const mongoose = require('mongoose');
const Event = require('../models/Event');
const Vendor = require('../models/Vendor');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const sendEmail = require('../utils/email');

const ensureEventAccess = (event, user) => {
  if (user.role === 'admin') return;
  const userId = user._id.toString();
  if (event.client.toString() === userId) return;
  if (event.planner && event.planner.toString() === userId) return;
  throw new ApiError(403, 'You are not authorized to manage this event');
};

const notifyEventParticipants = async ({ event, subject, html }) => {
  if (!event) return;

  const collectId = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id;
    return value;
  };

  const ids = [collectId(event.client), collectId(event.planner)].filter(Boolean);
  if (!ids.length) return;

  const recipients = await User.find({ _id: { $in: ids } }).select('email');
  await Promise.all(
    recipients
      .filter(user => !!user.email)
      .map(user =>
        sendEmail({
          to: user.email,
          subject,
          html
        }).catch(() => null)
      )
  );
};

exports.createEvent = async (req, res, next) => {
  const {
    type,
    theme,
    date,
    budget,
    guests,
    location,
    notes,
    plannerId,
    vendors = [],
    clientSubmission
  } = req.body;

  let favoritesSnapshot = [];
  try {
    const favorites = await Favorite.find({ user: req.user._id }).populate('vendor', 'name category city photos slug');
    favoritesSnapshot = favorites
      .filter(f => f.vendor)
      .map(f => ({
        vendor: f.vendor._id,
        name: f.vendor.name,
        category: f.vendor.category,
        city: f.vendor.city,
        slug: f.vendor.slug,
        photo: Array.isArray(f.vendor.photos) && f.vendor.photos.length ? f.vendor.photos[0] : undefined
      }));
  } catch (_) {
    favoritesSnapshot = [];
  }

  const eventData = {
    type,
    theme,
    date,
    budget,
    guests,
    location,
    notes,
    client: req.user._id,
    favoritesSnapshot,
    status: 'pending_assignment',
    lastActivityAt: new Date()
  };
  if (clientSubmission && typeof clientSubmission === 'object') {
    const uploads = Array.isArray(clientSubmission.uploads) ? clientSubmission.uploads.filter(Boolean) : [];
    const cleaned = ['name', 'email', 'phone', 'designation', 'requestedStatus'].reduce((acc, key) => {
      if (clientSubmission[key]) acc[key] = clientSubmission[key];
      return acc;
    }, {});
    if (uploads.length) cleaned.uploads = uploads;
    if (Object.keys(cleaned).length) eventData.clientSubmission = cleaned;
  }

  if (plannerId) {
    if (!mongoose.Types.ObjectId.isValid(plannerId)) {
      throw new ApiError(400, 'Invalid planner id');
    }
    if (req.user.role === 'planner' && plannerId !== req.user._id.toString()) {
      throw new ApiError(403, 'Planners can only assign themselves');
    }
    const planner = await User.findOne({ _id: plannerId, role: 'planner' });
    if (!planner) throw new ApiError(404, 'Planner not found');
    eventData.planner = plannerId;
  }

  if (vendors.length) {
    const uniqueVendorIds = [...new Set(vendors)];
    const vendorCount = await Vendor.countDocuments({ _id: { $in: uniqueVendorIds } });
    if (vendorCount !== uniqueVendorIds.length) {
      throw new ApiError(400, 'One or more vendors do not exist');
    }
    eventData.vendors = uniqueVendorIds;
  }

  const event = new Event(eventData);
  await event.save();
  const populated = await event.populate('planner client vendors', 'name email role');

  await notifyEventParticipants({
    event: populated,
    subject: 'Event Created',
    html: `<p>Your event "${populated.type}" has been created.</p>`
  });

  res.status(201).json({ success: true, data: populated });
};

exports.getMyEvents = async (req, res) => {
  let filter = {};
  if (req.user.role === 'admin') {
    filter = {};
  } else if (req.user.role === 'planner') {
    filter = { planner: req.user._id };
  } else {
    filter = { client: req.user._id };
  }

  const events = await Event.find(filter)
    .populate('client', 'name email role')
    .populate('planner', 'name email role')
    .populate('vendors', 'name category city pricing')
    .populate('tasks.assignedTo', 'name email role')
    .sort('-createdAt');

  res.json({ success: true, data: events });
};

exports.updateEventDetails = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const updatableFields = ['type', 'theme', 'date', 'budget', 'guests', 'location', 'notes'];
  updatableFields.forEach(field => {
    if (typeof req.body[field] !== 'undefined') {
      event[field] = req.body[field];
    }
  });

  await event.save();
  const populated = await event.populate('planner client vendors tasks.assignedTo', 'name email role');

  await notifyEventParticipants({
    event: populated,
    subject: 'Event Updated',
    html: `<p>The event "${populated.type}" details have been updated.</p>`
  });

  res.json({ success: true, data: populated });
};

exports.assignPlanner = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  if (req.user.role === 'client') {
    return next(new ApiError(403, 'Clients cannot assign planners'));
  }

  const { plannerId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(plannerId)) {
    return next(new ApiError(400, 'Invalid planner id'));
  }

  if (req.user.role === 'planner' && plannerId !== req.user._id.toString()) {
    return next(new ApiError(403, 'Planners can only claim events for themselves'));
  }

  const planner = await User.findOne({ _id: plannerId, role: 'planner' });
  if (!planner) return next(new ApiError(404, 'Planner not found'));

  const existingPlannerId = event.planner ? event.planner.toString() : null;
  const isSamePlanner = existingPlannerId && existingPlannerId === plannerId;
  const isReassign = existingPlannerId && existingPlannerId !== plannerId;

  event.planner = plannerId;
  event.lastActivityAt = new Date();
  if (!event.status || event.status === 'pending_assignment') {
    event.status = 'assigned';
    event.statusHistory.push({ status: 'assigned', changedAt: new Date(), changedBy: req.user._id });
  }
  await event.save();
  const populated = await event.populate('planner client', 'name email role');

  let chat = await ChatRoom.findOne({ event: event._id });
  const desiredParticipants = [event.client, plannerId].filter(Boolean);
  if (!chat) {
    chat = await ChatRoom.create({
      event: event._id,
      participants: desiredParticipants,
      createdBy: req.user._id
    });
  } else if (!isSamePlanner) {
    chat.participants = desiredParticipants;
    await chat.save();
  }

  if (!isSamePlanner) {
    await Message.create({
      event: event._id,
      sender: req.user._id,
      content: isReassign ? 'A planner has been reassigned to your event.' : 'A planner has been assigned to your event.'
    });
  }

  await notifyEventParticipants({
    event: populated,
    subject: 'Planner Assigned',
    html: `<p>A planner has been assigned to event "${populated.type}".</p>`
  });

  res.json({ success: true, data: populated });
};

exports.updateStatus = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const { status } = req.body;
  event.status = status;
  event.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: req.user._id
  });

  await event.save();
  await event.populate('planner client', 'name email role');

  await notifyEventParticipants({
    event,
    subject: 'Event Status Updated',
    html: `<p>The event "${event.type}" status has been updated to ${status}.</p>`
  });

  res.json({ success: true, data: event });
};

exports.updatePlanningStep = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  event.planningStep = req.body.planningStep;
  await event.save();
  res.json({ success: true, data: event });
};

exports.rescheduleEvent = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  event.date = req.body.date;
  if (typeof req.body.location !== 'undefined') {
    event.location = req.body.location;
  }

  await event.save();
  await event.populate('planner client', 'name email role');

  await notifyEventParticipants({
    event,
    subject: 'Event Rescheduled',
    html: `<p>The event "${event.type}" has been rescheduled to ${new Date(event.date).toLocaleString()}.</p>`
  });

  res.json({ success: true, data: event });
};

exports.updateBudget = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const { items } = req.body;
  const vendorIds = [
    ...new Set(items.map(item => item.vendor).filter(Boolean))
  ];

  if (vendorIds.length) {
    const count = await Vendor.countDocuments({ _id: { $in: vendorIds } });
    if (count !== vendorIds.length) {
      return next(new ApiError(400, 'One or more vendors in the budget do not exist'));
    }
  }

  event.budgetItems = items.map(item => ({
    label: item.label,
    amount: item.amount,
    vendor: item.vendor || undefined,
    notes: item.notes
  }));

  await event.save();
  await event.populate('budgetItems.vendor', 'name category city');

  res.json({
    success: true,
    data: {
      items: event.budgetItems,
      total: event.budgetItemsTotal
    }
  });
};

exports.getBudget = async (req, res, next) => {
  const event = await Event.findById(req.params.id)
    .populate('budgetItems.vendor', 'name category city');
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  res.json({
    success: true,
    data: {
      items: event.budgetItems,
      total: event.budgetItemsTotal
    }
  });
};

exports.getCalendar = async (req, res) => {
  const { from, to, plannerId } = req.query;

  const filter = {};

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  if (req.user.role === 'planner') {
    filter.planner = req.user._id;
  } else if (req.user.role === 'admin' && plannerId) {
    filter.planner = plannerId;
  } else if (req.user.role === 'client') {
    filter.client = req.user._id;
  }

  const events = await Event.find(filter)
    .select('type date location status planner client')
    .populate('planner', 'name email')
    .populate('client', 'name email')
    .sort('date');

  res.json({ success: true, data: events });
};

exports.addTask = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const { title, dueDate, assignedTo } = req.body;

  if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
    return next(new ApiError(400, 'Invalid assigned user id'));
  }

  event.tasks.push({
    title,
    dueDate,
    assignedTo
  });

  await event.save();
  const task = event.tasks[event.tasks.length - 1];

  await notifyEventParticipants({
    event,
    subject: 'New Event Task',
    html: `<p>A new task "${task.title}" was added to event "${event.type}".</p>`
  });

  res.status(201).json({ success: true, data: task });
};

exports.updateTask = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const task = event.tasks.id(req.params.taskId);
  if (!task) return next(new ApiError(404, 'Task not found'));

  const { title, completed, dueDate, assignedTo } = req.body;

  if (typeof title !== 'undefined') task.title = title;
  if (typeof completed !== 'undefined') task.completed = completed;
  if (typeof dueDate !== 'undefined') task.dueDate = dueDate;
  if (typeof assignedTo !== 'undefined') {
    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return next(new ApiError(400, 'Invalid assigned user id'));
    }
    task.assignedTo = assignedTo || undefined;
  }

  await event.save();

  await notifyEventParticipants({
    event,
    subject: 'Event Task Updated',
    html: `<p>The task "${task.title}" for event "${event.type}" has been updated.</p>`
  });

  res.json({ success: true, data: task });
};

exports.removeTask = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const task = event.tasks.id(req.params.taskId);
  if (!task) return next(new ApiError(404, 'Task not found'));

  task.deleteOne();
  await event.save();

  await notifyEventParticipants({
    event,
    subject: 'Event Task Removed',
    html: `<p>A task was removed from event "${event.type}".</p>`
  });

  res.json({ success: true, message: 'Task removed' });
};

exports.addVendor = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const { vendorId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new ApiError(400, 'Invalid vendor id'));
  }

  const vendorExists = await Vendor.exists({ _id: vendorId });
  if (!vendorExists) return next(new ApiError(404, 'Vendor not found'));

  if (event.vendors.some(id => id.toString() === vendorId)) {
    return next(new ApiError(400, 'Vendor already assigned to event'));
  }

  event.vendors.push(vendorId);
  await event.save();
  const populated = await event.populate('vendors', 'name category city pricing');

  await notifyEventParticipants({
    event,
    subject: 'Vendor Added',
    html: `<p>A vendor has been added to event "${event.type}".</p>`
  });

  res.json({ success: true, data: populated.vendors });
};

exports.removeVendor = async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ApiError(404, 'Event not found'));

  ensureEventAccess(event, req.user);

  const { vendorId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new ApiError(400, 'Invalid vendor id'));
  }

  const originalLength = event.vendors.length;
  event.vendors = event.vendors.filter(id => id.toString() !== vendorId);
  if (event.vendors.length === originalLength) {
    return next(new ApiError(404, 'Vendor not assigned to this event'));
  }

  await event.save();

  await notifyEventParticipants({
    event,
    subject: 'Vendor Removed',
    html: `<p>A vendor has been removed from event "${event.type}".</p>`
  });

  res.json({ success: true, message: 'Vendor removed from event' });
};
