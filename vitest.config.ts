import { defineConfig } from "vitest/config";

// Only the exercise's own tests. The demo app in web/ has its own test setup.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
