const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { auth, authorizeRoles } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const {
  vendorCreateSchema,
  vendorUpdateSchema,
  vendorPhotoDeleteSchema
} = require('../utils/validationSchemas');

router.post(
  '/',
  auth,
  authorizeRoles('planner', 'admin'),
  validateRequest(vendorCreateSchema),
  catchAsync(vendorController.createVendor)
);
router.get('/', catchAsync(vendorController.getVendors));
router.get('/recommendations', catchAsync(vendorController.getRecommendations));
router.get('/:id', catchAsync(vendorController.getVendorById));
router.patch(
  '/:id',
  auth,
  authorizeRoles('planner', 'admin'),
  validateRequest(vendorUpdateSchema),
  catchAsync(vendorController.updateVendor)
);
router.delete(
  '/:id',
  auth,
  authorizeRoles('planner', 'admin'),
  catchAsync(vendorController.deleteVendor)
);
router.delete(
  '/:id/photos',
  auth,
  authorizeRoles('planner', 'admin'),
  validateRequest(vendorPhotoDeleteSchema, 'query'),
  catchAsync(vendorController.removePhoto)
);

module.exports = router;
