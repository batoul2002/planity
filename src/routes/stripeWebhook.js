const Stripe = require('stripe');
const Event = require('../models/Event');
const Contract = require('../models/Contract');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  if (!webhookSecret) {
    console.warn('Stripe webhook secret not configured; ignoring webhook.');
    return res.status(200).json({ received: true });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing Stripe signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentIntent = event.data?.object;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const referenceType = paymentIntent?.metadata?.referenceType;
        const referenceId = paymentIntent?.metadata?.referenceId;

        if (referenceType === 'event' && referenceId) {
          await Event.findByIdAndUpdate(referenceId, { isPaid: true });
        } else if (referenceType === 'contract' && referenceId) {
          await Contract.findByIdAndUpdate(referenceId, { isPaid: true });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const referenceType = paymentIntent?.metadata?.referenceType;
        const referenceId = paymentIntent?.metadata?.referenceId;

        if (referenceType === 'event' && referenceId) {
          await Event.findByIdAndUpdate(referenceId, { isPaid: false });
        } else if (referenceType === 'contract' && referenceId) {
          await Contract.findByIdAndUpdate(referenceId, { isPaid: false });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Error handling Stripe webhook:', err);
    return res.status(500).send('Internal server error processing webhook');
  }

  res.status(200).json({ received: true });
};
