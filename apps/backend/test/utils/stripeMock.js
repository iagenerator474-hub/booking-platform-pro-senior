function makeCheckoutCompletedEvent({ stripeEventId, stripeSessionId }) {
  return {
    id: stripeEventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: stripeSessionId
      }
    }
  };
}

module.exports = { makeCheckoutCompletedEvent };
