import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    // 🔒 CRITIQUE : éviter les races DB entre tests
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
