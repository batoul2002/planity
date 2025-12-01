const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');
const upload = require('../middleware/upload');

router.post('/', auth, catchAsync(chatController.sendMessage));
router.get('/', auth, catchAsync(chatController.getMessages));
router.post(
  '/attachments',
  auth,
  upload.single('attachment'),
  catchAsync(chatController.uploadAttachment)
);
router.post('/read', auth, catchAsync(chatController.markMessagesRead));

module.exports = router;
