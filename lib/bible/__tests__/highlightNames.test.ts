// What each highlight colour means to a reader (1.7.1): names start empty, a
// reader gives them in the names sheet (components/bible/HighlightNamesSheet),
// and they travel with the account in user_metadata, the copy changed last
// winning (lib/sync/highlightNames.ts). These are the rules those screens and
// that sync stand on, in lib/bible/highlightPalette.ts, pure.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  HIGHLIGHT_COLORS,
  NAME_IDEA_KEYS,
  NAME_MAX,
  cleanName,
  normalizeNames,
  readAccountNames,
  reconcileNames,
  sameNames,
  withName,
} from "../highlightPalette";

describe("a reader's names for the colours", () => {
  it("start empty: nothing stored is no names, and no colour has a name it was not given", () => {
    expect(normalizeNames(null)).toEqual({});
    expect(normalizeNames(undefined)).toEqual({});
    expect(normalizeNames({})).toEqual({});
  });

  it("keep only colours this build has, and only names with words in them", () => {
    expect(
      normalizeNames({
        yellow: "  Promises ",
        rose: "",
        blue: "   ",
        green: 42,
        gold: "Not a colour here",
        teal: "Questions",
      }),
    ).toEqual({ yellow: "Promises", teal: "Questions" });
    expect(normalizeNames(["Promises"])).toEqual({});
    expect(normalizeNames("Promises")).toEqual({});
  });

  it("are tidied as they are kept: one space between words, and no longer than NAME_MAX", () => {
    expect(cleanName("To   pray\nover ")).toBe("To pray over");
    const long = "x".repeat(NAME_MAX + 10);
    expect(Array.from(cleanName(long))).toHaveLength(NAME_MAX);
    // Counted in characters, so a name in Georgian or with an accent is cut
    // where a reader would count, never in the middle of one.
    expect(Array.from(cleanName("ა".repeat(NAME_MAX + 3)))).toHaveLength(NAME_MAX);
    expect(cleanName(undefined)).toBe("");
  });

  it("are given, changed and taken away one colour at a time", () => {
    const one = withName({}, "rose", "To pray over");
    expect(one).toEqual({ rose: "To pray over" });
    const two = withName(one, "blue", " Questions ");
    expect(two).toEqual({ rose: "To pray over", blue: "Questions" });
    expect(withName(two, "rose", "Prayer")).toEqual({ rose: "Prayer", blue: "Questions" });
    // An empty name takes it away: the colour goes by what it is called again.
    expect(withName(two, "rose", "  ")).toEqual({ blue: "Questions" });
    // A colour this build does not have is not given one.
    expect(withName(two, "gold", "Gold")).toBe(two);
    expect(sameNames(two, { blue: "Questions", rose: "To pray over" })).toBe(true);
    expect(sameNames(two, one)).toBe(false);
  });
});

describe("the names on the account", () => {
  it("are read only with a date to weigh them by", () => {
    expect(readAccountNames({ names: { rose: "Prayer" }, at: "2026-10-18T10:00:00Z" })).toEqual({
      names: { rose: "Prayer" },
      at: "2026-10-18T10:00:00Z",
    });
    expect(readAccountNames({ names: { rose: "Prayer" } })).toBeNull();
    expect(readAccountNames({ names: { rose: "Prayer" }, at: "not a date" })).toBeNull();
    expect(readAccountNames(null)).toBeNull();
    // Whatever the account holds is tidied like a name typed here.
    expect(readAccountNames({ names: { rose: "x".repeat(99), sky: "No" }, at: "2026-10-18T10:00:00Z" })?.names).toEqual({
      rose: "x".repeat(NAME_MAX),
    });
  });

  it("meet the device's copy, and the one changed last wins", () => {
    const at = (d: number) => `2026-10-${String(d).padStart(2, "0")}T12:00:00Z`;
    const account = { names: { rose: "Prayer" }, at: at(10) };
    // A device that never named a colour takes the account's.
    expect(reconcileNames({ names: {}, at: null }, account)).toBe("take");
    // Named here later: sent. Named on the account later: taken.
    expect(reconcileNames({ names: { rose: "To pray over" }, at: at(12) }, account)).toBe("send");
    expect(reconcileNames({ names: { rose: "To pray over" }, at: at(8) }, account)).toBe("take");
    // The same names either way: nothing to do.
    expect(reconcileNames({ names: { rose: "Prayer" }, at: at(12) }, account)).toBe("keep");
    expect(reconcileNames({ names: { rose: "Prayer" }, at: at(10) }, account)).toBe("keep");
    // No copy on the account: this device's is sent, even names all taken
    // away, so a clearing travels too; with nothing ever named, nothing.
    expect(reconcileNames({ names: {}, at: at(12) }, null)).toBe("send");
    expect(reconcileNames({ names: {}, at: null }, null)).toBe("keep");
  });
});

describe("the ideas in the names sheet", () => {
  const dir = path.resolve(__dirname, "../../i18n/messages");
  const catalogs = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8")) as Record<string, string>;

  it("are the owner's three and three more, in English", () => {
    expect(NAME_IDEA_KEYS.map((k) => en[k])).toEqual(["Promises", "To pray over", "Questions", "Comfort", "Teaching", "To learn by heart"]);
  });

  it("are in all 21 languages, each distinct and short enough to be kept whole as a name", () => {
    expect(catalogs).toHaveLength(21);
    for (const f of catalogs) {
      const messages = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>;
      const ideas = NAME_IDEA_KEYS.map((k) => messages[k]);
      for (const [i, idea] of ideas.entries()) {
        expect(typeof idea === "string" && idea.trim().length > 0, `${f}: ${NAME_IDEA_KEYS[i]}`).toBe(true);
        // An idea tapped is kept as it is, never cut short.
        expect(cleanName(idea), `${f}: ${NAME_IDEA_KEYS[i]}`).toBe(idea);
      }
      expect(new Set(ideas.map((s) => s.toLocaleLowerCase())).size, f).toBe(ideas.length);
    }
  });

  it("can never be mistaken for what a colour is called", () => {
    for (const f of catalogs) {
      const messages = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>;
      const colours = new Set(HIGHLIGHT_COLORS.map((c) => messages[`bible.highlight.color.${c.name}`]?.toLocaleLowerCase()));
      for (const k of NAME_IDEA_KEYS) expect(colours.has(messages[k]?.toLocaleLowerCase()), `${f}: ${k}`).toBe(false);
    }
  });
});
