import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Per-slug overrides for saint registry flags. Reads the small
// `saint_overrides` table (admin-managed) and returns a Map suitable
// for merging with the static SAINTS registry at request time.
//
// Resilient: returns an empty Map on any error so the public site
// never breaks if Supabase is down.
export async function getSaintOverrides(): Promise<Map<string, { complete: boolean | null }>> {
  try {
    const supa = createAdminClient();
    const { data } = await supa.from("saint_overrides").select("slug, complete");
    const map = new Map<string, { complete: boolean | null }>();
    for (const r of data ?? []) {
      map.set(r.slug as string, { complete: r.complete as boolean | null });
    }
    return map;
  } catch {
    return new Map();
  }
}

// Convenience: effective `complete` flag for a single slug, given the
// registry value as fallback.
export async function getEffectiveComplete(
  slug: string,
  registryValue: boolean,
): Promise<boolean> {
  const overrides = await getSaintOverrides();
  const ov = overrides.get(slug);
  if (!ov) return registryValue;
  if (ov.complete === null) return registryValue;
  return ov.complete;
}
