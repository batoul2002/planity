const Review = require('../models/Review');
const ApiError = require('../utils/ApiError');
const Event = require('../models/Event');
const Contract = require('../models/Contract');

exports.createReview = async (req, res) => {
  const { vendorId, rating, comment } = req.body;
  if (!vendorId || !rating) throw new ApiError(400, 'Vendor and rating are required');

  if (req.user.role !== 'client') {
    throw new ApiError(403, 'Only clients can submit reviews');
  }

  const [hasEvent, hasContract] = await Promise.all([
    Event.exists({ client: req.user._id, vendors: vendorId }),
    Contract.exists({ vendor: vendorId, parties: req.user._id })
  ]);

  if (!hasEvent && !hasContract) {
    throw new ApiError(403, 'You can only review vendors you have worked with');
  }

  const review = new Review({
    author: req.user._id,
    vendor: vendorId,
    rating,
    comment
  });
  await review.save();
  res.status(201).json({ success: true, data: review });
};
