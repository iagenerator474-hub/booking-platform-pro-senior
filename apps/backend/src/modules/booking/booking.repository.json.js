const { readAll, writeAll } = require("./booking.model");

function list() {
  return readAll();
}

function createPending({ firstName, lastName, email, date, time }) {
  const items = readAll();
  const booking = { firstName, lastName, email, date, time, status: "en attente" };
  items.push(booking);
  writeAll(items);
  return booking;
}

function markPaidByMetadata({ email, date, time }) {
  const items = readAll();
  const found = items.find((r) => r.email === email && r.date === date && r.time === time);
  if (!found) return null;

  found.status = "payé";
  writeAll(items);
  return found;
}

module.exports = { list, createPending, markPaidByMetadata };
