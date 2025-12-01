const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['client', 'planner', 'admin'], default: 'client' },
  avatar: { type: String },
  phone: { type: String },
  locale: { type: String, enum: ['en', 'ar'], default: 'en' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  statusUpdatedAt: { type: Date },
  statusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roleUpdatedAt: { type: Date },
  roleUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password compare method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
