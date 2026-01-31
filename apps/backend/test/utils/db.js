const prismaModule = require("../../src/infra/prisma");

// supporte: module.exports = prismaClient  OU  module.exports = { prisma: prismaClient }
const prisma = prismaModule?.prisma ?? prismaModule;

async function dbReset() {
  // FK-safe: delete child first
  await prisma.paymentEvent.deleteMany({});
  await prisma.booking.deleteMany({});
}

module.exports = { prisma, dbReset };
