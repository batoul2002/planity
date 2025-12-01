const ApiError = require('../utils/ApiError');

const validateRequest = (schema, property = 'body') => (req, res, next) => {
  const data = req[property];
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    return next(new ApiError(400, error.details.map(d => d.message).join(', ')));
  }
  req[property] = value;
  next();
};

module.exports = validateRequest;
