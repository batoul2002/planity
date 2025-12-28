const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const Contract = require('../models/Contract');
const Dispute = require('../models/Dispute');
const MetaOption = require('../models/MetaOption');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const PlannerItemChange = require('../models/PlannerItemChange');
const PlannerItem = require('../models/PlannerItem');
const Favorite = require('../models/Favorite');
const ApiError = require('../utils/ApiError');

const toCsv = (rows, columns) => {
  const header = columns.map(col => col.header).join(',');
  const body = rows
    .map(row =>
      columns
        .map(col => {
          const value = row[col.key] ?? '';
          const normalized = typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : value?.toString?.() ?? '';
          return `"${normalized.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
};

exports.getStats = async (req, res) => {
  const now = new Date();
  const [totalUsers, planners, vendors, events, pendingAssignment, inProgress, approvals] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'planner' }),
    Vendor.countDocuments(),
    Event.countDocuments(),
    Event.countDocuments({ status: 'pending_assignment' }),
    Event.countDocuments({ status: { $in: ['assigned', 'draft', 'planning'] } }),
    PlannerItemChange.countDocuments({ status: 'pending' })
  ]);

  const overdue = await Event.countDocuments({
    status: { $nin: ['completed', 'cancelled'] },
    date: { $lt: now }
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      planners,
      vendors,
      events,
      pendingAssignment,
      inProgress,
      approvals,
      overdue
    }
  });
};

exports.getUsers = async (req, res) => {
  const users = await User.find().select('name email role isVerified isActive statusUpdatedAt statusUpdatedBy roleUpdatedAt roleUpdatedBy createdAt updatedAt');
  res.json({ success: true, data: users });
};

exports.updateUserRole = async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(new ApiError(404, 'User not found'));

  user.role = req.body.role;
  user.roleUpdatedAt = new Date();
  user.roleUpdatedBy = req.user._id;
  await user.save();

  res.json({ success: true, data: { id: user._id, role: user.role } });
};

exports.updateUserStatus = async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(new ApiError(404, 'User not found'));

  user.isActive = req.body.isActive;
  user.statusUpdatedAt = new Date();
  user.statusUpdatedBy = req.user._id;
  await user.save();

  res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
};

exports.verifyVendor = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.vendorId);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));

  vendor.verified = req.body.verified;
  await vendor.save();

  res.json({ success: true, data: { id: vendor._id, verified: vendor.verified } });
};

exports.updateVendorStatus = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.vendorId);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));

  vendor.isActive = req.body.isActive;
  await vendor.save();

  res.json({ success: true, data: { id: vendor._id, isActive: vendor.isActive } });
};

exports.getPendingVendors = async (req, res) => {
  const vendors = await Vendor.find({ verified: false }).sort('-createdAt');
  res.json({ success: true, data: vendors });
};

exports.getEventRequests = async (req, res) => {
  const events = await Event.find({ status: 'pending_assignment' })
    .populate('client', 'name email phone')
    .populate('planner', 'name email')
    .select('type theme date status budget guests location notes favoritesSnapshot createdAt statusHistory clientSubmission');

  res.json({ success: true, data: events });
};

exports.getEventsOverview = async (req, res) => {
  const events = await Event.find()
    .populate('client', 'name email')
    .populate('planner', 'name email')
    .select('type date status budget budgetItemsTotal planner client createdAt lastActivityAt isPaid clientSubmission favoritesSnapshot');

  const data = events.map(ev => {
    const status = ev.status;
    const statusLabel =
      status === 'pending_assignment'
        ? 'Submitted'
        : status === 'assigned' || status === 'planning'
        ? 'In Chat'
        : status === 'draft'
        ? 'Draft'
        : status === 'confirmed'
        ? 'Confirmed'
        : status === 'completed'
        ? 'Completed'
        : status === 'cancelled'
        ? 'Cancelled'
        : status;
    const paymentStatus = ev.isPaid ? 'Paid' : 'Pending';
    return {
      _id: ev._id,
      type: ev.type,
      date: ev.date,
      status: statusLabel,
      rawStatus: status,
      budget: ev.budget,
      planner: ev.planner,
      client: ev.client,
      lastActivityAt: ev.lastActivityAt,
      createdAt: ev.createdAt,
      paymentStatus,
      clientSubmission: ev.clientSubmission,
      favoritesSnapshot: ev.favoritesSnapshot
    };
  });

  res.json({ success: true, data });
};

exports.getEventDetailReadOnly = async (req, res, next) => {
  const event = await Event.findById(req.params.eventId)
    .populate('client', 'name email phone')
    .populate('planner', 'name email phone')
    .populate('vendors', 'name category city pricing')
    .populate('tasks.assignedTo', 'name email');
  if (!event) return next(new ApiError(404, 'Event not found'));

  const messages = await Message.find({ event: event._id })
    .sort('-createdAt')
    .limit(50)
    .populate('sender', 'name role email');

  let favorites = Array.isArray(event.favoritesSnapshot) ? event.favoritesSnapshot : [];
  if (!favorites.length && event.client) {
    const favDocs = await Favorite.find({ user: event.client }).populate('vendor', 'name category city photos slug');
    favorites = favDocs
      .filter(f => f.vendor)
      .map(f => ({
        vendor: f.vendor._id,
        name: f.vendor.name,
        category: f.vendor.category,
        city: f.vendor.city,
        slug: f.vendor.slug,
        photo: Array.isArray(f.vendor.photos) && f.vendor.photos.length ? f.vendor.photos[0] : undefined
      }));
  }

  // Enrich missing photos from vendor data
  const missingPhotoIds = favorites
    .filter(f => !f.photo && f.vendor)
    .map(f => f.vendor);
  if (missingPhotoIds.length) {
    const vendorDocs = await Vendor.find({ _id: { $in: missingPhotoIds } }).select('photos');
    const vendorMap = vendorDocs.reduce((acc, v) => {
      acc[v._id.toString()] = Array.isArray(v.photos) && v.photos.length ? v.photos[0] : null;
      return acc;
    }, {});
    favorites = favorites.map(f => {
      if (!f.photo && f.vendor && vendorMap[f.vendor.toString()]) {
        return { ...f, photo: vendorMap[f.vendor.toString()] };
      }
      return f;
    });
  }

  res.json({
    success: true,
    data: {
      event,
      messages,
      favorites
    }
  });
};

exports.assignPlannerToEvent = async (req, res, next) => {
  const { eventId } = req.params;
  const { plannerId } = req.body;

  const [event, planner] = await Promise.all([
    Event.findById(eventId),
    User.findOne({ _id: plannerId, role: 'planner', isActive: true, deletedAt: { $exists: false } })
  ]);

  if (!event) return next(new ApiError(404, 'Event not found'));
  if (!planner) return next(new ApiError(404, 'Planner not found or inactive'));

  const existingPlannerId = event.planner ? event.planner.toString() : null;
  const isSamePlanner = existingPlannerId && existingPlannerId === plannerId;
  const isReassign = existingPlannerId && existingPlannerId !== plannerId;

  event.planner = plannerId;
  event.assignedByAdmin = req.user._id;
  event.lastActivityAt = new Date();
  if (!event.status || event.status === 'pending_assignment') {
    event.status = 'assigned';
    event.statusHistory.push({ status: 'assigned', changedAt: new Date(), changedBy: req.user._id });
  }
  await event.save();

  const populated = await event.populate('client planner', 'name email role phone');

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

  res.json({ success: true, data: { event: populated, chatRoomId: chat._id } });
};

exports.getPlanners = async (req, res) => {
  const planners = await User.find({ role: 'planner' }).select('name email phone isActive deletedAt createdAt');
  const plannerIds = planners.map(p => p._id);
  const events = await Event.find({ planner: { $in: plannerIds } }).select('planner status');
  const counts = events.reduce(
    (acc, ev) => {
      const key = ev.planner?.toString();
      if (!key) return acc;
      if (ev.status === 'completed') {
        acc.completed[key] = (acc.completed[key] || 0) + 1;
        return acc;
      }
      if (ev.status !== 'cancelled') {
        acc.active[key] = (acc.active[key] || 0) + 1;
      }
      return acc;
    },
    { active: {}, completed: {} }
  );
  const data = planners.map(p => ({
    _id: p._id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    isActive: p.isActive,
    deletedAt: p.deletedAt,
    createdAt: p.createdAt,
    activeEvents: counts.active[p._id.toString()] || 0,
    completed: counts.completed[p._id.toString()] || 0
  }));
  res.json({ success: true, data });
};

exports.createPlanner = async (req, res, next) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return next(new ApiError(400, 'Email already in use'));

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    role: 'planner',
    isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : true,
    isVerified: true
  });
  await user.save();

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    }
  });
};

exports.getUiOverview = async (req, res) => {
  const now = new Date();
  const [events, planners, approvals, contracts, catalog] = await Promise.all([
    Event.find()
      .populate('client', 'name email phone')
      .populate('planner', 'name email')
      .select('type theme date status budget guests location notes favoritesSnapshot createdAt lastActivityAt isPaid planner client clientSubmission'),
    User.find({ role: 'planner' }).select('name email phone isActive deletedAt createdAt'),
    PlannerItemChange.find({ status: 'pending' })
      .sort('-createdAt')
      .limit(25)
      .populate('createdBy', 'name email role'),
    Contract.find().populate('event', 'type date client planner budget').sort('-createdAt').limit(10),
    PlannerItem.find({ status: 'approved' }).select('title service eventType category priceMin priceMax owner status createdAt')
  ]);

  const pendingRequests = events.filter(ev => ev.status === 'pending_assignment');
  const pendingAssignment = pendingRequests.length;
  const inProgress = events.filter(ev => ['assigned', 'planning', 'draft'].includes(ev.status)).length;
  const overdue = events.filter(ev => ev.date && ev.date < now && !['completed', 'cancelled'].includes(ev.status)).length;

  const eventRows = events.map(ev => {
    const status = ev.status;
    const statusLabel =
      status === 'pending_assignment'
        ? 'Submitted'
        : status === 'assigned' || status === 'planning'
        ? 'In Chat'
        : status === 'draft'
        ? 'Draft'
        : status === 'confirmed'
        ? 'Confirmed'
        : status === 'completed'
        ? 'Completed'
        : status === 'cancelled'
        ? 'Cancelled'
        : status;
    return {
      _id: ev._id,
      type: ev.type,
      date: ev.date,
      location: ev.location,
      budget: ev.budget,
      status: statusLabel,
      planner: ev.planner,
      client: ev.client,
      favoritesSnapshot: ev.favoritesSnapshot,
      createdAt: ev.createdAt,
      lastActivityAt: ev.lastActivityAt,
      isPaid: ev.isPaid,
      clientSubmission: ev.clientSubmission
    };
  });

  const plannerCounts = events.reduce(
    (acc, ev) => {
      const key = ev.planner?._id?.toString();
      if (!key) return acc;
      if (ev.status === 'completed') {
        acc.completed[key] = (acc.completed[key] || 0) + 1;
        return acc;
      }
      if (ev.status !== 'cancelled') {
        acc.active[key] = (acc.active[key] || 0) + 1;
      }
      return acc;
    },
    { active: {}, completed: {} }
  );

  const plannerRows = planners.map(p => ({
    _id: p._id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    isActive: p.isActive,
    deletedAt: p.deletedAt,
    createdAt: p.createdAt,
    activeEvents: plannerCounts.active[p._id.toString()] || 0,
    completed: plannerCounts.completed[p._id.toString()] || 0
  }));

  const paymentEntries = contracts.map(c => ({
    eventTitle: c.event?.type || 'Event',
    amount: c.event?.budget || 0,
    paymentStatus: c.isPaid ? 'Paid' : 'Pending',
    contractStatus: c.status,
    date: c.event?.date || c.createdAt
  }));

  const catalogItems = catalog.map(item => ({
    _id: item._id,
    name: item.title,
    service: item.service,
    eventType: item.eventType,
    category: item.category,
    price: item.priceMax || item.priceMin || 0,
    createdBy: item.owner,
    status: item.status,
    createdAt: item.createdAt
  }));

  res.json({
    success: true,
    data: {
      stats: {
        activeEvents: events.length,
        pendingAssignment,
        inProgress,
        approvals: approvals.length,
        overdue
      },
      requests: pendingRequests,
      approvals,
      events: eventRows,
      planners: plannerRows,
      payments: paymentEntries,
      catalog: catalogItems
    }
  });
};

exports.sendReminder = async (req, res, next) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId).populate('client planner', 'name email');
  if (!event) return next(new ApiError(404, 'Event not found'));

  let chat = await ChatRoom.findOne({ event: event._id });
  if (!chat) {
    chat = await ChatRoom.create({
      event: event._id,
      participants: [event.client, event.planner].filter(Boolean),
      createdBy: req.user._id
    });
  }

  await Message.create({
    event: event._id,
    sender: req.user._id,
    content: 'Admin reminder: Please respond or update this event.'
  });

  res.json({ success: true, data: { chatRoomId: chat._id } });
};

exports.updatePlanner = async (req, res, next) => {
  const planner = await User.findOne({ _id: req.params.plannerId, role: 'planner' });
  if (!planner) return next(new ApiError(404, 'Planner not found'));

  if (req.body.email && req.body.email !== planner.email) {
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return next(new ApiError(400, 'Email already in use'));
    planner.email = req.body.email;
  }
  if (req.body.name) planner.name = req.body.name;
  if (typeof req.body.phone !== 'undefined') planner.phone = req.body.phone;

  await planner.save();
  res.json({
    success: true,
    data: {
      id: planner._id,
      name: planner.name,
      email: planner.email,
      phone: planner.phone,
      isActive: planner.isActive
    }
  });
};

exports.setPlannerStatus = async (req, res, next) => {
  const planner = await User.findOne({ _id: req.params.plannerId, role: 'planner' });
  if (!planner) return next(new ApiError(404, 'Planner not found'));

  planner.isActive = req.body.isActive;
  planner.statusUpdatedAt = new Date();
  planner.statusUpdatedBy = req.user._id;
  await planner.save();

  res.json({ success: true, data: { id: planner._id, isActive: planner.isActive } });
};

exports.softDeletePlanner = async (req, res, next) => {
  const planner = await User.findOne({ _id: req.params.plannerId, role: 'planner' });
  if (!planner) return next(new ApiError(404, 'Planner not found'));
  planner.isActive = false;
  planner.deletedAt = new Date();
  await planner.save();
  res.json({ success: true });
};

exports.createDispute = async (req, res, next) => {
  const [event, contract, raisedByUser, againstUser] = await Promise.all([
    req.body.eventId ? Event.findById(req.body.eventId).select('_id type') : Promise.resolve(null),
    req.body.contractId ? Contract.findById(req.body.contractId).select('_id status') : Promise.resolve(null),
    User.findById(req.body.raisedBy).select('_id'),
    req.body.against ? User.findById(req.body.against).select('_id') : Promise.resolve(null)
  ]);

  if (req.body.eventId && !event) return next(new ApiError(404, 'Event not found for dispute'));
  if (req.body.contractId && !contract) return next(new ApiError(404, 'Contract not found for dispute'));
  if (!raisedByUser) return next(new ApiError(404, 'Raised-by user not found'));
  if (req.body.against && !againstUser) return next(new ApiError(404, 'Against user not found'));

  const dispute = await Dispute.create({
    title: req.body.title,
    description: req.body.description,
    event: req.body.eventId,
    contract: req.body.contractId,
    raisedBy: req.body.raisedBy,
    against: req.body.against,
    status: 'open'
  });

  const populated = await dispute
    .populate('event', 'type date')
    .populate('contract', 'status')
    .populate('raisedBy', 'name email')
    .populate('against', 'name email');

  res.status(201).json({ success: true, data: populated });
};

exports.getDisputes = async (req, res) => {
  const disputes = await Dispute.find()
    .populate('event', 'type date')
    .populate('contract', 'status')
    .populate('raisedBy', 'name email')
    .populate('against', 'name email')
    .sort('-createdAt');

  res.json({ success: true, data: disputes });
};

exports.updateDisputeStatus = async (req, res, next) => {
  const dispute = await Dispute.findById(req.params.disputeId);
  if (!dispute) return next(new ApiError(404, 'Dispute not found'));

  if (req.body.status) dispute.status = req.body.status;
  if (typeof req.body.resolutionNotes !== 'undefined') {
    dispute.resolutionNotes = req.body.resolutionNotes;
  }

  await dispute.save();
  res.json({ success: true, data: dispute });
};

exports.exportUsersCsv = async (req, res) => {
  const users = await User.find().select('name email role isActive createdAt');
  const csv = toCsv(users, [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role' },
    { header: 'Active', key: 'isActive' },
    { header: 'CreatedAt', key: 'createdAt' }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(csv);
};

exports.exportVendorsCsv = async (req, res) => {
  const vendors = await Vendor.find().select('name category city verified isActive createdAt');
  const csv = toCsv(vendors, [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'City', key: 'city' },
    { header: 'Verified', key: 'verified' },
    { header: 'Active', key: 'isActive' },
    { header: 'CreatedAt', key: 'createdAt' }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors.csv"');
  res.send(csv);
};

exports.exportEventsCsv = async (req, res) => {
  const events = await Event.find().select('type date status budget budgetItemsTotal createdAt');
  const csv = toCsv(events, [
    { header: 'Type', key: 'type' },
    { header: 'Date', key: 'date' },
    { header: 'Status', key: 'status' },
    { header: 'BudgetPlanned', key: 'budget' },
    { header: 'BudgetAllocated', key: 'budgetItemsTotal' },
    { header: 'CreatedAt', key: 'createdAt' }
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
  res.send(csv);
};

exports.createMetaOption = async (req, res) => {
  const option = await MetaOption.create({
    category: req.body.category,
    key: req.body.key,
    labels: req.body.labels,
    order: req.body.order ?? 0,
    isActive: req.body.isActive ?? true
  });
  res.status(201).json({ success: true, data: option });
};

exports.updateMetaOption = async (req, res, next) => {
  const option = await MetaOption.findById(req.params.optionId);
  if (!option) return next(new ApiError(404, 'Meta option not found'));

  if (req.body.key) option.key = req.body.key;
  if (req.body.labels) option.labels = req.body.labels;
  if (typeof req.body.order !== 'undefined') option.order = req.body.order;
  if (typeof req.body.isActive !== 'undefined') option.isActive = req.body.isActive;

  await option.save();
  res.json({ success: true, data: option });
};

exports.deleteMetaOption = async (req, res, next) => {
  const option = await MetaOption.findById(req.params.optionId);
  if (!option) return next(new ApiError(404, 'Meta option not found'));

  await option.deleteOne();
  res.json({ success: true });
};

exports.listMetaOptions = async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  const options = await MetaOption.find(filter).sort('order');
  res.json({ success: true, data: options });
};
