// src/routes/authVerify.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User'); // adjust path if needed

router.get('/verify', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ success: false, error: 'Missing token' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashed,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;