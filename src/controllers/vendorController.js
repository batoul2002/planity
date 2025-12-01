const Vendor = require('../models/Vendor');
const ApiError = require('../utils/ApiError');

exports.createVendor = async (req, res) => {
  const vendor = new Vendor(req.body);
  await vendor.save();
  res.status(201).json({ success: true, data: vendor });
};

exports.updateVendor = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));

  Object.assign(vendor, req.body);
  await vendor.save();

  res.json({ success: true, data: vendor });
};

exports.deleteVendor = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));

  await vendor.deleteOne();
  res.json({ success: true, message: 'Vendor removed' });
};

exports.getVendors = async (req, res) => {
  const {
    category,
    city,
    minBudget,
    maxBudget,
    rating,
    styles,
    cuisines,
    dietaryOptions,
    verified,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const filter = {};
  if (req.query.includeInactive !== 'true') filter.isActive = true;
  if (category) filter.category = category;
  if (city) filter.city = city;
  if (verified !== undefined) filter.verified = verified === 'true';
  if (rating) filter.averageRating = { $gte: Number(rating) };
  if (styles) filter.styles = { $in: styles.split(',') };
  if (cuisines) filter.cuisines = { $in: cuisines.split(',') };
  if (dietaryOptions) filter.dietaryOptions = { $in: dietaryOptions.split(',') };
  if (minBudget || maxBudget) {
    filter['pricing.amount'] = {};
    if (minBudget) filter['pricing.amount'].$gte = Number(minBudget);
    if (maxBudget) filter['pricing.amount'].$lte = Number(maxBudget);
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === 'asc' ? 1 : -1;
  const vendors = await Vendor.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(Number(limit));

  const total = await Vendor.countDocuments(filter);

  res.json({ success: true, total, page: Number(page), limit: Number(limit), data: vendors });
};

exports.getVendorById = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));
  res.json({ success: true, data: vendor });
};

exports.getRecommendations = async (req, res) => {
  // For simplicity, recommend top 5 verified vendors with highest rating
  const vendors = await Vendor.find({ verified: true, isActive: true }).sort({ averageRating: -1 }).limit(5);
  res.json({ success: true, data: vendors });
};

exports.removePhoto = async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return next(new ApiError(404, 'Vendor not found'));

  const { photo } = req.query;
  const filtered = vendor.photos.filter(existing => existing !== photo);
  if (filtered.length === vendor.photos.length) {
    return next(new ApiError(404, 'Photo not found on vendor profile'));
  }

  vendor.photos = filtered;
  await vendor.save();

  res.json({ success: true, data: vendor.photos });
};
