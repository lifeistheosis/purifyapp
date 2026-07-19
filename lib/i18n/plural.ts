// CLDR plural resolution (Beta 2.3 language patch).
//
// The original tn() picked ".singular" for count === 1 and ".plural"
// otherwise, which is wrong for most of the new locales (Russian and
// Polish need one/few/many, Arabic has six categories, Indonesian has
// one). This module resolves the CLDR category via Intl.PluralRules and
// keeps the legacy two-form keys working so existing en/de catalogs need
// no renames.
//
// Isomorphic on purpose: imported by both the server catalog loader
// (lib/i18n/index.ts) and the client <MessagesProvider>. No server-only.

import type { LocaleCode } from "./locales";

type Messages = Record<string, string>;

const rulesCache = new Map<LocaleCode, Intl.PluralRules | null>();

/** CLDR plural category ("one" | "two" | "few" | "many" | "zero" | "other"). */
export function pluralSuffix(locale: LocaleCode, count: number): string {
  let rules = rulesCache.get(locale);
  if (rules === undefined) {
    try {
      rules = new Intl.PluralRules(locale);
    } catch {
      rules = null;
    }
    rulesCache.set(locale, rules);
  }
  if (!rules) return count === 1 ? "one" : "other";
  return rules.select(count);
}

/**
 * Resolve a plural key against a catalog. Lookup order:
 *   1. `${keyBase}.${cldrCategory}`   (new-style keys)
 *   2. `${keyBase}.singular|plural`   (legacy two-form keys; "one" maps
 *      to singular, every other category to plural)
 *   3. `${keyBase}.other`             (CLDR's universal fallback)
 *   4. keyBase itself                 (loud failure, mirrors t())
 */
export function resolvePluralKey(
  messages: Messages,
  keyBase: string,
  count: number,
  locale: LocaleCode,
): string {
  const category = pluralSuffix(locale, count);
  const exact = messages[`${keyBase}.${category}`];
  if (exact !== undefined) return exact;
  const legacy = messages[`${keyBase}.${category === "one" ? "singular" : "plural"}`];
  if (legacy !== undefined) return legacy;
  const other = messages[`${keyBase}.other`];
  if (other !== undefined) return other;
  return messages[keyBase] ?? keyBase;
}

/** Replace `{placeholder}` tokens in a resolved message value. */
export function interpolate(
  value: string,
  replacements?: Record<string, string | number>,
): string {
  if (!replacements) return value;
  let out = value;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return out;
}
