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
import { readShowSupporterMark, writeShowSupporterMark } from "@/lib/profile/supporterMark";
import { createClient } from "@/lib/supabase/client";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

/**
 * The allowlist. A column in `profiles` is synced if and only if it is named
 * here together with its local reader and writer. Adding a column to the
 * table without adding it here is how the calendar pair became dead schema.
 *
 * show_supporter_mark (20260905_community_author_mark.sql) is the opt-out
 * for the community supporter mark, read and written by
 * lib/profile/supporterMark.ts. Unlike the other two it has a server-side
 * effect, a trigger that clears the mark from the feed, which is why the
 * toggle pushes at once rather than waiting for the next sign-in.
 */
const PROFILE_PREFS = ["focus", "depth", "show_supporter_mark"] as const;

/**
 * The columns that existed before the newest migration. When the select
 * fails with an unknown column, the pull reads these instead, so a
 * migration that has not been applied yet costs the new preference and not
 * the old ones. Extend this when the next column is added, not before.
 */
const PROFILE_PREFS_BEFORE_MARK = ["focus", "depth"] as const;

type ProfilePrefsRow = {
  focus: Focus[] | null;
  depth: Depth | null;
  show_supporter_mark?: boolean | null;
};

function localSnapshot(): ProfilePrefsRow {
  const focus = readFocus();
  return {
    focus: focus.length > 0 ? focus : null,
    depth: readDepth(),
    show_supporter_mark: readShowSupporterMark(),
  };
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
    // A boolean the reader has actually set. Null is "never chosen" and is
    // not sent, so a fresh install cannot flip an account's answer.
    if (typeof local.show_supporter_mark === "boolean") {
      patch.show_supporter_mark = local.show_supporter_mark;
    }
    if (Object.keys(patch).length === 0) return;

    const { error } = await supa.from("profiles").update(patch).eq("id", user.id);
    // Before 20260905_community_author_mark.sql is applied the whole update
    // is refused for the one unknown key. Send the rest again without it so
    // focus and depth keep syncing.
    if (error && isColumnAbsent(error) && "show_supporter_mark" in patch) {
      delete patch.show_supporter_mark;
      if (Object.keys(patch).length === 0) return;
      await supa.from("profiles").update(patch).eq("id", user.id);
    }
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

    let { data, error } = await supa
      .from("profiles")
      .select(PROFILE_PREFS.join(", "))
      .eq("id", user.id)
      .maybeSingle();
    // A 42703 (undefined column) means the newest migration has not been
    // applied. Read the columns that do exist rather than giving up on all
    // of them.
    if (error && isColumnAbsent(error)) {
      ({ data, error } = await supa
        .from("profiles")
        .select(PROFILE_PREFS_BEFORE_MARK.join(", "))
        .eq("id", user.id)
        .maybeSingle());
    }
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
    if (
      local.show_supporter_mark === null &&
      typeof row.show_supporter_mark === "boolean"
    ) {
      writeShowSupporterMark(row.show_supporter_mark);
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
