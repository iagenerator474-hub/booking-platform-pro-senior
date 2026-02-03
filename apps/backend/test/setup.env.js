// apps/backend/test/setup.env.js
//
// Chargé automatiquement par Vitest (via setupFiles).
// Objectif : garantir des tests reproductibles, indépendants
// de l'environnement local de la machine.

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Racines explicites (lisibilité > magie)
const backendRoot = path.resolve(__dirname, "..");        // apps/backend
const repoRoot = path.resolve(__dirname, "../../..");     // repo root

/**
 * Ordre de priorité volontaire :
 * 1. .env.test (backend)
 * 2. .env.test (repo)
 * 3. .env (backend)
 * 4. .env (repo)
 *
 * 👉 Le premier trouvé gagne.
 */
const candidates = [
  path.join(backendRoot, ".env.test"),
  path.join(repoRoot, ".env.test"),
  path.join(backendRoot, ".env"),
  path.join(repoRoot, ".env"),
];

for (const filePath of candidates) {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
    break;
  }
}

/**
 * Support explicite de DATABASE_URL_TEST
 * (pratique en CI ou pour isoler les tests localement)
 */
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

/**
 * Garde-fou : les tests ne démarrent jamais
 * sans DATABASE_URL valide.
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "[tests] DATABASE_URL manquante. " +
      "Ajoute un fichier .env(.test) ou définis DATABASE_URL(_TEST)."
  );
}
