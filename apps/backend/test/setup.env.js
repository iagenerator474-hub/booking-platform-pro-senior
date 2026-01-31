// apps/backend/test/setup.env.js
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const backendRoot = path.resolve(__dirname, "..");     // apps/backend
const repoRoot = path.resolve(__dirname, "../../..");  // repo root

const candidates = [
  path.join(backendRoot, ".env.test"),
  path.join(repoRoot, ".env.test"),
  path.join(backendRoot, ".env"),
  path.join(repoRoot, ".env"),
];

for (const p of candidates) {
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

if (!process.env.DATABASE_URL) {
  throw new Error("[tests] DATABASE_URL manquante. Ajoute .env(.test) ou exporte DATABASE_URL.");
}

