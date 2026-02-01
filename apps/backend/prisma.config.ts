import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Chemin du schema Prisma
  schema: "prisma/schema.prisma",

  // Configuration migrations + seed (Prisma 7.x)
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },

  // Connexion DB (remplace datasource.url dans schema.prisma)
  datasource: {
    url: env("DATABASE_URL"),
  },
});
