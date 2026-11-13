// The opening hands off to the first screen cleanly, and moves only what a
// phone draws cheaply (build 95 note 8).
//
// His word, 2026-11-13 07:34 UTC, on build 96, with a screenshot of the
// opening (the starry night, the glowing cross, the horizon's bright rim):
// "the animation is buggy". His phone was at 3% battery.
//
// Filmed on that build's export at 390 and 412, motion on, and again with the
// CPU slowed four times: the cover's stage (the cross, the stars, the
// horizon) left on an ease-in, slow at the start, while the night faded
// evenly, so for about a third of a second the bright cross stood over
// Today's "One question" card and the horizon's rim ran through the verse of
// the day, smearing as the whole stage was blurred to 6px. The cross's glow
// was two drop-shadows animated frame by frame. Filters animated frame by
// frame are the costliest thing a phone draws, and a busy start or a battery
// saver makes them stutter.
//
// Read as text, as lib/platform/__tests__/launchFrame.test.ts reads the
// cover; the lift is modelled from the stylesheet's own numbers.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LAUNCH_CROSS_PX } from "@/lib/platform/launchFrame";

const ROOT = process.cwd();
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
const frameTsx = fs.readFileSync(path.join(ROOT, "components/native/LaunchFrame.tsx"), "utf8");

/** A rule's body, by its selector as the stylesheet writes it at a line's start. */
const body = (selector: string) => {
  const at = css.indexOf(`\n${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};

/** The curve a timing function names: a cubic-bezier's four numbers, the house ease by its token. */
function curveOf(timing: string): [number, number, number, number] {
  const named = /var\(--([a-z-]+)\)/.exec(timing)?.[1];
  const text = named ? new RegExp(`--${named}: (cubic-bezier\\([^)]+\\));`).exec(css)?.[1] ?? "" : timing;
  const n = /cubic-bezier\(([^)]+)\)/.exec(text)?.[1].split(",").map(Number) ?? [];
  if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) throw new Error(`not a curve: ${timing}`);
  return n as [number, number, number, number];
}

/** How far a cubic-bezier has come at time share x, as a browser draws it. */
function progress([x1, y1, x2, y2]: [number, number, number, number], x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const at = (a: number, b: number, s: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s ** 2 * b + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

type Lift = { stage: { ms: number; curve: [number, number, number, number] }; night: { ms: number; delay: number; curve: [number, number, number, number] } };

/** The lift as the stylesheet times it, on the day's first open or on every later one. */
function lift(pace: "slow" | "quick"): Lift {
  const stage = /opacity (\d+)ms ((?:cubic-bezier\([^)]+\))|(?:var\(--[a-z-]+\)))/.exec(body("[data-launch-stage]"));
  const night = /opacity (\d+)ms (cubic-bezier\([^)]+\)) (\d+)ms/.exec(body("[data-launch-frame]"));
  if (!stage || !night) throw new Error("the lift's timings are not where they were");
  const out: Lift = {
    stage: { ms: Number(stage[1]), curve: curveOf(stage[2]) },
    night: { ms: Number(night[1]), delay: Number(night[3]), curve: curveOf(night[2]) },
  };
  if (pace === "quick") {
    const qs = body('html[data-intro-pace="quick"] [data-launch-stage]');
    const qf = body('html[data-intro-pace="quick"] [data-launch-frame]');
    out.stage.ms = Number(/transition-duration: (\d+)ms/.exec(qs)?.[1] ?? out.stage.ms);
    out.night.ms = Number(/transition-duration: (\d+)ms/.exec(qf)?.[1] ?? out.night.ms);
    out.night.delay = Number(/transition-delay: (\d+)ms/.exec(qf)?.[1] ?? out.night.delay);
  }
  return out;
}

/** Each millisecond of the lift: the stage's ink, and how much of the first screen shows through the night. */
function frames(l: Lift) {
  const end = Math.max(l.stage.ms, l.night.delay + l.night.ms);
  return Array.from({ length: end + 1 }, (_, t) => ({
    t,
    stage: 1 - progress(l.stage.curve, t / l.stage.ms),
    screen: progress(l.night.curve, (t - l.night.delay) / l.night.ms),
  }));
}

describe("the opening hands off to the first screen (build 95 note 8)", () => {
  for (const pace of ["slow", "quick"] as const) {
    it(`never draws the cross and the horizon over the first screen, on the ${pace} pace`, () => {
      // Both seen at more than a tenth of their ink, at any moment: the
      // cross over Today's cards, the rim through the verse of the day.
      const both = frames(lift(pace)).filter((f) => Math.min(f.stage, f.screen) > 0.1);
      expect(both.map((f) => `+${f.t}ms: the stage at ${f.stage.toFixed(2)}, the screen at ${f.screen.toFixed(2)}`).slice(0, 3)).toEqual([]);
    });
  }

  it("takes the time it took: 600ms on the day's first open, 360ms on every later one", () => {
    for (const [pace, ms] of [["slow", 600], ["quick", 360]] as const) {
      const l = lift(pace);
      expect(l.night.delay + l.night.ms, pace).toBe(ms);
      expect(l.stage.ms, pace).toBeLessThanOrEqual(ms);
    }
    expect(body("[data-launch-frame]")).toContain("visibility 0s linear 600ms");
    expect(body('html[data-intro-pace="quick"] [data-launch-frame]')).toMatch(/transition-delay: \d+ms, 360ms;/);
  });
});

describe("the opening moves only what a phone draws cheaply (build 95 note 8)", () => {
  it("animates no filter: no blur on the stage, no growing glow", () => {
    const keyframes = [...css.matchAll(/@keyframes (launch-[a-z]+) \{([^}]*\})\s*\}/g)];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const [, name, frames] of keyframes) expect(frames, name).not.toMatch(/filter|blur|shadow/);
    expect(body("[data-launch-stage]")).not.toMatch(/filter/);
    expect(body('html[data-launch="ready"][data-intro="played"] [data-launch-stage]')).not.toMatch(/filter|blur/);
  });

  it("blooms the cross's light by opacity: the same glow, drawn again over the bare cross", () => {
    const glow = body(".launch-glow");
    expect(glow).toContain("filter: drop-shadow(0 0 10px rgb(255 255 255 / 0.7)) drop-shadow(0 0 26px rgb(255 255 255 / 0.25));");
    expect(glow).toContain("animation: launch-lit 1200ms ease-out 600ms both;");
    expect(css).toMatch(/@keyframes launch-lit \{\s*from \{\s*opacity: 0;\s*\}\s*\}/);
    // The bare cross is the logo screen's: no light of its own, and still.
    expect(body(".launch-cross")).toBe("");
    // Two images of the one cross, in the one place.
    const style = "style={{ width: CROSS_W, height: LAUNCH_CROSS_PX, marginLeft: -CROSS_W / 2, marginTop: -LAUNCH_CROSS_PX / 2 }}";
    expect(frameTsx).toMatch(new RegExp(`className="launch-cross absolute left-1/2 top-1/2 max-w-none"\\s*${style.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    expect(frameTsx).toMatch(new RegExp(`className="launch-glow absolute left-1/2 top-1/2 max-w-none"\\s*${style.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    expect(frameTsx.indexOf('className="launch-glow')).toBeGreaterThan(frameTsx.indexOf('className="launch-cross'));
    expect(LAUNCH_CROSS_PX).toBe(80);
  });

  it("is the finished picture with motion off, the glow with it", () => {
    // The motion-off line takes every part's animation away, the glow's too:
    // it comes after the glow's rule, at its weight.
    expect(css.indexOf(':where([data-motion="reduce"]) [data-launch-frame] *')).toBeGreaterThan(css.indexOf("\n.launch-glow {"));
    expect(body('html[data-intro-pace="quick"] .launch-glow')).toMatch(/animation-duration: 600ms;\s*animation-delay: 300ms;/);
  });
});
