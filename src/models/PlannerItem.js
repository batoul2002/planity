const mongoose = require('mongoose');

const plannerItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    eventType: { type: String, trim: true },
    category: { type: String, trim: true },
    priceMin: { type: Number, min: 0 },
    priceMax: { type: Number, min: 0 },
    image: { type: String, trim: true },
    description: { type: String, trim: true },
    clientKey: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deleted'],
      default: 'pending'
    },
    source: { type: String, default: 'manual' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlannerItem', plannerItemSchema);
