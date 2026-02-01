const userRepo = require("./user.repository.db");

async function findByEmail(email) {
  return userRepo.findActiveByEmail(email);
}

module.exports = { findByEmail };

