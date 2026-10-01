import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(import.meta.dirname, "../src"),
      "@data": path.resolve(import.meta.dirname, "../data"),
      "@": import.meta.dirname,
      // server-only throws outside Next's server build; in tests it's a no-op.
      "server-only": path.resolve(import.meta.dirname, "test-stubs/server-only.ts"),
    },
  },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
});
