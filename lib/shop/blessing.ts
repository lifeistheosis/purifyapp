import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";

/**
 * The one blessing config, and the copy the storefront makes from it.
 *
 * docs/plans/v1.4/shop-simple.md, "Blessing": a single row in
 * shop_blessing_config (20260905_shop_simple.sql) edited from /admin/shop:
 * enabled, the parish name, the owner's copy, and a handling charge in
 * cents. Per product there is only blessing_available, on or off. Nothing
 * per product is duplicated, so a changed sentence changes everywhere.
 *
 * TOLERANT OF THE TABLE BEING ABSENT. The migration is not signed off. A
 * missing table (PGRST205 through supabase-js, 42P01 direct) reads as
 * "disabled", as does an unreadable one, so no page and no checkout can 500
 * on it. Disabled means: no note on the product page, no blessing flag on an
 * order, no handling line.
 *
 * COOKIE-LESS anon client, for the same reason lib/shop/catalog.ts uses one:
 * this is read from the product API and from checkout, and the config's own
 * RLS (public select where enabled) is exactly the predicate a public reader
 * wants. The admin route writes it with the service role and reads it
 * through readBlessingConfig with that client, so the owner sees a disabled
 * config too.
 */

export type BlessingConfig = {
  enabled: boolean;
  parishName: string;
  copyMd: string;
  handlingCents: number;
  updatedAt: string | null;
};

export const DISABLED_BLESSING: BlessingConfig = {
  enabled: false,
  parishName: "",
  copyMd: "",
  handlingCents: 0,
  updatedAt: null,
};

/** The line item title when the config carries a handling charge. */
export const BLESSING_HANDLING_TITLE = "Handling for blessing";

type Row = {
  enabled?: boolean | null;
  parish_name?: string | null;
  copy_md?: string | null;
  handling_cents?: number | null;
  updated_at?: string | null;
};

type ConfigReader = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        value: number,
      ) => {
        maybeSingle: () => PromiseLike<{
          data: Row | null;
          error: { code?: string | null; message?: string | null } | null;
        }>;
      };
    };
  };
};

function fromRow(row: Row | null): BlessingConfig {
  if (!row) return DISABLED_BLESSING;
  const handling = Number(row.handling_cents ?? 0);
  return {
    enabled: Boolean(row.enabled),
    parishName: (row.parish_name ?? "").trim(),
    copyMd: row.copy_md ?? "",
    handlingCents: Number.isFinite(handling) && handling > 0 ? Math.round(handling) : 0,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * Read the config with whichever client the caller holds. Absent table,
 * failed read, or a thrown fetch all come back as DISABLED_BLESSING; the
 * absent-table case is silent because it is the expected state until the
 * migration is applied, the others are logged.
 */
export async function readBlessingConfig(db: ConfigReader): Promise<BlessingConfig> {
  try {
    const { data, error } = await db
      .from("shop_blessing_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      if (!isTableAbsent(error)) {
        console.warn("[shop] blessing config read failed", error.message);
      }
      return DISABLED_BLESSING;
    }
    return fromRow(data);
  } catch (e) {
    console.warn("[shop] blessing config read threw", e instanceof Error ? e.message : e);
    return DISABLED_BLESSING;
  }
}

function anonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

/** The public read: enabled configs only, by the table's own policy. */
export function getBlessingConfig(): Promise<BlessingConfig> {
  return readBlessingConfig(anonClient() as unknown as ConfigReader);
}

/**
 * The same read through a real supabase-js client, typically the service
 * role from an admin route or page. The cast is here rather than at each
 * call site because checking SupabaseClient against ConfigReader's small
 * structural shape sends tsc into "excessively deep" instantiation.
 */
export function readBlessingConfigWith(client: SupabaseClient): Promise<BlessingConfig> {
  return readBlessingConfig(client as unknown as ConfigReader);
}

/**
 * Whether this product, on this config, may carry a blessing. One predicate
 * for the product API, the checkout, and the tests.
 */
export function blessingOffered(
  product: { blessing_available?: boolean | null },
  config: BlessingConfig,
): boolean {
  return config.enabled && product.blessing_available === true;
}
