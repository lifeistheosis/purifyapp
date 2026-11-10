import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { reworkAbsent } from "./opening";
import { deletePicturesOf } from "./pictures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A circle is about to be deleted (Read together deletes one when its last
 * member leaves: app/api/circles/[id]). The database then deletes every
 * campaign kept to it, rows and all (file one's foreign key on
 * prayer_campaigns.circle_id), and would leave their pictures' files, which
 * are not rows. So their files go first, by the call a creator's own
 * take-down uses. Never throws: a file that could not be deleted is logged
 * and stays written down under its creator, so the account's deletion takes
 * it (lib/campaigns/pictures.ts, deletePicturesOf).
 */
export async function beforeCircleGoes(admin: SupabaseClient, circleId: string): Promise<void> {
  if (!UUID.test(circleId)) return;
  try {
    const { data, error } = await admin.from("prayer_campaigns").select("id").eq("circle_id", circleId).limit(200);
    if (error) {
      if (!reworkAbsent(error)) console.warn("[campaigns] a circle's campaigns not read before it goes", error.message);
      return;
    }
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length > 0) await deletePicturesOf(admin, ids);
  } catch (e) {
    console.warn("[campaigns] a circle's campaigns not read before it goes", e instanceof Error ? e.message : String(e));
  }
}
