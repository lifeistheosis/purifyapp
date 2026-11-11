// Build 93 note 5, his words: "Remember, on this section, I wanted you to add
// haptic feedback and make the design more... I feel like you can make the
// design better on this. It's good, but..." His screenshot (1054, Story):
// each step's year stood twice ("867" beside it and "867" over its words),
// the map named nothing, and nothing clicked. scripts/export-walk.mjs,
// section 70, measures the page the apps build.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HISTORY_EVENTS } from "@/lib/history/events";
import { loadEventBody } from "@/lib/history/load";
import { eventThread, ownCity, stepWhen } from "@/lib/history/thread";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const THREAD = code("components/history/EventThread.tsx");
const CLICKS = code("components/history/useStepClicks.ts");
const at = (name: string) => ({ name, x: 0, y: 0 });

describe("each step's year, said once", () => {
  it("is marked where the years change, the day and the place said over the words", () => {
    expect(
      stepWhen([
        { date: "867", year: "867", place: null },
        { date: "c. 1014", year: "1014", place: at("Rome") },
        { date: "1053", year: "1053", place: null },
        { date: "19 April 1054", year: "1054", place: null },
        { date: "Late April 1054", year: "1054", place: at("Constantinople") },
        { date: "1204", year: "1204", place: at("Constantinople") },
      ]),
    ).toEqual([
      { mark: "867", line: "" },
      { mark: "c. 1014", line: "Rome" },
      { mark: "1053", line: "" },
      { mark: "1054", line: "19 April" },
      { mark: null, line: "Late April · Constantinople" },
      { mark: "1204", line: "Constantinople" },
    ]);
  });

  it("keeps a date whole when its words do more than name a day, a month or a season", () => {
    for (const date of ["About 150", "Before 374", "After 311", "Between 356 and 362", "1937–1938", "988, by the Chronicle", "861 or 862", "Winter 312–313", "1320s", "1274 and 1439"]) {
      const [when] = stepWhen([{ date, year: /\b(\d{3,4})\b/.exec(date)?.[1] ?? null, place: null }]);
      expect(when, date).toEqual({ mark: null, line: date });
    }
    expect(stepWhen([{ date: "Under Nero", year: null, place: null }])).toEqual([{ mark: null, line: "Under Nero" }]);
    // Days and months, however written, go over the words.
    for (const [date, line] of [
      ["8 October to 13 December 1438", "8 October to 13 December"],
      ["26 or 27 June 431", "26 or 27 June"],
      ["15/28 August 1917", "15/28 August"],
      ["5–7 April 1453", "5–7 April"],
      ["Summer 338", "Summer"],
    ]) {
      expect(stepWhen([{ date, year: /\b(\d{3,4})\b/.exec(date)?.[1] ?? null, place: null }])[0], date).toEqual({ mark: /\b(\d{3,4})\b/.exec(date)?.[1], line });
    }
  });

  it("says no step's year twice and loses none, in every event's steps", async () => {
    let steps = 0;
    for (const file of fs.readdirSync(path.join(ROOT, "data/history")).filter((f) => f.endsWith(".json"))) {
      const slug = file.replace(/\.json$/, "");
      const body = await loadEventBody(slug);
      if (!body?.chronology?.length) continue;
      let said: string | null = null;
      for (const s of eventThread(slug, body.chronology).steps) {
        steps += 1;
        if (!s.year) continue;
        const inLine = (s.line.match(new RegExp(`\\b${s.year}\\b`, "g")) ?? []).length;
        const inMark = s.mark?.includes(s.year) ? 1 : 0;
        expect(inMark + inLine, `${slug}: ${s.date}`).toBeLessThanOrEqual(1);
        // Said beside it, over it, or by the step above in the same year.
        expect(inMark + inLine > 0 || said === s.year, `${slug}: ${s.date} says no year`).toBe(true);
        if (inMark || inLine) said = s.year;
        // Nothing of the date is dropped: the year mark and the line hold all its words.
        const words = `${s.mark ?? said ?? ""} ${s.line}`;
        for (const w of s.date.split(/[\s,]+/).filter((x) => x && x !== "c.")) expect(words, `${slug}: ${s.date}`).toContain(w);
      }
    }
    expect(steps).toBeGreaterThan(300);
  });

  it("is drawn from the mark and the line, never the date beside its own year", () => {
    expect(THREAD).toContain('{s.mark ?? ""}');
    expect(THREAD).toContain("{s.line}");
    expect(THREAD).not.toContain('{s.year ?? ""}');
    expect(THREAD).not.toContain("s.place ? `${s.date} · ${s.place.name}` : s.date");
  });
});

describe("the click as each step reaches the reading place", () => {
  it("is the house's own click, on the Thread and on the plain list", () => {
    expect(CLICKS).toContain('import { SETTLE_MS, handTicks } from "@/lib/ui/scrollTicks";');
    expect(CLICKS).toContain("placeIn(visibleBand(), READING_PLACE)");
    expect(CLICKS).toMatch(/if \(now === null \|\| now === arrived\) return;\s*arrived = now;\s*if \(!hand\) return;/);
    expect(THREAD.match(/useStepClicks\(list\);/g)).toHaveLength(2);
    expect(THREAD.match(/data-step=\{i\}/g)).toHaveLength(2);
  });

  it("is started only by a hand, a finger and its fling, and not for the step the page opened on", () => {
    expect(CLICKS).toContain('window.addEventListener("touchstart", onTouchStart, { passive: true });');
    expect(CLICKS).toContain("settle = window.setTimeout(release, SETTLE_MS);");
    expect(CLICKS).toContain("arrived = here();");
  });
});

describe("the Thread's map", () => {
  it("names the event's place in its corner and the step's beside its mark, in the house's sans, never in a pill", () => {
    expect(THREAD).toContain('data-thread-map-home=""');
    expect(THREAD).toContain("{home.name}");
    expect(THREAD).toContain('data-thread-map-place=""');
    expect(THREAD).not.toMatch(/rounded-full bg-night\/70/);
    const css = read("app/globals.css");
    expect(css).toMatch(/\.thread-map-name \{\s*text-shadow:/);
    expect(css).toContain('.thread-map-here {\n animation: page-open-fade var(--duration-base) var(--ease-house) backwards;');
    expect(css).toContain(':where([data-motion="reduce"]) .thread-map-here {\n animation: none;');
  });

  it("names the event's own city, not the history map's mark for two", async () => {
    // The history map names Constantinople's mark for Chalcedon too, across the Bosporus.
    expect(ownCity("great-schism-1054", "Constantinople and Chalcedon")).toBe("Constantinople");
    expect(ownCity("council-of-chalcedon", "Constantinople and Chalcedon")).toBe("Chalcedon");
    expect(ownCity("council-of-florence", "Florence")).toBe("Florence");
    const body = await loadEventBody("great-schism-1054");
    expect(eventThread("great-schism-1054", body?.chronology ?? []).home?.name).toBe("Constantinople");
  });

  it("lends no step a place its words do not name, and names no place it is not showing", () => {
    expect(THREAD).toContain("const own = steps[current]?.place ?? null;");
    expect(THREAD).toMatch(/\{own \? \(\s*<p\s+aria-hidden/);
    // A step that names none brings the map back to the event's own city, and only then is the corner named.
    expect(THREAD).toContain("const here = own ?? home ?? last;");
    expect(THREAD).toContain("{home && !own ? (");
  });
});

describe("the event's own pictures under the steps they show", () => {
  it("each name a step the account has, one picture to a step", async () => {
    let placed = 0;
    for (const event of HISTORY_EVENTS) {
      const gallery = event.media?.gallery ?? [];
      const steps = gallery.map((g) => g.step).filter((s): s is string => Boolean(s));
      if (!steps.length) continue;
      const body = await loadEventBody(event.slug);
      const dates = new Set((body?.chronology ?? []).map((e) => e.date));
      for (const s of steps) expect(dates.has(s), `${event.slug}: ${s}`).toBe(true);
      expect(new Set(steps).size, event.slug).toBe(steps.length);
      placed += steps.length;
    }
    // Florence's two and ten of the Fall of Constantinople's eleven.
    expect(placed).toBe(10);
  });

  it("stand under their step with their credit, shorter than the head picture, on both lists", () => {
    expect(THREAD).toContain('const STEP_PICTURE = "200px";');
    expect(THREAD.match(/<EventPlate picture=\{picture\} tallest=\{STEP_PICTURE\} className="mt-3 items-start" \/>/g)).toHaveLength(2);
    expect(read("lib/history/media.ts")).toContain("...(g.step ? { step: g.step } : {})");
    expect(code("app/(app)/history/[slug]/page.tsx")).toContain("<EventArticle meta={meta} body={body} people={people} pictures={gallery} />");
  });
});
