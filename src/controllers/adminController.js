const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const Contract = require('../models/Contract');
const Dispute = require('../models/Dispute');
const MetaOption = require('../models/MetaOption');
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

exports.getEventsOverview = async (req, res) => {
  const events = await Event.find()
    .populate('client', 'name email')
    .populate('planner', 'name email')
    .select('type date status budget budgetItemsTotal planner client createdAt');

  res.json({ success: true, data: events });
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
