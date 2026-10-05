// A tapped notification opens its screen through the router, because inside
// the shells a hard navigation is always handed the front door. The history
// is in ../open.ts.

import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OPENER_WAIT_MS,
  isAppAddress,
  onlyTheHashChanges,
  openFromPush,
  resetPushOpenForTests,
  setPushOpener,
} from "../open";

describe("opening a tapped notification", () => {
  let assigned: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    resetPushOpenForTests();
    assigned = [];
    (globalThis as { window?: unknown }).window = { location: { assign: (url: string) => void assigned.push(url) } };
  });

  afterEach(() => {
    resetPushOpenForTests();
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  it("goes through the app's router and never reloads the app", () => {
    const opened: string[] = [];
    setPushOpener((url) => void opened.push(url));
    openFromPush("/prayers/morning");
    openFromPush("/community#post-123");
    expect(opened).toEqual(["/prayers/morning", "/community#post-123"]);
    vi.advanceTimersByTime(OPENER_WAIT_MS * 2);
    expect(assigned).toEqual([]);
  });

  it("holds a tap that launched the app until the app is up", () => {
    const opened: string[] = [];
    openFromPush("/prayers/evening");
    vi.advanceTimersByTime(OPENER_WAIT_MS - 1);
    expect(assigned).toEqual([]);
    setPushOpener((url) => void opened.push(url));
    expect(opened).toEqual(["/prayers/evening"]);
    // Delivered once, and the fallback is called off.
    vi.advanceTimersByTime(OPENER_WAIT_MS * 2);
    expect(assigned).toEqual([]);
    setPushOpener((url) => void opened.push(url));
    expect(opened).toEqual(["/prayers/evening"]);
  });

  it("keeps only the last of two taps that are both waiting", () => {
    const opened: string[] = [];
    openFromPush("/calendar");
    openFromPush("/whats-new");
    setPushOpener((url) => void opened.push(url));
    expect(opened).toEqual(["/whats-new"]);
    vi.advanceTimersByTime(OPENER_WAIT_MS * 2);
    expect(assigned).toEqual([]);
  });

  it("falls back to the shell's own load when the app never hands a router over", () => {
    openFromPush("/prayers/morning");
    vi.advanceTimersByTime(OPENER_WAIT_MS + 1);
    expect(assigned).toEqual(["/prayers/morning"]);
    // And that tap is spent.
    const opened: string[] = [];
    setPushOpener((url) => void opened.push(url));
    expect(opened).toEqual([]);
  });

  it("drops anything that is not an address inside the app", () => {
    const opened: string[] = [];
    setPushOpener((url) => void opened.push(url));
    for (const bad of ["//example.org/steal", "/\\example.org", "https://example.org/", "javascript:alert(1)", "prayers/morning", "", null, undefined, 7, {}]) {
      openFromPush(bad);
      expect(isAppAddress(bad), String(bad)).toBe(false);
    }
    expect(opened).toEqual([]);
    vi.advanceTimersByTime(OPENER_WAIT_MS * 2);
    expect(assigned).toEqual([]);
  });

  it("an opener that is taken away leaves the next tap waiting", () => {
    const opened: string[] = [];
    setPushOpener((url) => void opened.push(url));
    setPushOpener(null);
    openFromPush("/account");
    expect(opened).toEqual([]);
    setPushOpener((url) => void opened.push(url));
    expect(opened).toEqual(["/account"]);
  });
});

describe("a # on the screen the reader is already on", () => {
  it("is the one move the router makes without telling the page", () => {
    expect(onlyTheHashChanges({ pathname: "/community/" }, { pathname: "/community", hash: "#post-1" })).toBe(true);
    expect(onlyTheHashChanges({ pathname: "/community" }, { pathname: "/community/", hash: "#@handle" })).toBe(true);
  });

  it("is not a move to another screen, or one with no #", () => {
    expect(onlyTheHashChanges({ pathname: "/" }, { pathname: "/community/", hash: "#post-1" })).toBe(false);
    expect(onlyTheHashChanges({ pathname: "/community/" }, { pathname: "/community/", hash: "" })).toBe(false);
    expect(onlyTheHashChanges({ pathname: "/" }, { pathname: "/", hash: "" })).toBe(false);
  });
});

describe("the shells' tap listener", () => {
  const native = readFileSync("lib/push/native.ts", "utf8");
  const bridge = readFileSync("components/native/NativeBridge.tsx", "utf8");

  it("hands the tap to openFromPush and does not navigate by itself", () => {
    expect(native).toMatch(/openFromPush\(/);
    // A CALL or an assignment, not prose: the comment that explains the fix
    // names the old way.
    expect(native, "a hard navigation inside the shell is handed the front door").not.toMatch(
      /window\.location\.assign\s*\(|window\.location\.href\s*=|location\.replace\s*\(/,
    );
  });

  it("is given the router by the bridge that is mounted on every screen", () => {
    expect(bridge).toMatch(/setPushOpener\(/);
    expect(bridge).toMatch(/router\.push\(/);
    expect(bridge, "the opener is taken away when the bridge goes").toMatch(/setPushOpener\(null\)/);
  });
});
