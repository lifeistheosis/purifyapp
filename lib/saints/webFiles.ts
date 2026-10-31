/**
 * The saint webs this device can draw without a page (1.8, the build 80 note
 * 55): the glide from one saint's web to another's (lib/saints/webGlide.ts)
 * draws the new web in the same room, so it needs that web's data on the
 * device, and the apps' export has no server to ask.
 *
 * Each web is a file the build writes, /saint-webs/<slug>.json
 * (app/saint-webs/[file]/route.ts): inside the apps' bundle, so it opens with
 * no signal, and a static file on the website. The page a reader opened hands
 * over its own web, and every web read since is kept here for the visit, so
 * Back and Forward find theirs at once.
 *
 * Client-safe: it imports the web's shapes and its addresses, never the
 * saints' registry (lib/saints/web.ts stays on the server).
 */

import { webFileUrl } from "./webGlide";
import type { SaintWebData } from "./webLayout";

const WEBS = new Map<string, SaintWebData>();
const ASKED = new Map<string, Promise<SaintWebData | null>>();

/** A web already on hand: the page's own, or one read on this visit. */
export function knownWeb(slug: string): SaintWebData | undefined {
  return WEBS.get(slug);
}

/** Keep a web for the visit. */
export function rememberWeb(web: SaintWebData): void {
  WEBS.set(web.center.slug, web);
}

/** Whether what a file held is this saint's web, in the shape the screen takes. */
export function isWebOf(value: unknown, slug: string): value is SaintWebData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SaintWebData>;
  return (
    typeof v.center === "object" &&
    v.center !== null &&
    v.center.slug === slug &&
    typeof v.center.name === "string" &&
    Array.isArray(v.nodes) &&
    Array.isArray(v.timeline) &&
    Array.isArray(v.undated)
  );
}

/** A read that fails is tried again: the file is in the bundle, so a failure is a slow device, not a missing web. */
const TRIES = 3;
const AGAIN_MS = 250;

/**
 * A saint's web: at once if it is on hand, else read from its file. Null when
 * there is no such web (the file answers 404) or it cannot be read after a few
 * tries; a later call asks again.
 */
export function loadWeb(slug: string, read: typeof fetch = (...args) => fetch(...args)): Promise<SaintWebData | null> {
  const have = WEBS.get(slug);
  if (have) return Promise.resolve(have);
  const asked = ASKED.get(slug);
  if (asked) return asked;
  const ask = (left: number): Promise<SaintWebData | null> =>
    Promise.resolve()
      .then(() => read(webFileUrl(slug)))
      .then(async (r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(String(r.status));
        const body: unknown = await r.json();
        return isWebOf(body, slug) ? body : null;
      })
      .catch(() =>
        left > 1 ? new Promise<SaintWebData | null>((done) => setTimeout(() => done(ask(left - 1)), AGAIN_MS)) : null,
      );
  const promise = ask(TRIES).then((web) => {
    ASKED.delete(slug);
    if (web) rememberWeb(web);
    return web;
  });
  ASKED.set(slug, promise);
  return promise;
}

/** Start reading a web the reader may glide to next (its card pulled up), so it is on hand when he does. */
export function warmWeb(slug: string): void {
  if (!WEBS.has(slug)) void loadWeb(slug);
}
