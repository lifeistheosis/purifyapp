// Apple's hidden address, and the readers a bulk send leaves out until Apple
// accepts our mail (lib/email/appleRelay.ts).
//
// On 2026-10-06 the 1.5 release email had gone to 1,571 accounts and 80 of
// them had bounced, every one at privaterelay.appleid.com, each marked by
// Resend "Unauthorized Sender to Apple Private Relay". 153 of the 768 still
// owed it held the same kind of address. These tests hold what was built that
// afternoon: such a reader stays owed, is not tried, and is counted and said.

import { describe, expect, it } from "vitest";

import { appleRelayReady, appleWaitLine, heldForApple, isAppleRelay, waitingAmong } from "../appleRelay";
import { planBatch, type Candidate } from "../audienceOrder";

type Reader = Candidate & { email: string };

const reader = (id: string, email: string, createdAt = "2026-08-01T00:00:00Z"): Reader => ({
  id,
  email,
  createdAt,
  lastSignInAt: null,
  received: 0,
});

const HIDDEN = "abc123xyz@privaterelay.appleid.com";

describe("telling one of Apple's hidden addresses", () => {
  it("knows the address by where it ends", () => {
    expect(isAppleRelay(HIDDEN)).toBe(true);
    expect(isAppleRelay("  ABC@PrivateRelay.AppleID.com ")).toBe(true);
  });

  it("does not mistake an ordinary Apple address, or a lookalike, for one", () => {
    expect(isAppleRelay("reader@icloud.com")).toBe(false);
    expect(isAppleRelay("reader@me.com")).toBe(false);
    expect(isAppleRelay("reader@privaterelay.appleid.com.example.org")).toBe(false);
    expect(isAppleRelay("privaterelay.appleid.com@gmail.com")).toBe(false);
    expect(isAppleRelay("")).toBe(false);
    expect(isAppleRelay(null)).toBe(false);
  });
});

describe("whether Apple accepts our mail yet", () => {
  it("is no until the owner says the sender is registered", () => {
    expect(appleRelayReady({})).toBe(false);
    expect(appleRelayReady({ EMAIL_APPLE_RELAY: "" })).toBe(false);
    expect(appleRelayReady({ EMAIL_APPLE_RELAY: "soon" })).toBe(false);
    expect(appleRelayReady({ EMAIL_APPLE_RELAY: "1" })).toBe(false);
  });

  it("is yes on the one word", () => {
    expect(appleRelayReady({ EMAIL_APPLE_RELAY: "ready" })).toBe(true);
    expect(appleRelayReady({ EMAIL_APPLE_RELAY: " Ready " })).toBe(true);
  });
});

describe("who a bulk send leaves out", () => {
  const people = [
    reader("a", "a@gmail.com"),
    reader("b", HIDDEN),
    reader("c", "c@icloud.com"),
    reader("d", "other@privaterelay.appleid.com"),
    reader("e", "e@gmail.com"),
  ];

  it("holds every hidden address while Apple refuses us", () => {
    expect([...heldForApple(people, {})].sort()).toEqual(["b", "d"]);
  });

  it("holds nobody once Apple is ready", () => {
    expect(heldForApple(people, { EMAIL_APPLE_RELAY: "ready" }).size).toBe(0);
  });

  it("plans a batch without them, and still counts them as owed", () => {
    const wait = waitingAmong(people, undefined, {});
    const plan = planBatch({ candidates: people, done: new Set(), resting: wait.leaveOut, order: "oldest", room: 100 });
    expect(plan.batch.map((p) => p.id).sort()).toEqual(["a", "c", "e"]);
    expect(plan.owed).toBe(5);
    expect(wait.onApple).toBe(2);
    expect(wait.resting).toBe(0);
  });

  it("keeps the one-a-week rule beside it, and counts a reader under both once, as Apple's", () => {
    const resting = new Set(["a", "b"]);
    const wait = waitingAmong(people, resting, {});
    expect(wait.onApple).toBe(2);
    expect(wait.resting).toBe(1);
    expect([...wait.leaveOut].sort()).toEqual(["a", "b", "d"]);
  });

  it("sends to them on the first run after Apple is ready", () => {
    const wait = waitingAmong(people, undefined, { EMAIL_APPLE_RELAY: "ready" });
    const plan = planBatch({ candidates: people, done: new Set(["a", "c", "e"]), resting: wait.leaveOut, order: "oldest", room: 100 });
    expect(plan.batch.map((p) => p.id).sort()).toEqual(["b", "d"]);
    expect(wait.onApple).toBe(0);
  });

  it("only looks at readers still owed it", () => {
    // The 80 who were already sent to (and bounced) are done, not waiting.
    const owed = people.filter((p) => p.id !== "b");
    expect(waitingAmong(owed, undefined, {}).onApple).toBe(1);
  });
});

describe("the line a send shows", () => {
  it("says how many are waiting and on whom", () => {
    expect(appleWaitLine(153)).toBe("153 use Apple's hidden address and wait until Apple accepts our mail.");
  });

  it("says nothing when nobody is", () => {
    expect(appleWaitLine(0)).toBeNull();
  });
});
