// Build 95 note 13 (the owner, 2026-11-13, a screenshot of a reader's
// profile sheet): "make the profile system even smoother". Recorded frame by
// frame on the export with motion on, before:
//   - the card slid up holding its loading lines, and when the profile came
//     its top jumped 432px in one frame, and 10px more when the verse came;
//   - a door's panel swapped for the next in one frame;
//   - flicked away, the card stood almost still for two frames (395, 399,
//     408px after a release at 2.4px a millisecond) and was then pulled off.
// Now the card's height follows what it holds on the house curve, a door
// hands its panel over, a flicked card leaves at the finger's speed, and what
// arrives after its loading lines fades in. With motion off nothing moves.
//
// Rendered to static markup and read from the source (vitest runs in node).
// The motion itself is measured on the export, frame by frame, by section 50
// of scripts/export-walk.mjs.

import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ARRIVE } from "@/components/community/profile/ProfileCard";
import { ProfileDoors } from "@/components/community/profile/ProfileDoors";
import { throwMs } from "@/lib/ui/useDraggableSheet";

const ROOT = process.cwd();
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");

/** Each door panel's id and classes, in order. */
function panels(html: string): { id: string; className: string }[] {
  return [...html.matchAll(/<div([^>]*role="tabpanel"[^>]*)>/g)].map((m) => ({
    id: /id="([^"]+)"/.exec(m[1])?.[1] ?? "",
    className: /class="([^"]*)"/.exec(m[1])?.[1] ?? "",
  }));
}

describe("the profile sheet, smoother (build 95 note 13)", () => {
  it("hands a door's panel over: the old fades, the new follows, only with motion on", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileDoors, {
        doors: ["about", "badges", "posts"],
        label: "Sections",
        initial: "badges",
        panels: { about: createElement("p", null, "About"), badges: createElement("p", null, "Badges"), posts: createElement("p", null, "Posts") },
      }),
    );
    const p = panels(html);
    expect(p.map((x) => x.id)).toEqual(["profile-panel-about", "profile-panel-badges", "profile-panel-posts"]);
    for (const x of p) {
      const cls = x.className.split(/\s+/);
      // Still one cell: nothing moves when a door is chosen.
      expect(cls).toEqual(expect.arrayContaining(["col-start-1", "row-start-1"]));
      const moves = cls.filter((c) => /transition/.test(c));
      expect(moves.length, x.id).toBe(1);
      expect(moves[0], x.id).toMatch(/^motion-safe:\[transition:opacity_var\(--duration-fast\)_var\(--ease-house\)/);
      if (x.id === "profile-panel-badges") {
        expect(cls).toEqual(expect.arrayContaining(["visible", "opacity-100"]));
        // The new one follows the old, 120ms on, as the mini player's pill does.
        expect(moves[0]).toContain("_120ms");
      } else {
        expect(cls).toEqual(expect.arrayContaining(["invisible", "opacity-0"]));
        // Hidden only once it has faded, so the fade is seen.
        expect(moves[0]).toContain("visibility_0s_linear_var(--duration-fast)");
      }
    }
  });

  it("asks its sheet to follow its height in the house's motion", () => {
    const viewer = read("components", "community", "profile", "ProfileViewer.tsx");
    expect(viewer).toMatch(/useDraggableSheet\(\{[^}]*smoothHeight: true[^}]*\}\)/);
    const hook = read("lib", "ui", "useDraggableSheet.ts");
    // The hand-over is a height transition on the snap's time and the house curve.
    expect(hook).toMatch(/kind === "resize"\s*\?\s*`height \$\{ms\}ms \$\{ease\}`/);
  });

  it("lets a flicked sheet go at the finger's speed, and a slow release from a stop", () => {
    // 2.4px a millisecond (the export's flick), 540px to the screen's edge.
    expect(throwMs(540, 2.4)).toBe(225);
    // A very fast flick still takes a moment; a long, slow one no longer than a close.
    expect(throwMs(100, 5)).toBe(120);
    expect(throwMs(2000, 0.8)).toBe(300);
    // No flick: the ordinary close, which starts from a stop.
    expect(throwMs(540, 0.3)).toBeNull();
    expect(throwMs(0, 3)).toBeNull();
    // It begins in the frame it is let go, and a frame along its way: the close
    // in a layout effect (a passive one began after the next frame was drawn),
    // the throw with a frame's head start (a transition's first frame is where
    // it starts). Before, it stood still under the lifted finger.
    const hook = read("lib", "ui", "useDraggableSheet.ts");
    expect(hook).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(open\) \{\s*closing\.current = false;\s*setMounted\(true\);/);
    expect(hook).toMatch(/kind === "throw"\s*\?\s*`transform \$\{ms\}ms \$\{ease\} -\$\{THROW_HEAD_START_MS\}ms`/);
    expect(hook).toMatch(/const THROW_HEAD_START_MS = 16;/);
  });

  it("fades in what arrives after its loading lines: opacity only, filling backwards, motion on", () => {
    expect(ARRIVE).toBe("motion-safe:animate-[page-open-fade_var(--duration-base)_var(--ease-house)_backwards]");
    // The keyframe it names is the house's, and moves nothing but opacity.
    const css = read("app", "globals.css");
    expect(css).toMatch(/@keyframes page-open-fade \{\s*from \{ opacity: 0; \}\s*\}/);
    const viewer = read("components", "community", "profile", "ProfileViewer.tsx");
    expect(viewer).toMatch(/<div key=\{profile\.handle\} className=\{ARRIVE\}>\s*<ProfileDoors/);
    const card = read("components", "community", "profile", "ProfileCard.tsx");
    expect(card).toMatch(/words\?\.text \? \(\s*<p className=\{cn\([^)]*ARRIVE\)\}>\{words\.text\}<\/p>/);
  });
});
