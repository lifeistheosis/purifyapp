import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { LaunchFrame } from "@/components/native/LaunchFrame";
import { WhereFrom, WhereFromSky } from "@/components/onboarding/WhereFrom";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

import { BACKGROUND_PILLS, type Background } from "../space";

/**
 * "Where are you coming from?" as it is drawn (1.8): the owner's pick
 * "E + I · Pills that answer" (Homebase/boards/purify-master/r18/choose/
 * 1b-where-are-you-coming-from-EI.png, the right-hand phone). E's night and
 * horizon from the intro, the answers as pills of light, and under them, once
 * one is tapped, the line that says where Purify will start the reader.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const noop = () => {};

function draw(answer: Background | null, locale = "en"): string {
  return renderToString(
    createElement(
      MessagesProvider,
      { locale, messages: getMessages(locale) } as ProviderProps,
      createElement(WhereFrom, { answer, onChoose: noop, onContinue: noop, onPreferNot: noop }),
    ),
  );
}

/** The buttons in the order drawn: their words, whether pressed, and their classes. */
function buttons(html: string) {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attrs, inner]) => ({
    text: inner.replace(/<[^>]+>/g, ""),
    pressed: /aria-pressed="true"/.test(attrs),
    classes: /class="([^"]*)"/.exec(attrs)?.[1] ?? "",
  }));
}

const the = (s: string) => s.replace(/'/g, "&#x27;");
const en = getMessages("en");
const CSS = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("Where are you coming from?", () => {
  it("asks under the lit cross, with its line, and offers the answers as pills, Prefer not to say under them", () => {
    const html = draw(null);
    expect(html).toContain(">Where are you coming from?<");
    expect(html).toContain(">So Purify can start you in the right place.<");
    expect(html).toMatch(/class="ob-wf-cross [^"]*"[^>]*><svg/);
    expect(buttons(html).map((b) => b.text)).toEqual(["Orthodox", "Catholic", "Protestant", "Another faith", "Just curious", "Prefer not to say"]);
    // Pills: the first five. Prefer not to say is quieter, under them.
    const all = buttons(html);
    for (const pill of all.slice(0, 5)) expect(pill.classes).toMatch(/\bob-pill\b.*\brounded-pill\b.*\bborder\b/);
    expect(all[5].classes).not.toMatch(/\bob-pill\b/);
    expect(all[5].classes).toMatch(/\btext-caption\b/);
  });

  it("says nothing more, and offers no way on, until a pill is tapped", () => {
    const html = draw(null);
    expect(html).not.toContain("start you with");
    expect(html).not.toContain(">Continue<");
    expect(buttons(html).every((b) => !b.pressed)).toBe(true);
  });

  it("lights the pill tapped and says, in one line under the pills, where Purify starts that reader", () => {
    const lines: Record<(typeof BACKGROUND_PILLS)[number], string> = {
      orthodox: "your prayers, the day's readings and the saints",
      catholic: "the Church Fathers and the early councils",
      protestant: "the Scriptures and the early Church",
      "other-faith": "an introduction to Orthodox Christianity",
      none: "a short tour first",
    };
    for (const b of BACKGROUND_PILLS) {
      const html = draw(b);
      expect(html, b).toContain(`We${the("'")}ll start you with <b class="font-semibold text-paper">${the(lines[b])}</b>.`);
      const lit = buttons(html).filter((x) => x.pressed);
      expect(lit.map((x) => x.text), b).toEqual([the(en[`onboard.background.${b}`])]);
      expect(lit[0].classes, b).toMatch(/\bbg-paper\b.*\bfont-semibold\b.*\btext-night\b/);
      // The way on, once there is a line to have read.
      expect(html, b).toContain(">Continue<");
    }
    // The line sits after the pills and before Prefer not to say, its short rule glowing.
    const html = draw("catholic");
    expect(html.indexOf("We&#x27;ll start you")).toBeGreaterThan(html.indexOf(">Just curious<"));
    expect(html.indexOf("We&#x27;ll start you")).toBeLessThan(html.indexOf(">Prefer not to say<"));
    expect(html).toMatch(/<span aria-hidden="true" class="ob-says-ln /);
    expect(html).toMatch(/<div aria-live="polite"/);
  });

  it("takes Prefer not to say as an answer, with no line and nothing to wait for", () => {
    const html = draw("prefer-not");
    expect(html).not.toContain("start you with");
    expect(html).not.toContain(">Continue<");
    expect(buttons(html).find((b) => b.pressed)?.text).toBe("Prefer not to say");
  });

  it("is in every language Purify speaks, the line's words in place", () => {
    for (const { code } of LOCALES) {
      const m = getMessages(code);
      for (const key of ["onboard.background.title", "onboard.background.body", "onboard.background.prefer-not", "onboard.background.startWith"]) {
        expect(m[key], `${code} ${key}`).toBeTruthy();
        if (code !== "en") expect(m[key], `${code} ${key}`).not.toBe(en[key]);
      }
      expect(m["onboard.background.startWith"], code).toContain("{what}");
      for (const b of BACKGROUND_PILLS) {
        const html = draw(b, code);
        expect(html, `${code} ${b}`).not.toContain("{what}");
        expect(html, `${code} ${b}`).toContain(m[`onboard.background.start.${b}`].replace(/'/g, "&#x27;").replace(/"/g, "&quot;"));
        expect(m[`onboard.background.${b}`], `${code} ${b}`).toBeTruthy();
      }
    }
  });
});

describe("its night and its light", () => {
  it("is the intro's horizon, the same shapes under ids of its own, low on the screen", () => {
    const sky = renderToStaticMarkup(createElement(WhereFromSky));
    const intro = renderToStaticMarkup(createElement(LaunchFrame));
    const svg = (html: string) => /<svg viewBox="0 0 1000 1000" class="[^"]*">([\s\S]*?)<\/svg>/.exec(html)?.[1] ?? "";
    expect(svg(sky)).toBeTruthy();
    expect(svg(sky).replaceAll("ob-horizon-", "launch-")).toBe(svg(intro));
    expect(sky).not.toContain('id="launch-');
    // The crest at 84% of the screen and the curve 3.24 screens wide, as the design draws it.
    expect(sky).toContain("top-[84%]");
    expect(sky).toMatch(/class="absolute left-1\/2 top-0 h-\[324vw\] w-\[324vw\]/);
    // The intro's own stars, in the same places.
    const stars = (html: string) => [...html.matchAll(/<i class="absolute rounded-full bg-paper" style="(left:[^;]+;top:[^;]+)/g)].map((m) => m[1]);
    expect(stars(sky).length).toBeGreaterThan(20);
    expect(stars(sky)).toEqual(stars(intro));
    // Behind the step, fixed to the screen, never in the way of a tap.
    expect(sky).toMatch(/^<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 /);
  });

  it("is drawn in the page's own tokens, with no yellow or gold", () => {
    for (const html of [draw(null), draw("catholic"), renderToStaticMarkup(createElement(WhereFromSky))]) {
      expect(html).not.toMatch(/gold|yellow|amber|festal|premium|#[0-9a-fA-F]{3,8}\b|rgb\(/);
    }
  });

  it("lights a pill and the line's rule in white, softly, and plainly in ink on Parchment", () => {
    expect(/\.ob-pill\[aria-pressed="true"\]\s*\{([^}]*)\}/.exec(CSS)?.[1]).toMatch(/rgb\(255 255 255 \/ 0\.\d+\)/);
    expect(/\.ob-says-ln\s*\{([^}]*)\}/.exec(CSS)?.[1]).toMatch(/rgb\(255 255 255 \/ 0\.\d+\)/);
    expect(CSS).toMatch(/html\[data-reading-mode="parchment"\] \.ob-pill\[aria-pressed="true"\],\s*html\[data-reading-mode="parchment"\] \.ob-says-ln\s*\{\s*box-shadow: none;/);
    expect(CSS).toMatch(/html\[data-reading-mode="parchment"\] \.ob-wf-cross \{ filter: none; \}/);
  });

  it("stills every move when Purify's motion is off", () => {
    for (const selector of [".ob-wf-stars > i", ".ob-wf-horizon", ".ob-says", ".ob-pill"]) {
      expect(CSS, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
    // And what rises fills backwards, so nothing is left holding a transform.
    for (const rule of [".ob-wf-horizon", ".ob-says"]) {
      expect(new RegExp(`\\${rule} \\{ animation: [^}]*\\bbackwards;`).test(CSS), rule).toBe(true);
    }
  });
});

describe("in the flow", () => {
  const flow = fs.readFileSync(path.join(process.cwd(), "components/onboarding/OnboardingFlow.tsx"), "utf8");

  it("is the first question, before familiarity, on every way in", () => {
    expect(flow).toMatch(/\.\.\.head,\s*"background",\s*"level",/);
    // The progress line of each of the four ways in counts it.
    expect(flow.match(/"background", "level", "rule", "intent", "reminders", "handoff"\]/g)).toHaveLength(4);
  });

  it("stands on its night only while it shows", () => {
    expect(flow).toMatch(/\{step === "background" \? <WhereFromSky \/> : null\}/);
  });

  it("saves the answer as it is tapped and counts it as the reader leaves", () => {
    const choose = flow.slice(flow.indexOf("function chooseBackground("), flow.indexOf("function chooseLevel("));
    expect(choose).toMatch(/writeBackground\(b\);/);
    expect(choose).toMatch(/countAnswer\("background", background\);/);
    expect(choose).toMatch(/countAnswer\("background", "prefer-not"\);/);
  });
});
