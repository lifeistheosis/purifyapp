// Message catalog loader (v6.4 PRD §2).
//
// Flat-key JSON catalogs under lib/i18n/messages/{locale}.json. Server
// components call getMessages(locale) once; client components receive
// their slice via a MessagesProvider mounted in the locale layout when
// the route restructure ships.
//
// Until the App Router locale segment is in place, this helper is
// callable but unused on the live site. It exists so contributors
// adding strings during the v6.4 cycle can extract them into the
// catalog incrementally rather than as one big PR later.

import "server-only";
import { DEFAULT_LOCALE, type LocaleCode, resolveLocale } from "./locales";

/** Flat-key catalog. Nested keys use dot notation: "nav.home". */
export type Messages = Record<string, string>;

/**
 * Static map of catalog imports. JSON imports are erased to plain
 * Records by TypeScript so this gives us a type-safe sync table the
 * Edge runtime can serve without filesystem access.
 */
const CATALOGS: Record<LocaleCode, Messages> = {
  // The dynamic require avoids forcing every catalog into the client
  // bundle at build time. Server components get the file they need.
  en: require("./messages/en.json"),
  es: require("./messages/es.json"),
  el: require("./messages/el.json"),
  ru: require("./messages/ru.json"),
};

/** Get the message catalog for a locale, falling back to English. */
export function getMessages(input: string | null | undefined): Messages {
  const code = resolveLocale(input);
  return CATALOGS[code] ?? CATALOGS[DEFAULT_LOCALE];
}

/** Look up a single key. Returns the key itself on miss (loud failure). */
export function t(messages: Messages, key: string): string {
  return messages[key] ?? key;
}
