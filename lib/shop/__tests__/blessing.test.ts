import { describe, expect, it } from "vitest";

import {
  blessingOffered,
  DISABLED_BLESSING,
  readBlessingConfig,
} from "../blessing";

/** A client whose one read answers with the given row or error. */
function reader(answer: {
  data?: Record<string, unknown> | null;
  error?: { code?: string; message?: string } | null;
}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: answer.data ?? null, error: answer.error ?? null }),
        }),
      }),
    }),
  };
}

describe("readBlessingConfig", () => {
  it("is disabled when the table is absent, as PostgREST reports it", async () => {
    const db = reader({
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.shop_blessing_config' in the schema cache",
      },
    });
    await expect(readBlessingConfig(db)).resolves.toEqual(DISABLED_BLESSING);
  });

  it("is disabled when the table is absent, as Postgres reports it", async () => {
    const db = reader({ error: { code: "42P01", message: "relation does not exist" } });
    await expect(readBlessingConfig(db)).resolves.toEqual(DISABLED_BLESSING);
  });

  it("is disabled when there is no row (the anon policy hides a disabled config)", async () => {
    await expect(readBlessingConfig(reader({ data: null }))).resolves.toEqual(DISABLED_BLESSING);
  });

  it("is disabled when the read throws, rather than 500ing a page", async () => {
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.reject(new TypeError("fetch failed")),
          }),
        }),
      }),
    };
    await expect(readBlessingConfig(db)).resolves.toEqual(DISABLED_BLESSING);
  });

  it("maps a live row and never carries a negative handling charge", async () => {
    const cfg = await readBlessingConfig(
      reader({
        data: {
          enabled: true,
          parish_name: "  St Nicholas  ",
          copy_md: "Blessed after Liturgy.",
          handling_cents: 350,
          updated_at: "2026-09-05T00:00:00Z",
        },
      }),
    );
    expect(cfg).toEqual({
      enabled: true,
      parishName: "St Nicholas",
      copyMd: "Blessed after Liturgy.",
      handlingCents: 350,
      updatedAt: "2026-09-05T00:00:00Z",
    });
    const neg = await readBlessingConfig(
      reader({ data: { enabled: true, handling_cents: -5 } }),
    );
    expect(neg.handlingCents).toBe(0);
  });
});

describe("blessingOffered", () => {
  const on = { ...DISABLED_BLESSING, enabled: true };
  it("needs both the product flag and the config", () => {
    expect(blessingOffered({ blessing_available: true }, on)).toBe(true);
    expect(blessingOffered({ blessing_available: true }, DISABLED_BLESSING)).toBe(false);
    expect(blessingOffered({ blessing_available: false }, on)).toBe(false);
    // The column is absent before the migration: no offer, no error.
    expect(blessingOffered({}, on)).toBe(false);
  });
});
