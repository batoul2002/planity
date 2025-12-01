const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth, authorizeRoles } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const {
  eventCreateSchema,
  eventUpdateDetailsSchema,
  eventAssignPlannerSchema,
  eventStatusSchema,
  eventPlanningStepSchema,
  eventTaskCreateSchema,
  eventTaskUpdateSchema,
  eventVendorSchema,
  eventRescheduleSchema,
  eventBudgetSchema,
  eventCalendarQuerySchema
} = require('../utils/validationSchemas');

router.get(
  '/calendar',
  auth,
  authorizeRoles('planner', 'admin'),
  validateRequest(eventCalendarQuerySchema, 'query'),
  catchAsync(eventController.getCalendar)
);

router.post(
  '/',
  auth,
  validateRequest(eventCreateSchema),
  catchAsync(eventController.createEvent)
);
router.get('/mine', auth, catchAsync(eventController.getMyEvents));
router.patch(
  '/:id/details',
  auth,
  validateRequest(eventUpdateDetailsSchema),
  catchAsync(eventController.updateEventDetails)
);
router.patch(
  '/:id/assign-planner',
  auth,
  authorizeRoles('planner', 'admin'),
  validateRequest(eventAssignPlannerSchema),
  catchAsync(eventController.assignPlanner)
);
router.patch(
  '/:id/status',
  auth,
  validateRequest(eventStatusSchema),
  catchAsync(eventController.updateStatus)
);
router.patch(
  '/:id/reschedule',
  auth,
  validateRequest(eventRescheduleSchema),
  catchAsync(eventController.rescheduleEvent)
);
router.patch(
  '/:id/planning-step',
  auth,
  validateRequest(eventPlanningStepSchema),
  catchAsync(eventController.updatePlanningStep)
);
router.post(
  '/:id/tasks',
  auth,
  validateRequest(eventTaskCreateSchema),
  catchAsync(eventController.addTask)
);
router.patch(
  '/:id/tasks/:taskId',
  auth,
  validateRequest(eventTaskUpdateSchema),
  catchAsync(eventController.updateTask)
);
router.delete('/:id/tasks/:taskId', auth, catchAsync(eventController.removeTask));
router.post(
  '/:id/vendors',
  auth,
  validateRequest(eventVendorSchema),
  catchAsync(eventController.addVendor)
);
router.delete('/:id/vendors/:vendorId', auth, catchAsync(eventController.removeVendor));
router.get('/:id/budget', auth, catchAsync(eventController.getBudget));
router.put(
  '/:id/budget',
  auth,
  validateRequest(eventBudgetSchema),
  catchAsync(eventController.updateBudget)
);

module.exports = router;
