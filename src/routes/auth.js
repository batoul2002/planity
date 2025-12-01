const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const catchAsync = require('../middleware/catchAsync');
const {
  registerSchema,
  loginSchema,
  profileUpdateSchema
} = require('../utils/validationSchemas');
const authController = require('../controllers/authController');

router.post('/register', validateRequest(registerSchema), catchAsync(authController.register));
router.post('/login', validateRequest(loginSchema), catchAsync(authController.login));
router.get('/me', auth, catchAsync(authController.getMe));
router.patch('/profile', auth, validateRequest(profileUpdateSchema), catchAsync(authController.updateProfile));
router.post('/request-reset', catchAsync(authController.requestReset));
router.post('/reset-password', catchAsync(authController.resetPassword));
router.post('/send-verify', auth, catchAsync(authController.sendVerifyEmail));
router.post('/verify-email', catchAsync(authController.verifyEmail));
router.get('/', (req, res) => res.json({ ok: true }));
module.exports = router;
