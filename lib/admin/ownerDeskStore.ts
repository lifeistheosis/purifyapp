import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DESK_DEFAULTS,
  readAnnouncement,
  readDeskSettings,
  readHolds,
  readLookSeen,
  type Announcement,
  type DeskSettings,
  type Holds,
  type LookSeen,
} from "./ownerDesk";
import { isTableAbsent } from "./tableAbsent";
import { LOOK_ALREADY_SEEN } from "@/lib/email/look";

/**
 * The owner's desk, kept in site_settings (lib/admin/ownerDesk.ts says what it
 * is). No migration: site_settings is one of the ten tables the production
 * baseline found already made by hand (supabase/migrations/
 * 20261110155643_production_baseline.sql; docs/1.9-build/MERGE-DAY.md, row
 * 12), a named row per setting, service role only (RLS on, no policies).
 *
 * Four rows:
 *   owner_desk            his settings: the switch, the sends' hour, the
 *                         brief's hour, the weekly day;
 *   owner_desk_holds      the pieces he held, by board rule key;
 *   owner_desk_announced  what the day's brief named as going out by itself,
 *                         and when it went. Written only after the brief was
 *                         sent, so a brief that failed names nothing and
 *                         nothing goes;
 *   owner_desk_look       the reader emails' look he has seen in his own
 *                         inbox (lib/email/look.ts, the first-send guard).
 *                         Its own row, so saving the brief's hour never
 *                         clears it.
 *
 * A READ THAT FAILS SENDS NOTHING. `ok` is false when the rows could not be
 * read, and then no piece goes out by itself (a hold that could not be read
 * is not a hold that is not there). The brief still comes, with the default
 * hour.
 */

export const DESK_KEYS = {
  settings: "owner_desk",
  holds: "owner_desk_holds",
  announced: "owner_desk_announced",
  look: "owner_desk_look",
} as const;

export type DeskKey = (typeof DESK_KEYS)[keyof typeof DESK_KEYS];

export type DeskState = {
  /** False when site_settings is not there. */
  present: boolean;
  /** False when the rows could not be read: then nothing sends by itself. */
  ok: boolean;
  settings: DeskSettings;
  /** When he last saved settings, or null while the defaults stand. */
  saved: { at: string; by: string | null } | null;
  holds: Holds;
  announcement: Announcement | null;
  /** The reader emails' look he has seen in his inbox (lib/email/look.ts). */
  look: LookSeen;
};

const UNREAD: Omit<DeskState, "present" | "ok"> = {
  settings: DESK_DEFAULTS,
  saved: null,
  holds: {},
  announcement: null,
  look: { seen: LOOK_ALREADY_SEEN, at: null, by: null },
};

type Row = { key: string; value: unknown; updated_at: string | null; updated_by_email: string | null };

export async function readDesk(admin: SupabaseClient): Promise<DeskState> {
  try {
    const { data, error } = await admin
      .from("site_settings")
      .select("key, value, updated_at, updated_by_email")
      .in("key", Object.values(DESK_KEYS));
    if (error) return { ...UNREAD, present: !isTableAbsent(error), ok: false };
    const rows = new Map(((data ?? []) as Row[]).map((r) => [r.key, r]));
    const settingsRow = rows.get(DESK_KEYS.settings);
    return {
      present: true,
      ok: true,
      settings: readDeskSettings(settingsRow?.value),
      saved: settingsRow ? { at: settingsRow.updated_at ?? "", by: settingsRow.updated_by_email ?? null } : null,
      holds: readHolds(rows.get(DESK_KEYS.holds)?.value),
      announcement: readAnnouncement(rows.get(DESK_KEYS.announced)?.value),
      look: readLookSeen(rows.get(DESK_KEYS.look)?.value, LOOK_ALREADY_SEEN),
    };
  } catch {
    return { ...UNREAD, present: false, ok: false };
  }
}

export type WriteResult = { ok: true } | { ok: false; absent: boolean; error: string };

/** Write one of the desk's rows. `by` is the admin's address, or a name for the heartbeat. */
export async function writeDesk(
  admin: SupabaseClient,
  key: DeskKey,
  value: Record<string, unknown>,
  by: string | null,
): Promise<WriteResult> {
  try {
    const { error } = await admin
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by_email: by }, { onConflict: "key" });
    if (!error) return { ok: true };
    return { ok: false, absent: isTableAbsent(error), error: error.message };
  } catch (e) {
    return { ok: false, absent: false, error: (e as Error).message };
  }
}

/** Whether the day's brief has gone, from the email log, and when. Null when the log could not be read. */
export async function briefSent(admin: SupabaseClient, dedupeKey: string): Promise<{ sent: boolean; at: string | null } | null> {
  try {
    const { data, error } = await admin
      .from("email_sends")
      .select("status, sent_at")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (error) return null;
    const row = data as { status: string; sent_at: string | null } | null;
    return { sent: row?.status === "sent", at: row?.sent_at ?? null };
  } catch {
    return null;
  }
}
