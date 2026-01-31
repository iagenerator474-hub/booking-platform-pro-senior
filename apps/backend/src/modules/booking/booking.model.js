const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "data", "bookings.json");

function readAll() {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeAll(items) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
}

module.exports = { readAll, writeAll, filePath };
