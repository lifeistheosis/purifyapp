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

// i18n extraction ratchet (Beta 2.3): directories whose UI strings are
// fully extracted to lib/i18n/messages get jsx-no-literals so hardcoded
// English cannot creep back in. Grows one surface at a time in lockstep
// with CONVERTED_DIRS in scripts/i18n-check.mjs. Short punctuation-only
// literals are allowed; real copy must come from useTranslate()/t().
const I18N_CONVERTED_GLOBS = [
  "components/layout/**/*.tsx",
  "components/nav/**/*.tsx",
  "components/i18n/**/*.tsx",
];

const i18nRatchet =
  I18N_CONVERTED_GLOBS.length === 0
    ? []
    : [
        {
          files: I18N_CONVERTED_GLOBS,
          rules: {
            "react/jsx-no-literals": [
              "error",
              {
                noStrings: true,
                allowedStrings: [
                  "·", "•", "|", "/", "(", ")", ":", "%", "©", "↗", "‹", "›", "→", "←", ".",
                  // Brand names and social handles never translate.
                  "Purify", "@purifymylife", "@purify.app",
                ],
                ignoreProps: true,
              },
            ],
          },
        },
      ];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsxA11yRecommended,
  ...i18nRatchet,
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
    // Generated Capacitor web assets (copies of the exported site that
    // `npx cap sync` drops into the native shells) — not source.
    "android/app/src/main/assets/**",
    "ios/App/App/public/**",
  ]),
]);

export default eslintConfig;
