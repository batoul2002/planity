const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const { paymentIntentSchema, paymentStatusSchema } = require('../utils/validationSchemas');

router.post(
  '/intent',
  auth,
  validateRequest(paymentIntentSchema),
  catchAsync(paymentController.createPaymentIntent)
);
router.post(
  '/status',
  auth,
  validateRequest(paymentStatusSchema),
  catchAsync(paymentController.setPaymentStatus)
);

module.exports = router;
