// The catalogue and a seller's fees are read whole.
//
// The API returns at most 1,000 rows a request and says nothing when it stops
// (docs/audit/findings.yaml F-31, F-38). The app builds one page per product
// slug, so a slug list cut at a thousand is a piece with no page in the app.
// The stand-in here caps the way the real API does.

import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cappedApi, type ApiRequest } from "@/lib/supabase/__tests__/cappedApi";

let client: SupabaseClient;
let requests: ApiRequest[] = [];
vi.mock("@supabase/ssr", () => ({ createServerClient: () => client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }));

const { listPublishedProductSlugs } = await import("../catalog");
const { getOrderFees } = await import("../payouts");

const pad = (i: number) => String(i).padStart(5, "0");

describe("listPublishedProductSlugs", () => {
  it("names every published piece, past the first thousand, and no deleted or unpublished one", async () => {
    ({ client } = cappedApi({
      shop_products: [
        ...Array.from({ length: 1300 }, (_, i) => ({ id: `p${pad(i)}`, slug: `icon-${pad(i)}`, status: "published", deleted_at: null })),
        { id: "x1", slug: "taken-down", status: "published", deleted_at: "2026-09-01T00:00:00Z" },
        { id: "x2", slug: "not-yet", status: "draft", deleted_at: null },
      ],
    }));
    const slugs = await listPublishedProductSlugs();
    expect(slugs).toHaveLength(1300);
    expect(slugs).toContain("icon-01299");
    expect(slugs).not.toContain("taken-down");
    expect(slugs).not.toContain("not-yet");
  });

  it("answers nothing when the catalogue cannot be read", async () => {
    ({ client } = cappedApi({ shop_products: { error: { message: "down" } } }));
    expect(await listPublishedProductSlugs()).toEqual([]);
  });
});

describe("getOrderFees", () => {
  const fees = Array.from({ length: 250 }, (_, i) => ({
    order_id: `o${pad(i)}`,
    stripe_account_id: "acct_1",
    commission_rate_bps: 1000,
    commission_base_cents: 4000,
    application_fee_cents: 400,
  }));

  it("finds the fee for every order, a hundred ids a request", async () => {
    ({ client, requests } = cappedApi({ shop_order_fees: fees }));
    const out = await getOrderFees(fees.map((f) => f.order_id));
    expect(out.size).toBe(250);
    expect(out.get("o00249")?.application_fee_cents).toBe(400);
    expect(requests.map((r) => r.rows)).toEqual([100, 100, 50]);
  });

  it("answers no fees at all, not some of them, when a request fails", async () => {
    ({ client } = cappedApi({ shop_order_fees: fees }, {}, { fail: ({ n }) => (n === 2 ? { message: "down" } : null) }));
    const out = await getOrderFees(fees.map((f) => f.order_id));
    expect(out.size).toBe(0);
  });
});
