const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String },
    mimetype: { type: String },
    size: { type: Number }
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true },
    attachments: [attachmentSchema],
    reads: [readReceiptSchema]
  },
  { timestamps: true }
);

messageSchema.pre('validate', function (next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('content', 'Message must include text or attachment');
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
