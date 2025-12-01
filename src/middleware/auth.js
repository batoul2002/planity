const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) throw new ApiError(401, 'Authorization token missing');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) throw new ApiError(401, 'User not found');
    if (!user.isActive) return next(new ApiError(403, 'Account disabled'));

    req.user = user;
    next();
  } catch (err) {
    next(new ApiError(401, 'Unauthorized: Invalid token'));
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Access denied'));
  }
  next();
};

// Socket.IO JWT verification
const verifySocketJWT = async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error('No token provided');

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Account disabled');
  socket.user = user;
};

module.exports = { auth, authorizeRoles, verifySocketJWT };
