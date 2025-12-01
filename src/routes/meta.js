const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const catchAsync = require('../middleware/catchAsync');

router.get('/event-types', catchAsync(metaController.getEventTypes));
router.get('/service-categories', catchAsync(metaController.getServiceCategories));
router.get('/home-banners', catchAsync(metaController.getHomeBanners));

module.exports = router;