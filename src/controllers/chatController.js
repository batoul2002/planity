const mongoose = require('mongoose');
const Message = require('../models/Message');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');

const ensureParticipant = async (eventId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, 'Invalid event id');
  }

  const event = await Event.findById(eventId).select('client planner');
  if (!event) throw new ApiError(404, 'Event not found');

  const id = userId.toString();
  const isClient = event.client?.toString() === id;
  const isPlanner = event.planner?.toString() === id;

  if (!isClient && !isPlanner) {
    throw new ApiError(403, 'You are not part of this event chat');
  }

  return event;
};

const sanitizeAttachments = (attachments = []) =>
  attachments
    .filter(att => att && att.url)
    .map(att => ({
      url: att.url,
      name: att.name,
      mimetype: att.mimetype,
      size: att.size
    }));

exports.sendMessage = async (req, res) => {
  const { eventId, attachments = [] } = req.body;
  const content = typeof req.body.content === 'string' ? req.body.content : req.body.message;
  if (!eventId) throw new ApiError(400, 'Event id is required');

  await ensureParticipant(eventId, req.user._id);

  const sanitizedAttachments = sanitizeAttachments(attachments);

  if (!content && sanitizedAttachments.length === 0) {
    throw new ApiError(400, 'Message must include text or at least one attachment');
  }

  const message = await Message.create({
    event: eventId,
    sender: req.user._id,
    content,
    attachments: sanitizedAttachments,
    reads: [{ user: req.user._id, readAt: new Date() }]
  });

  const populated = await message.populate([
    { path: 'sender', select: 'name avatar role' },
    { path: 'reads.user', select: 'name avatar role' }
  ]);

  res.status(201).json({ success: true, data: populated });
};

exports.getMessages = async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) throw new ApiError(400, 'Event ID required');

  await ensureParticipant(eventId, req.user._id);

  const messages = await Message.find({ event: eventId })
    .populate('sender', 'name avatar role')
    .populate('reads.user', 'name avatar role')
    .sort('createdAt');
  res.json({ success: true, data: messages });
};

exports.uploadAttachment = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No attachment uploaded');
  }

  const file = req.file;
  const url = `/uploads/${file.filename}`;

  res.status(201).json({
    success: true,
    data: {
      url,
      name: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }
  });
};

exports.markMessagesRead = async (req, res) => {
  const { eventId, messageIds = [] } = req.body;
  if (!eventId) throw new ApiError(400, 'Event id required');
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new ApiError(400, 'messageIds array required');
  }

  await ensureParticipant(eventId, req.user._id);
  const validMessageIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
  const now = new Date();

  const messages = await Message.find({
    _id: { $in: validMessageIds },
    event: eventId
  });

  const updates = [];
  for (const message of messages) {
    const alreadyRead = message.reads?.some(r => r.user.toString() === req.user._id.toString());
    if (!alreadyRead) {
      message.reads.push({ user: req.user._id, readAt: now });
      updates.push(message.save());
    }
  }
  await Promise.all(updates);

  res.json({
    success: true,
    data: {
      eventId,
      messageIds: validMessageIds,
      readAt: now
    }
  });
};
