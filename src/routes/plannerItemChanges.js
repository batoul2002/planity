const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const { plannerItemChangeCreateSchema, plannerItemChangeDecisionSchema } = require('../utils/validationSchemas');
const controller = require('../controllers/plannerItemChangeController');

router.post('/', auth, authorizeRoles('planner', 'admin'), validateRequest(plannerItemChangeCreateSchema), catchAsync(controller.submitChange));

router.get('/', auth, authorizeRoles('admin'), catchAsync(controller.listChanges));

router.patch('/:id/approve', auth, authorizeRoles('admin'), validateRequest(plannerItemChangeDecisionSchema), catchAsync(controller.approveChange));
router.patch('/:id/reject', auth, authorizeRoles('admin'), validateRequest(plannerItemChangeDecisionSchema), catchAsync(controller.rejectChange));

module.exports = router;
