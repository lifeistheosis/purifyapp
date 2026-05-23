import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal Vitest config. We test pure-function libraries (lib/**) only —
// React component testing happens through Playwright + axe in the smoke
// suite. Node environment keeps startup fast; the `@/` alias matches
// the tsconfig.json `paths` mapping so test files can import lib modules
// the same way the app does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
