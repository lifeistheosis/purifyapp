import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next already registers the `jsx-a11y` plugin, so we can't
// re-register via jsxA11y.flatConfigs.recommended. Instead, apply the
// plugin's recommended ruleset directly. We rely on this + axe-core in the
// Playwright smoke suite as the two layers that keep a11y from regressing.
const jsxA11yRecommended = {
  files: ["**/*.{ts,tsx,js,jsx}"],
  rules: jsxA11y.configs.recommended.rules,
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsxA11yRecommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tests and Lighthouse reports.
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
  ]),
]);

export default eslintConfig;
