import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { LookingFor } from "@/components/onboarding/LookingFor";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

import { ANSWER_PICTURES } from "../pictures";
import { INTENTS, togglePick, type Intent } from "../space";

/**
 * "What are you looking for?" as it is drawn (1.8, the owner's pick B of
 * round 14: picture cards, numbered in tap order; Homebase/boards/
 * purify-master/variants/14-onboarding.png). The order's rules are
 * space.test.ts, what is kept state.test.ts, the pictures pictures.test.ts.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function draw(picks: Intent[], locale = "en"): string {
  return renderToString(
    createElement(
      MessagesProvider,
      { locale, messages: getMessages(locale) } as ProviderProps,
      createElement(LookingFor, { picks, onToggle: () => {}, onContinue: () => {} }),
    ),
  );
}

/** The answer cards in the order drawn: picked or not, the number shown, the picture. */
function cards(html: string) {
  return [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([\s\S]*?)<\/button>/g)].map(([, pressed, inner]) => ({
    pressed: pressed === "true",
    number: /ob-pick-n[^>]*>(\d+)</.exec(inner)?.[1] ?? null,
    src: /<img[^>]*src="([^"]+)"/.exec(inner)?.[1] ?? null,
  }));
}

/** The way on, at the foot. */
function continueButton(html: string): string {
  const all = [...html.matchAll(/<button(?![^>]*aria-pressed)[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
  expect(all).toHaveLength(1);
  return all[0];
}

const CSS = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("What are you looking for?", () => {
  it("asks the question with its line, and draws the app's four answers as picture cards, two across", () => {
    const html = draw([]);
    expect(html).toContain("What are you looking for?");
    expect(html).toContain("Pick as many as you like. The order you tap is the order Purify puts them in.");
    expect(html).toContain("grid-cols-2");
    // The screen before's four answers, in its order, each with its picture.
    expect(cards(html).map((c) => c.src)).toEqual(INTENTS.map((i) => ANSWER_PICTURES[i].src));
    for (const name of ["Daily quiet", "The Liturgy", "Study", "A rule of prayer"]) expect(html, name).toContain(`>${name}<`);
    // The step had an eyebrow and its old question; the design has neither.
    expect(html).not.toContain("Where to begin");
    expect(html).not.toContain("What are you hoping to focus on first?");
  });

  it("numbers each pick in the order it was tapped", () => {
    const drawn = cards(draw(["study", "quiet"]));
    // quiet, liturgy, study, prayer: the cards keep their places, the numbers follow the taps.
    expect(drawn.map((c) => c.pressed)).toEqual([true, false, true, false]);
    expect(drawn.map((c) => c.number)).toEqual(["2", null, "1", null]);
  });

  it("closes the numbers up when a pick is taken out", () => {
    const picks = togglePick(["study", "quiet", "prayer"], "study");
    expect(cards(draw(picks)).map((c) => c.number)).toEqual(["1", null, null, "2"]);
  });

  it("says how many it continues with, and waits while nothing is picked", () => {
    expect(continueButton(draw(["liturgy", "quiet", "prayer"]))).toContain(">Continue with 3<");
    expect(continueButton(draw(["liturgy"]))).toContain(">Continue with 1<");
    const none = continueButton(draw([]));
    expect(none).toContain(">Continue<");
    expect(none).toMatch(/\sdisabled=""/);
    expect(continueButton(draw(["study"]))).not.toMatch(/\sdisabled=""/);
  });

  it("draws no line under an answer, and gives each one's line to a screen reader", () => {
    const items = [...draw([]).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    expect(items).toHaveLength(INTENTS.length);
    items.forEach((item, k) => {
      const line = getMessages("en")[`onboard.intent.${INTENTS[k]}Sub`];
      const id = /aria-describedby="([^"]+)"/.exec(item)?.[1];
      expect(id, INTENTS[k]).toBeTruthy();
      expect(item, INTENTS[k]).toContain(`<span id="${id}" hidden="">${line}</span>`);
      expect(/<button[\s\S]*<\/button>/.exec(item)?.[0], INTENTS[k]).not.toContain(line);
    });
  });

  it("is in every language Purify speaks, the count filled in", () => {
    const english = draw(["study", "quiet"]);
    for (const { code } of LOCALES) {
      const messages = getMessages(code);
      const html = draw(["study", "quiet"], code);
      expect(html, code).not.toContain("{count}");
      expect(continueButton(html), code).toContain(">" + messages["onboard.intent.continueWith"].replace("{count}", "2") + "<");
      if (code === "en") continue;
      for (const key of ["onboard.intent.lookingFor", "onboard.intent.lookingForSub", "onboard.intent.continueWith"]) {
        expect(messages[key], `${code} ${key}`).not.toBe(getMessages("en")[key]);
      }
      expect(html, code).not.toBe(english);
    }
  });
});

describe("its light", () => {
  it("is drawn in the page's own tokens, with no yellow or gold", () => {
    const html = draw(["study"]);
    expect(html).not.toMatch(/gold|yellow|amber|festal|#[0-9a-fA-F]{3,8}\b/);
    expect(html).toContain("to-night/90");
    expect(html).toMatch(/ob-pick-n[^"]*\bbg-paper\b[^"]*\btext-night\b/);
  });

  it("lights a pick in white, softly, and plainly in ink on Parchment", () => {
    const pick = /\.ob-pick\[aria-pressed="true"\]\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";
    expect(pick).toMatch(/rgb\(255 255 255 \/ 0\.\d+\)/);
    expect(/\.ob-pick\[aria-pressed="true"\]::after\s*\{([^}]*)\}/.exec(CSS)?.[1]).toContain("var(--color-paper)");
    expect(CSS).toMatch(/html\[data-reading-mode="parchment"\] \.ob-pick\[aria-pressed="true"\],\s*html\[data-reading-mode="parchment"\] \.ob-pick-n\s*\{\s*box-shadow: none;/);
  });

  it("stills every move when Purify's motion is off", () => {
    for (const selector of [".ob-pick", ".ob-pick::after", ".ob-pick img", ".ob-pop", ".ob-rise"]) {
      expect(CSS, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
  });
});
