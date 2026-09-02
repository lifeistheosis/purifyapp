// agoLabel is the part of the live feed a person actually reads, and it is
// pure, so it gets tested directly.
//
// The hook itself still needs a DOM this node suite does not have, but that no
// longer means its behaviour is untested: the polling, sharing and failure
// rules were moved into lib/admin/liveStore.ts precisely so they could be
// driven here, and liveStore.test.ts does that. What is left in the hook is
// the useSyncExternalStore binding, which is verified in the browser.

import { describe, expect, it } from "vitest";
import { agoLabel } from "../useLiveData";

const AT = new Date("2026-08-21T12:00:00Z");
const at = (secondsLater: number) => AT.getTime() + secondsLater * 1000;

describe("agoLabel", () => {
  it("says never before the first successful sync", () => {
    // Not "just now". A panel that has never loaded must not read as fresh,
    // which is the whole failure this label exists to prevent.
    expect(agoLabel(null)).toBe("never");
  });

  it("holds at 'just now' only briefly", () => {
    expect(agoLabel(AT, at(0))).toBe("just now");
    expect(agoLabel(AT, at(9))).toBe("just now");
    expect(agoLabel(AT, at(10))).toBe("10s ago");
  });

  it("counts seconds, then minutes, then hours", () => {
    expect(agoLabel(AT, at(45))).toBe("45s ago");
    expect(agoLabel(AT, at(90))).toBe("2m ago");
    expect(agoLabel(AT, at(60 * 59))).toBe("59m ago");
    expect(agoLabel(AT, at(60 * 90))).toBe("2h ago");
  });

  it("never reports the future as an age", () => {
    // Clock skew between the server stamp and the browser is real, and a
    // panel reading "-3s ago" looks broken in a way that costs trust in every
    // other number beside it.
    expect(agoLabel(AT, at(-30))).toBe("just now");
  });
});
