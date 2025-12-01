const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');

router.post('/', auth, catchAsync(reviewController.createReview));

module.exports = router;