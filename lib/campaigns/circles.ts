import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { reworkAbsent } from "./opening";

// A campaign kept to one circle (1.9; the notes, 4.2 and section 27).
//
// A circle is one of Read together's: a row of prayer_campaign_groups that
// follows a reading path (lib/circles/circles.ts), with its members in
// prayer_campaign_group_members. A campaign kept to one says so in two
// columns the rework's file one added, `audience` ("circle") and
// `circle_id`. Then only the circle's members, and its creator, can open
// it; its updates and comments are theirs alone; and it is on no board.
//
// This file answers the three questions campaigns ask of circles, with the
// service role, for a reader the route has already named by their own
// token:
//
//   which circles is this reader in     the choice on the start screen, and
//                                       the list in Pray together
//   is this reader in these circles     who may open a campaign
//   what is this circle called          the line on the campaign's page
//
// NEVER ONE OF JULY'S GROUPS. A parish group of July belongs to a July
// campaign (its `campaign_id` is set) and goes with July's rows thirty days
// after 1.9 ships (lib/campaigns/julyRows.ts). Only a circle on a reading
// path is offered or taken: `campaign_id` empty and `path_id` set, asked
// here and again when a campaign is started.

/** A reading circle, as campaigns show one: its name and its kind (parish, household, friends). */
export type ReaderCircle = { id: string; name: string; kind: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A reader is in sixty circles at most as far as campaigns are concerned: one read, never cut silently short of a real reader's. */
const CIRCLES_READ = 60;

type GroupRow = { id: string; name: string | null; kind: string | null; campaign_id: string | null; path_id: string | null };

/**
 * The reading circles a reader is in, by name. Empty for nobody, and where
 * the circles' tables are not there. Never throws.
 */
export async function readerCircles(admin: SupabaseClient, userId: string | null): Promise<ReaderCircle[]> {
  if (!userId) return [];
  try {
    const { data: mine, error } = await admin.from("prayer_campaign_group_members").select("group_id").eq("user_id", userId).limit(CIRCLES_READ);
    if (error) {
      if (!reworkAbsent(error)) console.warn("[campaigns] circles not read", error.message);
      return [];
    }
    const ids = ((mine ?? []) as { group_id: string }[]).map((r) => r.group_id);
    if (ids.length === 0) return [];
    const { data: groups, error: groupError } = await admin
      .from("prayer_campaign_groups")
      .select("id, name, kind, campaign_id, path_id")
      .in("id", ids)
      // A circle on a reading path, never a group of one of July's campaigns.
      .is("campaign_id", null)
      .not("path_id", "is", null);
    if (groupError) {
      if (!reworkAbsent(groupError)) console.warn("[campaigns] circles not read", groupError.message);
      return [];
    }
    return ((groups ?? []) as GroupRow[])
      .filter((g) => g.campaign_id === null && g.path_id !== null)
      .map((g) => ({ id: g.id, name: (g.name ?? "").trim(), kind: g.kind ?? "friends" }))
      .filter((g) => g.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.warn("[campaigns] circles not read", e instanceof Error ? e.message : String(e));
    return [];
  }
}

/**
 * Which of these circles the reader is in. The answer to "may this reader
 * open a campaign kept to a circle", asked with the reader's own id and the
 * circle's, and never taken from what a request says. Empty when it cannot
 * be read: a campaign kept to a circle is then opened by nobody but its
 * creator, which is the safe way to be wrong.
 */
export async function circlesHolding(admin: SupabaseClient, userId: string | null, circleIds: readonly (string | null | undefined)[]): Promise<Set<string>> {
  const ids = [...new Set(circleIds.filter((id): id is string => typeof id === "string" && UUID.test(id)))];
  if (!userId || ids.length === 0) return new Set();
  try {
    const { data, error } = await admin.from("prayer_campaign_group_members").select("group_id").eq("user_id", userId).in("group_id", ids);
    if (error) {
      if (!reworkAbsent(error)) console.warn("[campaigns] circle membership not read", error.message);
      return new Set();
    }
    return new Set(((data ?? []) as { group_id: string }[]).map((r) => r.group_id));
  } catch (e) {
    console.warn("[campaigns] circle membership not read", e instanceof Error ? e.message : String(e));
    return new Set();
  }
}

/** The names of these circles, by id, for a reader already known to be allowed to see the campaigns kept to them. */
export async function circleNames(admin: SupabaseClient, circleIds: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = [...new Set(circleIds.filter((id): id is string => typeof id === "string" && UUID.test(id)))];
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  try {
    const { data, error } = await admin.from("prayer_campaign_groups").select("id, name").in("id", ids);
    if (error) {
      if (!reworkAbsent(error)) console.warn("[campaigns] circle names not read", error.message);
      return out;
    }
    for (const g of (data ?? []) as { id: string; name: string | null }[]) {
      const name = (g.name ?? "").trim();
      if (name) out.set(g.id, name);
    }
  } catch (e) {
    console.warn("[campaigns] circle names not read", e instanceof Error ? e.message : String(e));
  }
  return out;
}

/**
 * Whether a campaign may be kept to this circle by this reader: it is a
 * circle on a reading path, and they are in it. One answer for "no such
 * circle", "one of July's groups" and "not yours": a reader learns nothing
 * of a circle they are not in.
 */
export async function mayKeepTo(admin: SupabaseClient, userId: string, circleId: string): Promise<boolean> {
  if (!UUID.test(circleId)) return false;
  return (await readerCircles(admin, userId)).some((c) => c.id === circleId);
}
