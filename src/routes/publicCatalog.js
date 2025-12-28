const express = require('express');
const router = express.Router();
const PlannerItem = require('../models/PlannerItem');
const catchAsync = require('../middleware/catchAsync');

router.get('/planner-items', catchAsync(async (req, res) => {
  const { service, eventType, category, status } = req.query || {};
  const normalizedStatus = (status || '').toString().toLowerCase();
  const allowedStatuses = new Set(['approved', 'deleted']);
  const filter = { status: allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'approved' };
  if (service) filter.service = service;
  if (eventType) filter.eventType = eventType;
  if (category) filter.category = category;
  const items = await PlannerItem.find(filter)
    .sort('-createdAt')
    .select('title service eventType category priceMin priceMax image description status source clientKey');
  res.json({ success: true, data: items });
}));

module.exports = router;
