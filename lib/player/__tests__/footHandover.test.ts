// The foot's change, drawn by the compositor (build 98 note 14, his word of
// 2026-11-15: "also there's a small stutter when switching between these
// screens"; Updates 98e).
//
// The dock and the mini player wear one name in the View Transitions, and the
// browser's own move from one box to the other animates the box's width and
// height, which only the page's main thread draws. That thread is busiest
// just as a page arrives, so in the motion walk's strips the two pictures
// faded into each other in the old box and the box then leapt 50 to 78% of
// the way in one frame. Now the box does not move: each picture stands at its
// own size on the foot of the box and they fade into each other (opacity,
// which the compositor draws on time), the leaving one where it stood, by the
// step between their feet that the hosting page writes as it comes and goes.
//
// What a reader would notice if this broke: the bar holding still for a
// moment as the page changes, then jumping into the card (or the card into
// the bar); or the leaving bar drawn a few pixels off where it stood.

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import * as pagePlayer from "@/lib/player/pagePlayer";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

describe("the foot's change in a page switch", () => {
  it("moves no box: the group's own animation is none", () => {
    expect(css).toMatch(/::view-transition-group\(foot-player\) \{[^}]*animation-name: none;/);
  });

  it("stands each picture at its own size on the foot of the box, centred, and fades them on the house curve", () => {
    const rule = /::view-transition-old\(foot-player\),\s*::view-transition-new\(foot-player\) \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toContain("inset-block: auto 0;");
    expect(rule).toContain("margin-inline: auto;");
    expect(rule).toContain("inline-size: auto;");
    expect(rule).toContain("block-size: auto;");
    expect(rule).toContain("animation-timing-function: var(--ease-house);");
    // Not stretched to the box: the card's picture is not drawn twice its size in the bar's place.
    expect(rule).not.toContain("object-fit: cover");
  });

  it("keeps the leaving picture where it stood, by the step the page writes", () => {
    expect(css).toMatch(/html\.foot-handover::view-transition-old\(foot-player\) \{\s*inset-block-end: calc\(-1 \* var\(--foot-shift, 0px\)\);/);
  });
});

/** A screen with a mini player and a dock at the given feet, and <html> as the page writes it. */
function screen(feet: { mini: number | null; dock: number | null }) {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  const root = {
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), contains: (c: string) => classes.has(c) },
    style: { setProperty: (k: string, v: string) => props.set(k, v), removeProperty: (k: string) => props.delete(k) },
  } as unknown as HTMLElement;
  const box = (bottom: number | null) => (bottom === null ? null : { getBoundingClientRect: () => ({ bottom, height: 40 }) });
  (globalThis as { document?: unknown }).document = {
    querySelector: (sel: string) => (sel.includes("mini-player") ? box(feet.mini) : sel.includes("reader-dock") ? box(feet.dock) : null),
  };
  return { root, classes, props };
}

describe("the step between the two feet", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("is written as the hosting page comes, the mini player's foot less the dock's, and the other way as it goes", async () => {
    expect((pagePlayer as Record<string, unknown>).HANDOVER_CLASS).toBe("foot-handover");
    const { root, classes, props } = screen({ mini: 788, dock: 776 });
    pagePlayer.footHandoverForTests.arriving(root);
    expect(classes.has("foot-handover")).toBe(true);
    expect(props.get("--foot-shift")).toBe("12px");
    pagePlayer.footHandoverForTests.leaving(root);
    expect(props.get("--foot-shift")).toBe("-12px");
    await Promise.resolve();
  });

  it("is nothing from one hosting page to the next: the dock is in both pictures", () => {
    const { root, classes, props } = screen({ mini: 788, dock: 776 });
    pagePlayer.footHandoverForTests.arriving(root);
    pagePlayer.footHandoverForTests.leaving(root);
    // The next page comes in the same commit.
    pagePlayer.footHandoverForTests.arriving(root);
    expect(classes.has("foot-handover")).toBe(false);
    expect(props.has("--foot-shift")).toBe(false);
  });

  it("is nothing when either form is not drawn (a sound alone: the pill wears no name)", async () => {
    await Promise.resolve();
    const { root, classes } = screen({ mini: 788, dock: null });
    pagePlayer.footHandoverForTests.arriving(root);
    expect(classes.has("foot-handover")).toBe(false);
  });
});
