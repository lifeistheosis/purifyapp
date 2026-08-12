"use client";

/**
 * The community inbox, held once for the whole app.
 *
 * Two components read this: the dot on the Community tab glyph, which is
 * mounted in the persistent MobileTabBar, and the inbox list inside the
 * Conversations panel. They used to fetch independently, once each, on
 * mount. The tab bar never unmounts, so its fetch ran exactly once per app
 * launch, which produced two bugs a reader sees every session:
 *
 *   - a reply arriving mid-session never lit the dot, and
 *   - opening the inbox marked everything read on the server while the dot
 *     stayed lit until the app was restarted, because nothing told it.
 *
 * One module store fixes both by construction: there is only one count, so
 * there is nothing for the two views to disagree about. Same shape as
 * lib/bookmarks.ts, including the cached snapshot that useSyncExternalStore
 * requires and the window event so a second mount stays in step.
 */

import { useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";

export type CommunityNotification = {
  id: string;
  kind: "reply";
  post_id: string;
  reply_id: string | null;
  actor_name: string;
  excerpt: string | null;
  read_at: string | null;
  created_at: string;
};

export type Inbox = {
  notifications: CommunityNotification[];
  unread: number;
  /** False until the first fetch settles, so the list can stay hidden
   *  rather than flashing an empty state it has not confirmed. */
  loaded: boolean;
};

const EVENT = "purify:community-inbox";

const EMPTY: Inbox = { notifications: [], unread: 0, loaded: false };

let snapshot: Inbox = EMPTY;
let inFlight: Promise<void> | null = null;

const subscribers = new Set<() => void>();

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
  for (const cb of subscribers) {
    try {
      cb();
    } catch {
      /* a broken subscriber must not stop the others */
    }
  }
}

function set(next: Inbox): void {
  snapshot = next;
  emit();
}

async function fetchInbox(): Promise<Inbox> {
  try {
    const res = await apiFetch("/api/community/notifications");
    if (!res.ok) return { notifications: [], unread: 0, loaded: true };
    const json = (await res.json()) as {
      notifications?: CommunityNotification[];
      unread?: number;
    };
    return {
      notifications: Array.isArray(json.notifications) ? json.notifications : [],
      unread: typeof json.unread === "number" ? json.unread : 0,
      loaded: true,
    };
  } catch {
    // Signed out, offline, or the table is not there yet. All the same
    // thing to a reader: nothing to show.
    return { notifications: [], unread: 0, loaded: true };
  }
}

/**
 * Refresh the inbox. Concurrent callers share one request, so the tab badge
 * mounting at the same moment as the panel does not fire two.
 */
export function refreshInbox(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = fetchInbox()
    .then((next) => {
      set(next);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Mark everything read, and reflect it locally straight away.
 *
 * Optimistic on purpose: the reader is looking at the list, so the dot must
 * go out now, not after a round trip. On failure the count is restored, and
 * the next refresh corrects it either way.
 */
export async function markInboxRead(): Promise<void> {
  const before = snapshot;
  if (before.unread === 0) return;
  const readAt = new Date().toISOString();
  set({
    ...before,
    unread: 0,
    notifications: before.notifications.map((n) =>
      n.read_at ? n : { ...n, read_at: readAt },
    ),
  });
  try {
    const res = await apiFetch("/api/community/notifications", {
      method: "POST",
    });
    if (!res.ok) set(before);
  } catch {
    set(before);
  }
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT, cb);
  }
  return () => {
    subscribers.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT, cb);
    }
  };
}

function getSnapshot(): Inbox {
  return snapshot;
}

function getServerSnapshot(): Inbox {
  return EMPTY;
}

export function useInbox(): Inbox {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test seam: drop everything so one spec cannot leak into the next. */
export function resetInboxForTests(): void {
  snapshot = EMPTY;
  inFlight = null;
  subscribers.clear();
}
