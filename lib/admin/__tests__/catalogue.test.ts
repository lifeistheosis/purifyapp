import { describe, expect, it } from "vitest";

import {
  inShelfView,
  isCutout,
  keepBar,
  latestChecks,
  matchesPiece,
  shelfCounts,
  shelfState,
  shelfWarning,
  STATE_MARK,
  stockLine,
} from "../catalogue";

/**
 * The Catalogue shelf (the owner's pick A). What would go wrong if this
 * broke: a hidden piece counted as on sale, a margin shown for a piece with
 * no recorded cost, a card dashed for nothing (or not dashed when Temu's
 * price moved), or a stock count passed off as shippable when the split is
 * not recorded.
 */

describe("a piece's state", () => {
  it("is drawn by shape: Live solid, Hidden dashed, Draft a ring, Paused grey", () => {
    expect(shelfState({ status: "published" }, false)).toBe("live");
    expect(shelfState({ status: "published" }, true)).toBe("hidden");
    expect(shelfState({ status: "draft" }, false)).toBe("draft");
    expect(shelfState({ status: "paused" }, true)).toBe("paused");
    expect(shelfState({ status: "archived" }, false)).toBe("archived");
    expect(STATE_MARK).toEqual({ live: "done", hidden: "late", draft: "wait", paused: "idle", archived: "idle" });
  });

  it("counts the hidden ones under Live, as published pieces, and everything under All", () => {
    const states = ["live", "live", "hidden", "draft", "paused", "archived"] as const;
    expect(shelfCounts(states)).toEqual({ live: 3, drafts: 1, paused: 1, all: 6 });
    expect(inShelfView("archived", "live")).toBe(false);
    expect(inShelfView("archived", "all")).toBe(true);
  });
});

describe("what a sale keeps", () => {
  it("splits the price into Temu, the card fee and what is kept", () => {
    const bar = keepBar(2400, 610);
    expect(bar.keeps).toBe(70);
    expect(Math.round(bar.costPct + bar.feePct + bar.keepPct)).toBe(100);
    expect(bar.costKnown).toBe(true);
  });

  it("shows no percentage for a piece with no recorded cost", () => {
    const bar = keepBar(2400, null);
    expect(bar.keeps).toBeNull();
    expect(bar.keepPct).toBe(0);
    expect(bar.costKnown).toBe(false);
  });

  it("draws nothing for a free piece", () => {
    expect(keepBar(0, 100).keeps).toBeNull();
  });
});

describe("a dashed card", () => {
  const check = (over: Partial<{ outcome: string; cost_cents: number | null; price_cents: number }>) => ({
    outcome: "changed",
    cost_cents: 1120,
    price_cents: 3600,
    created_at: "2026-10-29T10:00:00Z",
    ...over,
  });

  it("says Temu's new price when it moved and the price has not been looked at since", () => {
    expect(shelfWarning({ price_cents: 3600 }, 1120, check({}))).toEqual({ kind: "moved", text: "Temu now $11.20" });
  });

  it("stops once the price was changed or the cost checked again", () => {
    expect(shelfWarning({ price_cents: 3800 }, 1120, check({}))).toBeNull();
    expect(shelfWarning({ price_cents: 3600 }, 1120, check({ outcome: "ok" }))).toBeNull();
  });

  it("says when the listing is gone, and when the price loses money", () => {
    expect(shelfWarning({ price_cents: 3600 }, 1120, check({ outcome: "not-found" }))?.kind).toBe("gone");
    expect(shelfWarning({ price_cents: 1000 }, 1000, null)).toEqual({ kind: "loss", text: "Loses money at this price" });
    expect(shelfWarning({ price_cents: 2400 }, 610, null)).toBeNull();
  });

  it("keeps the latest check per piece", () => {
    const out = latestChecks([
      { product_id: "a", outcome: "ok", cost_cents: 900, price_cents: 3600, created_at: "2026-10-01T00:00:00Z" },
      { product_id: "a", outcome: "changed", cost_cents: 1120, price_cents: 3600, created_at: "2026-10-29T00:00:00Z" },
      { product_id: "b", outcome: "ok", cost_cents: 300, price_cents: 1400, created_at: "2026-10-02T00:00:00Z" },
    ]);
    expect(out.a.outcome).toBe("changed");
    expect(out.b.cost_cents).toBe(300);
  });
});

describe("stock and the rest of the card", () => {
  it("names the one count general stock and never splits it by guess", () => {
    expect(stockLine(3)).toEqual({ count: 3, word: "in stock" });
    expect(stockLine(null)).toEqual({ count: null, word: "not counted" });
  });

  it("shows a cut-out photo whole and a photograph filling its box", () => {
    expect(isCutout("/shop/media/greek-33-knot-prayer-rope.png")).toBe(true);
    expect(isCutout("https://x.supabase.co/a/theotokos.jpg?v=2")).toBe(false);
    expect(isCutout(null)).toBe(false);
  });

  it("searches the title, slug and anything else a piece is known by", () => {
    const p = { title: "Greek prayer rope, 33 knots", slug: "greek-33-knot-prayer-rope", category: "prayer_corner" };
    expect(matchesPiece(p, [], "rope")).toBe(true);
    expect(matchesPiece(p, ["temu.com"], "TEMU")).toBe(true);
    expect(matchesPiece(p, [], "icon")).toBe(false);
  });
});
