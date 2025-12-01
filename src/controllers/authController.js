const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const ApiError = require('../utils/ApiError');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

exports.register = async (req, res, next) => {
  const { name, email, password, role, phone, locale } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(400, 'Email already registered');

  const user = new User({ name, email, password, role, phone, locale });

  const rawToken = crypto.randomBytes(20).toString('hex');
  user.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${user.email}`;
  const message = `<p>Verify your email by clicking <a href="${verifyUrl}">here</a></p>`;

  await sendEmail({
    to: user.email,
    subject: 'Email Verification - Planity',
    html: message
  });

  res.status(201).json({ success: true, message: 'User registered, please verify your email' });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Account is disabled');
  if (!user.isVerified) throw new ApiError(401, 'Please verify your email first');

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      locale: user.locale
    }
  });
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.updateProfile = async (req, res) => {
  const updatableFields = ['name', 'avatar', 'phone', 'locale'];

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  updatableFields.forEach(field => {
    if (typeof req.body[field] !== 'undefined') {
      if (req.body[field] === null || req.body[field] === '') {
        user[field] = undefined;
      } else {
        user[field] = req.body[field];
      }
    }
  });

  await user.save();

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      locale: user.locale
    }
  });
};

exports.sendVerifyEmail = async (req, res) => {
  const user = req.user;
  if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });

  const rawToken = crypto.randomBytes(20).toString('hex');
  user.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${user.email}`;
  const message = `<p>Verify your email by clicking <a href="${verifyUrl}">here</a></p>`;

  await sendEmail({
    to: user.email,
    subject: 'Email Verification - Planity',
    html: message
  });

  res.json({ success: true, message: 'Verification email sent' });
};

exports.verifyEmail = async (req, res) => {
  const { token, email } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email,
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: Date.now() }
  });
  if (!user) throw new ApiError(400, 'Invalid token or email');

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
};

exports.requestReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${user.email}`;
  const message = `<p>Reset your password by clicking <a href="${resetUrl}">here</a></p>`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset - Planity',
    html: message
  });

  res.json({ success: true, message: 'Password reset email sent' });
};

exports.resetPassword = async (req, res) => {
  const { token, email, newPassword } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) throw new ApiError(400, 'Invalid or expired token');

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful' });
};
