const User = require('../models/User');
const catchAsync = require('../middleware/catchAsync');

exports.listUsers = catchAsync(async (_req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});
