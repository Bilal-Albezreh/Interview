import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
      "@": __dirname,
      // server-only throws outside Next's server build; in tests it's a no-op.
      "server-only": path.resolve(__dirname, "test-stubs/server-only.ts"),
    },
  },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
});
