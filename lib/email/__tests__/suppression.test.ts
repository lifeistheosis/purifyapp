import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { applyEvent, bareAddress, blocks, SOFT_BOUNCE_LIMIT, type SuppressionRow } from "../suppression";

const row = (over: Partial<SuppressionRow> = {}): SuppressionRow => ({
  email: "a@b.c",
  hard: false,
  complained: false,
  soft_bounces: 0,
  ...over,
});

describe("the do-not-send rule", () => {
  it("lets an address with no row through", () => {
    expect(blocks(undefined, true)).toBe(false);
  });

  it("stops all mail after a hard bounce", () => {
    expect(blocks(row({ hard: true }), false)).toBe(true);
    expect(blocks(row({ hard: true }), true)).toBe(true);
  });

  it("stops all mail after three soft bounces, not before", () => {
    expect(blocks(row({ soft_bounces: SOFT_BOUNCE_LIMIT - 1 }), true)).toBe(false);
    expect(blocks(row({ soft_bounces: SOFT_BOUNCE_LIMIT }), false)).toBe(true);
  });

  it("stops list mail after a complaint, but not a receipt", () => {
    expect(blocks(row({ complained: true }), true)).toBe(true);
    expect(blocks(row({ complained: true }), false)).toBe(false);
  });
});

describe("an event on the list", () => {
  it("counts a soft bounce and marks a permanent one hard", () => {
    expect(applyEvent(undefined, { kind: "bounce", email: "X@Y.z", permanent: false, detail: "" })).toEqual(
      row({ email: "x@y.z", soft_bounces: 1 }),
    );
    expect(applyEvent(row({ soft_bounces: 2 }), { kind: "bounce", email: "a@b.c", permanent: true, detail: "" }).hard).toBe(true);
  });

  it("treats Resend's own suppression as final, and a complaint as a complaint", () => {
    expect(applyEvent(undefined, { kind: "suppressed", email: "a@b.c", detail: "" }).hard).toBe(true);
    expect(applyEvent(row(), { kind: "complaint", email: "a@b.c", detail: "" })).toEqual(row({ complained: true }));
  });

  it("reads the address out of a named one", () => {
    expect(bareAddress("Edgar <Legal@PurifyApp.net>")).toBe("legal@purifyapp.net");
    expect(bareAddress(" a@b.c ")).toBe("a@b.c");
  });
});

describe("the sender", () => {
  const send = fs.readFileSync(path.join(process.cwd(), "lib/email/send.ts"), "utf8");

  it("never falls back to Resend's test address", () => {
    expect(send).not.toContain("onboarding@resend.dev\"");
    expect(send).toContain('code: "no_sender"');
  });

  it("checks the list before every send and keys each send for Resend", () => {
    expect(send).toContain("suppressedAmong(all, marketing)");
    expect(send).toContain("idempotencyKey");
  });

  it("sends replies to the support inbox, not a personal address", () => {
    expect(send).not.toContain("lifeistheosis@gmail.com");
    expect(send).toContain('DEFAULT_REPLY_TO = "support@purifyapp.net"');
  });
});

describe("the 1.8 email fixes, held in place", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("does not send a release to an account made after it went out", async () => {
    vi.resetModules();
    const { madeBy } = await import("../jobs");
    const accounts = [
      { id: "old", createdAt: "2026-10-20T10:00:00Z" },
      { id: "new", createdAt: "2026-10-22T10:00:00Z" },
    ];
    expect(madeBy(accounts, "2026-10-20T20:40:00Z").map((a) => a.id)).toEqual(["old"]);
  });

  it("gives the monthly note its own list, stored where the jobs table accepts it", async () => {
    const { listOfJob, storedAudience } = await import("../jobs");
    expect(storedAudience("monthly_note")).toBe("product_updates");
    expect(listOfJob({ kind: "monthly", audience: "product_updates" })).toBe("monthly_note");
    expect(listOfJob({ kind: "weekly", audience: "product_updates" })).toBe("product_updates");
    expect(listOfJob({ kind: "release", audience: "all_accounts" })).toBe("release_news");
  });

  it("tells the buyer about a refund on both paths", () => {
    const route = read("app/api/admin/shop/refunds/route.ts");
    expect(route.match(/sendOrderRefundedEmail\(/g)?.length).toBe(2);
  });
});
