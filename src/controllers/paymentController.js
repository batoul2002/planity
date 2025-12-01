const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Event = require('../models/Event');
const Contract = require('../models/Contract');
const ApiError = require('../utils/ApiError');

const equalsObjectId = (a, b) => (a && b ? a.toString() === b.toString() : false);

const hasEventAccess = (eventDoc, user) => {
  if (!eventDoc) return false;
  if (user.role === 'admin') return true;
  if (equalsObjectId(eventDoc.client, user._id)) return true;
  if (equalsObjectId(eventDoc.planner, user._id)) return true;
  return false;
};

const hasContractAccess = (contractDoc, user) => {
  if (!contractDoc) return false;
  if (user.role === 'admin') return true;
  if (contractDoc.parties?.some((party) => equalsObjectId(party, user._id))) return true;
  if (contractDoc.event && hasEventAccess(contractDoc.event, user)) return true;
  return false;
};

exports.createPaymentIntent = async (req, res) => {
  const { amount, currency = 'usd', referenceType, referenceId, description } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  const metadata = {
    userId: req.user._id.toString()
  };

  if (referenceType && referenceId) {
    if (referenceType === 'event') {
      const event = await Event.findById(referenceId).select('client planner');
      if (!event) throw new ApiError(404, 'Event not found for payment intent');
      if (!hasEventAccess(event, req.user)) {
        throw new ApiError(403, 'You are not authorized to create a payment for this event');
      }
    } else if (referenceType === 'contract') {
      const contract = await Contract.findById(referenceId)
        .select('parties event')
        .populate('event', 'client planner');
      if (!contract) throw new ApiError(404, 'Contract not found for payment intent');
      if (!hasContractAccess(contract, req.user)) {
        throw new ApiError(403, 'You are not authorized to create a payment for this contract');
      }
    } else {
      throw new ApiError(400, 'Unsupported reference type');
    }

    metadata.referenceType = referenceType;
    metadata.referenceId = referenceId;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency,
    description,
    metadata
  });

  res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
};

exports.setPaymentStatus = async (req, res) => {
  const { referenceType, referenceId, paid } = req.body;

  if (referenceType === 'event') {
    const event = await Event.findById(referenceId).select('client planner isPaid');
    if (!event) throw new ApiError(404, 'Event not found');
    if (!hasEventAccess(event, req.user)) {
      throw new ApiError(403, 'You are not authorized to update payment status for this event');
    }
    event.isPaid = paid;
    await event.save();
    return res.json({ success: true, data: { type: 'event', id: event._id, isPaid: event.isPaid } });
  }

  if (referenceType === 'contract') {
    const contract = await Contract.findById(referenceId)
      .select('parties event isPaid')
      .populate('event', 'client planner');
    if (!contract) throw new ApiError(404, 'Contract not found');
    if (!hasContractAccess(contract, req.user)) {
      throw new ApiError(403, 'You are not authorized to update payment status for this contract');
    }
    contract.isPaid = paid;
    await contract.save();
    return res.json({ success: true, data: { type: 'contract', id: contract._id, isPaid: contract.isPaid } });
  }

  throw new ApiError(400, 'Unsupported reference type');
};
