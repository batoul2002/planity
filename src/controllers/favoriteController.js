const Favorite = require('../models/Favorite');
const Vendor = require('../models/Vendor');
const ApiError = require('../utils/ApiError');

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

exports.toggleFavorite = async (req, res) => {
  const { vendorId, vendorSlug, vendorName } = req.body;
  if (!vendorId && !vendorSlug && !vendorName) throw new ApiError(400, 'Vendor identifier is required');

  let vendorDoc = null;

  if (vendorId) {
    vendorDoc = await Vendor.findById(vendorId);
  }

  if (!vendorDoc && (vendorSlug || vendorName)) {
    const slug = slugify(vendorSlug || vendorName || '');
    vendorDoc =
      (slug && (await Vendor.findOne({ slug }))) ||
      (vendorName && (await Vendor.findOne({ name: new RegExp(`^${vendorName}$`, 'i') })));

    if (!vendorDoc) {
      const fallbackName = vendorName || vendorSlug || 'Venue';
      vendorDoc = new Vendor({
        name: fallbackName,
        slug,
        category: 'venue',
        pricing: { type: 'package', amount: 0 },
        city: 'Lebanon',
        amenities: [],
        styles: [],
        cuisines: [],
        dietaryOptions: [],
        photos: [],
        verified: false,
        isActive: true
      });
      await vendorDoc.save();
    }
  }

  if (!vendorDoc) throw new ApiError(404, 'Vendor not found');

  const existing = await Favorite.findOne({ user: req.user._id, vendor: vendorDoc._id });
  if (existing) {
    await existing.deleteOne();
    return res.json({ success: true, message: 'Removed from favorites', vendorId: vendorDoc._id });
  }

  const favorite = new Favorite({ user: req.user._id, vendor: vendorDoc._id });
  await favorite.save();
  res.json({ success: true, message: 'Added to favorites', vendorId: vendorDoc._id });
};

exports.getMyFavorites = async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id }).populate('vendor');
  res.json({
    success: true,
    data: favorites
      .filter(fav => fav.vendor) // drop orphaned favorites
      .map(fav => fav.vendor)
  });
};

exports.getFavoritesCount = async (req, res) => {
  const count = await Favorite.countDocuments({ user: req.user._id });
  res.json({ success: true, count });
};
