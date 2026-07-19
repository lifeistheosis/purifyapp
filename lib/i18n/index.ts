// Message catalog loader (v6.4.1, full UI translation patch).
//
// Flat-key JSON catalogs under lib/i18n/messages/{locale}.json. Server
// components call getMessages(locale) once; client components receive
// their slice via the <MessagesProvider> mounted in the root layout.

import "server-only";
import { DEFAULT_LOCALE, type LocaleCode, resolveLocale } from "./locales";
import { interpolate, resolvePluralKey } from "./plural";

/** Flat-key catalog. Nested keys use dot notation: "nav.home". */
export type Messages = Record<string, string>;

import en from "./messages/en.json";
import es from "./messages/es.json";
import ro from "./messages/ro.json";
import el from "./messages/el.json";
import ru from "./messages/ru.json";
import fr from "./messages/fr.json";
import de from "./messages/de.json";
import sr from "./messages/sr.json";
import uk from "./messages/uk.json";
import it from "./messages/it.json";
import pt from "./messages/pt.json";
import bg from "./messages/bg.json";
import ar from "./messages/ar.json";
import fil from "./messages/fil.json";
import tr from "./messages/tr.json";
import ka from "./messages/ka.json";
import hu from "./messages/hu.json";
import id from "./messages/id.json";
import ne from "./messages/ne.json";
import pl from "./messages/pl.json";
import ur from "./messages/ur.json";

const CATALOGS: Record<LocaleCode, Messages> = {
  en: en as Messages,
  es: es as Messages,
  ro: ro as Messages,
  el: el as Messages,
  ru: ru as Messages,
  fr: fr as Messages,
  de: de as Messages,
  sr: sr as Messages,
  uk: uk as Messages,
  it: it as Messages,
  pt: pt as Messages,
  bg: bg as Messages,
  ar: ar as Messages,
  fil: fil as Messages,
  tr: tr as Messages,
  ka: ka as Messages,
  hu: hu as Messages,
  id: id as Messages,
  ne: ne as Messages,
  pl: pl as Messages,
  ur: ur as Messages,
};

/** Get the message catalog for a locale, falling back to English. */
export function getMessages(input: string | null | undefined): Messages {
  const code = resolveLocale(input);
  // Merge English under the locale so missing keys fall back to English
  // automatically. This keeps the site usable while a translator works
  // through a new locale incrementally.
  return { ...CATALOGS[DEFAULT_LOCALE], ...(CATALOGS[code] ?? {}) };
}

/** Look up a single key. Returns the key itself on miss (loud failure). */
export function t(
  messages: Messages,
  key: string,
  replacements?: Record<string, string | number>,
): string {
  return interpolate(messages[key] ?? key, replacements);
}

/**
 * Server-side plural lookup, CLDR-aware via Intl.PluralRules. Mirrors the
 * client tn() in <MessagesProvider>; legacy .singular/.plural keys keep
 * working (see lib/i18n/plural.ts for the lookup order).
 */
export function tn(
  messages: Messages,
  locale: LocaleCode,
  keyBase: string,
  count: number,
  replacements?: Record<string, string | number>,
): string {
  const value = resolvePluralKey(messages, keyBase, count, locale);
  return interpolate(value, { ...(replacements ?? {}), count });
}
