"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readLastRead, writeLastRead } from "@/lib/bible/lastRead";
import { canSyncPlaces } from "@/lib/sync/gate";
import { readPlansForSync, writePlansFromSync } from "@/lib/plans/progress";
import { readAllPositions, readClearedPositions, writePositionsFromSync } from "@/lib/reader/position";
import { rememberStore, writeScheduleFromSync } from "@/lib/remember/schedule";
import { createClient } from "@/lib/supabase/client";

import {
  READING_KEYS,
  cleanPlacesSlice,
  cleanPlansSlice,
  cleanReadingSlice,
  cleanRememberSlice,
  mergePlaces,
  mergePlans,
  mergeReading,
  mergeRemember,
  sameValue,
  travelling,
  withDeviceWords,
  type ReadingSlice,
} from "./keptMerge";

/**
 * Everything a reader keeps that had no table, carried between their devices
 * (1.9, PLAN row 29, s5-09: "Sync everything kept: plan progress, Remember
 * progress, place, palette, settings").
 *
 * One row per slice in public.user_kept, which is the owner's SQL
 * (supabase/migrations/20261110012059_user_kept.sql) and may not exist
 * yet. A probe asks for the table first, as the journal's sync does
 * (lib/sync/journal.ts): until it answers, all of this stays on the device,
 * as it always has, with no failed request on every page and no error shown.
 *
 * Every exchange is the same three steps, for each slice asked for: read the
 * server's copy, merge it with this device's item by item, the newer of each
 * winning (lib/sync/keptMerge.ts says how, slice by slice), and put the
 * merged value in both places, where it differs. So a push never writes over
 * what another device sent since: it is merged first. What the merge puts on
 * the device is marked as the sync's, so it is not sent back.
 *
 * Carrying a library across devices is the Purify Plus layer: canSyncPlaces()
 * (lib/sync/gate.ts) before anything, as every sync of verse-numbered things
 * does.
 */

export const KEPT_SLICES = ["plans", "remember", "places", "reading"] as const;
export type KeptSlice = (typeof KEPT_SLICES)[number];

const TABLE = "user_kept";
const TABLE_KEY = "purify:sync:keptTable";
const REPROBE_MS = 12 * 3_600_000;
/**
 * The plans this device has merged with the server, and for which account
 * (mergePlans' `met`): a plan's first exchange joins both copies' days, later
 * ones keep the newer copy. Written only once the server holds the merged copy.
 */
const PLANS_MET_KEY = "purify:kept.plansMet";
/** When the reading settings last changed on this device: they carry no time of their own. */
const READING_AT_KEY = "purify:kept.readingAt";
/** The reader's settings change event (components/reader/ReaderPrefs.tsx), which repaints the palette too. */
export const READER_PREFS_EVENT = "purify:reader-prefs";

let tableKnown: boolean | null = null;

/** For tests: forget what the probe found. */
export function forgetKeptProbe(): void {
  tableKnown = null;
}

function rememberProbe(ok: boolean) {
  tableKnown = ok;
  try {
    window.localStorage.setItem(TABLE_KEY, JSON.stringify({ ok, at: Date.now() }));
  } catch {
    /* kept for this page only */
  }
}

/** True once the server is known to have the table. */
export async function keptTable(supabase: SupabaseClient): Promise<boolean> {
  if (tableKnown !== null) return tableKnown;
  try {
    const saved = JSON.parse(window.localStorage.getItem(TABLE_KEY) ?? "null") as { ok: boolean; at: number } | null;
    if (saved && (saved.ok || Date.now() - saved.at < REPROBE_MS)) {
      tableKnown = saved.ok;
      return saved.ok;
    }
  } catch {
    /* ask */
  }
  try {
    const { error } = await supabase.from(TABLE).select("slice").limit(1);
    if (!error) {
      rememberProbe(true);
      return true;
    }
    if (error.code === "PGRST205" || error.code === "42P01" || /user_kept/.test(error.message ?? "")) rememberProbe(false);
    return false;
  } catch {
    return false;
  }
}

// ── The reading settings' time ──────────────────────────────────────────

/** The reader changed a setting here: it is now the newest copy. Not for the sync's own writes. */
export function stampReadingChange(now: number = Date.now()): void {
  try {
    window.localStorage.setItem(READING_AT_KEY, String(now));
  } catch {
    /* sent with no time, so any other device's copy wins: the safe way */
  }
}

function readingAt(): number {
  try {
    const at = Number(window.localStorage.getItem(READING_AT_KEY));
    return Number.isFinite(at) && at > 0 ? at : 0;
  } catch {
    return 0;
  }
}

function readReading(): ReadingSlice {
  const values: Record<string, string | null> = {};
  for (const key of READING_KEYS) {
    try {
      values[key] = window.localStorage.getItem(key);
    } catch {
      values[key] = null;
    }
  }
  return cleanReadingSlice({ at: readingAt(), values });
}

function writeReading(next: ReadingSlice): void {
  try {
    for (const [key, value] of Object.entries(next.values)) {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    }
    window.localStorage.setItem(READING_AT_KEY, String(next.at));
  } catch {
    return;
  }
  // The readers redraw, and the palette is put on again, by the one event
  // they already listen for (components/theme/AppThemeController.tsx).
  window.dispatchEvent(new CustomEvent(READER_PREFS_EVENT, { detail: { source: "sync" } }));
}

// ── The slices ──────────────────────────────────────────────────────────

/** What an exchange knows beyond the two copies. */
type MergeContext = { plansMet: ReadonlySet<string> };

type Adapter = {
  /** This device's copy, read as a server copy is read. */
  local(): unknown;
  clean(v: unknown): unknown;
  merge(local: never, remote: never, context: MergeContext): unknown;
  /** Put a merged copy in place on this device. */
  apply(merged: never): void;
  /** Nothing to keep: no row is made for it. */
  empty(v: never): boolean;
};

const SLICES: Record<KeptSlice, Adapter> = {
  plans: {
    local: () => cleanPlansSlice(readPlansForSync()),
    clean: cleanPlansSlice,
    merge: (local: ReturnType<typeof cleanPlansSlice>, remote: ReturnType<typeof cleanPlansSlice>, context: MergeContext) =>
      mergePlans(local, remote, context.plansMet),
    apply: (m: ReturnType<typeof cleanPlansSlice>) => writePlansFromSync(m.plans, m.resets),
    empty: (v: ReturnType<typeof cleanPlansSlice>) => !Object.keys(v.plans).length && !Object.keys(v.resets).length,
  },
  remember: {
    // A quote's words and the reader's own stay on the device until the privacy
    // page says they travel (LEARNED_WORDS_TRAVEL, lib/sync/keptMerge.ts).
    local: () => travelling(cleanRememberSlice(rememberStore())),
    clean: (v: unknown) => travelling(cleanRememberSlice(v)),
    merge: mergeRemember,
    apply: (m: ReturnType<typeof cleanRememberSlice>) => writeScheduleFromSync(withDeviceWords(m, cleanRememberSlice(rememberStore()))),
    empty: (v: ReturnType<typeof cleanRememberSlice>) => !Object.keys(v.entries).length && !Object.keys(v.items).length && !v.chosen,
  },
  places: {
    local: () => cleanPlacesSlice({ bible: readLastRead(), works: readAllPositions(), cleared: readClearedPositions() }),
    clean: cleanPlacesSlice,
    merge: mergePlaces,
    apply: (m: ReturnType<typeof cleanPlacesSlice>) => {
      const here = readLastRead();
      if (m.bible && (!here || m.bible.ts > here.ts)) writeLastRead(m.bible);
      writePositionsFromSync(m.works, m.cleared);
    },
    empty: (v: ReturnType<typeof cleanPlacesSlice>) => !v.bible && !Object.keys(v.works).length && !Object.keys(v.cleared).length,
  },
  reading: {
    local: readReading,
    clean: cleanReadingSlice,
    merge: mergeReading,
    apply: writeReading,
    // Settings never changed here are the defaults, nothing to carry.
    empty: (v: ReadingSlice) => v.at === 0,
  },
};

function readPlansMet(userId: string): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(PLANS_MET_KEY) ?? "null") as { user?: unknown; ids?: unknown } | null;
    if (v && v.user === userId && Array.isArray(v.ids)) return new Set(v.ids.filter((id): id is string => typeof id === "string"));
  } catch {
    /* unreadable: every plan meets the server afresh, which loses nothing */
  }
  return new Set();
}

function writePlansMet(userId: string, ids: Iterable<string>): void {
  try {
    localStorage.setItem(PLANS_MET_KEY, JSON.stringify({ user: userId, ids: [...new Set(ids)].sort() }));
  } catch {
    /* no storage: the next exchange joins again, which loses nothing */
  }
}

async function session(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  if (!(await canSyncPlaces())) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await keptTable(supabase))) return null;
  return { supabase, userId: user.id };
}

/**
 * Exchange the slices asked for (all of them unless named): the server's copy
 * merged with this device's, and each place given the merged value where it
 * differs. Never throws.
 */
export async function syncKept(only: readonly KeptSlice[] = KEPT_SLICES): Promise<void> {
  try {
    const s = await session();
    if (!s) return;
    const { data, error } = await s.supabase.from(TABLE).select("slice, value").in("slice", [...only]);
    if (error) return;
    const remote = new Map<string, unknown>((data ?? []).map((r: { slice: string; value: unknown }) => [r.slice, r.value]));
    const rows: { user_id: string; slice: KeptSlice; value: unknown; updated_at: string }[] = [];
    const context: MergeContext = { plansMet: readPlansMet(s.userId) };
    let plansNow: string[] | null = null;
    for (const id of only) {
      const slice = SLICES[id];
      const local = slice.local();
      const theirs = remote.has(id) ? slice.clean(remote.get(id)) : null;
      const merged = theirs ? slice.merge(local as never, theirs as never, context) : local;
      if (theirs && !sameValue(merged, local)) slice.apply(merged as never);
      const changed = theirs ? !sameValue(merged, theirs) : !slice.empty(merged as never);
      if (changed) rows.push({ user_id: s.userId, slice: id, value: merged, updated_at: new Date().toISOString() });
      if (id === "plans") plansNow = Object.keys((merged as ReturnType<typeof cleanPlansSlice>).plans);
    }
    if (rows.length) {
      const { error: written } = await s.supabase.from(TABLE).upsert(rows, { onConflict: "user_id,slice" });
      if (written) return;
    }
    // The server holds the merged plans now: from here on they are met.
    if (plansNow) writePlansMet(s.userId, [...context.plansMet, ...plansNow]);
  } catch {
    /* kept on the device; the next exchange tries again */
  }
}
