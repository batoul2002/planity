const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, authorizeRoles } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const {
  adminUpdateUserRoleSchema,
  adminVerifyVendorSchema,
  adminUpdateUserStatusSchema,
  adminUpdateVendorStatusSchema,
  adminAssignPlannerSchema,
  adminCreatePlannerSchema,
  adminUpdatePlannerSchema,
  adminPlannerStatusSchema,
  disputeCreateSchema,
  disputeUpdateSchema,
  metaOptionCreateSchema,
  metaOptionUpdateSchema,
  metaOptionListSchema
} = require('../utils/validationSchemas');

router.use(auth, authorizeRoles('admin'));

router.get('/stats', catchAsync(adminController.getStats));
router.get('/users', catchAsync(adminController.getUsers));
router.patch(
  '/users/:userId/role',
  validateRequest(adminUpdateUserRoleSchema),
  catchAsync(adminController.updateUserRole)
);
router.patch(
  '/users/:userId/status',
  validateRequest(adminUpdateUserStatusSchema),
  catchAsync(adminController.updateUserStatus)
);
router.patch(
  '/vendors/:vendorId/verify',
  validateRequest(adminVerifyVendorSchema),
  catchAsync(adminController.verifyVendor)
);
router.patch(
  '/vendors/:vendorId/status',
  validateRequest(adminUpdateVendorStatusSchema),
  catchAsync(adminController.updateVendorStatus)
);
router.get('/vendors/pending', catchAsync(adminController.getPendingVendors));
router.get('/event-requests', catchAsync(adminController.getEventRequests));
router.post(
  '/events/:eventId/assign',
  validateRequest(adminAssignPlannerSchema),
  catchAsync(adminController.assignPlannerToEvent)
);
router.get('/events', catchAsync(adminController.getEventsOverview));
router.get('/events/:eventId', catchAsync(adminController.getEventDetailReadOnly));
router.get('/planners', catchAsync(adminController.getPlanners));
router.post(
  '/planners',
  validateRequest(adminCreatePlannerSchema),
  catchAsync(adminController.createPlanner)
);
router.patch(
  '/planners/:plannerId',
  validateRequest(adminUpdatePlannerSchema),
  catchAsync(adminController.updatePlanner)
);
router.patch(
  '/planners/:plannerId/status',
  validateRequest(adminPlannerStatusSchema),
  catchAsync(adminController.setPlannerStatus)
);
router.delete('/planners/:plannerId', catchAsync(adminController.softDeletePlanner));
router.get('/disputes', catchAsync(adminController.getDisputes));
router.post(
  '/disputes',
  validateRequest(disputeCreateSchema),
  catchAsync(adminController.createDispute)
);
router.patch(
  '/disputes/:disputeId',
  validateRequest(disputeUpdateSchema),
  catchAsync(adminController.updateDisputeStatus)
);
router.get('/reports/users', catchAsync(adminController.exportUsersCsv));
router.get('/reports/vendors', catchAsync(adminController.exportVendorsCsv));
router.get('/reports/events', catchAsync(adminController.exportEventsCsv));
router.get(
  '/content/meta-options',
  validateRequest(metaOptionListSchema, 'query'),
  catchAsync(adminController.listMetaOptions)
);
router.post(
  '/content/meta-options',
  validateRequest(metaOptionCreateSchema),
  catchAsync(adminController.createMetaOption)
);
router.patch(
  '/content/meta-options/:optionId',
  validateRequest(metaOptionUpdateSchema),
  catchAsync(adminController.updateMetaOption)
);
router.delete(
  '/content/meta-options/:optionId',
  catchAsync(adminController.deleteMetaOption)
);

module.exports = router;
