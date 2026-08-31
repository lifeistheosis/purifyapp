import { afterEach, describe, expect, it } from "vitest";

import { inflate, installLarpWriteGuard } from "../larp";

/**
 * Larp mode is a demo illusion, and the thing that makes it safe is what it
 * REFUSES to touch. A blanket multiply breaks the panel in ways that look like
 * bugs rather than like a demo: ids stop matching their rows, timestamps land
 * in the next century, percentages read 18400%, and a page limit of 50 becomes
 * a request for twenty thousand rows.
 *
 * So these mostly assert the deny list. The inflation itself is one line.
 */

describe("what larp inflates", () => {
  it("raises money and population", () => {
    const out = inflate({
      revenueCents: 1998,
      totalUsers: 3,
      unitsSold: 1,
      subscribers: 2,
    });
    expect(out.revenueCents).toBeGreaterThan(1998 * 100);
    expect(out.totalUsers).toBeGreaterThan(3 * 100);
    expect(out.unitsSold).toBeGreaterThan(1);
    expect(out.subscribers).toBeGreaterThan(2);
  });

  it("keeps whole things whole", () => {
    // A subscriber count of 1840.5 is a tell.
    const out = inflate({ totalUsers: 3, visitors: 8880 });
    expect(Number.isInteger(out.totalUsers)).toBe(true);
    expect(Number.isInteger(out.visitors)).toBe(true);
  });

  it("is stable across calls, so the panel does not flicker", () => {
    const a = inflate({ revenueCents: 1998 });
    const b = inflate({ revenueCents: 1998 });
    expect(a.revenueCents).toBe(b.revenueCents);
  });

  it("reaches into arrays and nested objects", () => {
    const out = inflate({
      shop: { netCents: 1998 },
      revenueSeries: [{ netCents: 100 }, { netCents: 200 }],
    });
    expect(out.shop.netCents).toBeGreaterThan(1998);
    expect(out.revenueSeries[0].netCents).toBeGreaterThan(100);
  });
});

describe("what larp must never touch", () => {
  it("leaves identity alone", () => {
    const out = inflate({ id: 42, user_id: 7, product_id: 9, version: 2, code: 200 });
    expect(out).toEqual({ id: 42, user_id: 7, product_id: 9, version: 2, code: 200 });
  });

  it("leaves time alone", () => {
    const out = inflate({ created_at: 1756000000, day: 12, month: 8, year: 2026 });
    expect(out).toEqual({ created_at: 1756000000, day: 12, month: 8, year: 2026 });
  });

  it("leaves proportions alone, or the panel prints 18400%", () => {
    const out = inflate({ percent: 62, conversionRate: 3.4, ratio: 0.5, share: 12 });
    expect(out).toEqual({ percent: 62, conversionRate: 3.4, ratio: 0.5, share: 12 });
  });

  it("leaves query shape alone, or a page turns into a table scan", () => {
    const out = inflate({ limit: 50, offset: 0, page: 2, size: 20 });
    expect(out).toEqual({ limit: 50, offset: 0, page: 2, size: 20 });
  });

  it("leaves a product's own price and cost alone", () => {
    // These are catalogue facts an operator reads to make decisions, not
    // performance figures. A larped price would misprice a real listing in the
    // one screen used to edit it.
    const out = inflate({ price_cents: 1299, supplier_cost_cents: 217 });
    expect(out).toEqual({ price_cents: 1299, supplier_cost_cents: 217 });
  });

  it("leaves geometry and chart ranges alone", () => {
    const out = inflate({ lat: 25.7, lng: -80.1, width: 1000, height: 300, days: 90 });
    expect(out).toEqual({ lat: 25.7, lng: -80.1, width: 1000, height: 300, days: 90 });
  });

  it("passes through anything it does not recognise", () => {
    // The safe direction: an uninflated number is a dull demo, an inflated one
    // that should not have moved is a broken screen.
    const out = inflate({ mysteryNumber: 5, label: "Overview", ok: true, nothing: null });
    expect(out).toEqual({ mysteryNumber: 5, label: "Overview", ok: true, nothing: null });
  });

  it("leaves a zero alone on a key it must never touch", () => {
    // THIS is the zero rule that matters, and it is the reason the seed below
    // sits after the NEVER / INFLATE tests rather than before them. A zero
    // share, a zero page offset and a zero id are all facts. Inventing a
    // number for them would turn a first page into a 4,800th one.
    const out = inflate({ offset: 0, share: 0, page: 0, percent: 0 });
    expect(out).toEqual({ offset: 0, share: 0, page: 0, percent: 0 });
  });
});

describe("a metric that is genuinely zero", () => {
  // This used to assert that zero stayed zero everywhere, which was a
  // description of the arithmetic rather than a rule: nothing multiplies zero
  // into anything. It was also the opposite of what the mode is for. Purify's
  // honest numbers are small and MANY OF THEM ARE ZERO, so on blast the
  // dashboard came out half impressive and half flat line. It is also why the
  // odometer could not be demonstrated on a dev machine, where the admin API
  // answers 403 and every figure is zero.

  it("is given a plausible figure rather than staying flat", () => {
    const out = inflate({ visitors: 0, totalUsers: 0, revenueCents: 0 });
    expect(out.visitors).toBeGreaterThan(0);
    expect(out.totalUsers).toBeGreaterThan(0);
    expect(out.revenueCents).toBeGreaterThan(0);
  });

  it("keeps money an order of magnitude above a head count", () => {
    // Money is in cents throughout this panel, so a count and an amount that
    // seeded into the same band would read as $48 of revenue from 4,800 users.
    const out = inflate({ visitors: 0, revenueCents: 0 });
    expect(out.revenueCents).toBeGreaterThan(out.visitors * 50);
  });

  it("shows the same figure every render, so it does not reshuffle as you look", () => {
    const a = inflate({ visitors: 0 }).visitors;
    const b = inflate({ visitors: 0 }).visitors;
    expect(a).toBe(b);
  });

  it("gives different fields different figures", () => {
    // Seeded from the key. Three cards all reading 4,812 is the tell that
    // makes a screenshot obviously fake.
    const out = inflate({ visitors: 0, signups: 0, orders: 0 });
    expect(new Set([out.visitors, out.signups, out.orders]).size).toBe(3);
  });

  it("still leaves an unrecognised key alone at zero", () => {
    expect(inflate({ mysteryNumber: 0 }).mysteryNumber).toBe(0);
  });
});

describe("it cannot take the panel down", () => {
  it("survives a cycle instead of hanging", () => {
    const a: Record<string, unknown> = { totalUsers: 3 };
    a.self = a;
    expect(() => inflate(a)).not.toThrow();
  });

  it("survives absurd depth", () => {
    let deep: Record<string, unknown> = { totalUsers: 1 };
    for (let i = 0; i < 40; i++) deep = { nested: deep };
    expect(() => inflate(deep)).not.toThrow();
  });

  it("leaves non-finite numbers alone", () => {
    const out = inflate({ totalUsers: NaN, visitors: Infinity });
    expect(Number.isNaN(out.totalUsers)).toBe(true);
    expect(out.visitors).toBe(Infinity);
  });
});

describe("what larp must never touch: the pager", () => {
  it("leaves a bare `total` alone, because UsersTab sends it back as an offset", () => {
    // An inflated total made lastPage 196,150, so Last requested an offset
    // 196,000 rows past the end and the table went blank under a subtitle
    // claiming 196,200 users.
    const out = inflate({ total: 300, offset: 0, pageSize: 50 });
    expect(out).toEqual({ total: 300, offset: 0, pageSize: 50 });
  });

  it("still inflates the headline totals, which is the whole point", () => {
    // The deny entry is anchored for exactly this reason.
    const out = inflate({ totalUsers: 3, total_cents: 4500, totalOrders: 2 });
    expect(out.totalUsers).toBeGreaterThan(3);
    expect(out.total_cents).toBeGreaterThan(4500);
    expect(out.totalOrders).toBeGreaterThan(2);
  });
});

describe("larp mode is read only", () => {
  const realWindow = (globalThis as Record<string, unknown>).window;

  function fakeWindow(larpIsOn: boolean) {
    const seen: Array<{ url: string; method: string }> = [];
    const store = new Map<string, string>();
    if (larpIsOn) store.set("purify:admin:larp", "1");
    const passthrough = (input: unknown, init?: { method?: string }) => {
      seen.push({ url: String(input), method: init?.method ?? "GET" });
      return Promise.resolve(new Response("{}", { status: 200 }));
    };
    const w = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
      fetch: passthrough,
    };
    (globalThis as Record<string, unknown>).window = w;
    return { w, seen, passthrough };
  }

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = realWindow;
  });

  it("refuses a write to /api/admin while it is on, and never lets it leave", async () => {
    // The bug this exists for: SustainabilityTab prefills its amount field
    // from an inflated amount_cents and posts it back, and the route ends with
    // revalidatePath("/support"), so invented money reached a PUBLIC page.
    const { w, seen } = fakeWindow(true);
    const restore = installLarpWriteGuard();
    const res = await w.fetch("/api/admin/sustainability/actions", { method: "POST" });
    expect(res.status).toBe(409);
    expect(seen).toHaveLength(0);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("read only") });
    restore();
  });

  it("still allows reads, or the panel it is meant to demo would not load", async () => {
    const { w, seen } = fakeWindow(true);
    const restore = installLarpWriteGuard();
    const res = await w.fetch("/api/admin/overview");
    expect(res.status).toBe(200);
    expect(seen).toHaveLength(1);
    restore();
  });

  it("does not police anything outside /api/admin", async () => {
    const { w, seen } = fakeWindow(true);
    const restore = installLarpWriteGuard();
    await w.fetch("/api/shop/checkout", { method: "POST" });
    expect(seen).toHaveLength(1);
    restore();
  });

  it("is inert while the mode is off, which is the resting state", async () => {
    const { w, seen } = fakeWindow(false);
    const restore = installLarpWriteGuard();
    await w.fetch("/api/admin/sustainability/actions", { method: "POST" });
    expect(seen).toHaveLength(1);
    restore();
  });

  it("puts the original fetch back, so turning the mode off really releases it", async () => {
    const { w, passthrough, seen } = fakeWindow(true);
    const restore = installLarpWriteGuard();
    expect(w.fetch).not.toBe(passthrough);
    restore();
    expect(w.fetch).toBe(passthrough);
    await w.fetch("/api/admin/sustainability/actions", { method: "POST" });
    expect(seen).toHaveLength(1);
  });
});
