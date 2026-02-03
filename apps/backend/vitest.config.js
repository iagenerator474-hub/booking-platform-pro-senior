import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    /**
     * 🧪 Setup global des tests
     * - charge les variables d'environnement (.env.test, DATABASE_URL, secrets factices)
     * - garantit que les tests sont reproductibles sur toute machine
     */
    setupFiles: ["./test/setup.env.js"],

    /**
     * 🔒 CRITIQUE
     * Désactive la concurrence pour éviter :
     * - races Prisma / Postgres
     * - collisions sur les données de test
     */
    sequence: {
      concurrent: false,
    },

    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
