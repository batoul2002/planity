const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Event = require('../models/Event');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const sendEmail = require('../utils/email');

const ensureEventMembership = (event, user) => {
  if (!event) throw new ApiError(404, 'Event not found');

  if (user.role === 'admin') return;

  const uid = user._id.toString();
  const isClient = event.client?.toString() === uid;
  const isPlanner = event.planner?.toString() === uid;

  if (!isClient && !isPlanner) {
    throw new ApiError(403, 'You are not authorized to manage contracts for this event');
  }
};

const notifyParties = async ({ users, subject, html }) => {
  const tasks = users
    .filter(u => !!u.email)
    .map(user =>
      sendEmail({
        to: user.email,
        subject,
        html
      }).catch(() => null)
    );
  await Promise.all(tasks);
};

const populateContract = async (contract) =>
  contract
    .populate('event', 'type date client planner')
    .populate('vendor', 'name category city')
    .populate('parties', 'name email role');

exports.createContract = async (req, res) => {
  const { eventId, vendorId, parties = [], text } = req.body;
  if (!eventId || !text) throw new ApiError(400, 'Event and contract text are required');

  const event = await Event.findById(eventId).select('client planner type date vendors').lean();
  ensureEventMembership(event, req.user);

  let vendor = null;
  if (vendorId) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new ApiError(400, 'Invalid vendor id');
    }
    vendor = await Vendor.findById(vendorId).select('name');
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    if (event.vendors && event.vendors.length && !event.vendors.some(id => id.toString() === vendorId)) {
      throw new ApiError(400, 'Vendor is not assigned to this event');
    }
  }

  const uniquePartyIds = Array.from(
    new Set(
      [...parties, event.client?.toString(), event.planner?.toString()]
        .filter(Boolean)
    )
  );

  if (!uniquePartyIds.length) {
    throw new ApiError(400, 'At least one party is required');
  }

  const partyUsers = await User.find({ _id: { $in: uniquePartyIds } }).select('name email role');
  if (partyUsers.length !== uniquePartyIds.length) {
    throw new ApiError(400, 'One or more parties are invalid');
  }

  const contract = await Contract.create({
    event: eventId,
    vendor: vendor ? vendor._id : undefined,
    parties: uniquePartyIds,
    text,
    status: 'pending'
  });

  await notifyParties({
    users: partyUsers,
    subject: 'New Contract Created',
    html: `<p>A new contract has been created for event "${event.type}". Please review and sign at your earliest convenience.</p>`
  });

  const populated = await populateContract(contract);
  res.status(201).json({ success: true, data: populated });
};

exports.listContracts = async (req, res) => {
  const { eventId } = req.query;
  const query = {};

  if (eventId) {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new ApiError(400, 'Invalid event id');
    }
    query.event = eventId;
  }

  const contracts = await Contract.find(query)
    .populate('event', 'type date client planner')
    .populate('vendor', 'name category city')
    .populate('parties', 'name email role');

  const visible = contracts.filter(contract => {
    if (req.user.role === 'admin') return true;
    const uid = req.user._id.toString();
    const partyMatch = contract.parties.some(p => p._id.toString() === uid);
    const eventClient = contract.event?.client?.toString() === uid;
    const eventPlanner = contract.event?.planner?.toString() === uid;
    return partyMatch || eventClient || eventPlanner;
  });

  res.json({ success: true, data: visible });
};

exports.signContract = async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('event', 'type client planner')
    .populate('vendor', 'name')
    .populate('parties', 'name email role');
  if (!contract) throw new ApiError(404, 'Contract not found');

  const isParty = contract.parties.some(p => p._id.toString() === req.user._id.toString());
  if (!isParty) throw new ApiError(403, 'You are not authorized to sign this contract');

  contract.status = 'signed';
  contract.signedAt = new Date();
  await contract.save();

  await notifyParties({
    users: contract.parties,
    subject: 'Contract Signed',
    html: `<p>The contract for event "${contract.event?.type || ''}" has been signed.</p>`
  });

  res.json({ success: true, data: contract });
};
