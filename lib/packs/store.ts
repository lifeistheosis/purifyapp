import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import { packsTrusted, readPacks, type Packs } from "./types";

/**
 * The packs this phone has, kept between app opens.
 *
 * One localStorage entry holds the website's last good answer as text; it is
 * read back through readPacks() every time, so an entry written by an older
 * build, or changed by hand, is checked as strictly as a fresh download.
 * Readers subscribe (useSyncExternalStore) and see a new pack the moment it
 * is saved, without waiting for the next app open.
 *
 * Only the apps use packs. On the website the same content comes from the
 * website itself, already current, so usePacks() answers null there and the
 * server-rendered markup and the first client render always agree.
 */

const KEY = "purify.packs";

/**
 * When this build was built, written in by next.config.ts for the app
 * exports only. See packsTrusted() for why it matters.
 */
const BUILT_AT = process.env.NEXT_PUBLIC_PURIFY_BUILT_AT || undefined;

let cache: { raw: string | null; packs: Packs | null } | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The packs saved on this phone that may be used, or null. */
export function savedPacks(): Packs | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cache && cache.raw === raw) return cache.packs;
  let packs: Packs | null = null;
  if (raw) {
    try {
      const read = readPacks(JSON.parse(raw));
      packs = read && packsTrusted(read, CURRENT_VERSION, BUILT_AT) ? read : null;
    } catch {
      packs = null;
    }
  }
  cache = { raw, packs };
  return packs;
}

/**
 * Keep an answer that has already been read and found good. Returns whether
 * it was kept: a full or blocked storage keeps nothing, and the screens go on
 * showing what the build carries.
 */
export function savePacks(packs: Packs): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify(packs));
  } catch {
    return false;
  }
  cache = null;
  for (const listener of listeners) listener();
  return true;
}

/** Forget the saved packs (the tests, and a pack the app should stop using). */
export function clearPacks(): void {
  const store = storage();
  try {
    store?.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
  cache = null;
  for (const listener of listeners) listener();
}

export function subscribePacks(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab of the website cannot write here (the website never saves
  // packs), but a second window of a desktop shell could; keep both in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
