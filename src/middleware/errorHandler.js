const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const responsePayload = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = { errorHandler };
