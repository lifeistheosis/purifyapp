// Client-side catalog loading (Beta 2.3 native locale bootstrap).
//
// The Android build is a static export baked in English: there is no
// server to re-render when the user switches language, so the client
// must be able to load a locale's catalog on its own. An explicit
// import map (not a template-string import) makes webpack emit one
// small lazy chunk per locale; the static export ships all of them and
// the app only ever loads the one it needs.

import type { LocaleCode } from "./locales";

export type Messages = Record<string, string>;

type CatalogModule = { default: unknown };

const CATALOG_IMPORTS: Record<
  Exclude<LocaleCode, "en">,
  () => Promise<CatalogModule>
> = {
  es: () => import("./messages/es.json"),
  ro: () => import("./messages/ro.json"),
  el: () => import("./messages/el.json"),
  ru: () => import("./messages/ru.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  sr: () => import("./messages/sr.json"),
  uk: () => import("./messages/uk.json"),
  it: () => import("./messages/it.json"),
  pt: () => import("./messages/pt.json"),
  bg: () => import("./messages/bg.json"),
  ar: () => import("./messages/ar.json"),
  fil: () => import("./messages/fil.json"),
  tr: () => import("./messages/tr.json"),
  ka: () => import("./messages/ka.json"),
  hu: () => import("./messages/hu.json"),
  id: () => import("./messages/id.json"),
  ne: () => import("./messages/ne.json"),
  pl: () => import("./messages/pl.json"),
  ur: () => import("./messages/ur.json"),
};

/**
 * Load a locale's catalog in the browser, merged over English exactly
 * like the server-side getMessages() so missing keys fall back.
 */
export async function loadClientCatalog(code: LocaleCode): Promise<Messages> {
  // The catalog asked for ahead (readyLanguageAhead below), taken once: a later
  // ask after a failure is a fresh try, as it always was.
  if (ahead && ahead.code === code) {
    const early = ahead.catalog;
    ahead = null;
    return early;
  }
  const en = (await import("./messages/en.json")).default as Messages;
  if (code === "en") return { ...en };
  try {
    const mod = await CATALOG_IMPORTS[code]();
    return { ...en, ...(mod.default as Messages) };
  } catch {
    // Chunk failed to load (offline before it was cached): English keeps
    // the app usable, the next switch attempt retries.
    return { ...en };
  }
}

// THE READER'S OWN FACES, BEFORE THEIR WORDS (Updates 80, 1.9).
//
// Every script but Latin is drawn in a face that is not preloaded (app/layout.tsx:
// Noto Sans and Noto Serif for Greek and Cyrillic, Noto Sans Arabic and Noto Naskh
// Arabic for Arabic and Urdu, the two Georgian faces, Noto Sans Devanagari for
// Nepali, and DM Sans's latin-ext file for the letters of Romanian, Turkish,
// Polish and Hungarian). A browser asks for a face only when it first lays out a
// letter it covers, and `display: swap` draws the fallback until it arrives. So a
// language's words, committed the moment their catalog came, were drawn once in
// the fallback and again in their face: on the export, Community's sign-in link in
// Arabic widened 2.8px a frame later, as Noto Naskh Arabic and Noto Sans Arabic
// finished loading (docs/handoffs/updates-79.md, step 3).
//
// So the faces are asked for first, with the letters the catalog itself draws:
// `document.fonts.load` fetches exactly the faces whose unicode-range covers them
// and passes over the rest, so this is right for every language without a table
// of which face is whose. It never holds the words longer than FACES_WAIT_MS.

/** The longest a language's words wait for their faces. */
export const FACES_WAIT_MS = 1500;

/** The faces the chrome is drawn in, as next/font names them on <html> (app/layout.tsx). */
export const FACE_VARIABLES = [
  "--font-dm-sans",
  "--font-dm-serif",
  "--font-lora",
  "--font-noto-sans-x",
  "--font-noto-serif-x",
  "--font-noto-sans-arabic",
  "--font-noto-naskh",
  "--font-noto-sans-georgian",
  "--font-noto-serif-georgian",
  "--font-noto-sans-devanagari",
] as const;

/** Every letter beyond ASCII that a catalog draws, once each. */
export function scriptSample(messages: Messages): string {
  const seen = new Set<string>();
  for (const value of Object.values(messages)) {
    for (const ch of value) if ((ch.codePointAt(0) ?? 0) > 0x7f) seen.add(ch);
  }
  return [...seen].join("");
}

/** Resolves once the faces that draw these words are loaded, or the wait is over. Never rejects. */
export async function facesReady(messages: Messages, ms: number = FACES_WAIT_MS): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const sample = scriptSample(messages);
  if (!sample) return;
  const css = getComputedStyle(document.documentElement);
  const asks = FACE_VARIABLES.map((v) => css.getPropertyValue(v).trim())
    .filter(Boolean)
    .map((family) => document.fonts.load(`400 1em ${family}`, sample).catch(() => []));
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(asks),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  if (timer) clearTimeout(timer);
}

// THE LANGUAGE ASKED FOR AS SOON AS THE APP'S CODE RUNS (Updates 87, 1.9).
//
// In the apps, a screen opened straight away is held until the reader's language
// is on the screen (components/i18n/LaunchLanguageGate.tsx). Its catalog and faces
// were asked for only once the first screen had been brought to life and the
// device had been asked what it remembers (LocaleBootstrap), so the wait began
// late. But the language pre-paint (./languagePrepaint.ts) has already decided,
// before the first paint, as LocaleBootstrap decides, and put it on <html>. So
// both are asked for here, when the app's code first runs. Nothing is decided or
// drawn here: LocaleBootstrap still decides, and loadClientLanguage still waits
// for the faces, now mostly already loaded. A guess the device then overrules
// costs one catalog file read for nothing.

let ahead: { code: LocaleCode; catalog: Promise<Messages> } | null = null;

/** Ask for the language the pre-paint put on <html>, in the apps, once. Never throws. */
export function readyLanguageAhead(native: () => boolean): void {
  try {
    if (typeof document === "undefined" || ahead || !native()) return;
    const code = document.documentElement.lang;
    if (!code || code === "en" || !Object.prototype.hasOwnProperty.call(CATALOG_IMPORTS, code)) return;
    const asked = code as Exclude<LocaleCode, "en">;
    const catalog = (async () => {
      const en = (await import("./messages/en.json")).default as Messages;
      try {
        return { ...en, ...((await CATALOG_IMPORTS[asked]()).default as Messages) };
      } catch {
        return { ...en };
      }
    })();
    ahead = { code: asked, catalog };
    void catalog.then((messages) => facesReady(messages)).catch(() => {});
  } catch {
    // Nothing here may stop the app: LocaleBootstrap asks for it in its own time.
  }
}

/**
 * A language ready to be drawn: its catalog, and the faces its words are drawn
 * in. English is the language the apps are built in, and its faces are preloaded.
 */
export async function loadClientLanguage(code: LocaleCode): Promise<Messages> {
  const messages = await loadClientCatalog(code);
  if (code !== "en") await facesReady(messages);
  return messages;
}
