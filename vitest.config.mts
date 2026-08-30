import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Next.js provides "server-only" at build time; stub it for Node tests.
      "server-only": resolve(__dirname, "./tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
