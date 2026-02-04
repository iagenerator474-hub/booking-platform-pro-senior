const storageDriver = (process.env.STORAGE_DRIVER || "json").toLowerCase();

// Repositories
const jsonRepo = require("./booking.model");
const dbRepo = require("./booking.repository.db");

// JSON repository adapter (same signatures)
function jsonList() {
  return jsonRepo.readAll();
}
function jsonCreatePending({ firstName, lastName, email, date, time, stripeSessionId }) {
  if (!firstName || !lastName || !email || !date || !time) {
    const err = new Error("Données manquantes");
    err.status = 400;
    throw err;
  }
  const items = jsonRepo.readAll();
  const booking = {
    id: `json_${Date.now()}`,
    firstName,
    lastName,
    email,
    date,
    time,
    status: "en attente",
    createdAt: new Date().toISOString(),
    amountTotal: null,
    currency: null,
    stripeSessionId: stripeSessionId || null,
  };
  items.push(booking);
  jsonRepo.writeAll(items);
  return booking;
}

function jsonFindByStripeSessionId(_stripeSessionId) {
  // JSON storage doesn't have a reliable Stripe linkage; keep null
  return null;
}

function jsonMarkPaidById(id) {
  const items = jsonRepo.readAll();
  const found = items.find((r) => r.id === id);
  if (!found) return null;
  found.status = "payé";
  jsonRepo.writeAll(items);
  return found;
}
function jsonMarkPaidByMetadata({ email, date, time }) {
  const items = jsonRepo.readAll();
  const found = items.find((r) => r.email === email && r.date === date && r.time === time);
  if (!found) return null;
  found.status = "payé";
  jsonRepo.writeAll(items);
  return found;
}

function jsonAttachStripeSessionIdById({ id, stripeSessionId }) {
  const items = jsonRepo.readAll();
  const found = items.find((r) => r.id === id);
  if (!found) return null;
  found.stripeSessionId = stripeSessionId || null;
  jsonRepo.writeAll(items);
  return found;
}

function getRepo() {
  if (storageDriver === "db") return dbRepo;
  return {
    list: jsonList,
    createPending: jsonCreatePending,
    markPaidByMetadata: jsonMarkPaidByMetadata,
    findByStripeSessionId: jsonFindByStripeSessionId,
    markPaidById: jsonMarkPaidById,
    attachStripeSessionIdById: jsonAttachStripeSessionIdById,
  };
}

module.exports = getRepo();
