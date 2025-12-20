const mongoose = require('mongoose');

const plannerItemChangeSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlannerItem' },
    itemData: { type: Object, default: {} },
    clientKey: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlannerItemChange', plannerItemChangeSchema);
