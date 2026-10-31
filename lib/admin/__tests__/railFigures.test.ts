import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { railFigure, railMoney, type RailReadings } from "../railFigures";
import { setViewIntent, takeViewIntent } from "../viewIntent";

// The owner's pick A for the rail on sheet r3-15 (2026-10-30): each Daily page
// carries the one figure he opens it for, "4 waiting", "37 now", "$96", "+58".

const READ: RailReadings = { waiting: 4, live: 37, revenueTodayCents: 9_600, signupsToday: 58 };
const UNREAD: RailReadings = { waiting: null, live: null, revenueTodayCents: null, signupsToday: null };

describe("the rail's figures", () => {
  it("says each page's one figure as the sheet drew it", () => {
    expect(railFigure("waiting", READ)?.text).toBe("4 waiting");
    expect(railFigure("live", READ)?.text).toBe("37 now");
    expect(railFigure("revenue", READ)?.text).toBe("$96");
    expect(railFigure("signups", READ)?.text).toBe("+58");
  });

  it("shows no figure for what could not be read, never a zero", () => {
    for (const kind of ["waiting", "live", "revenue", "signups"] as const) {
      expect(railFigure(kind, UNREAD), kind).toBeNull();
    }
  });

  it("says nothing waits by showing no figure, but a quiet site is a real zero", () => {
    expect(railFigure("waiting", { ...READ, waiting: 0 })).toBeNull();
    expect(railFigure("live", { ...READ, live: 0 })?.text).toBe("0 now");
    expect(railFigure("signups", { ...READ, signupsToday: 0 })?.text).toBe("+0");
    expect(railFigure("revenue", { ...READ, revenueTodayCents: 0 })?.text).toBe("$0");
  });

  it("hides the money under streamer mode, and only the money", () => {
    expect(railFigure("revenue", READ)?.sensitive).toBe(true);
    expect(railFigure("live", READ)?.sensitive).toBeUndefined();
    expect(railFigure("waiting", READ)?.sensitive).toBeUndefined();
  });

  it("rounds money to whole dollars with thousands marked", () => {
    expect(railMoney(9_649)).toBe("$96");
    expect(railMoney(9_650)).toBe("$97");
    expect(railMoney(120_400)).toBe("$1,204");
    expect(railMoney(-1_600)).toBe("-$16");
  });

  it("says what each figure counts in its tooltip", () => {
    expect(railFigure("waiting", { ...READ, waiting: 1 })?.title).toBe("1 thing needs you");
    expect(railFigure("signups", { ...READ, signupsToday: 1 })?.title).toBe("1 new reader today");
  });
});

describe("a view's intent", () => {
  it("is taken once, by the view it was left for", () => {
    setViewIntent("users", "waiting");
    expect(takeViewIntent("traffic")).toBeNull();
    expect(takeViewIntent("users")).toBe("waiting");
    expect(takeViewIntent("users")).toBeNull();
  });

  it("is cleared by a plain open of any view", () => {
    setViewIntent("users", "waiting");
    setViewIntent("users", undefined);
    expect(takeViewIntent("users")).toBeNull();
  });
});

describe("the shell", () => {
  const SHELL = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");
  const MOBILE = readFileSync(join(process.cwd(), "components/admin/AdminMobileNav.tsx"), "utf8");

  it("lights the open page and unfolds its views under it in the rail", () => {
    expect(SHELL).toContain('boxShadow: "var(--adm-lit)"');
    expect(SHELL).toContain('className="adm-rail-views"');
    expect(SHELL).toContain("figure={figureOf(p.figure)}");
  });

  it("keeps the views as a switch under the page's name on the phone only", () => {
    expect(SHELL).toMatch(/<div className="mt-3\.5 lg:hidden">\s*<Segmented<string>/);
    // No tabs inside the page's own head on the desktop any more.
    expect(SHELL).not.toContain("<SubTabs");
  });

  it("sends every way of opening a view through one door that knows the retired ids", () => {
    expect(SHELL).toContain("const to = landingOf(id);");
    expect(SHELL).toContain("onSelect={select}");
    expect(SHELL).not.toMatch(/RETIRED_TABS/);
  });

  it("opens More as rows above the bar, with a You group", () => {
    expect(MOBILE).toContain("style={{ bottom: BAR_H }}");
    expect(MOBILE).toContain("You");
    expect(MOBILE).not.toMatch(/grid-cols-2 gap-2"/);
  });
});
