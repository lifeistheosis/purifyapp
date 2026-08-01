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
  "components/today/**/*.tsx",
  "components/calendar/**/*.tsx",
  "components/fasting/**/*.tsx",
  "components/prayers/**/*.tsx",
  "components/discover/**/*.tsx",
  "app/(app)/prayers/**/*.tsx",
  "components/bible/**/*.tsx",
  "app/(app)/bible/**/*.tsx",
  "components/saints/**/*.tsx",
  "app/(app)/saints/**/*.tsx",
  "app/(app)/councils/**/*.tsx",
  "app/(app)/history/**/*.tsx",
  "app/(app)/theology/**/*.tsx",
  "app/(app)/topics/**/*.tsx",
  "app/(app)/apologetics/**/*.tsx",
  "app/(app)/heresies/**/*.tsx",
  "app/(app)/discover/**/*.tsx",
  "app/(app)/reading/**/*.tsx",
  "app/(app)/saved/**/*.tsx",
  "app/(app)/florilegium/**/*.tsx",
  "app/(app)/trapeza/**/*.tsx",
  "app/(app)/account/**/*.tsx",
  "app/(auth)/**/*.tsx",
  "app/(app)/premium/**/*.tsx",
  "app/(app)/pricing/**/*.tsx",
  "app/(app)/plan/**/*.tsx",
  "app/(app)/whats-new/**/*.tsx",
  "app/(app)/faq/**/*.tsx",
  "app/(app)/about/**/*.tsx",
  "app/(app)/support/**/*.tsx",
  "components/profile/**/*.tsx",
  "components/account/**/*.tsx",
  "components/premium/**/*.tsx",
  "components/onboarding/**/*.tsx",
  "components/pwa/**/*.tsx",
  "components/mobile/**/*.tsx",
  "app/(app)/shop/**/*.tsx",
  "app/(app)/campaigns/**/*.tsx",
  "components/shop/**/*.tsx",
  "components/campaigns/**/*.tsx",
  "components/gifts/**/*.tsx",
  "components/marketing/**/*.tsx",
  "components/reader/**/*.tsx",
  "components/ui/**/*.tsx",
  "components/native/**/*.tsx",
  "components/analytics/**/*.tsx",
  "components/feature/**/*.tsx",
  "components/content/**/*.tsx",
  "components/history/**/*.tsx",
  "components/florilegium/**/*.tsx",
  "components/theology/**/*.tsx",
  "components/saved/**/*.tsx",
  "components/reading/**/*.tsx",
  "components/trapeza/**/*.tsx",
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
                  "·", "•", "|", "/", "(", ")", ":", "%", "©", "↗", "‹", "›", "→", "←", ".", "✦", "…", "+", "×", "▾", "★", "☆", "← →", "⌕", "⇤", "⇥", "↑", "“", "”.", "Orthodox Study Bible", "?", "✓", "✎", "†", "&rdquo;", "&ldquo;", "&rsquo;", "~", "–", "✕", "☩",
                  // Brand names and social handles never translate.
                  "Purify", "Purify Pro", "Purify Plus", "A", "a", "@purifymylife", "@purify.app",
                ],
                ignoreProps: true,
              },
            ],
          },
        },
      ];

// Web-only English-by-design surfaces: seller console, admin, and the
// language-editor recruitment page are out of the i18n ratchet.
const i18nRatchetExempt = [
  {
    files: [
      "app/(app)/shop/seller/**/*.tsx",
      "app/admin/**/*.tsx",
      "app/(app)/language-editor/**/*.tsx",
    ],
    rules: { "react/jsx-no-literals": "off" },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsxA11yRecommended,
  ...i18nRatchet,
  ...i18nRatchetExempt,
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
