const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function findActiveByEmail(email) {
  return prisma.user.findFirst({
    where: { email, isActive: true },
  });
}

module.exports = { findActiveByEmail };
