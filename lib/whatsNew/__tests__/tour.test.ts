// The release's guided tour (1.8, the owner's note 49 of build 80): the steps
// as data, the order they are taken in, and how a missing step is passed
// over. lib/whatsNew/tour.ts.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { hasWeb } from "@/lib/saints/web";
import {
  HIGHLIGHTS_MAX,
  HIGHLIGHTS_MIN,
  IDLE,
  TOURS,
  awaitingSteps,
  canGoBack,
  highlightSteps,
  reduceTour,
  stepAfter,
  stepCount,
  tourFor,
  type Tour,
  type TourAction,
  type TourState,
} from "../tour";
import { CURRENT_VERSION, featureRelease } from "../version";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const LANGS = fs.readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
const CATALOGS = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(MESSAGES, `${l}.json`), "utf8")) as Record<string, string>]),
);
/** Written by its number, so the character itself is in no file. */
const EM_DASH = String.fromCharCode(0x2014);

const TOUR = tourFor("1.8")!;
const N = TOUR.steps.length;
const ORIGIN = { route: "/", via: "offer" as const };
/** The steps still awaiting their screens, passed over from the start. */
const AWAIT = awaitingSteps(TOUR);
/** The steps the tour looks for, in order. */
const READY = [...Array(N).keys()].filter((i) => !AWAIT.includes(i));

/** Runs a list of actions from idle. */
function run(...actions: TourAction[]): TourState {
  return actions.reduce(reduceTour, IDLE);
}

/** The steps found missing so far, in a step or at the end card. */
function missingOf(s: TourState): readonly number[] {
  return s.phase === "step" || s.phase === "end" ? s.missing : [];
}

const start: TourAction = { type: "start", version: "1.8", origin: ORIGIN };

describe("the 1.8 tour as data", () => {
  it("belongs to 1.8 and its patches, and to nothing else", () => {
    expect(TOUR.version).toBe("1.8");
    expect(tourFor("1.8.1")).toBe(TOUR);
    expect(tourFor(" 1.8 ")).toBe(TOUR);
    expect(tourFor("1.7")).toBeNull();
    expect(tourFor("1.9")).toBeNull();
    // This build's release has its tour.
    expect(tourFor(CURRENT_VERSION)?.version).toBe(featureRelease(CURRENT_VERSION));
  });

  it("names each thing the owner listed, in the order a reader meets them", () => {
    expect(TOUR.steps.map((s) => s.id)).toEqual([
      "search",
      "quote-picture",
      "mini-player",
      "theology",
      "saint-web",
      "atlas",
      "chants",
      "community",
      "settings",
    ]);
  });

  it("gives every step a unique id and target, and every release a unique version", () => {
    const ids = TOUR.steps.map((s) => s.id);
    const targets = TOUR.steps.map((s) => s.target);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(targets).size).toBe(targets.length);
    expect(new Set(TOURS.map((t) => t.version)).size).toBe(TOURS.length);
    for (const s of TOUR.steps) expect(s.target, s.id).toMatch(/^[a-z][a-z-]*$/);
  });

  it("names pages as the app's own addresses, or none for what is on every page", () => {
    for (const s of TOUR.steps) {
      if (s.route === null) continue;
      expect(s.route, s.id).toMatch(/^\/[a-z0-9/-]*$/);
      expect(s.route.endsWith("/") && s.route !== "/", s.id).toBe(false);
    }
    // The mini player is drawn on every page: it is looked for where the reader is.
    expect(TOUR.steps.find((s) => s.id === "mini-player")?.route).toBeNull();
  });

  it("goes to pages that exist in this build", () => {
    for (const s of TOUR.steps) {
      if (!s.route || s.route === "/") continue;
      const segments = s.route.split("/").filter(Boolean);
      const top = path.join(ROOT, "app/(app)", segments[0]);
      expect(fs.existsSync(top), `${s.id}: app/(app)/${segments[0]}`).toBe(true);
    }
    // The saint web's step opens a saint whose page has the Web door.
    const saint = TOUR.steps.find((s) => s.id === "saint-web")!.route!.split("/")[2];
    expect(hasWeb(saint)).toBe(true);
  });

  it("names two or three highlights for the pop-up, each a step", () => {
    expect(TOUR.highlights.length).toBeGreaterThanOrEqual(HIGHLIGHTS_MIN);
    expect(TOUR.highlights.length).toBeLessThanOrEqual(HIGHLIGHTS_MAX);
    for (const id of TOUR.highlights) expect(TOUR.steps.some((s) => s.id === id), id).toBe(true);
    const shown = highlightSteps(TOUR);
    expect(shown.length).toBeGreaterThanOrEqual(HIGHLIGHTS_MIN);
    expect(shown.length).toBeLessThanOrEqual(HIGHLIGHTS_MAX);
  });

  it("never names in the pop-up a step still awaiting its screen", () => {
    const shown = highlightSteps(TOUR);
    expect(shown.some((s) => s.awaiting)).toBe(false);
    // Its own highlights when they are ready, in their order; the tour's first
    // ready steps filling in when fewer than two are.
    const step = (id: string, awaiting?: true, route: string | null = "/") => ({ id, route, target: id, title: "t", body: "b", ...(awaiting ? { awaiting } : {}) });
    const tour = (steps: Tour["steps"], highlights: string[]): Tour => ({ version: "9.9", name: "n", line: "l", highlights, steps });
    const ids = (t: Tour) => highlightSteps(t).map((s) => s.id);
    expect(ids(tour([step("a"), step("b"), step("c"), step("d")], ["c", "a"]))).toEqual(["c", "a"]);
    expect(ids(tour([step("a"), step("b", true), step("c"), step("d")], ["b", "d"]))).toEqual(["d", "a", "c"]);
    expect(ids(tour([step("a", true), step("b", true)], ["a", "b"]))).toEqual([]);
    // What only some readers see fills in last.
    expect(ids(tour([step("p", undefined, null), step("q", true), step("r"), step("s")], ["q"]))).toEqual(["r", "s", "p"]);
  });

  it("asks for a try only where the element stays on its page when used", () => {
    expect(TOUR.steps.filter((s) => s.tryIt).map((s) => s.id)).toEqual(["community"]);
  });
});

describe("the tour's words", () => {
  const keys = [TOUR.name, TOUR.line, ...TOUR.steps.flatMap((s) => [s.title, s.body])];
  const own = ["tour.offer.see", "tour.end.title", "tour.end.body", "tour.replay"];
  const all = [...new Set([...keys, ...own])];
  const newKeys = all.filter((k) => k.startsWith("tour."));

  it("are in all 21 catalogs", () => {
    expect(LANGS.length).toBe(21);
    for (const lang of LANGS) {
      const missing = all.filter((k) => !(k in CATALOGS[lang]) || CATALOGS[lang][k].trim() === "");
      expect(missing, lang).toEqual([]);
    }
  });

  it("are translated, never the English copied", () => {
    for (const lang of LANGS) {
      if (lang === "en") continue;
      const copied = newKeys.filter((k) => CATALOGS[lang][k] === CATALOGS.en[k]);
      expect(copied, lang).toEqual([]);
    }
  });

  it("are short: a title and one line for each step", () => {
    for (const s of TOUR.steps) {
      expect(CATALOGS.en[s.title].length, s.title).toBeLessThanOrEqual(34);
      expect(CATALOGS.en[s.body].length, s.body).toBeLessThanOrEqual(80);
      for (const lang of LANGS) {
        expect(CATALOGS[lang][s.title].length, `${lang} ${s.title}`).toBeLessThanOrEqual(56);
        expect(CATALOGS[lang][s.body].length, `${lang} ${s.body}`).toBeLessThanOrEqual(110);
      }
    }
  });

  it("hold no em dash, and no gold or yellow", () => {
    for (const lang of LANGS) {
      for (const k of newKeys) expect(CATALOGS[lang][k], `${lang} ${k}`).not.toContain(EM_DASH);
    }
    for (const k of newKeys) expect(CATALOGS.en[k]).not.toMatch(/\b(gold|golden|yellow)\b/i);
  });

  it("sit together after What's New's own keys, where they were put", () => {
    for (const lang of LANGS) {
      const order = Object.keys(CATALOGS[lang]);
      const anchor = order.indexOf("whatsnew.highlights.sub");
      expect(order.slice(anchor + 1, anchor + 1 + newKeys.length).sort(), lang).toEqual([...newKeys].sort());
    }
  });
});

describe("where each step's element is marked", () => {
  const marked = (target: string): string[] => {
    try {
      return execFileSync("git", ["grep", "-l", "-F", `data-tour="${target}"`, "--", "app", "components"], {
        cwd: ROOT,
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  it("is placed for every step whose screen is in this build", () => {
    for (const s of TOUR.steps) {
      if (s.awaiting) continue;
      expect(marked(s.target), `data-tour="${s.target}"`).not.toEqual([]);
    }
  });

  it("is not placed yet for a step still awaiting its screen, so the flag cannot outlive it", () => {
    // Round 3's search, quote pictures and Theology are built beside the
    // tour; their anchors go on after the merge, and the step's `awaiting`
    // comes off in the same commit.
    for (const s of TOUR.steps) {
      if (!s.awaiting) continue;
      expect(marked(s.target), `data-tour="${s.target}" is placed now: take "awaiting" off the ${s.id} step`).toEqual([]);
    }
  });
});

describe("moving through the steps", () => {
  it("finds the next step to try, passing over the missing ones", () => {
    expect(stepAfter(0, 1, 5, [])).toBe(1);
    expect(stepAfter(0, 1, 5, [1, 2])).toBe(3);
    expect(stepAfter(4, 1, 5, [])).toBeNull();
    expect(stepAfter(3, -1, 5, [1, 2])).toBe(0);
    expect(stepAfter(1, -1, 5, [0])).toBeNull();
    expect(stepAfter(-1, 1, 3, [])).toBe(0);
  });

  it("counts the shown step among the steps that are there", () => {
    expect(stepCount(0, 9, [])).toEqual({ at: 1, of: 9 });
    expect(stepCount(3, 9, [0, 1])).toEqual({ at: 2, of: 7 });
    expect(stepCount(8, 9, [2])).toEqual({ at: 8, of: 8 });
    // Never "of 0", whatever the list says.
    expect(stepCount(0, 1, [0])).toEqual({ at: 1, of: 1 });
  });

  it("offers only from idle, and only a release that has a tour", () => {
    expect(run({ type: "offer", version: "1.8" })).toEqual({ phase: "offer", version: "1.8" });
    expect(run({ type: "offer", version: "1.7" })).toBe(IDLE);
    const stepping = run(start);
    expect(reduceTour(stepping, { type: "offer", version: "1.8" })).toBe(stepping);
  });

  it("starts at the first step there is, from the pop-up or from Take the tour", () => {
    expect(READY.length).toBeGreaterThanOrEqual(4);
    const fromOffer = run({ type: "offer", version: "1.8" }, start);
    expect(fromOffer).toMatchObject({ phase: "step", index: READY[0], dir: 1, found: false, shown: null, missing: AWAIT });
    const replay = run({ type: "start", version: "1.8", origin: { route: "/whats-new", via: "replay" } });
    expect(replay).toMatchObject({ phase: "step", index: READY[0], origin: { route: "/whats-new", via: "replay" } });
    expect(run({ type: "start", version: "1.6", origin: ORIGIN })).toBe(IDLE);
  });

  it("passes over the steps still awaiting their screens without looking, and does not count them", () => {
    const lit = run(start, { type: "found", index: READY[0] });
    expect(stepCount(READY[0], N, missingOf(lit))).toEqual({ at: 1, of: READY.length });
    for (const i of AWAIT) expect(TOUR.steps[i].awaiting).toBe(true);
  });

  it("lights a step once found, and keeps its words on the card while moving on", () => {
    const lit = run(start, { type: "found", index: READY[0] });
    expect(lit).toMatchObject({ phase: "step", index: READY[0], found: true, shown: READY[0] });
    const moving = reduceTour(lit, { type: "next" });
    expect(moving).toMatchObject({ phase: "step", index: READY[1], found: false, shown: READY[0] });
    // A "found" for a step that is not the one being looked for changes nothing.
    expect(reduceTour(moving, { type: "found", index: READY[3] })).toBe(moving);
  });

  it("does not move on before the step is found", () => {
    const looking = run(start);
    expect(reduceTour(looking, { type: "next" })).toBe(looking);
    expect(reduceTour(looking, { type: "back" })).toBe(looking);
  });

  it("passes over a missing step, forward, and never waits on it", () => {
    const [a, b, c] = READY;
    const s = run(start, { type: "missing", index: a }, { type: "missing", index: b });
    expect(s).toMatchObject({ phase: "step", index: c, dir: 1, missing: [...AWAIT, a, b], shown: null });
    const lit = reduceTour(s, { type: "found", index: c });
    expect(stepCount(c, N, missingOf(lit))).toEqual({ at: 1, of: READY.length - 2 });
    expect(canGoBack(lit)).toBe(false);
  });

  it("walks every step in order, and the end card follows the last", () => {
    let s = run(start);
    const seen: number[] = [];
    for (const i of READY) {
      s = reduceTour(s, { type: "found", index: i });
      seen.push((s as { index: number }).index);
      s = reduceTour(s, { type: "next" });
    }
    expect(seen).toEqual(READY);
    expect(s).toMatchObject({ phase: "end", version: "1.8", missing: AWAIT });
  });

  it("goes to the end card when every step is missing", () => {
    let s = run(start);
    for (const i of READY) s = reduceTour(s, { type: "missing", index: i });
    expect(s.phase).toBe("end");
    expect([...missingOf(s)].sort((x, y) => x - y)).toEqual([...Array(N).keys()]);
  });

  it("goes back over the missing steps, and not past the first one there is", () => {
    // The first found, the next two missing, the fourth found: Back from it goes to the first.
    const [a, b, c, d] = READY;
    let s = run(start, { type: "found", index: a }, { type: "next" });
    s = reduceTour(s, { type: "missing", index: b });
    s = reduceTour(s, { type: "missing", index: c });
    s = reduceTour(s, { type: "found", index: d });
    expect(canGoBack(s)).toBe(true);
    s = reduceTour(s, { type: "back" });
    expect(s).toMatchObject({ phase: "step", index: a, dir: -1, found: false, shown: d });
    s = reduceTour(s, { type: "found", index: a });
    expect(canGoBack(s)).toBe(false);
    expect(reduceTour(s, { type: "back" })).toBe(s);
  });

  it("going back to a step that has gone, turns forward again rather than stopping", () => {
    // The first found, then the second; Back to the first, which is not there now: on to the second again.
    const [a, b] = READY;
    let s = run(start, { type: "found", index: a }, { type: "next" }, { type: "found", index: b }, { type: "back" });
    expect(s).toMatchObject({ index: a, dir: -1 });
    s = reduceTour(s, { type: "missing", index: a });
    expect(s).toMatchObject({ phase: "step", index: b, dir: 1, missing: [...AWAIT, a] });
  });

  it("a lit step whose element goes is passed over, its words with it", () => {
    const [a, b] = READY;
    let s = run(start, { type: "found", index: a });
    s = reduceTour(s, { type: "missing", index: a });
    expect(s).toMatchObject({ phase: "step", index: b, shown: null, missing: [...AWAIT, a] });
  });

  it("ends on Skip from anywhere, and the end card closes on Done", () => {
    expect(reduceTour(run({ type: "offer", version: "1.8" }), { type: "skip" })).toBe(IDLE);
    expect(reduceTour(run(start, { type: "found", index: READY[0] }), { type: "skip" })).toBe(IDLE);
    let end = run(start);
    for (const i of READY) end = reduceTour(end, { type: "missing", index: i });
    expect(reduceTour(end, { type: "finish" })).toBe(IDLE);
    // Done means nothing before the end card.
    const lit = run(start, { type: "found", index: READY[0] });
    expect(reduceTour(lit, { type: "finish" })).toBe(lit);
    expect(reduceTour(IDLE, { type: "skip" })).toBe(IDLE);
  });
});
