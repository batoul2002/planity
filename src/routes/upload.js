const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { auth, authorizeRoles } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');
const catchAsync = require('../middleware/catchAsync');

router.post(
  '/',
  auth,
  authorizeRoles('client', 'planner', 'admin'),
  upload.array('images', 10),
  catchAsync(uploadController.uploadImages)
);

module.exports = router;
