const counters = {
  received: 0,
  duplicates: 0,
  errors: 0,
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
