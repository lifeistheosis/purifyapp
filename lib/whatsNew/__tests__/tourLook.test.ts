// The tour's look, drawn to markup (components/whats-new/tour/TourLook.tsx)
// and its rules in app/globals.css ("What's New: the tour"). vitest runs in
// node with no DOM; react-dom/server needs none, and what is checked here is
// all in the markup and the stylesheet.

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TourCaption, TourEnd, TourOffer, TourSpotlight } from "@/components/whats-new/tour/TourLook";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
const draw = (el: ReactElement) => renderToStaticMarkup(el);
const noop = () => {};
const WORDS = { see: "See what's new", skip: "Skip", next: "Next", back: "Back", done: "Done" };

/** What a piece of markup reads as: its text, entities read back. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

/** The buttons as drawn, in order: their words and whether they are off. */
function buttons(html: string) {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attrs, inner]) => ({
    text: text(inner),
    label: /aria-label="([^"]*)"/.exec(attrs)?.[1] ?? null,
    disabled: /\sdisabled=""/.test(attrs),
  }));
}

/** The tour's block of app/globals.css, comments taken out. */
const BLOCK = (() => {
  const from = CSS.indexOf("/* ── What's New: the tour (1.8)");
  const to = CSS.indexOf("/* Emoji and symbols in readers' own words", from);
  return CSS.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, "");
})();

describe("the pop-up", () => {
  const html = draw(
    createElement(TourOffer, {
      name: "Purify 1.8",
      line: "Hear the New Testament, and walk to the Nativity with the Church.",
      highlights: ["Theology, as a path", "One search for all of Purify", "Share a saint's words"],
      words: WORDS,
      titleId: "t",
      onSee: noop,
      onSkip: noop,
    }),
  );

  it("is a modal card named by its line", () => {
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="t"/);
    expect(html).toMatch(/<h2 id="t" class="tour-title">Hear the New Testament/);
    expect(html).toContain(">Purify 1.8</p>");
  });

  it("names two or three of what the release brings, as rows and never pills", () => {
    const rows = [...html.matchAll(/<li class="tour-highlight"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
    expect(rows).toEqual(["Theology, as a path", "One search for all of Purify", "Share a saint's words"]);
    // Each row comes in after the one before it.
    expect(html).toContain('style="--i:2"');
  });

  it("offers See what's new and Skip, and a tap on the dimmed page is Skip", () => {
    expect(buttons(html)).toEqual([
      { text: "", label: "Skip", disabled: false },
      { text: "See what's new", label: null, disabled: false },
      { text: "Skip", label: null, disabled: false },
    ]);
    expect(html).toMatch(/<button type="button" tabindex="-1" aria-label="Skip" class="tour-scrim"/);
  });

  it("stands at the screen's own edge, over the tab bar", () => {
    expect(html).toMatch(/class="tour-offer-layer safe-pb-edge"/);
  });

  it("fades as it goes", () => {
    const leaving = draw(
      createElement(TourOffer, { name: "n", line: "l", highlights: [], words: WORDS, titleId: "t", leaving: true, onSee: noop, onSkip: noop }),
    );
    expect(leaving).toMatch(/class="tour-offer-layer safe-pb-edge" data-leaving=""/);
    // No highlights, no empty list.
    expect(leaving).not.toContain("<ul");
  });
});

describe("a step's words", () => {
  const props = {
    title: "Pray together, talk together",
    body: "Community now has two sides. Tap one, then the other.",
    count: "2 of 7",
    place: "bottom" as const,
    canBack: true,
    words: WORDS,
    stepKey: "community",
    titleId: "st",
    bodyId: "sb",
    onNext: noop,
    onBack: noop,
    onSkip: noop,
  };

  it("carry the count, Skip, the title and one line, Back and Next", () => {
    const html = draw(createElement(TourCaption, props));
    expect(html).toContain('<span class="tour-count">2 of 7</span>');
    expect(html).toMatch(/aria-labelledby="st" aria-describedby="sb"/);
    expect(html).toContain('<h2 id="st" class="tour-step-title">Pray together, talk together</h2>');
    expect(html).toContain('<p id="sb" class="tour-step-body">Community now has two sides. Tap one, then the other.</p>');
    expect(buttons(html).map((b) => b.text)).toEqual(["Skip", "Back", "Next"]);
    expect(html).toMatch(/class="tour-caption-layer safe-pb-edge" data-place="bottom"/);
    // A new step's words are announced.
    expect(html).toMatch(/class="tour-words" aria-live="polite"/);
  });

  it("keep Back on the first step, turned off", () => {
    const html = draw(createElement(TourCaption, { ...props, canBack: false }));
    expect(buttons(html).find((b) => b.text === "Back")?.disabled).toBe(true);
    expect(buttons(html).find((b) => b.text === "Next")?.disabled).toBe(false);
  });

  it("stay, quieted, while the tour moves on: only Skip answers", () => {
    const html = draw(createElement(TourCaption, { ...props, moving: true }));
    expect(html).toMatch(/class="tour-card tour-caption" data-moving=""/);
    expect(buttons(html)).toEqual([
      { text: "Skip", label: null, disabled: false },
      { text: "Back", label: null, disabled: true },
      { text: "Next", label: null, disabled: true },
    ]);
  });

  it("stand over the hole when there is no room under it", () => {
    expect(draw(createElement(TourCaption, { ...props, place: "top" }))).toContain('data-place="top"');
  });
});

describe("the end card", () => {
  it("says where to take the tour again, with the lit candle and Done", () => {
    const html = draw(createElement(TourEnd, { title: "That's what's new", body: "Take the tour again any time from What's new.", words: WORDS, titleId: "e", onDone: noop }));
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="e"/);
    expect(html).toContain('<span aria-hidden="true" class="tour-mark"><svg');
    expect(html).toContain("Take the tour again any time from What&#x27;s new.");
    expect(buttons(html).map((b) => b.text)).toEqual(["Done"]);
  });
});

describe("the lit hole", () => {
  it("dims the whole page while nothing is lit", () => {
    const html = draw(createElement(TourSpotlight, { hole: null }));
    expect(html).toBe('<div aria-hidden="true" class="tour-spot"><div class="tour-veil" data-on=""></div></div>');
  });

  it("leaves the element clear in its ring, and moves across only between two on one page", () => {
    const hole = { top: 292, left: 12, width: 366, height: 76, radius: 29 };
    const still = draw(createElement(TourSpotlight, { hole }));
    expect(still).toContain('<div class="tour-veil"></div>');
    expect(still).toContain('class="tour-hole" style="top:292px;left:12px;width:366px;height:76px;border-radius:29px"');
    expect(still).not.toContain("data-glide");
    expect(draw(createElement(TourSpotlight, { hole, glide: true }))).toContain('class="tour-hole" data-glide=""');
  });
});

describe("the look's rules", () => {
  it("stand over the tab bar and the mini player, and under the onboarding", () => {
    expect(BLOCK).toMatch(/\.tour-root \{[^}]*position: fixed;[^}]*z-index: 90;/);
  });

  it("light the ring in the page's ink, white on the dark palettes, and never gold", () => {
    expect(BLOCK).toMatch(/\.tour-hole \{[^}]*0 0 0 2px var\(--color-paper\)/);
    expect(BLOCK).not.toMatch(/gold|premium|#d4af37|#c9a25a|yellow/i);
  });

  it("let nothing glow on Parchment", () => {
    expect(BLOCK).toMatch(/html\[data-reading-mode="parchment"\] \.tour-hole::after,\s*html\[data-reading-mode="parchment"\] \.tour-offer::after \{\s*display: none;/);
    expect(BLOCK).toMatch(/html\[data-reading-mode="parchment"\] \.tour-light,\s*html\[data-reading-mode="parchment"\] \.tour-primary \{\s*box-shadow: none;/);
  });

  it("give every motion its escape under Purify's motion switch", () => {
    const animated = new Set([...BLOCK.matchAll(/(\.tour-[a-z-]+)[^{}]*\{[^}]*\banimation(?:-name)?:\s*(?!none)/g)].map((m) => m[1]));
    const moving = new Set([...BLOCK.matchAll(/(\.tour-[a-z-]+)[^{}]*\{[^}]*\btransition:\s*(?!none)/g)].map((m) => m[1]));
    const escapes = [...BLOCK.matchAll(/((?::where\(\[data-motion="reduce"\]\)[^{]*))\{([^}]*)\}/g)].map((m) => m[1]);
    const escaped = (cls: string) => escapes.some((sel) => sel.includes(cls));
    for (const cls of [...animated, ...moving]) expect(escaped(cls), cls).toBe(true);
    expect(animated.size).toBeGreaterThan(5);
    // Never against the OS alone.
    expect(BLOCK).not.toMatch(/prefers-reduced-motion/);
  });

  it("name the properties a press scales, so a transition list covers them", () => {
    expect(BLOCK).toMatch(/scale var\(--duration-instant\)/);
  });
});
