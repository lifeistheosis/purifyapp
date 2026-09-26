import { describe, expect, it } from "vitest";

import { DESKTOP_HOME, DESKTOP_HOME_PREPAINT } from "@/lib/desktop/homeRedirect";

/** Runs the pre-paint string against a fake window and reports what it did. */
function run(pathname: string, globals: Record<string, unknown>, search = "", hash = "") {
  let replaced: string | null = null;
  const style: Record<string, string> = {};
  const win = { ...globals };
  const location = { pathname, search, hash, replace: (to: string) => (replaced = to) };
  const document = { documentElement: { style } };
  new Function("window", "location", "document", DESKTOP_HOME_PREPAINT)(win, location, document);
  return { replaced, hidden: style.visibility === "hidden" };
}

describe("the desktop app opens on Today, not the marketing page", () => {
  it("sends the app's front page to Today, before anything paints", () => {
    expect(run("/", { __TAURI_INTERNALS__: {} })).toEqual({ replaced: DESKTOP_HOME, hidden: true });
    expect(run("/", { __TAURI__: {} }).replaced).toBe(DESKTOP_HOME);
  });

  it("keeps the query and the anchor", () => {
    expect(run("/", { __TAURI__: {} }, "?from=discord", "#top").replaced).toBe(`${DESKTOP_HOME}?from=discord#top`);
  });

  it("does nothing in a browser or the phone apps", () => {
    expect(run("/", {})).toEqual({ replaced: null, hidden: false });
    expect(run("/", { Capacitor: {} })).toEqual({ replaced: null, hidden: false });
  });

  it("does nothing on any other page of the app", () => {
    for (const p of ["/bible/john/3", "/prayers/today", "/settings", "/saints"]) {
      expect(run(p, { __TAURI_INTERNALS__: {} }).replaced, p).toBeNull();
    }
  });

  it("points at a page that exists", () => {
    expect(DESKTOP_HOME).toBe("/prayers/today");
  });
});
