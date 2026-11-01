import "server-only";

import { createServerClient } from "@supabase/ssr";

import { CLEARED_PUBLIC_COLUMNS, readCleared, type ClearedWords } from "./cleared";
import { allChants } from "./registry.server";

/**
 * The cleared chant words switched on now (build 86 note 78), as the public
 * reads them: the anon key and no cookies, as lib/shop/catalog.ts reads the
 * catalogue, so row level security does the filtering (a row is readable
 * only while it is on) and the column grants keep the clearance record out
 * of reach (supabase/migrations/20261101000000_chant_cleared_words.sql).
 *
 * Every row is checked (lib/chants/cleared.ts) and must name a version the
 * app has; a table that is not there yet, or any failure, is an empty list,
 * and the apps show the words they carry.
 */
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function readSwitchedOn(): Promise<ClearedWords[]> {
  try {
    const { data, error } = await createClient().from("chant_cleared_words").select(CLEARED_PUBLIC_COLUMNS).eq("enabled", true);
    if (error || !Array.isArray(data)) return [];
    const versions = new Set(allChants().flatMap((c) => c.variants.map((v) => `${c.slug}/${v.id}`)));
    return data.map(readCleared).filter((c): c is ClearedWords => Boolean(c) && versions.has(`${c!.slug}/${c!.variant}`));
  } catch {
    return [];
  }
}
