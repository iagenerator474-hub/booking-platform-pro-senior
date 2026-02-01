const counters = {
  webhook_received: 0,
  webhook_invalid_signature: 0,
  webhook_ignored_duplicate: 0,
  webhook_booking_paid: 0,
};

function inc(name) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) {
    counters[name] += 1;
  }
}

function snapshot() {
  return { ...counters };
}

module.exports = { inc, snapshot };
