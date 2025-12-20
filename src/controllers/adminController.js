const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const Contract = require('../models/Contract');
const Dispute = require('../models/Dispute');
const MetaOption = require('../models/MetaOption');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
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
  const totalUsers = await User.countDocuments();
  const planners = await User.countDocuments({ role: 'planner' });
  const vendors = await Vendor.countDocuments();
  const events = await Event.countDocuments();

  res.json({ success: true, data: { totalUsers, planners, vendors, events } });
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
    .select('type theme date status budget guests location notes favoritesSnapshot createdAt statusHistory');

  res.json({ success: true, data: events });
};

exports.getEventsOverview = async (req, res) => {
  const events = await Event.find()
    .populate('client', 'name email')
    .populate('planner', 'name email')
    .select('type date status budget budgetItemsTotal planner client createdAt lastActivityAt');

  res.json({ success: true, data: events });
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

  res.json({
    success: true,
    data: {
      event,
      messages
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
  if (event.planner && event.planner.toString() !== plannerId) {
    return next(new ApiError(400, 'Event already has a planner'));
  }

  event.planner = plannerId;
  event.assignedByAdmin = req.user._id;
  event.status = 'assigned';
  event.lastActivityAt = new Date();
  event.statusHistory.push({ status: 'assigned', changedAt: new Date(), changedBy: req.user._id });
  await event.save();

  const populated = await event.populate('client planner', 'name email role phone');

  let chat = await ChatRoom.findOne({ event: event._id });
  if (!chat) {
    chat = await ChatRoom.create({
      event: event._id,
      participants: [event.client, plannerId],
      createdBy: req.user._id
    });
  }

  await Message.create({
    event: event._id,
    sender: req.user._id,
    content: 'A planner has been assigned to your event.'
  });

  res.json({ success: true, data: { event: populated, chatRoomId: chat._id } });
};

exports.getPlanners = async (req, res) => {
  const planners = await User.find({ role: 'planner' }).select('name email phone isActive deletedAt createdAt');
  res.json({ success: true, data: planners });
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
