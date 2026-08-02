"use client";

// The preference-sync glue that supabase/migrations/20260527_profiles_calendar_matrix.sql
// described as already existing. It did not. That migration added
// `calendar_reckoning` and `calendar_tradition` to `profiles` and said the
// "client-side preference-sync glue ... picks these columns up as soon as
// their names are added to the PROFILE_PREFS allowlist", and because no such
// module was ever written, both columns have sat unread since May.
//
// This is that module, built for `focus` and `depth`. It is written so the
// two calendar columns can be finished by adding them to PROFILE_PREFS and
// nothing else, but they are deliberately NOT included yet: the calendar
// reckoning already has a working local preference plus an SSR cookie
// (lib/calendar/styleDefault.ts), and deciding what happens when the device
// and the account disagree is a product question, not a plumbing one.
//
// ── Posture ────────────────────────────────────────────────────────────────
//
// Local is the source of truth on the device, exactly as bookmarks,
// annotations and prayer state are. The server copy exists so a reinstall or
// a second device does not silently forget what the reader told us. Every
// call fails silent: a preference is a garnish, and no part of the app may
// block on it.
//
// Merge rule on pull: the server only fills a value the device does not have.
// A reader who just answered on THIS device must never watch their answer be
// overwritten by an older answer from another one. That is the same rule
// lib/prayers/sync.ts uses for intentions, for the same reason.

import { readDepth, readFocus, writeDepth, writeFocus, type Depth, type Focus } from "@/lib/onboarding/state";
import { createClient } from "@/lib/supabase/client";

/**
 * The allowlist. A column in `profiles` is synced if and only if it is named
 * here together with its local reader and writer. Adding a column to the
 * table without adding it here is how the calendar pair became dead schema.
 */
const PROFILE_PREFS = ["focus", "depth"] as const;

type ProfilePrefsRow = {
  focus: Focus[] | null;
  depth: Depth | null;
};

function localSnapshot(): ProfilePrefsRow {
  const focus = readFocus();
  return { focus: focus.length > 0 ? focus : null, depth: readDepth() };
}

/**
 * Push whatever the device knows. Only sends keys that actually have a value,
 * so signing in on a fresh install cannot blank a preference the account
 * already holds.
 */
export async function pushProfilePrefs(): Promise<void> {
  try {
    const supa = createClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return;

    const local = localSnapshot();
    const patch: Partial<ProfilePrefsRow> = {};
    if (local.focus) patch.focus = local.focus;
    if (local.depth) patch.depth = local.depth;
    if (Object.keys(patch).length === 0) return;

    await supa.from("profiles").update(patch).eq("id", user.id);
  } catch {
    // Column missing (migration not applied yet), offline, or signed out.
    // All three are survivable: the local preference still works.
  }
}

/**
 * Pull the account's preferences and fill only what the device is missing.
 * Called once after sign-in.
 */
export async function pullProfilePrefs(): Promise<void> {
  try {
    const supa = createClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return;

    const { data, error } = await supa
      .from("profiles")
      .select(PROFILE_PREFS.join(", "))
      .eq("id", user.id)
      .maybeSingle();
    // A 42703 (undefined column) means the migration has not been applied.
    // Nothing to do, and nothing to report: the app is fully usable without it.
    if (error || !data) return;

    const row = data as unknown as ProfilePrefsRow;
    const local = localSnapshot();

    if (!local.focus && Array.isArray(row.focus) && row.focus.length > 0) {
      writeFocus(row.focus);
    }
    if (!local.depth && row.depth) {
      writeDepth(row.depth);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Sign-in handshake: take what the account has for anything this device is
 * missing, then hand back anything the device knows that the account does not.
 * Pull first, deliberately, so the push cannot race ahead and write a blank.
 */
export async function syncProfilePrefsOnSignIn(): Promise<void> {
  await pullProfilePrefs();
  await pushProfilePrefs();
}
