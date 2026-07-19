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
