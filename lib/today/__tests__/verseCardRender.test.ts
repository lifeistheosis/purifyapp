import fs from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The Verse of the Day card as the server writes it (1.8, the owner's pick B
// of round 10, "The light"): the light behind the words, the lit cross, the
// card's name with the reading the verse is from, the whole verse, its
// reference, and three round actions: Save, Listen (only where the chapter
// has a recording) and Share, with the card's other ways on a small "•••"
// beside them.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { VerseOfDayView } from "@/components/today/VerseOfDayView";
import { getMessages } from "@/lib/i18n";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const LUKE: VerseOfDayEntry = {
  label: "Luke 11:13",
  text: "If ye then, being evil, know how to give good gifts unto your children: how much more shall your heavenly Father give the Holy Spirit to them that ask him?",
  href: "/bible/luke/11#v13",
  source: "gospel",
  book: "luke",
  bookName: "Luke",
  chapter: 11,
  verse: 13,
};
const PSALM: VerseOfDayEntry = {
  label: "Psalm 23:1",
  text: "The LORD is my shepherd; I shall not want.",
  href: "/bible/psalms/23#v1",
  source: "related",
  book: "psalms",
  bookName: "Psalms",
  chapter: 23,
  verse: 1,
};

function card(entry: VerseOfDayEntry): string {
  return renderToString(
    createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(VerseOfDayView, { table: { "2026-10-28": entry } })),
  );
}

/** The round actions' names, in the order they stand. */
const actions = (out: string) => [...out.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);

describe("the Verse of the Day card", () => {
  it("is the light: the card, its light, the lit cross, and the reading it is from", () => {
    const out = card(LUKE);
    expect(out).toContain("verse-light");
    expect(out).toContain("verse-cross-lit");
    expect(out).toContain(`${html(en["today.verseOfDay"])}<!-- --> · ${html(en["bible.kindGospelLong"])}`);
    // No gold, no yellow: the card's ink is the page's own.
    expect(out).not.toMatch(/text-gold|#c1272d|amber|yellow/);
  });

  it("shows the whole verse, never cut, and its reference with the Bible it is from", () => {
    const out = card(LUKE);
    expect(out).toContain(html(LUKE.text!));
    expect(out).not.toMatch(/line-clamp/);
    expect(out).toMatch(/Luke(<!-- -->| |&nbsp;)*11:13/);
    expect(out).toContain(html(en["reading.collection.kjv"]));
  });

  it("has three round actions, Save, Listen and Share, and the card's other ways beside them", () => {
    expect(actions(card(LUKE))).toEqual([en["common.save"], en["readAloud.listen"], en["common.share"], en["today.verse.moreActions"]]);
  });

  it("draws no Listen where the chapter has no recording", () => {
    const out = card(PSALM);
    expect(actions(out)).toEqual([en["common.save"], en["common.share"], en["today.verse.moreActions"]]);
    // A verse chosen from outside the day's reading names no reading.
    expect(out).not.toContain(` · ${en["bible.kindGospelLong"]}`);
  });

  it("keeps what the old •••  offered: the chapter, a copy of the verse and its link", () => {
    const source = fs.readFileSync("components/today/VerseCardActions.tsx", "utf8");
    for (const key of ["today.verse.openChapter", "today.verse.copyVerseText", "today.verse.copyLink"]) expect(source).toContain(`t("${key}")`);
    // Share is the picture's sheet now, loaded on the tap.
    expect(source).toMatch(/dynamic\(\(\) => import\("@\/components\/share\/PictureSheet"\)/);
  });
});
