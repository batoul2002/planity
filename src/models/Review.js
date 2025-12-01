const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String }
}, { timestamps: true });

reviewSchema.post('save', async function () {
  const Vendor = require('./Vendor');
  const reviews = await this.constructor.find({ vendor: this.vendor });
  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  await Vendor.findByIdAndUpdate(this.vendor, {
    averageRating,
    ratingCount: reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);