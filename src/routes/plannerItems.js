const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const { plannerItemCreateSchema, plannerItemUpdateSchema } = require('../utils/validationSchemas');
const plannerItemController = require('../controllers/plannerItemController');

router.use(auth, authorizeRoles('planner', 'admin'));

router.get('/', catchAsync(plannerItemController.listMyItems));
router.post('/', validateRequest(plannerItemCreateSchema), catchAsync(plannerItemController.createItem));
router.patch('/:id', validateRequest(plannerItemUpdateSchema), catchAsync(plannerItemController.updateItem));
router.delete('/:id', catchAsync(plannerItemController.deleteItem));

module.exports = router;
