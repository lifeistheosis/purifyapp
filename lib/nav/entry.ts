/**
 * A hard load of an inner address, inside the apps, ends on the screen the
 * address names.
 *
 * It did not. Capacitor answers any address with no file extension with the
 * root index.html, on both platforms (the history is in
 * components/auth/OAuthButtons.tsx, and the bundle no longer even carries the
 * other documents: scripts/native-build.mjs, prunePageDocuments). So a reload
 * on Settings, or a `window.location` move to /campaigns, booted the front
 * door and left the reader on Today under the other screen's address, with
 * the back bar and the tab bar believing the address. Seen on the 1.5.2
 * export served the way the shells serve it: a hard load of /bible/john/1/
 * drew Today and kept the address.
 *
 * The router can put it right: asked to refresh, it reads the payload for the
 * address it is on and draws that screen (measured: the chapter was drawn and
 * the address, its query and its # were kept; a push or a replace to the same
 * address did nothing at all). So once, as the app comes up, an inner address
 * is refreshed.
 *
 * The one way this can go wrong is an address the bundle has no screen for.
 * The router answers a missing payload with a hard load of the same address,
 * which is this again, for ever. So each try is written down, and an address
 * that was already tried a moment ago is given up on: the reader is taken to
 * the front door properly, address and all.
 *
 * Decided here as plain functions over what the caller hands in, so it is
 * tested without a browser. The effect that acts on it is in
 * components/native/NativeBridge.tsx.
 */

/**
 * What app/page.tsx puts in the front door's document and nothing else has.
 * It is how the app knows the document it was handed is the front door's.
 */
export const FRONT_DOOR_MARK = "[data-front-door]";

/** Where the last try is kept. Session storage: a new launch starts clean. */
export const ENTRY_KEY = "purify:entry.recovering";

/** A second boot on the same address within this long is the first try failing. */
export const ENTRY_RETRY_MS = 15000;

export type EntryAction = "none" | "refresh" | "front-door";

type Remembered = { address: string; at: number };

function trim(pathname: string): string {
  return pathname !== "/" ? pathname.replace(/\/+$/, "") || "/" : "/";
}

function read(raw: string | null): Remembered | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Remembered>;
    return typeof v.address === "string" && typeof v.at === "number" ? { address: v.address, at: v.at } : null;
  } catch {
    return null;
  }
}

/**
 * What to do as the app comes up.
 *
 * `shell` is whether the app is inside its shell AND the document it was
 * handed is the front door's (FRONT_DOOR_MARK). Only then can the screen be
 * the wrong one. On the website, and on a development server, an inner
 * address is answered with its own page and there is nothing to recover.
 */
export function entryAction(input: {
  shell: boolean;
  pathname: string;
  search: string;
  remembered: string | null;
  now: number;
}): { action: EntryAction; remember: string | null } {
  if (!input.shell || trim(input.pathname) === "/") return { action: "none", remember: null };
  const address = trim(input.pathname) + input.search;
  const last = read(input.remembered);
  if (last && last.address === address && input.now - last.at < ENTRY_RETRY_MS) {
    // The refresh came back as a hard load of the same address: no such screen.
    return { action: "front-door", remember: null };
  }
  return { action: "refresh", remember: JSON.stringify({ address, at: input.now } satisfies Remembered) };
}
