const counters = {
  webhook_received: 0,
  webhook_invalid_signature: 0,
  webhook_ignored_duplicate: 0,
  webhook_booking_paid: 0,

  // ✅ New: useful in prod when booking creation & webhook timing are out of sync
  webhook_no_booking: 0,
};

function inc(name) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) {
    counters[name] += 1;
    return true;
  }

  // Optionnel: ne casse pas, mais aide si typo de counter
  // (tu peux commenter si tu veux zéro bruit)
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn(`[webhookCounters] unknown counter: ${name}`);
  }
  return false;
}

function snapshot() {
  return { ...counters };
}

module.exports = { inc, snapshot };
