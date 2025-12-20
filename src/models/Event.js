const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: true }
);

const budgetItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    notes: { type: String }
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, required: true },
    theme: { type: String },
    date: { type: Date, required: true },
    budget: { type: Number, required: true },
    guests: { type: Number, required: true },
    location: { type: String, required: true },
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    tasks: [taskSchema],
    budgetItems: [budgetItemSchema],
    budgetItemsTotal: { type: Number, default: 0 },
    notes: { type: String },
    favoritesSnapshot: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        name: { type: String },
        category: { type: String },
        city: { type: String },
        slug: { type: String },
        photo: { type: String }
      }
    ],
    assignedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastActivityAt: { type: Date },
    planningStep: { type: Number, default: 1, min: 1 },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['pending_assignment', 'assigned', 'draft', 'planning', 'confirmed', 'completed', 'cancelled'],
          required: true
        },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    status: {
      type: String,
      enum: ['pending_assignment', 'assigned', 'draft', 'planning', 'confirmed', 'completed', 'cancelled'],
      default: 'pending_assignment'
    },
    isPaid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

eventSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status || 'pending_assignment' });
  }
  if (Array.isArray(this.budgetItems)) {
    this.budgetItemsTotal = this.budgetItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
