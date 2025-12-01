const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  type: { type: String, enum: ['per-person', 'package'], required: true },
  amount: { type: Number, required: true }
});

const vendorSchema = new mongoose.Schema({
  slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['venue', 'photographer', 'catering', 'decorator', 'dj', 'invitation'] },
  pricing: pricingSchema,
  city: { type: String, required: true },
  amenities: [{ type: String }],
  styles: [{ type: String }],
  cuisines: [{ type: String }],
  dietaryOptions: [{ type: String }],
  photos: [{ type: String }],
  verified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

vendorSchema.index({ slug: 1 }, { unique: true, sparse: true });

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

vendorSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
