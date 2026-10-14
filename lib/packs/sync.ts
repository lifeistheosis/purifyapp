import { PACKS_MAX_CHARS, readPacks } from "./types";
import { savePacks } from "./store";

/**
 * Ask the website for new packs, and keep them if they are good.
 *
 * Called by components/native/PackBridge.tsx when the app opens and when it
 * comes back to the front. Asks at most once every half hour: content drops
 * are planned by the day, and a reader who flips between apps should not cost
 * a request each time.
 *
 * Everything here fails silent and leaves the saved packs as they were. No
 * signal, a slow answer, an error page, a body that is too large or not
 * JSON, an answer in a format this build does not read: each one ends with
 * the screens showing what they showed a moment before.
 */

const ASKED_KEY = "purify.packs.askedAt";
export const ASK_EVERY_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 10_000;

export type SyncResult = "kept" | "skipped" | "failed" | "refused";

type Deps = {
  site: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Ask even if the last ask was recent (the walk, and a reader's pull to refresh one day). */
  force?: boolean;
};

function askedRecently(now: number): boolean {
  try {
    const at = Number(window.localStorage.getItem(ASKED_KEY));
    return Number.isFinite(at) && at > 0 && now - at < ASK_EVERY_MS && at <= now;
  } catch {
    return false;
  }
}

function markAsked(now: number): void {
  try {
    window.localStorage.setItem(ASKED_KEY, String(now));
  } catch {
    /* the next open asks again, which is harmless */
  }
}

export async function syncPacks({ site, fetchImpl = fetch, now = Date.now, force = false }: Deps): Promise<SyncResult> {
  if (typeof window === "undefined") return "skipped";
  const t = now();
  if (!force && askedRecently(t)) return "skipped";
  markAsked(t);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // No credentials and no custom header: a plain GET needs no preflight,
    // and the answer is the same for every reader.
    const res = await fetchImpl(`${site}/api/packs`, { signal: controller.signal, credentials: "omit" });
    if (!res.ok) return "failed";
    const text = await res.text();
    if (text.length > PACKS_MAX_CHARS) return "refused";
    const packs = readPacks(JSON.parse(text));
    if (!packs) return "refused";
    return savePacks(packs) ? "kept" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}
