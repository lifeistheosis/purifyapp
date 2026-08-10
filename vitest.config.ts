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
    // Several suites are data-integrity checks that walk and parse the content
    // corpus synchronously. interlinearData reads over 1,300 files. Vitest's
    // 5000ms default does not fit that on a loaded machine, and on Windows it
    // failed in roughly one run in three: always a pure timeout, never a real
    // offender. A suite that is red for no reason trains you to ignore red, and
    // ci.yml runs on main, so it can fail a deploy for nothing.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js supplies the `server-only` marker module at build time; it
      // isn't installed as a package, so modules that import it (e.g.
      // lib/shop/catalog.ts) need this empty stand-in under Vitest.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
