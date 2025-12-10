const PlannerItem = require('../models/PlannerItem');
const PlannerItemChange = require('../models/PlannerItemChange');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const getAdminOwnerId = async () => {
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  return admin ? admin._id : null;
};

exports.submitChange = async (req, res) => {
  const { action, itemId, itemData, note, clientKey } = req.body;

  if ((action === 'update' || action === 'delete') && !itemId && !clientKey) {
    throw new ApiError(400, 'itemId or clientKey is required for update/delete');
  }

  let target = null;
  if (itemId) {
    target = await PlannerItem.findById(itemId);
  }
  if (!target && clientKey) {
    target = await PlannerItem.findOne({ clientKey });
  }

  if (
    target &&
    req.user.role !== 'admin' &&
    target.owner.toString() !== req.user._id.toString() &&
    (target.source || '').toLowerCase() !== 'client'
  ) {
    throw new ApiError(403, 'Not authorized for this item');
  }

  if ((action === 'update' || action === 'delete') && !target && !itemData) {
    throw new ApiError(400, 'itemData is required when referencing a client item');
  }

  const change = await PlannerItemChange.create({
    action,
    itemId: target?._id || itemId,
    clientKey: clientKey || target?.clientKey,
    itemData: itemData || {},
    note,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: change });
};

exports.listChanges = async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const changes = await PlannerItemChange.find(filter)
    .sort('-createdAt')
    .populate('createdBy', 'name email role')
    .populate('itemId', 'title service eventType category status owner');
  res.json({ success: true, data: changes });
};

exports.approveChange = async (req, res, next) => {
  const change = await PlannerItemChange.findById(req.params.id);
  if (!change) return next(new ApiError(404, 'Change request not found'));
  if (change.status !== 'pending') return next(new ApiError(400, 'Request already reviewed'));

  const adminOwnerId = await getAdminOwnerId();
  const isClientItem = () => {
    if (change.clientKey) return true;
    return (change.itemData?.source || '').toLowerCase() === 'client';
  };

  const resolveTarget = async () => {
    if (change.itemId) {
      const existing = await PlannerItem.findById(change.itemId);
      if (existing) return existing;
    }
    if (change.clientKey) {
      const existing = await PlannerItem.findOne({ clientKey: change.clientKey });
      if (existing) return existing;
    }
    return null;
  };

  const apply = async () => {
    if (change.action === 'create') {
      const owner = isClientItem() ? adminOwnerId || change.createdBy : change.createdBy;
      const item = await PlannerItem.create({
        ...change.itemData,
        owner,
        status: 'approved',
        clientKey: change.clientKey || change.itemData?.clientKey,
        source: change.itemData?.source || 'manual'
      });
      change.itemId = item._id;
    } else if (change.action === 'update') {
      let item = await resolveTarget();
      if (!item) {
        const owner = isClientItem() ? adminOwnerId || change.createdBy : change.createdBy;
        item = await PlannerItem.create({
          ...change.itemData,
          owner,
          status: 'approved',
          clientKey: change.clientKey || change.itemData?.clientKey,
          source: change.itemData?.source || 'manual'
        });
      } else {
        if ((item.source || '').toLowerCase() === 'client' && adminOwnerId) {
          item.owner = adminOwnerId;
        }
        Object.assign(item, change.itemData, { status: 'approved' });
        if (change.clientKey || change.itemData?.clientKey) {
          item.clientKey = change.clientKey || change.itemData.clientKey;
        }
        await item.save();
      }
      change.itemId = item._id;
    } else if (change.action === 'delete') {
      let item = await resolveTarget();
      if (!item && change.itemData) {
        const owner = isClientItem() ? adminOwnerId || change.createdBy : change.createdBy;
        item = await PlannerItem.create({
          ...change.itemData,
          owner,
          status: 'deleted',
          clientKey: change.clientKey || change.itemData?.clientKey,
          source: change.itemData?.source || 'manual'
        });
      }
      if (!item) throw new ApiError(404, 'Target item missing');
      if ((item.source || '').toLowerCase() === 'client' && adminOwnerId) {
        item.owner = adminOwnerId;
      }
      item.status = 'deleted';
      if (change.clientKey || change.itemData?.clientKey) {
        item.clientKey = change.clientKey || change.itemData.clientKey;
      }
      await item.save();
      change.itemId = item._id;
    }
  };

  await apply();
  change.status = 'approved';
  change.reviewedBy = req.user._id;
  change.reviewedAt = new Date();
  await change.save();

  res.json({ success: true, data: change });
};

exports.rejectChange = async (req, res, next) => {
  const change = await PlannerItemChange.findById(req.params.id);
  if (!change) return next(new ApiError(404, 'Change request not found'));
  if (change.status !== 'pending') return next(new ApiError(400, 'Request already reviewed'));

  change.status = 'rejected';
  change.reviewedBy = req.user._id;
  change.reviewedAt = new Date();
  change.note = req.body?.note || change.note;
  await change.save();

  res.json({ success: true, data: change });
};
