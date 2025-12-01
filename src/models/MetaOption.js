const mongoose = require('mongoose');

const metaOptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['event-type', 'service-category'],
      required: true
    },
    key: { type: String, required: true },
    labels: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

metaOptionSchema.index({ category: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('MetaOption', metaOptionSchema);
