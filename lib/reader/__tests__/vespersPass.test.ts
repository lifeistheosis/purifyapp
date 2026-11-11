import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { THEME_PREPAINT } from "@/lib/reader/prepaint";
import { VESPERS_KEY, VESPERS_PASS_KEY, VESPERS_WINDOW_KEY, clearPass, passHolds, passTonight } from "@/lib/reader/vespers";

/**
 * Candlelight at Vespers, and a palette a reader picks after sunset
 * (lib/reader/vespers.ts, "The reader's own pick, for one night").
 *
 * With the switch on, after sunset the app wore Candlelight whatever was
 * picked: a tap moved the check and changed nothing until morning. The
 * arbiter's word, 2026-11-11, by the bar of build 93 note 3: "the reader's
 * tap wins for that night and Candlelight returns at the next sunset."
 *
 * What a reader would notice if this broke: at night, a tap on a palette
 * that changes nothing; or Candlelight not coming back the next evening.
 */
const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

const SUNSET = 1_000_000;
const SUNRISE = 5_000_000;
const NEXT_SUNSET = 9_000_000;
const NEXT_SUNRISE = 13_000_000;

function device(start: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(start));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  return store;
}

/** The pre-paint script, run against a device: what it puts on the page. */
function prepaint(stored: Record<string, string>, now: number): string {
  const attrs: Record<string, string> = {};
  new Function("localStorage", "document", "Date", THEME_PREPAINT)(
    { getItem: (k: string) => stored[k] ?? null },
    { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    { now: () => now },
  );
  return attrs["data-look"] ?? attrs["data-reading-mode"] ?? "default";
}

afterEach(() => vi.unstubAllGlobals());

describe("a palette picked after sunset, with Candlelight at Vespers on", () => {
  it("is given the rest of that night: until its sunrise, and not a moment longer", () => {
    const store = device({ [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: `${SUNSET},${SUNRISE}` });
    expect(passHolds(SUNSET + 10)).toBe(false);
    passTonight(SUNSET + 10);
    expect(store.get(VESPERS_PASS_KEY)).toBe(String(SUNRISE));
    expect(passHolds(SUNSET + 10)).toBe(true);
    expect(passHolds(SUNRISE - 1)).toBe(true);
    // The night is over, and the next sunset is past it: Candlelight comes back by itself.
    expect(passHolds(SUNRISE)).toBe(false);
    expect(passHolds(NEXT_SUNSET + 10)).toBe(false);
  });

  it("is given by a tap after sunset only: not by day, and not with the switch off", () => {
    const day = device({ [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: `${SUNSET},${SUNRISE}` });
    passTonight(SUNSET - 10);
    expect(day.has(VESPERS_PASS_KEY)).toBe(false);
    vi.unstubAllGlobals();

    const off = device({ [VESPERS_WINDOW_KEY]: `${SUNSET},${SUNRISE}` });
    passTonight(SUNSET + 10);
    expect(off.has(VESPERS_PASS_KEY)).toBe(false);
    vi.unstubAllGlobals();

    // No night kept (the switch only just turned on): nothing to give yet.
    const none = device({ [VESPERS_KEY]: "1" });
    passTonight(SUNSET + 10);
    expect(none.has(VESPERS_PASS_KEY)).toBe(false);
  });

  it("is taken back when the switch is turned off, so on again that night means Candlelight now", () => {
    const store = device({ [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: `${SUNSET},${SUNRISE}` });
    passTonight(SUNSET + 10);
    expect(passHolds(SUNSET + 20)).toBe(true);
    clearPass();
    expect(store.has(VESPERS_PASS_KEY)).toBe(false);
    expect(passHolds(SUNSET + 20)).toBe(false);
  });

  it("reads nothing kept, or something unreadable, as no night given", () => {
    device({});
    expect(passHolds(SUNSET + 10)).toBe(false);
    vi.unstubAllGlobals();
    device({ [VESPERS_PASS_KEY]: "soon" });
    expect(passHolds(SUNSET + 10)).toBe(false);
    vi.unstubAllGlobals();
    // No storage at all: Candlelight holds the night, as it did.
    vi.stubGlobal("window", {});
    expect(passHolds(SUNSET + 10)).toBe(false);
    expect(() => passTonight(SUNSET + 10)).not.toThrow();
    expect(() => clearPass()).not.toThrow();
  });
});

describe("the app opens as the reader left it that night", () => {
  const on = { [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: `${SUNSET},${SUNRISE}`, "purify.reader.theme": "dawn" };

  it("in Candlelight after sunset, as before, when nothing was picked that night", () => {
    expect(prepaint(on, SUNSET + 10)).toBe("candlelight");
    expect(prepaint(on, SUNSET - 10)).toBe("dawn");
    expect(prepaint(on, SUNRISE + 10)).toBe("dawn");
  });

  it("in the reader's own palette on a night they picked it in, from the first paint", () => {
    const picked = { ...on, [VESPERS_PASS_KEY]: String(SUNRISE) };
    expect(prepaint(picked, SUNSET + 10)).toBe("dawn");
    expect(prepaint(picked, SUNRISE - 1)).toBe("dawn");
  });

  it("and in Candlelight again at the next sunset, the switch never touched", () => {
    const next = { ...on, [VESPERS_WINDOW_KEY]: `${NEXT_SUNSET},${NEXT_SUNRISE}`, [VESPERS_PASS_KEY]: String(SUNRISE) };
    expect(prepaint(next, NEXT_SUNSET + 10)).toBe("candlelight");
    expect(prepaint(next, NEXT_SUNSET - 10)).toBe("dawn");
  });

  it("the script reads the same key the rule writes", () => {
    expect(THEME_PREPAINT).toContain(`localStorage.getItem('${VESPERS_PASS_KEY}')`);
    expect(VESPERS_PASS_KEY).toBe("purify.reader.vespers.pass");
  });
});

describe("how the app is wired to it", () => {
  it("a tap that picks a palette gives the night first, then writes the palette", () => {
    const prefs = read("components/reader/ReaderPrefs.tsx");
    expect(prefs).toMatch(/const setTheme = useCallback\(\(t: ReadingTheme\) => \{[\s\S]*?passTonight\(\);\s*write\(READING_THEME_KEY, t\);\s*\}, \[\]\);/);
    expect(prefs).toMatch(/passTonight\(\);\s*write\(READING_THEME_KEY, ids\[\(at \+ 1\) % ids\.length\]\);/);
    // A palette arriving from the reader's account is not a tap: the account's own writer gives no night.
    expect(read("lib/sync/kept.ts")).not.toContain("passTonight");
  });

  it("the part that dresses the app wears the reader's palette through that night, and its clock still runs on the night itself", () => {
    const controller = read("components/theme/AppThemeController.tsx");
    expect(controller).toContain("const held = on && nightHolds(night.current, now) ? night.current : null;");
    expect(controller).toContain("const wanted = vespersTheme(stored, on, held && !passHolds(now) ? held : null);");
    // The next sunset is still looked for while the night is the reader's.
    expect(controller).toMatch(/if \(held\) \{\s*const wait = \(held\.now \? held\.end : held\.start\) - now;/);
    // The switch off takes the night back.
    expect(controller).toMatch(/if \(!on\) \{\s*night\.current = null;\s*keepWindow\(null\);[\s\S]*?clearPass\(\);\s*\}/);
  });
});
