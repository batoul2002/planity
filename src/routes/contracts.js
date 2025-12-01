const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { auth } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const validateRequest = require('../middleware/validateRequest');
const { contractCreateSchema, contractQuerySchema } = require('../utils/validationSchemas');

router.get(
  '/',
  auth,
  validateRequest(contractQuerySchema, 'query'),
  catchAsync(contractController.listContracts)
);
router.post('/', auth, validateRequest(contractCreateSchema), catchAsync(contractController.createContract));
router.patch('/:id/sign', auth, catchAsync(contractController.signContract));

module.exports = router;
