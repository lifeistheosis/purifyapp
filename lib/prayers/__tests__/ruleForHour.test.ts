import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listHours } from "@/lib/prayers/hours";
import { EVENING_FROM_HOUR, ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { NIGHT_FROM_HOUR, timeOfDayAt } from "@/lib/prayers/suggest";

/**
 * Evening starts at one hour, on every screen.
 *
 * Until 2026-10-10 it started at four different ones. The Pray now row on
 * Prayers said 16, the Today card and the rule on Prayers said 17, the
 * greeting on Today said 18, and the line under the Prayers masthead said 19.
 * Each was a bare number in a comparison, so nothing tied them together, and
 * a reader could be wished a good afternoon above the Evening Rule. The owner
 * settled it that day: 17:00, everywhere, held in lib/prayers/ruleForHour.ts.
 *
 * Two halves. The first pins the behaviour at the boundary. The second reads
 * the source of the files that decide a day part from the clock, and fails
 * when one of them writes an evening hour of its own again. Typecheck cannot
 * see that: 18 is a perfectly good number.
 */

// Built from local parts, so the hour read back is the hour asked for in
// whatever zone the suite runs.
const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 10, h, m, s);

describe("where evening starts", () => {
  it("is five in the afternoon", () => {
    // The owner's decision, not a number to tune. Moving it moves the
    // greeting, the rule, the line on Prayers and the Pray now row together.
    expect(EVENING_FROM_HOUR).toBe(17);
  });

  it("calls for the Morning Rule at 16:59 and the Evening Rule at 17:00", () => {
    expect(ruleIdForHour(at(16, 59, 59).getHours())).toBe("morning");
    expect(ruleIdForHour(at(17, 0, 0).getHours())).toBe("evening");
    expect(ruleIdForHour(at(23, 59, 59).getHours())).toBe("evening");
  });

  it("is the same hour in the Pray now row", () => {
    expect(timeOfDayAt(at(16, 59, 59))).toBe("midday");
    expect(timeOfDayAt(at(17, 0, 0))).toBe("evening");
    // Not merely inside the rule's evening: both turn on the same stroke.
    const hours = Array.from({ length: 24 }, (_, h) => h);
    expect(hours.find((h) => timeOfDayAt(at(h)) === "evening")).toBe(EVENING_FROM_HOUR);
    expect(hours.find((h) => ruleIdForHour(h) === "evening")).toBe(EVENING_FROM_HOUR);
  });

  it("ends, in that row, when Compline begins", () => {
    // The row has a night the greeting does not: from nine it leads with
    // Compline and the prayers before sleep. That hour is the END of evening
    // and says nothing about where evening starts.
    expect(timeOfDayAt(at(20, 59, 59))).toBe("evening");
    expect(timeOfDayAt(at(21, 0, 0))).toBe("night");
    expect(NIGHT_FROM_HOUR).toBe(listHours().find((h) => h.slug === "compline")?.approxHour);
    expect(NIGHT_FROM_HOUR).toBeGreaterThan(EVENING_FROM_HOUR);
  });
});

// ---------------------------------------------------------------------------
// The source guard.
//
// WHEN IT FAILS, it names a file, a line and the comparison it found. The fix
// is nearly always in that file: import EVENING_FROM_HOUR (or ruleIdForHour)
// from lib/prayers/ruleForHour.ts and compare the hour against that. Do not
// change the number to make two screens agree, and do not edit this test to
// let a second number through. If the number really is a different boundary,
// the way NIGHT_FROM_HOUR is the end of evening in suggest.ts, give it a
// name, say why beside it, and add it to ALLOWED below with the reason.
//
// WHAT IT CANNOT SEE. It reads text, not meaning. It knows an hour by its
// name (HOUR_NAMES below) or by the file filling that name from getHours(),
// and it knows a late number when the file writes it, bare or behind one
// local name. An hour handed on under a name that says nothing (part(t), then
// t >= 18), a number reached through two names or brought in from another
// file, and an hour shifted before it is asked about (ruleIdForHour(h + 1))
// all pass. A change to one of these files still wants a reader.
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * The files that decide a day part from the reader's clock: morning,
 * afternoon, evening or night, or which rule the hour calls for.
 *
 * TO ADD A FILE: put its path here, from the repo root, with forward slashes.
 * Add it when a file starts to answer "is it evening?" (or afternoon, or
 * night), whether it calls getHours() itself or is handed the hour. The last
 * test in this file names any file that reads the clock and is on neither
 * list, so a new one cannot slip past by not being mentioned.
 */
const DECIDES_A_DAY_PART: string[] = [
  "components/today/GreetingHeader.tsx",
  "components/today/PrayNowCard.tsx",
  "components/prayers/TodayHourRule.tsx",
  "components/prayers/PrayNow.tsx",
  "components/mobile/PrayersMobile.tsx",
  "components/streak/StreakSheet.tsx",
  "lib/prayers/suggest.ts",
  // The day as a timeline (1.7): which part of the day the clock is in, from
  // timeOfDayAt, and which Hour, from lib/prayers/hours.ts.
  "lib/prayers/dayTimeline.ts",
  // Your rule (1.7): Pray my rule opens the part the hour calls for.
  "components/prayers/mine/MyRuleBuilder.tsx",
];

/**
 * Files that read the clock to ask something else. Each says what, so the
 * next reader can tell a decision from an oversight. These are not scanned.
 */
const ANOTHER_QUESTION: Record<string, string> = {
  "lib/rhythm/useDailyRhythm.ts":
    "Which rule a mark is filed under, split at noon on purpose. See the header of ruleForHour.ts.",
  "lib/streak/useStreak.ts":
    "RISK_HOUR: when the at-risk card starts to ask. When to nudge, not what to call the hour.",
};

/**
 * A late hour that may stand in one of the scanned files, by name. An
 * allowance is one constant, in one file, with one value and a reason. It is
 * not a way to skip a file: every other line of that file is still read, and
 * the allowance stops covering the constant the day its value changes.
 */
const ALLOWED: { file: string; name: string; value: number; why: string }[] = [
  {
    file: "lib/prayers/suggest.ts",
    name: "NIGHT_FROM_HOUR",
    value: 21,
    why:
      "The END of evening in the Pray now row. Nine is Compline's hour, and from then the row leads with " +
      "Compline and the prayers before sleep. Evening still STARTS at EVENING_FROM_HOUR there.",
  },
];

/** A whole number from 16 to 21 standing alone: not 16px, 1.7, 216 or 0.18. */
const LATE = String.raw`(?<![\w.$])(?:1[6-9]|2[01])(?![\w.$])`;
/**
 * What an hour is called in this code: h, hr, or a name with "hour" in it.
 * lateHourComparisons adds the getHours() call itself and any const, let or
 * var the file declares from it (clockNames below). An hour kept under any
 * other name is not seen, and that includes one kept in state and filled by
 * its setter after mount, or assigned on a later line: give such a state a
 * name with "hour" in it, as TodayHourRule does. And a name with "hour" in it is taken for an hour of the day even
 * when it is not one (minutesPerHour): the guard would sooner ask than miss.
 */
const HOUR_NAMES = String.raw`h|hr|\w*[Hh]our\w*`;
const CMP = String.raw`(?:<=?|>=?|[!=]==?)`;

/**
 * The code without its comments, line for line. Prose may name an hour ("it
 * said h < 19 until October"); only code can decide one.
 */
function code(src: string): string {
  return src
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

type Finding = { line: number; text: string };

/**
 * The names a file fills from the clock itself (const now = d.getHours()).
 * They hold the hour whatever they are called, so `now >= 18` is read the way
 * `h >= 18` is.
 */
function clockNames(text: string): string[] {
  const filled = /\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*(?::\s*number\s*)?=\s*[^;\n]*\.getHours\(\s*\)/g;
  return Array.from(text.matchAll(filled), (m) => m[1]);
}

/**
 * Every place an hour is compared against a late number: written bare
 * (h < 19, 17 <= hour, d.getHours() >= 18), or hidden one step away behind a
 * local name (const DUSK = 18, then h >= DUSK). Names in `allowed` are let
 * through. A number that is not compared with an hour is never looked at.
 *
 * And every place the one evening hour is moved (EVENING_FROM_HOUR + 1). That
 * is a second evening hour spelt with the first one's name, and no allowance
 * covers it.
 */
function lateHourComparisons(src: string, allowed: ReadonlySet<string> = new Set()): Finding[] {
  const text = code(src);
  const found: Finding[] = [];
  const note = (index: number, what: string) => {
    found.push({ line: text.slice(0, index).split("\n").length, text: what.replace(/\s+/g, " ").trim() });
  };

  // An hour on the left of a comparison, and on the right, where it may be
  // d.getHours().
  const names = [HOUR_NAMES, ...clockNames(text)].join("|");
  const hour = String.raw`(?:\b(?:${names})\b|\.getHours\(\s*\))`;
  const hourRight = String.raw`(?:new\s+)?(?:[\w$]+(?:\(\s*\))?\.)*?(?:(?:${names})\b|getHours\(\s*\))`;

  for (const re of [
    new RegExp(`${hour}\\s*${CMP}\\s*${LATE}`, "g"),
    new RegExp(`${LATE}\\s*${CMP}\\s*${hourRight}`, "g"),
  ]) {
    for (const m of text.matchAll(re)) note(m.index ?? 0, m[0]);
  }

  const declared = new RegExp(
    String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*number\s*)?=\s*(` +
      LATE +
      String.raw`)(?:\s+as\s+const)?(?=\s*(?:[;,\n]|$))`,
    "g",
  );
  for (const d of text.matchAll(declared)) {
    const [, name, value] = d;
    if (allowed.has(name)) continue;
    const n = name.replace(/\$/g, "\\$");
    for (const re of [
      new RegExp(`${hour}\\s*${CMP}\\s*${n}\\b`, "g"),
      new RegExp(`(?<![\\w$.])${n}\\s*${CMP}\\s*${hourRight}`, "g"),
    ]) {
      for (const m of text.matchAll(re)) note(m.index ?? 0, `${m[0]}  (${name} is ${value})`);
    }
  }

  const moved = /\bEVENING_FROM_HOUR\s*[-+](?:\s*[\w$.]+)?|[-+]\s*EVENING_FROM_HOUR\b/g;
  for (const m of text.matchAll(moved)) note(m.index ?? 0, `${m[0]}  (the evening hour, moved)`);

  return found.sort((a, b) => a.line - b.line);
}

function read(file: string): string {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    throw new Error(
      `${file} is listed in lib/prayers/__tests__/ruleForHour.test.ts but is not in the tree. ` +
        "Fix the path, or take it off the list if the file is gone.",
    );
  }
  return fs.readFileSync(p, "utf8");
}

/** Every file under app, components and lib that reads the reader's local hour. */
function clockReaders(): string[] {
  const out = execFileSync(
    "git",
    ["grep", "-l", "--untracked", "-E", "[.]getHours[(]", "--", "app", "components", "lib"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((file) => file && !file.includes("__tests__"));
}

describe("no screen keeps an evening hour of its own", () => {
  const seen = (src: string) => lateHourComparisons(src).length;

  it("still sees the forms that were in the code", () => {
    // A pattern that quietly matched nothing would pass every file below.
    expect(seen(`if (h < 19) return "midday";`)).toBe(1); // the line on Prayers
    expect(seen(`      : h < 18`)).toBe(1); // the greeting on Today
    expect(seen(`if (h >= 16 && h < 21) return "evening";`)).toBe(2); // the Pray now row
    expect(seen(`if (h < 17) return "today.greetingAfternoon";`)).toBe(1); // right, but written twice
    expect(seen(`const evening = new Date().getHours() >= 18;`)).toBe(1);
    expect(seen(`if (17 <= hour) {`)).toBe(1);
    expect(seen(`if (18 > d.getHours()) {`)).toBe(1);
    expect(seen("const DUSK = 18;\nconst evening = h >= DUSK;")).toBe(1);
  });

  it("sees an hour under another name, and the evening hour moved", () => {
    // The ways a second evening hour could come back with none of the old
    // forms typed again.
    expect(seen("const now = new Date().getHours();\nif (now >= 18) x();")).toBe(1);
    expect(seen("const t = d.getHours();\nconst evening = t > 17;")).toBe(1);
    expect(seen("const DUSK = 18 as const;\nconst evening = h >= DUSK;")).toBe(1);
    expect(seen(`if (h >= EVENING_FROM_HOUR + 1) return "evening";`)).toBe(1);
    expect(seen("const LATE_START = EVENING_FROM_HOUR + 2;\nif (h >= LATE_START) x();")).toBe(1);
    expect(seen(`const sinceEvening = h - EVENING_FROM_HOUR;`)).toBe(1);
  });

  it("leaves every other number alone", () => {
    for (const line of [
      `if (h < 12) return "morning";`,
      `if (h >= 7 && h < 11) return "morning";`,
      `if (h >= 11 && h < EVENING_FROM_HOUR) return "midday";`,
      `if (h >= EVENING_FROM_HOUR && h < NIGHT_FROM_HOUR) return "evening";`,
      `return hour >= EVENING_FROM_HOUR ? "evening" : "morning";`,
      "const tick = new Date();\nconst m = tick.getMinutes();\nif (m >= 20) x();",
      `const [hour, setHour] = useState(8);`,
      `const h = mounted ? new Date().getHours() : 8;`,
      `<Skeleton weight="faint" className="mt-2 h-[27px] w-[62%]" />`,
      `<svg width={20} height={20} viewBox="0 0 24 24" strokeWidth={1.7}>`,
      `className="h-12 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)] text-[16px]"`,
      `if (cards.length >= 20) return;`,
      "const SLOTS = 20;\nif (cards.length < SLOTS) add();",
      `// it said h < 19 until 2026-10-10`,
      `/* h >= 16 was the old start */`,
    ]) {
      expect(seen(line), line).toBe(0);
    }
  });

  it("lets a named allowance through, and only that name", () => {
    const src = "const NIGHT_FROM_HOUR = 21;\nif (h < NIGHT_FROM_HOUR) x();\nif (h >= 18) y();";
    expect(lateHourComparisons(src)).toHaveLength(2);
    expect(lateHourComparisons(src, new Set(["NIGHT_FROM_HOUR"])).map((f) => f.text)).toEqual(["h >= 18"]);
  });

  it("finds no late hour compared with the clock in a file that decides a day part", () => {
    const offenders: string[] = [];
    for (const file of DECIDES_A_DAY_PART) {
      const allowed = new Set(ALLOWED.filter((a) => a.file === file).map((a) => a.name));
      for (const f of lateHourComparisons(read(file), allowed)) offenders.push(`${file}:${f.line}  ${f.text}`);
    }
    expect(
      offenders,
      "These lines compare the hour against a number of their own, or move the evening hour " +
        "by an offset. Evening starts at EVENING_FROM_HOUR in lib/prayers/ruleForHour.ts on " +
        "every screen: import it (or ruleIdForHour) and compare against that, as it stands. If " +
        "the number is truly another boundary, name " +
        "it, say why beside it, and add it to ALLOWED in this test:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("has every one of those files read the one hour", () => {
    // Directly, or through suggest.ts, which is itself on the list and held
    // to ruleForHour.ts by the test above.
    const reads = /from\s+["'][^"']*\/(?:ruleForHour|suggest)["']/;
    const strangers = DECIDES_A_DAY_PART.filter((file) => !reads.test(read(file)));
    expect(
      strangers,
      "These files are listed as deciding a day part from the clock, yet they import neither " +
        "lib/prayers/ruleForHour.ts nor lib/prayers/suggest.ts, so their evening comes from " +
        "somewhere else. Have them read ruleForHour.ts. If a file no longer decides a day " +
        "part at all, take it off DECIDES_A_DAY_PART:\n  " +
        strangers.join("\n  "),
    ).toEqual([]);
  });

  it("keeps each allowance to the one number it names", () => {
    for (const a of ALLOWED) {
      expect(DECIDES_A_DAY_PART, `${a.file} must be a scanned file to carry an allowance`).toContain(a.file);
      const value = new RegExp(String.raw`\bconst\s+${a.name}\s*=\s*(\d+)\s*;`).exec(code(read(a.file)))?.[1];
      expect(
        value,
        `${a.name} in ${a.file} is allowed as ${a.value} and no other number (${a.why}) ` +
          "Changing it is a new decision: settle it with the owner, then update ALLOWED.",
      ).toBe(String(a.value));
    }
  });

  it("has been told about every file that reads the clock", () => {
    const readers = clockReaders();
    // A grep that found nothing would pass the check below.
    expect(readers.length).toBeGreaterThan(5);
    const known = new Set([...DECIDES_A_DAY_PART, ...Object.keys(ANOTHER_QUESTION)]);
    const unknown = readers.filter((file) => !known.has(file));
    expect(
      unknown,
      "These files call getHours() and this test has not been told what for. If one decides a " +
        "day part (morning, afternoon, evening, night, or the rule of the hour), add it to " +
        "DECIDES_A_DAY_PART and have it read lib/prayers/ruleForHour.ts. If it asks something " +
        "else, add it to ANOTHER_QUESTION with the reason:\n  " +
        unknown.join("\n  "),
    ).toEqual([]);
  });
});
