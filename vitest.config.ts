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
    // Nineteen of these suites are data-integrity checks that walk and parse
    // the content corpus synchronously. interlinearData alone reads over 1,300
    // files and commentaryIntegrity reads 435 more. Vitest's 5000ms default
    // does not fit that on a loaded machine, and on Windows several failed in
    // roughly two runs out of three: always pure timeouts, never a real
    // offender.
    //
    // That is worse than slow. A suite that is red for no reason trains you to
    // ignore red, so a genuine regression gets waved through as "the flaky
    // one", and ci.yml runs on main, so it can fail a deploy for nothing.
    //
    // 30s is chosen to be generous for the corpus while still failing a
    // genuinely hung test in reasonable time. Raise it if the corpus outgrows
    // it; do not solve a timeout by checking less.
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
