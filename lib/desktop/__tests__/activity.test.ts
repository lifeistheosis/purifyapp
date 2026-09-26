import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { activityFor, activityKey, subjectFromTitle } from "../activity";

describe("activityFor", () => {
  it("says nothing while presence is off", () => {
    expect(activityFor("/bible/john/3", "off")).toBeNull();
  });

  it("says only 'in Purify' at the app level, whatever the page", () => {
    for (const p of ["/bible/john/3", "/saints/john-chrysostom", "/prayers/compline", "/community"]) {
      expect(activityFor(p, "app", "St. John Chrysostom | Purify")).toEqual({ kind: "app", path: "/" });
    }
  });

  it("names Scripture by book and chapter, with a button to the passage", () => {
    expect(activityFor("/bible/john/3", "reading")).toEqual({
      kind: "scripture",
      subject: "John 3",
      path: "/bible/john/3",
    });
    expect(activityFor("/bible/john", "reading")?.subject).toBe("John");
    expect(activityFor("/bible", "reading")).toEqual({ kind: "scripture", path: "/bible" });
  });

  it("does not invent a book or chapter from a malformed path", () => {
    expect(activityFor("/bible/not-a-book/3", "reading")).toEqual({ kind: "scripture", path: "/bible" });
    expect(activityFor("/bible/john/3abc", "reading")).toEqual({
      kind: "scripture",
      subject: "John",
      path: "/bible/john",
    });
  });

  it("never says which prayer", () => {
    for (const p of ["/prayers", "/prayers/today", "/prayers/compline", "/prayers/for-the-departed"]) {
      expect(activityFor(p, "reading", "Prayers for the departed | Purify")).toEqual({
        kind: "prayer",
        path: "/prayers",
      });
    }
  });

  it("names a saint from the page title", () => {
    expect(activityFor("/saints/john-chrysostom", "reading", "St. John Chrysostom | Purify")).toEqual({
      kind: "saints",
      subject: "St. John Chrysostom",
      path: "/saints/john-chrysostom",
    });
    expect(activityFor("/saints", "reading", "The Saints | Purify")).toEqual({ kind: "saints", path: "/saints" });
  });

  it("names a saint's writing as a writing, and links the writing itself", () => {
    expect(
      activityFor(
        "/saints/athanasius/on-the-incarnation",
        "reading",
        "On the Incarnation, St. Athanasius the Great | Purify",
      ),
    ).toEqual({
      kind: "writings",
      subject: "On the Incarnation, St. Athanasius the Great",
      path: "/saints/athanasius/on-the-incarnation",
    });
    // Anything deeper than the work still links the work, never a sub-path
    // the button list has not been asked to vouch for.
    expect(activityFor("/saints/athanasius/on-the-incarnation/extra", "reading", "X | Purify")?.path).toBe(
      "/saints/athanasius/on-the-incarnation",
    );
  });

  it("keeps private rooms private: no subject and no button beyond the front page", () => {
    for (const p of [
      "/community",
      "/community/groups/abc",
      "/campaigns/xyz",
      "/account",
      "/account/profile",
      "/shop/cart",
      "/saved",
      "/support",
      "/admin",
      "/",
    ]) {
      expect(activityFor(p, "reading", "Something personal | Purify"), p).toEqual({ kind: "app", path: "/" });
    }
  });

  it("drops the query and the hash", () => {
    expect(activityFor("/bible/john/3?v=16#x", "reading")?.path).toBe("/bible/john/3");
  });

  it("describes library pages, naming a detail page from its title", () => {
    expect(activityFor("/theology/theosis", "reading", "Theosis | Purify")).toEqual({
      kind: "library",
      subject: "Theosis",
      path: "/theology/theosis",
    });
    expect(activityFor("/councils", "reading", "The Councils | Purify")).toEqual({
      kind: "library",
      path: "/councils",
    });
    expect(activityFor("/calendar/2026-09-25", "reading")).toEqual({ kind: "calendar", path: "/calendar" });
  });

  it("opens a council's document itself, the page its title names", () => {
    expect(activityFor("/councils/nicaea-i/creed", "reading", "The Creed of Nicaea | Purify")).toEqual({
      kind: "library",
      subject: "The Creed of Nicaea",
      path: "/councils/nicaea-i/creed",
    });
  });
});

describe("subjectFromTitle", () => {
  it("strips the site name and ignores a bare one", () => {
    expect(subjectFromTitle("St. Basil the Great | Purify")).toBe("St. Basil the Great");
    expect(subjectFromTitle("Purify")).toBeUndefined();
    expect(subjectFromTitle("  ")).toBeUndefined();
    expect(subjectFromTitle(null)).toBeUndefined();
  });

  it("caps a long title", () => {
    const s = subjectFromTitle(`${"A very long study title ".repeat(10)}| Purify`);
    expect(s!.length).toBeLessThanOrEqual(80);
  });
});

describe("activityKey", () => {
  it("changes only when what Discord would show changes", () => {
    expect(activityKey(activityFor("/bible/john/3", "reading"))).toBe(
      activityKey(activityFor("/bible/john/3?x=1", "reading")),
    );
    expect(activityKey(activityFor("/bible/john/3", "reading"))).not.toBe(
      activityKey(activityFor("/bible/john/4", "reading")),
    );
    expect(activityKey(null)).toBe("");
  });
});

describe("the site and the desktop app agree on what a button may open", () => {
  // presence.rs refuses a button for any path outside its PUBLIC_PREFIXES.
  // Every path this module can produce must be on that list, or the button
  // silently disappears for that kind of page.
  const rust = readFileSync(join(process.cwd(), "desktop", "src-tauri", "src", "presence.rs"), "utf8");
  const block = rust.slice(rust.indexOf("const PUBLIC_PREFIXES"), rust.indexOf("];", rust.indexOf("const PUBLIC_PREFIXES")));
  const allowed = [...block.matchAll(/"(\/[a-z-]+)"/g)].map((m) => m[1]);

  it("reads the list", () => {
    expect(allowed.length).toBeGreaterThan(5);
  });

  it("covers every path the site sends", () => {
    const samples = [
      "/bible/john/3",
      "/prayers/x",
      "/saints/x",
      "/calendar",
      "/catechism",
      "/councils/x",
      "/theology/x",
      "/apologetics/x",
      "/heresies/x",
      "/topics/x",
      "/history/x",
      "/reading/x",
      "/florilegium/x",
      "/fasting/x",
      "/discover",
    ];
    for (const s of samples) {
      const path = activityFor(s, "reading", "X | Purify")?.path;
      expect(path, s).toBeDefined();
      const root = `/${path!.split("/")[1]}`;
      expect(allowed, `${s} sends ${path}`).toContain(root);
    }
  });
});
