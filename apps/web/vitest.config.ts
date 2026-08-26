import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure-logic unit tests only for now (no DOM, no DB). Fast and deterministic.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
