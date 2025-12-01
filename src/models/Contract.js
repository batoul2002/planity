const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  parties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  text: { type: String, required: true },
  status: { type: String, enum: ['pending', 'signed', 'declined'], default: 'pending' },
  signedAt: { type: Date },
  isPaid: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
