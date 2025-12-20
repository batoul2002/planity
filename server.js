require('dotenv').config();

/* 
  Quick architecture guide (for new learners)

  - Entry point: server.js
    - Loads environment (.env), connects to MongoDB (src/config/db.js), mounts middleware, routes and starts HTTP + Socket.IO server.

  - Routes (mounted under /api/v1/*):
    - src/routes/auth.js        -> src/controllers/authController.js
    - src/routes/vendors.js     -> src/controllers/vendorController.js
    - src/routes/events.js      -> src/controllers/eventController.js
    - src/routes/chat.js        -> src/controllers/chatController.js
    - src/routes/contracts.js   -> src/controllers/contractController.js
    - src/routes/payments.js    -> src/controllers/paymentController.js
    - src/routes/meta.js        -> src/controllers/metaController.js
    - src/routes/admin.js       -> src/controllers/adminController.js
    - src/routes/upload.js      -> src/controllers/uploadController.js
    - ...more routes in src/routes/*

  - Models: src/models/*.js (User, Event, Vendor, Contract, Message, Review, Favorite, MetaOption, Dispute, ...)
    - Controllers import models to read/write MongoDB via mongoose.

  - Middleware: src/middleware/*
    - auth.js         -> verifies JWT for HTTP and Socket.IO; attaches req.user or socket.user
    - validateRequest -> validates & sanitizes input using Joi schemas (src/utils/validationSchemas.js)
    - catchAsync      -> wraps async controllers to forward errors
    - errorHandler    -> centralized JSON error responses
    - upload.js       -> multer configuration for file uploads

  - Utilities:
    - src/utils/email.js      -> nodemailer transporter and sendEmail helper
    - src/utils/ApiError.js   -> ApiError class used by controllers to send HTTP errors

  - Socket.IO flow (in server runtime):
    1. Client connects and provides token in handshake: socket.handshake.auth.token
    2. verifySocketJWT decodes token, loads user and sets socket.user
    3. Socket events:
       - 'joinRoom' -> check Event model that socket.user is client or planner, then socket.join(eventId)
       - 'sendMessage' -> ensure participant, create Message document, io.to(eventId).emit('receiveMessage', payload)

  - Common request lifecycle (example: POST /api/v1/events)
    1. Client calls route -> src/routes/events.js
    2. validateRequest (Joi) sanitizes body
    3. auth verifies JWT and sets req.user
    4. Controller (eventController.createEvent) performs business logic, saves to DB, sends emails, returns JSON
    5. Errors are thrown as ApiError or forwarded; errorHandler formats response

  - How to explore the code:
    1. Open src/routes/*.js to see endpoints and attached middleware.
    2. Follow the controller referenced by each route to learn the logic (src/controllers/*).
    3. Inspect src/models/* to see data shapes and helpful pre/post hooks.
    4. Read src/middleware/* to learn about auth, validation and error handling.

  Tip for debugging: add console.log in controllers and check server logs; use Postman or curl to hit routes; run npm run seed to create test users/vendors.

  --- End of brief guide ---
*/

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const { verifySocketJWT } = require('./src/middleware/auth');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Event = require('./src/models/Event');
const Message = require('./src/models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});
const authVerify = require('./src/routes/authVerify');
const authRoutes = require('./src/routes/auth');
const stripeWebhookHandler = require('./src/routes/stripeWebhook');
const plannerItemsRoutes = require('./src/routes/plannerItems');
const plannerItemChangesRoutes = require('./src/routes/plannerItemChanges');
const publicCatalogRoutes = require('./src/routes/publicCatalog');

// Connect to DB
connectDB();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhooks must receive the raw body for signature verification
app.post('/api/v1/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: { error: 'Too many requests, please try again later.' }
// });
// app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// Static uploads
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend from /public (serves index.html at '/')
app.use(express.static(path.join(__dirname, 'public')));

// Friendly route for extensionless email verification link
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify-email.html'));
});

// Friendly route for password reset page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Friendly routes for planner pages (without .html)
app.get(['/planner', '/planner-dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'planner-dashboard.html'));
});
app.get(['/planner/event', '/event-workspace'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'event-workspace.html'));
});

// Friendly routes for admin pages (without .html)
app.get(['/admin', '/admin-dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});
app.get(['/admin/event', '/admin-event'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-event.html'));
});

// Explicit .html admin routes
app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});
app.get('/admin-event.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-event.html'));
});

// Routes
app.use('/api/v1/auth', authVerify);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/vendors', require('./src/routes/vendors'));
app.use('/api/v1/events', require('./src/routes/events'));
app.use('/api/v1/favorites', require('./src/routes/favorites'));
app.use('/api/v1/reviews', require('./src/routes/reviews'));
app.use('/api/v1/contracts', require('./src/routes/contracts'));
app.use('/api/v1/chat', require('./src/routes/chat'));
app.use('/api/v1/admin', require('./src/routes/admin'));
app.use('/api/v1/upload', require('./src/routes/upload'));
app.use('/api/v1/payments', require('./src/routes/payments'));
app.use('/api/v1/meta', require('./src/routes/meta'));
app.use('/api/v1/planner/items', plannerItemsRoutes);
app.use('/api/v1/planner/item-requests', plannerItemChangesRoutes);
app.use('/api/v1/public', publicCatalogRoutes);
// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Error middleware
app.use(errorHandler);

// Socket.IO Authentication
io.use(async (socket, next) => {
  try {
    await verifySocketJWT(socket);
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connections
io.on('connection', (socket) => {
  const userId = socket.user._id.toString();

  const loadEventIfParticipant = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(eventId)) return null;
    const event = await Event.findById(eventId).select('client planner');
    if (!event) return null;
    const uid = socket.user._id.toString();
    const isClient = event.client?.toString() === uid;
    const isPlanner = event.planner?.toString() === uid;
    return isClient || isPlanner ? event : null;
  };

  socket.on('joinRoom', async (eventId, callback) => {
    try {
      const event = await loadEventIfParticipant(eventId);
      if (!event) {
        callback?.({ success: false, error: 'Not authorized for this event' });
        return;
      }
      socket.join(eventId);
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, error: 'Unable to join event room' });
    }
  });

  const sanitizeAttachments = (attachments = []) =>
    attachments
      .filter(att => att && att.url)
      .map(att => ({
        url: att.url,
        name: att.name,
        mimetype: att.mimetype,
        size: att.size
      }));

  socket.on('typing', async ({ eventId, isTyping }, callback) => {
    try {
      const event = await loadEventIfParticipant(eventId);
      if (!event) {
        callback?.({ success: false, error: 'Not authorized for this event' });
        return;
      }
      socket.to(eventId).emit('typing', {
        eventId,
        userId,
        isTyping: Boolean(isTyping)
      });
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, error: 'Unable to send typing status' });
    }
  });

  socket.on('sendMessage', async ({ eventId, content, message, attachments }, callback) => {
    try {
      const text = typeof content === 'string' ? content : message;
      const sanitizedAttachments = sanitizeAttachments(attachments);
      if (!eventId || (!text && sanitizedAttachments.length === 0)) {
        callback?.({ success: false, error: 'Event and message/attachment are required' });
        return;
      }

      const event = await loadEventIfParticipant(eventId);
      if (!event) {
        callback?.({ success: false, error: 'Not authorized for this event' });
        return;
      }

      const newMessage = await Message.create({
        event: eventId,
        sender: userId,
        content: text,
        attachments: sanitizedAttachments,
        reads: [{ user: socket.user._id, readAt: new Date() }]
      });

      const populated = await newMessage.populate([
        { path: 'sender', select: 'name avatar role' },
        { path: 'reads.user', select: 'name avatar role' }
      ]);

      const payload = {
        _id: populated._id,
        event: eventId,
        sender: populated.sender,
        content: populated.content,
        attachments: populated.attachments,
        createdAt: populated.createdAt,
        reads: populated.reads
      };

      io.to(eventId).emit('receiveMessage', payload);
      callback?.({ success: true, data: payload });
    } catch (err) {
      callback?.({ success: false, error: 'Unable to send message' });
    }
  });

  socket.on('messageRead', async ({ eventId, messageIds }, callback) => {
    try {
      if (!eventId || !Array.isArray(messageIds) || messageIds.length === 0) {
        callback?.({ success: false, error: 'Event and messageIds are required' });
        return;
      }

      const event = await loadEventIfParticipant(eventId);
      if (!event) {
        callback?.({ success: false, error: 'Not authorized for this event' });
        return;
      }

      const validIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (!validIds.length) {
        callback?.({ success: false, error: 'No valid message ids provided' });
        return;
      }

      const messages = await Message.find({
        _id: { $in: validIds },
        event: eventId
      });

      const now = new Date();
      const updatedIds = [];
      for (const message of messages) {
        const already = message.reads?.some(r => r.user.toString() === userId);
        if (!already) {
          message.reads.push({ user: socket.user._id, readAt: now });
          await message.save();
          updatedIds.push(message._id.toString());
        }
      }

      if (updatedIds.length) {
        io.to(eventId).emit('message:read', {
          eventId,
          messageIds: updatedIds,
          user: {
            id: userId,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          readAt: now
        });
      }
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, error: 'Unable to mark messages as read' });
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = Number(process.env.PORT) || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
