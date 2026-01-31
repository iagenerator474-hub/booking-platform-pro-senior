const stripe = require("../../config/stripe");
const { APP_URL } = require("../../config/env");

async function createCheckoutSession({ email, date, time }) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: `Séance ${date} ${time}` },
          unit_amount: 6000,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${APP_URL}/success.html`,
    cancel_url: `${APP_URL}/cancel.html`,
    customer_email: email,
    metadata: { email, date, time },
  });

  // IMPORTANT: we return both url + sessionId so the DB can store a reliable link
  // between Stripe and the Booking (Stripe hardening v2.1)
  return { url: session.url, stripeSessionId: session.id };
}

module.exports = { createCheckoutSession };
