// A hard load of an inner address, inside the apps, ends on the screen the
// address names, and an address with no screen ends at the front door instead
// of reloading for ever. The why is in ../entry.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ENTRY_KEY, ENTRY_RETRY_MS, FRONT_DOOR_MARK, entryAction } from "../entry";

const at = (over: Partial<Parameters<typeof entryAction>[0]> = {}) =>
  entryAction({ shell: true, pathname: "/bible/john/1/", search: "", remembered: null, now: 100000, ...over });

describe("the app coming up on an inner address", () => {
  it("asks the router for the screen the address names", () => {
    const r = at();
    expect(r.action).toBe("refresh");
    expect(JSON.parse(r.remember!)).toEqual({ address: "/bible/john/1", at: 100000 });
  });

  it("has nothing to do at the front door, which is every ordinary launch", () => {
    expect(at({ pathname: "/" })).toEqual({ action: "none", remember: null });
    expect(at({ pathname: "" })).toEqual({ action: "none", remember: null });
  });

  it("has nothing to do on the website, where an address gets its own page", () => {
    expect(at({ shell: false })).toEqual({ action: "none", remember: null });
  });

  it("keeps the query as part of the address: a product is its query", () => {
    const r = at({ pathname: "/shop/icons/detail/", search: "?slug=theotokos" });
    expect(JSON.parse(r.remember!).address).toBe("/shop/icons/detail?slug=theotokos");
  });
});

describe("an address the bundle has no screen for", () => {
  const first = at({ pathname: "/shop/icons/a-piece-published-yesterday/" });

  it("is tried once", () => {
    expect(first.action).toBe("refresh");
  });

  it("then goes to the front door, when the try comes back as the same hard load", () => {
    const second = at({ pathname: "/shop/icons/a-piece-published-yesterday/", remembered: first.remember, now: 100000 + 900 });
    expect(second).toEqual({ action: "front-door", remember: null });
  });

  it("is not confused with a reader who reloads the same screen later", () => {
    const later = at({ pathname: "/shop/icons/a-piece-published-yesterday/", remembered: first.remember, now: 100000 + ENTRY_RETRY_MS });
    expect(later.action).toBe("refresh");
  });

  it("nor with a hard load of some other screen", () => {
    const other = at({ pathname: "/settings/", remembered: first.remember, now: 100000 + 900 });
    expect(other.action).toBe("refresh");
    expect(JSON.parse(other.remember!).address).toBe("/settings");
  });

  it("treats the same screen under another query as another address", () => {
    const a = at({ pathname: "/shop/icons/detail/", search: "?slug=a" });
    const b = at({ pathname: "/shop/icons/detail/", search: "?slug=b", remembered: a.remember, now: 100000 + 900 });
    expect(b.action).toBe("refresh");
  });

  it("is not thrown by whatever else is in storage", () => {
    for (const junk of ["", "not json", "{}", "[]", JSON.stringify({ address: 7, at: "x" })]) {
      expect(at({ remembered: junk }).action, JSON.stringify(junk)).toBe("refresh");
    }
  });
});

describe("the bridge that acts on it", () => {
  const bridge = readFileSync("components/native/NativeBridge.tsx", "utf8");

  it("refreshes, and never pushes or replaces to the same address, which does nothing", () => {
    expect(bridge).toMatch(/entryAction\(/);
    expect(bridge).toMatch(/router\.refresh\(\)/);
  });

  it("writes the try down before it is made, in the session's storage", () => {
    expect(bridge).toMatch(/sessionStorage/);
    expect(bridge).toContain("ENTRY_KEY");
    expect(ENTRY_KEY).toMatch(/^purify:/);
  });

  it("only inside the shell, and only when the document is the front door's", () => {
    expect(bridge).toMatch(/if \(!isNativeClient\(\)\) return;/);
    expect(bridge).toMatch(/document\.querySelector\(FRONT_DOOR_MARK\)/);
    // The mark is in the front door's page and no other.
    expect(readFileSync("app/page.tsx", "utf8")).toMatch(/<span hidden data-front-door="" \/>/);
    expect(FRONT_DOOR_MARK).toBe("[data-front-door]");
  });

  it("never asks the build what was built: that flag is server only", () => {
    // lib/platform/buildTarget.ts reads as "the website" in every client
    // bundle. The first version of the bridge was gated on it and never ran;
    // the walk's hard load found it on Today.
    // The use, not the prose: the bridge's own comment names the file.
    expect(bridge).not.toMatch(/IS_STATIC_EXPORT|from "@\/lib\/platform\/buildTarget"/);
  });
});
