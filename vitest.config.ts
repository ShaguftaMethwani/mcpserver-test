import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/google-api.test.ts"], // real API tests excluded by default
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/scripts/**"],
    },
  },
  resolve: {
    // allow importing .ts files with .js extensions (ESM compatibility)
    extensions: [".ts", ".js"],
  },
});
