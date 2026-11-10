// The tour's look, the owner's pick B of sheet r3-14, "The story of 1.8"
// (components/whats-new/tour/TourLook.tsx), drawn to markup, and its rules in
// app/globals.css ("What's New: the tour", and the intro's hold). vitest runs
// in node with no DOM; react-dom/server needs none, and what is checked here
// is all in the markup and the stylesheet.

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HORIZON_STARS } from "@/components/native/Horizon";
import { TourClose, TourHush, TourStoryFoot, TourTitlePage, splitBell } from "@/components/whats-new/tour/TourLook";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").split("\r\n").join("\n");
// React hoists a preload for the cross ahead of the markup when drawing on a
// server; on the page the layer is drawn in the browser, and there is none.
const draw = (el: ReactElement) => renderToStaticMarkup(el).replace(/^(<link rel="preload"[^>]*>)+/, "");
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
    disabled: /\sdisabled=""/.test(attrs),
  }));
}

/** The tour's block of app/globals.css, comments taken out. */
const BLOCK = (() => {
  const from = CSS.indexOf("/* ── What's New: the tour (1.8)");
  const to = CSS.indexOf("/* Emoji and symbols in readers' own words", from);
  return CSS.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, "");
})();

const title = (over: Partial<Parameters<typeof TourTitlePage>[0]> = {}) =>
  draw(
    createElement(TourTitlePage, {
      brand: "Purify",
      version: "1.8",
      line: "Hear the New Testament, and walk to the Nativity with the Church.",
      highlights: ["One search for all of Purify", "The saint web", "Pray together, talk together"],
      words: WORDS,
      titleId: "t",
      entrance: "intro",
      crossSrc: "/purify-cross-mark.png",
      onSee: noop,
      onSkip: noop,
      ...over,
    }),
  );

describe("the title page", () => {
  const html = title();

  it("stands on the intro's own night: its stars, its horizon and its cross", () => {
    expect(html).toMatch(/^<div class="tour-night dark-island" data-night="title" data-entrance="intro">/);
    expect((html.match(/<i style="inset-inline-start:/g) ?? []).length).toBe(HORIZON_STARS.length);
    expect(html).toContain('<div class="tour-horizon"><div class="tour-horizon-level"><svg viewBox="0 0 1000 1000"');
    expect(html).toContain('<img src="/purify-cross-mark.png" alt="" decoding="sync" class="tour-cross"/>');
    // The intro's horizon is drawn under its own name; this one under the tour's.
    expect(html).toContain('id="tour-title-haze"');
  });

  it("writes the release in under the cross: Purify, its number, its line", () => {
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="t"/);
    expect(html).toContain('<p class="tour-brand" style="--at:0">Purify</p>');
    expect(html).toContain('<p class="tour-version" style="--at:1">1.8</p>');
    expect(html).toMatch(/<h2 id="t" class="tour-release"[^>]*>Hear the New Testament/);
  });

  it("names three of what is new as quiet rows, never pills, each after the one before", () => {
    const rows = [...html.matchAll(/<li class="tour-highlight"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
    expect(rows).toEqual(["One search for all of Purify", "The saint web", "Pray together, talk together"]);
    expect(html).toContain('style="--at:3.5"');
    expect(html).not.toMatch(/pill|chip/);
  });

  it("offers See what's new and Skip", () => {
    expect(buttons(html)).toEqual([
      { text: "See what's new", disabled: false },
      { text: "Skip", disabled: false },
    ]);
  });

  it("arrives as its own entrance where no intro came before it, and lifts away as the intro does", () => {
    expect(title({ entrance: "own" })).toContain('data-entrance="own"');
    expect(title({ leaving: true })).toContain('data-entrance="intro" data-leaving=""');
    expect(title({ highlights: [] })).not.toContain("<ul");
  });
});

describe("a page of the story", () => {
  const props = {
    title: "Pray together, talk together",
    story: "Community now has two rooms: tap one, then the other.",
    count: "3 of 8",
    progress: { at: 3, of: 8 },
    place: "bottom" as const,
    canBack: true,
    words: WORDS,
    stepKey: "community",
    titleId: "st",
    storyId: "ss",
    onNext: noop,
    onBack: noop,
    onSkip: noop,
  };

  it("carries the pages as a strip, where this one stands and its title, its line, Skip, Back and Next", () => {
    const html = draw(createElement(TourStoryFoot, props));
    expect(html).toMatch(/^<div class="tour-foot" data-place="bottom">/);
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="st" aria-describedby="ss" class="tour-foot-body"/);
    const strip = /<div aria-hidden="true" class="tour-strip">([\s\S]*?)<\/div>/.exec(html)![1];
    expect((strip.match(/<i/g) ?? []).length).toBe(8);
    expect((strip.match(/data-on=""/g) ?? []).length).toBe(3);
    expect(html).toContain('<p id="st" class="tour-page-k">3 of 8 · Pray together, talk together</p>');
    expect(html).toContain('<p id="ss" class="tour-page-s">Community now has two rooms: tap one, then the other.</p>');
    expect(buttons(html).map((b) => b.text)).toEqual(["Skip", "Back", "Next"]);
    // A new page's words are announced.
    expect(html).toMatch(/class="tour-page" aria-live="polite"/);
  });

  it("keeps Back off on the first page", () => {
    const html = draw(createElement(TourStoryFoot, { ...props, canBack: false }));
    expect(buttons(html).find((b) => b.text === "Back")?.disabled).toBe(true);
    expect(buttons(html).find((b) => b.text === "Next")?.disabled).toBe(false);
  });

  it("stays, quieted, while the tour moves on: only Skip answers", () => {
    const html = draw(createElement(TourStoryFoot, { ...props, moving: true }));
    expect(html).toMatch(/class="tour-foot-body" data-moving=""/);
    expect(buttons(html)).toEqual([
      { text: "Skip", disabled: false },
      { text: "Back", disabled: true },
      { text: "Next", disabled: true },
    ]);
  });

  it("stands at the top over a thing held low on the screen", () => {
    expect(draw(createElement(TourStoryFoot, { ...props, place: "top" }))).toContain('data-place="top"');
  });
});

describe("the quiet", () => {
  it("is decoration, drawn from the engine's variables, and comes only while a page is shown", () => {
    expect(draw(createElement(TourHush, { shown: true }))).toBe(
      '<div aria-hidden="true" class="tour-hush" data-shown=""><div class="tour-hush-veil"></div><div class="tour-bloom"></div></div>',
    );
    expect(draw(createElement(TourHush, { shown: false }))).not.toContain("data-shown");
  });
});

describe("the close", () => {
  const close = (line: string) =>
    draw(
      createElement(TourClose, {
        title: "That was 1.8.",
        line,
        signature: "From Edgar, the Purify Team.",
        words: WORDS,
        titleId: "e",
        crossSrc: "/purify-cross-mark.png",
        onDone: noop,
      }),
    );

  it("is the night again: where the story stays, the bell drawn where the line names it, the signature, Done", () => {
    const html = close("The story stays in What's new, under the bell {bell}, to read again.");
    expect(html).toMatch(/^<div class="tour-night dark-island" data-night="close" data-entrance="own">/);
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="e"/);
    expect(html).toContain('<h2 id="e" class="tour-close-title" style="--at:0">That was 1.8.</h2>');
    expect(html).toMatch(/under the bell <span class="tour-bell"><svg[^>]*>[\s\S]*?<\/svg><\/span>, to read again\./);
    expect(html).toContain('<p class="tour-signature" style="--at:2">From Edgar, the Purify Team.</p>');
    expect(buttons(html).map((b) => b.text)).toEqual(["Done"]);
  });

  it("draws a line with no bell in it as it is", () => {
    expect(splitBell("Under the bell {bell}, again.")).toEqual(["Under the bell ", ", again."]);
    expect(splitBell("No bell here.")).toEqual(["No bell here.", null]);
    expect(close("No bell here.")).not.toContain("tour-bell");
  });
});

describe("the look's rules", () => {
  it("stand over the tab bar and the mini player, and the title page over the intro's cover", () => {
    expect(BLOCK).toMatch(/\.tour-root \{[^}]*position: fixed;[^}]*z-index: 90;/);
    expect(BLOCK).toMatch(/\.tour-root\[data-tour-root="offer"\] \{\s*z-index: 210;/);
    // The intro's cover stands at 200 (components/native/LaunchFrame.tsx).
    expect(fs.readFileSync(path.join(ROOT, "components/native/LaunchFrame.tsx"), "utf8")).toContain("z-[200]");
  });

  it("grey and lower the page around the lit thing, a soft hole drawn from the engine's variables", () => {
    expect(BLOCK).toMatch(/backdrop-filter: grayscale\(1\) brightness\(0\.42\);/);
    expect(BLOCK).toMatch(/mask-image: radial-gradient\(var\(--tour-rx\) var\(--tour-ry\) at var\(--tour-cx\) var\(--tour-cy\), transparent 58%, #000 100%\);/);
    expect(BLOCK).toMatch(/--tour-rx: calc\(\(var\(--tour-w, 0px\) \/ 2 \+ 16px\) \* var\(--tour-open, 0\) \+ 0\.5px\);/);
  });

  it("bloom white behind the lit thing, ink on Parchment, and never gold", () => {
    expect(BLOCK).toMatch(/\.tour-bloom \{[^}]*rgb\(255 255 255 \/ 0\.2\)/);
    expect(BLOCK).toMatch(/html\[data-reading-mode="parchment"\] \.tour-bloom \{[^}]*var\(--color-paper\)/);
    expect(BLOCK).not.toMatch(/gold|premium|#d4af37|#c9a25a|yellow/i);
  });

  it("blend nothing inside the tour's layer, so the quiet has the page behind it to grey", () => {
    // A blend mode makes the layer a group of its own, and the quiet inside
    // it then greys nothing: the page stayed in full colour on the export.
    expect(BLOCK).not.toMatch(/mix-blend-mode/);
    expect(BLOCK).not.toMatch(/isolation: isolate/);
  });

  it("give a page room after its end while a stop is shown", () => {
    expect(BLOCK).toMatch(/html\[data-tour-room\] \{\s*padding-bottom: var\(--tour-room, 0px\);/);
  });

  it("give every motion its escape under Purify's motion switch", () => {
    const rules = [...BLOCK.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
    const escapes = rules.filter((r) => r.sel.includes(':where([data-motion="reduce"])')).map((r) => r.sel).join("\n");
    const moving = rules.filter(
      (r) =>
        !r.sel.startsWith("@") &&
        !r.sel.includes(":where(") &&
        /\b(animation|transition):(?!\s*none)/.test(r.body) &&
        !/^(from|to|\d+%)/.test(r.sel),
    );
    expect(moving.length).toBeGreaterThan(8);
    for (const r of moving) {
      for (const sel of r.sel.split(",").map((s) => s.trim())) {
        const escaped = escapes.includes(sel) || (sel.startsWith(".tour-night") && escapes.includes(".tour-night *"));
        expect(escaped, sel).toBe(true);
      }
    }
    // Never against the OS alone.
    expect(BLOCK).not.toMatch(/prefers-reduced-motion/);
  });

  it("name the properties a press scales, so a transition list covers them", () => {
    expect(BLOCK).toMatch(/scale var\(--duration-instant\)/);
  });
});

describe("the intro, held for the title page", () => {
  it("does not lift while held, and goes at once, unseen, once the title page stands over it", () => {
    expect(CSS).toMatch(/html\[data-intro-hold="on"\]\[data-launch\] \[data-launch-frame\],\s*html\[data-intro-hold="on"\]\[data-launch\] \[data-launch-stage\] \{[^}]*opacity: 1;[^}]*pointer-events: auto;/);
    expect(CSS).toMatch(/html\[data-intro-hold="taken"\]\[data-launch\] \[data-launch-frame\] \{[^}]*transition: none;[^}]*visibility: hidden;/);
    // After the lift, so it outranks it.
    expect(CSS.indexOf('html[data-intro-hold="on"]')).toBeGreaterThan(CSS.indexOf('html[data-launch="ready"][data-intro="played"] [data-launch-stage]'));
  });
});
