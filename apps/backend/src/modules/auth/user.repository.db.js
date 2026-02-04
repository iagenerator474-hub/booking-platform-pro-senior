const { prisma } = require("../../infra/prisma");

function findActiveByEmail(email) {
  return prisma.user.findFirst({
    where: { email, isActive: true },
  });
}

module.exports = { findActiveByEmail };
