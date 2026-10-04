// The SQL that counts the Engagement, Content and Audience tabs, held to what
// the code calls and to who may call it. The tally rules themselves are in
// rollups.test.ts.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { ROLLUP_MIGRATION } from "../rollups";

const SQL = fs.readFileSync(path.join(process.cwd(), ROLLUP_MIGRATION), "utf8");

describe("the rollup migration", () => {
  it("defines the two functions the code calls, returning one row of jsonb", () => {
    for (const name of ["admin_pageview_rollup", "admin_audience_rollup"]) {
      expect(SQL).toMatch(new RegExp(`create or replace function public\\.${name}\\(p_since timestamptz\\)\\s+returns jsonb`));
    }
  });

  it("closes them, and the three that were open, to anon and authenticated by name", () => {
    // `revoke ... from public` is not enough on Supabase: anon and
    // authenticated hold their own grants on every new function. Leaving them
    // out is how anyone with the public key could read the daily visitor
    // counts until 2026-10-03.
    for (const fn of ["admin_pageview_rollup(timestamptz)", "admin_audience_rollup(timestamptz)"]) {
      expect(SQL).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
      expect(SQL).toContain(`grant execute on function public.${fn} to service_role;`);
    }
    for (const fn of ["analytics_daily_buckets(timestamptz, int)", "shop_reviews_resync(uuid)", "shop_store_reviews_resync(uuid)"]) {
      expect(SQL).toContain(`revoke execute on function public.${fn} from public, anon, authenticated;`);
    }
  });

  it("uses the browser tests the code uses, in the same order", () => {
    const order = ["'edg/'", "'chrome/'", "'firefox/'", "'safari/'", "'bot|crawl|spider'"].map((t) => SQL.indexOf(t));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
