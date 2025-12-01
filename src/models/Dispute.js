const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved'],
      default: 'open'
    },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    against: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
