import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

import type { UpgradeFeature } from "@/components/billing/UpgradeModal";
import { LOCK_LABELS, LocksPanel, rate } from "@/components/admin/tabs/LocksPanel";
import { COUNT_PLATFORMS } from "@/lib/onboarding/counting";
import { trackEventSchema } from "@/lib/security/schemas";

import { BOUGHT_PLANS, LOCKS, LOCK_EVENTS, isLockEvent, lockEventBody, summarizeLocks, type Lock } from "../lockCounting";

// Which lock a reader taps, and which leads to a purchase (1.9, item 12 of
// docs/1.9-build/PLAN.md): totals with no reader in them. These hold that the
// lists are the upgrade sheet's own, that the server takes nothing off them,
// that the sheet counts where it opens and where a purchase in it goes
// through, and the admin's sums.

// The panel's one read, answered here: a server render runs no effect, so the
// hook's answer is what the panel draws.
const fetched = vi.hoisted(() => ({ data: null as unknown, error: null as string | null }));
vi.mock("@/components/admin/adminFetch", () => ({ useAdminFetch: () => ({ data: fetched.data, error: fetched.error, reload: () => {} }) }));

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

// Compile-time: the locks are exactly the names the sheet opens on, both ways.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const same: Same<Lock, UpgradeFeature> = true;

describe("the locks' counts", () => {
  it("are the names the upgrade sheet opens on, every one, and no other", () => {
    expect(same).toBe(true);
    const sheet = read("components/billing/UpgradeModal.tsx");
    const block = sheet.slice(sheet.indexOf("export type UpgradeFeature ="), sheet.indexOf(";", sheet.indexOf("export type UpgradeFeature =")));
    const named = [...block.matchAll(/\| "([a-z]+)"/g)].map((m) => m[1]).sort();
    expect(named).toEqual([...LOCKS].sort());
  });

  it("knows its own event names", () => {
    for (const name of LOCK_EVENTS) expect(isLockEvent(name)).toBe(true);
    expect(isLockEvent("screen_closed")).toBe(false);
    expect(isLockEvent("onboarding_finished")).toBe(false);
  });

  it("name every lock in the admin, and say a rate plainly", () => {
    for (const lock of LOCKS) expect(LOCK_LABELS[lock], lock).toMatch(/\S/);
    expect(rate({ taps: 0, bought: 0 })).toBe("-");
    expect(rate({ taps: 40, bought: 2 })).toBe("5.0%");
    expect(rate({ taps: 40, bought: 10 })).toBe("25%");
    expect(rate({ taps: 3, bought: 0 })).toBe("0%");
  });
});

describe("what the device sends is what the server takes", () => {
  const parse = (body: string) => trackEventSchema.safeParse(JSON.parse(body));

  it("every lock met, and every purchase from every lock, on every plan, from every kind of device", () => {
    for (const platform of COUNT_PLATFORMS) {
      for (const lock of LOCKS) {
        expect(parse(lockEventBody({ name: "lock_tapped", props: { lock } }, platform)).success, `${lock} ${platform}`).toBe(true);
        for (const plan of BOUGHT_PLANS) {
          expect(parse(lockEventBody({ name: "plus_bought", props: { lock, plan } }, platform)).success, `${lock} ${plan}`).toBe(true);
        }
      }
    }
  });

  it("sends nothing but the event and the kind of device", () => {
    expect(JSON.parse(lockEventBody({ name: "plus_bought", props: { lock: "plans", plan: "yearly" } }, "android"))).toEqual({
      name: "plus_bought",
      props: { lock: "plans", plan: "yearly", platform: "android" },
    });
  });
});

describe("the server takes only what is on the lists", () => {
  const take = (name: string, props: Record<string, unknown>) => trackEventSchema.safeParse({ name, props }).success;

  it("refuses a lock, a plan or a device it does not know", () => {
    expect(take("lock_tapped", { lock: "plans", platform: "web" })).toBe(true);
    expect(take("lock_tapped", { lock: "/plans/gospels", platform: "web" })).toBe(false);
    expect(take("lock_tapped", { lock: "plans", platform: "linux" })).toBe(false);
    expect(take("lock_tapped", { lock: "plans" })).toBe(false);
    expect(take("plus_bought", { lock: "plans", plan: "weekly", platform: "web" })).toBe(false);
    expect(take("plus_bought", { lock: "plans", platform: "web" })).toBe(false);
  });

  it("refuses anything that could name a reader, or a price", () => {
    expect(take("lock_tapped", { lock: "plans", platform: "web", userId: "00000000-0000-4000-8000-000000000000" })).toBe(false);
    expect(take("plus_bought", { lock: "plans", plan: "yearly", platform: "ios", email: "reader@example.com" })).toBe(false);
    expect(take("plus_bought", { lock: "plans", plan: "yearly", platform: "ios", price: 7199 })).toBe(false);
    expect(take("lock_tapped", { lock: "plans", platform: "web", page: "/plans/gospels" })).toBe(false);
  });

  it("keeps them to the day, as the screens' and the onboarding's", () => {
    const route = read("app/api/track/event/route.ts");
    expect(route).toMatch(/const toTheDay = name\.startsWith\("onboarding_"\) \|\| isScreenEvent\(name\) \|\| isLockEvent\(name\);/);
  });
});

describe("the upgrade sheet counts", () => {
  const sheet = read("components/billing/UpgradeModal.tsx");

  it("the lock it opens on, as it opens", () => {
    const open = sheet.slice(sheet.indexOf("const open = useCallback("), sheet.indexOf("setFeature(next);"));
    expect(open).toContain("countLock(next);");
  });

  it("a purchase only when it went through, from the lock the sheet opened on, in the apps and on the website", () => {
    const buy = sheet.slice(sheet.indexOf("const buy = useCallback("), sheet.indexOf("const restorePurchases"));
    const counted = [...buy.matchAll(/if \(outcome === "active"\) \{\s*emitEntitlementsChanged\(\);[\s\S]*?countBought\(feature \?\? "general", plan\);\s*\}/g)];
    expect(counted).toHaveLength(2);
    expect(buy).toMatch(/\}, \[plan, feature\]\);/);
    // A restore is the store's answer about a purchase made before, never a purchase.
    const restore = sheet.slice(sheet.indexOf("const restorePurchases"), sheet.indexOf("const restorePurchases") + 600);
    expect(restore).not.toContain("countBought");
  });

  it("and the privacy page says so", () => {
    const privacy = read("app/(app)/privacy/page.tsx");
    expect(privacy).toContain("What Purify Plus is wanted for is counted in the same table.");
  });
});

describe("the admin's sums", () => {
  it("a row a lock, the most met first, a purchase under the lock its sheet opened on", () => {
    const rows = [
      { name: "lock_tapped", props: { lock: "plans", platform: "android" } },
      { name: "lock_tapped", props: { lock: "plans", platform: "web" } },
      { name: "lock_tapped", props: { lock: "ambience", platform: "android" } },
      { name: "lock_tapped", props: { lock: "general", platform: "web" } },
      { name: "plus_bought", props: { lock: "plans", plan: "yearly", platform: "android" } },
      { name: "plus_bought", props: { lock: "ambience", plan: "monthly", platform: "android" } },
    ];
    const sums = summarizeLocks(rows);
    expect(sums.taps).toBe(4);
    expect(sums.bought).toBe(2);
    expect(sums.locks).toEqual([
      { lock: "plans", taps: 2, bought: 1, yearly: 1, monthly: 0 },
      { lock: "ambience", taps: 1, bought: 1, yearly: 0, monthly: 1 },
      { lock: "general", taps: 1, bought: 0, yearly: 0, monthly: 0 },
    ]);
  });

  it("leaves out what it cannot read, rather than guess", () => {
    const sums = summarizeLocks([
      { name: "lock_tapped", props: { lock: "a-lock-from-later", platform: "web" } },
      { name: "plus_bought", props: { lock: "plans", plan: "weekly", platform: "web" } },
      { name: "plus_bought", props: null },
      { name: "screen_closed", props: { screen: "saint", open: "1m-5m", platform: "web" } },
    ]);
    expect(sums).toEqual({ locks: [], taps: 0, bought: 0 });
  });
});

describe("the admin's Locks panel", () => {
  const draw = (data: unknown, error: string | null = null) => {
    fetched.data = data;
    fetched.error = error;
    return renderToStaticMarkup(createElement(LocksPanel));
  };

  it("draws the four numbers and a row a lock, by the paywall's names", () => {
    const html = draw({
      absent: false,
      truncated: false,
      days: 30,
      taps: 4,
      bought: 2,
      locks: [
        { lock: "plans", taps: 2, bought: 1, yearly: 1, monthly: 0 },
        { lock: "ambience", taps: 1, bought: 1, yearly: 0, monthly: 1 },
        { lock: "general", taps: 1, bought: 0, yearly: 0, monthly: 0 },
      ],
    });
    for (const words of ["Locks met", "Bought in the sheet", "Most met", "Sells the most", "Reading plans", "Ambience", "The Plus button (no lock)", "50%", "100%"]) {
      expect(html, words).toContain(words);
    }
    // The Plus button is no lock: three met, not four.
    expect(html).toMatch(/Locks met[\s\S]*?>3</);
    expect(html).not.toContain("\u2014");
  });

  it("says when there is nothing to count, or it could not read", () => {
    expect(draw({ absent: true })).toContain("Not counting yet");
    expect(draw({ unavailable: "permission denied" })).toContain("permission denied");
    expect(draw(null, "Couldn't load (are the migrations applied?).")).toContain("Couldn&#x27;t load");
    expect(draw(null)).toContain("Loading.");
  });
});
