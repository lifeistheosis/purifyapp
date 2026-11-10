"use client";

// The one-time move of a reader's things on Psalms 113 to 115 on this device
// (./psalmMove.ts), his yes of 2026-11-09, kept in step with the server's.
//
// The server moves its rows once, by its own SQL
// (supabase/migrations/20261110001550_psalms_113_115_move.sql), run by the
// owner by hand on release day; the SQL leaves a row in public.data_moves,
// which anyone may read. A device moves its copies only once that row is
// there, and nothing it keeps is synced before it knows:
//
//  - before the server's move (a test build now, synced with production),
//    the device keeps the old numbering, as the server does, and syncs;
//  - once the server has moved, the device moves its copies, once, and then
//    syncs, so a row the server sends, new already, is never moved again,
//    and nothing it sends is new while the server's are old;
//  - when it cannot tell (no signal, an error), its verse-numbered things
//    wait to sync until it can (lib/sync/gate.ts), and it asks again.
//
// components/layout/RootFrame.tsx starts the asking as the app's code loads,
// so a reader who is not signed in has their copies moved too. Once per
// device, by the mark moveDevicePsalms leaves (purify:psalms113.moved).

import { createClient } from "@/lib/supabase/client";

import { moveDevicePsalms, PSALMS_MOVED_KEY, type MoveStore } from "./psalmMove";

/** The server's move, by its row in public.data_moves. */
export const SERVER_MOVE = "psalms-113-115";

export type ServerMove = "moved" | "not-moved" | "unknown";

/** The browser's own storage, as the move reads and writes it. */
export function localMoveStore(storage: Storage): MoveStore {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    keys: () => Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string => key !== null),
  };
}

/**
 * Whether the server has moved: its row, read with the public key. No table
 * means its SQL has not run (PostgREST's PGRST205, Postgres's 42P01), so
 * nothing has moved; any other answer that is not the row is not known.
 */
export async function serverMoveState(): Promise<ServerMove> {
  try {
    const { data, error } = await createClient().from("data_moves").select("name").eq("name", SERVER_MOVE).maybeSingle();
    if (error) return error.code === "PGRST205" || error.code === "42P01" ? "not-moved" : "unknown";
    return data ? "moved" : "not-moved";
  } catch {
    return "unknown";
  }
}

/** The settling, given its parts: what the device keeps, and how to ask the server. */
export async function settleWith(store: MoveStore, ask: () => Promise<ServerMove>): Promise<boolean> {
  if (store.getItem(PSALMS_MOVED_KEY) === "1") return true;
  const server = await ask();
  if (server === "unknown") return false;
  if (server === "moved") moveDevicePsalms(store);
  return true;
}

let settling: Promise<boolean> | null = null;

/**
 * Settles this device with the server, once a visit: true when its
 * verse-numbered things may sync (moved with the server, or both still in the
 * old numbering), false while it cannot tell, and asked again the next time.
 */
export function settlePsalmsMove(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (!settling) {
    let store: MoveStore;
    try {
      store = localMoveStore(window.localStorage);
    } catch {
      /* storage refused (a private window): nothing is kept there to move or sync */
      return Promise.resolve(true);
    }
    settling = settleWith(store, serverMoveState).then(
      (ok) => {
        if (!ok) settling = null;
        return ok;
      },
      () => {
        settling = null;
        return false;
      },
    );
  }
  return settling;
}

/** For tests: forget this visit's answer. */
export function resetPsalmMoveForTests(): void {
  settling = null;
}
