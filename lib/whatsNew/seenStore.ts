// Client-side store for the "What's new" seen-version, exposed through
// useSyncExternalStore. This lets the hero badge read localStorage without a
// hydration mismatch (the server snapshot is always null) and without a
// setState-in-effect. markWhatsNewSeen() persists the version and notifies any
// mounted badge in the same tab; the storage event keeps other tabs in sync.

import { WHATS_NEW_SEEN_KEY } from "./version";

const listeners = new Set<() => void>();

export function subscribeSeen(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === WHATS_NEW_SEEN_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSeenSnapshot(): string | null {
  try {
    return window.localStorage.getItem(WHATS_NEW_SEEN_KEY);
  } catch {
    return null;
  }
}

export function getServerSeenSnapshot(): string | null {
  return null;
}

export function markWhatsNewSeen(version: string): void {
  try {
    window.localStorage.setItem(WHATS_NEW_SEEN_KEY, version);
  } catch {
    // Ignore storage failures (private mode, quota); the badge simply stays.
  }
  listeners.forEach((cb) => cb());
}
