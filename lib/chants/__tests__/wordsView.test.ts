// The words' own switch and the three ways the words are drawn (1.8, notes 56
// and 59): the owner, "there should be Arabic, right? But you should also have
// the option to switch it to English transliteration. So you could see the
// pronunciation of each Arabic word", and "an option to show both at the same
// time". Rendered to static markup: react-dom/server needs no DOM.

import fs from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChantWords, WordsViewSwitch } from "@/components/chants/ChantWords";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { LiveCaptions } from "@/components/player/LiveCaptions";
import { captionsFor } from "@/lib/chants/media";
import { allChants, chantIndex } from "@/lib/chants/registry.server";
import type { ChantLine } from "@/lib/chants/types";
import { getMessages } from "@/lib/i18n";
import { captionLines } from "@/lib/player/captions";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const inEnglish = (el: ReactElement) =>
  renderToStaticMarkup(createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, el));

const verse: ChantLine[] = [
  { text: "اعترفوا للرب فإنه صالح،", translit: "I'tarifu lir-Rabbi fa-innahu salihun," },
  { text: "فإن إلى الأبد رحمته.", translit: "fa-inna ila l-abadi rahmatahu." },
];

function drawn(view: "original" | "translit" | "both", rtl: boolean) {
  const source = captionsFor(verse, { v: 1, durationSec: 20, lines: [{ at: 1, end: 6, text: verse[0].text }, { at: 6, end: 12, text: verse[1].text }] }, { view, en: true });
  return renderToStaticMarkup(
    createElement(LiveCaptions, {
      source,
      lines: captionLines(source, 20),
      timed: true,
      current: -1,
      live: false,
      look: "page",
      rtl,
      lang: "ar",
      onSeek: () => {},
    }),
  );
}

describe("the words, drawn as the reader chose", () => {
  it("draws both as each sung word over its sound, right to left, the sound in Latin letters", () => {
    const html = drawn("both", true);
    expect(html).toContain('<ol dir="rtl"');
    expect(html.match(/data-sung-pair/g)).toHaveLength(8);
    const sounds = html.match(/<span data-sung-sound="true"[^>]*>/g) ?? [];
    expect(sounds).toHaveLength(8);
    for (const tag of sounds) {
      expect(tag).toContain('dir="ltr"');
      expect(tag).toContain('lang="ar-Latn"');
    }
    // The n-th sound under the n-th word.
    expect(html).toMatch(/<span data-sung-pair="true"><span>للرب<\/span><span data-sung-sound="true"[^>]*>lir-Rabbi<\/span><\/span>/);
  });

  it("draws the sound alone in Latin letters, left to right, lit word by word", () => {
    const html = drawn("translit", false);
    expect(html).not.toContain('dir="rtl"');
    expect(html).toContain('lang="ar-Latn"');
    expect(html).toContain("I&#x27;tarifu");
    expect(html).not.toContain("اعترفوا");
    expect(html).not.toContain("data-sung-pair");
  });

  it("draws the words as sung, alone, by default", () => {
    const html = drawn("original", true);
    expect(html).toContain("اعترفوا");
    expect(html).not.toContain("tarifu");
    expect(html).not.toContain("data-sung-pair");
  });
});

describe("the switch on the words", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");

  it("offers the words as the version names them, the transliteration, and both, one chosen", () => {
    const html = inEnglish(createElement(WordsViewSwitch, { variant: { label: "العربية", language: "ar" }, view: "both" }));
    expect(html).toContain('role="radiogroup" aria-label="Words"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/aria-checked="false"[^>]*lang="ar"[^>]*><span dir="auto" class="block truncate">العربية<\/span>/);
    expect(html).toContain(">Transliteration</span>");
    expect(html).toMatch(/aria-checked="true" tabindex="0"[^>]*><span dir="auto" class="block truncate">Both<\/span>/);
  });

  it("sits on the words of a version with its sound written out, and only there", () => {
    const rows = chantIndex();
    for (const chant of allChants()) {
      const row = rows.find((r) => r.slug === chant.slug)!;
      for (const variant of chant.variants) {
        const indexVariant = row.variants.find((v) => v.id === variant.id)!;
        const html = inEnglish(createElement(ChantWords, { variant, indexVariant, className: "h-[300px]" }));
        const has = variant.lines.some((l) => l.translit);
        expect(html.includes('role="radiogroup"'), `${chant.slug}/${variant.id}`).toBe(has);
        // In the words' own box, so nothing around it moves: the box keeps the height it is given.
        expect(html.startsWith(has ? '<div class="flex flex-col h-[300px]">' : "<div"), `${chant.slug}/${variant.id}`).toBe(true);
      }
    }
  });

  it("is a carved track lit white, with an escape for the motion setting", () => {
    expect(css).toMatch(/\.words-view > button\[aria-checked="true"\]::before \{\s*opacity: 1;/);
    expect(css).toContain(':where([data-motion="reduce"]) .words-view > button,');
    expect(css).toContain('html[data-reading-mode="parchment"] .words-view');
    // Next to the sung words' own rules, never at the end of the file.
    const sung = css.indexOf("/* Sung words (1.8)");
    const track = css.indexOf(".words-view {");
    expect(track).toBeGreaterThan(sung);
    expect(track).toBeLessThan(css.indexOf("/* The prayer reader (1.7)"));
  });
});
