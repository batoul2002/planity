const PlannerItem = require('../models/PlannerItem');
const ApiError = require('../utils/ApiError');

const ownsItemOrAdmin = (item, user) => {
  if (!item) return false;
  if (user.role === 'admin') return true;
  return item.owner.toString() === user._id.toString();
};

exports.listMyItems = async (req, res) => {
  const filter =
    req.user.role === 'admin'
      ? {}
      : {
          $or: [{ owner: req.user._id }, { source: 'client' }]
        };
  const items = await PlannerItem.find(filter).sort('-createdAt');
  res.json({ success: true, data: items });
};

exports.createItem = async (req, res) => {
  const payload = {
    ...req.body,
    owner: req.user._id,
    status: 'pending',
    source: req.body.source || 'manual'
  };
  const item = await PlannerItem.create(payload);
  res.status(201).json({ success: true, data: item });
};

exports.updateItem = async (req, res, next) => {
  const item = await PlannerItem.findById(req.params.id);
  if (!item) return next(new ApiError(404, 'Item not found'));
  if (!ownsItemOrAdmin(item, req.user)) return next(new ApiError(403, 'Not authorized'));

  const updatable = ['title', 'service', 'eventType', 'category', 'priceMin', 'priceMax', 'image', 'description', 'status'];
  updatable.forEach((field) => {
    if (typeof req.body[field] !== 'undefined') {
      item[field] = req.body[field];
    }
  });

  // default to pending when a planner edits
  if (req.user.role === 'planner' && req.body.status === undefined) {
    item.status = 'pending';
  }

  await item.save();
  res.json({ success: true, data: item });
};

exports.deleteItem = async (req, res, next) => {
  const item = await PlannerItem.findById(req.params.id);
  if (!item) return next(new ApiError(404, 'Item not found'));
  if (!ownsItemOrAdmin(item, req.user)) return next(new ApiError(403, 'Not authorized'));

  await item.deleteOne();
  res.json({ success: true, message: 'Item deleted' });
};
