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

  it("stands on the words of every version of a chant that has one, greyed where a version has nothing to switch (r3-18, note 61)", () => {
    // Choosing Ελληνικά used to bring a button beside Share and drop the
    // page 9px. The switch is the chant's, not the version's: drawn for each
    // of its versions in the same place, its other two parts greyed for a
    // version sung with no sound written out, never taken away.
    const rows = chantIndex();
    for (const chant of allChants()) {
      const row = rows.find((r) => r.slug === chant.slug)!;
      const switchable = chant.variants.some((v) => v.lines.some((l) => l.translit));
      for (const variant of chant.variants) {
        const at = `${chant.slug}/${variant.id}`;
        const indexVariant = row.variants.find((v) => v.id === variant.id)!;
        const html = inEnglish(createElement(ChantWords, { variant, indexVariant, switchable, className: "min-h-0 flex-1" }));
        expect(html.includes('role="radiogroup"'), at).toBe(switchable);
        // The words fill the box below it, whatever the version.
        expect(html.startsWith('<div class="flex flex-col min-h-0 flex-1">'), at).toBe(true);
        expect(html, at).toMatch(/<div class="relative min-h-0 flex-1"><div data-sung-look="page" class="[^"]*absolute inset-0/);
        if (!switchable) continue;
        const has = variant.lines.some((l) => l.translit);
        const radios = [...html.matchAll(/<button type="button" role="radio"[^>]*>/g)].map((m) => m[0]);
        expect(radios, at).toHaveLength(3);
        // Its own words, chosen; the sound and both greyed when it has none.
        expect(radios[0], at).toContain('aria-checked="true"');
        expect(radios[0], at).not.toContain("disabled");
        for (const part of radios.slice(1)) expect(part.includes('disabled=""'), at).toBe(!has);
      }
    }
  });

  it("is an underlined strip, lit white, with an escape for the motion setting", () => {
    expect(css).toMatch(/\.words-view > button\[aria-checked="true"\]::before \{\s*opacity: 1;/);
    // Greyed by its own light, on every palette.
    expect(css).toMatch(/\.words-view > button:disabled \{\s*opacity: 0\.44;\s*\}/);
    // The line under the chosen part is ::before: .hit-44's touch box is ::after.
    expect(css).toMatch(/\.words-view > button::before \{[^}]*bottom: 4px;[^}]*height: 2px;/);
    expect(css).toContain(':where([data-motion="reduce"]) .words-view > button,');
    expect(css).toContain('html[data-reading-mode="parchment"] .words-view');
    // Next to the sung words' own rules, never at the end of the file.
    const sung = css.indexOf("/* Sung words (1.8)");
    const track = css.indexOf(".words-view {");
    expect(track).toBeGreaterThan(sung);
    expect(track).toBeLessThan(css.indexOf("/* The prayer reader (1.7)"));
  });
});

describe("the English, under the line being sung (r3-18 B)", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");
  const greek: ChantLine[] = [
    { text: "Ἐξομολογεῖσθε τῷ Κυρίῳ, ὅτι ἀγαθὸς,", translit: "Exomologiste to Kyrio, oti agathos,", en: "Give thanks to the Lord: for he is good:" },
    { text: "Ἀλληλούϊα.", translit: "Allilouia.", en: "Alleluia." },
  ];

  function page(current: number) {
    const source = captionsFor(greek, { v: 1, durationSec: 20, lines: [{ at: 1, end: 6, text: greek[0].text }, { at: 6, end: 9, text: greek[1].text }] }, { view: "original", en: true });
    return renderToStaticMarkup(
      createElement(LiveCaptions, { source, lines: captionLines(source, 20), timed: true, current, live: current >= 0, look: "page", english: "under", lang: "el", onSeek: () => {} }),
    );
  }

  it("leads with the words as sung, the English under them, in the sans", () => {
    const html = page(0);
    const row = html.slice(html.indexOf("<li"), html.indexOf("</li>"));
    expect(row.indexOf("Ἐξομολογεῖσθε")).toBeLessThan(row.indexOf("Give thanks to the Lord"));
    // Each says its language and the direction that goes with it (build 90 note 4: lib/i18n/textDir.ts).
    expect(row).toMatch(/<span data-sung-main="true" dir="ltr" lang="el" class="block">/);
    expect(row).toContain('<span data-sung-gloss="true" dir="ltr" lang="en">Give thanks to the Lord: for he is good:</span>');
    expect(html.match(/data-sung-gloss/g)).toHaveLength(2);
  });

  it("shows it under the line being sung only, and under every line at rest", () => {
    expect(css).toMatch(/\[data-sung-gloss\] \{\s*display: none;\s*\}/);
    expect(css).toMatch(
      /\[data-sung-look="page"\] \[data-sung="lit"\] \[data-sung-gloss\],\s*\[data-sung-look="page"\] \[data-sung="rest"\] \[data-sung-gloss\] \{\s*display: block;/,
    );
    expect(page(0)).toContain('data-sung="lit"');
    expect(page(0)).toContain('data-sung="near"');
    expect(page(-1).match(/data-sung="rest"/g)).toHaveLength(2);
  });

  it("keeps a long hymn's line at its own size as it is sung, and the words larger in Arabic letters", () => {
    expect(css).toMatch(/\[data-sung-look="page"\] \[data-sung="lit"\]\[data-sung-long\] \[data-sung-main\] \{\s*font-size: 21px;/);
    expect(css).toMatch(/\[data-sung-look="page"\] \[data-sung-main\]\[lang="ar"\] \[data-sung-grow\] \{\s*font-size: 1\.12em;/);
    const long = "Let us purify our senses and we shall behold Christ, radiant with the light ineffable of the Resurrection";
    const source = captionsFor([{ text: long }], null, { view: "original", en: true });
    const html = renderToStaticMarkup(
      createElement(LiveCaptions, { source, lines: [], timed: false, current: -1, live: false, look: "page", english: "under", onSeek: () => {} }),
    );
    expect(html).toContain('data-sung-long=""');
  });
});
