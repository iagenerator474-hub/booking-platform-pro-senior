const Stripe = require("stripe");
const { STRIPE_SECRET_KEY } = require("./env");

module.exports = new Stripe(STRIPE_SECRET_KEY);
