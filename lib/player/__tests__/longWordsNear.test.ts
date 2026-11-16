// A long text's words in Now Playing: built only in the Words view, and a word
// a span only near the line being read (Updates 98n, build 98 note 2).
//
// 98m had a long text's words wait until Now Playing was up and its slide had
// ended. Traced on the export of dfe5fa8e (the Four Discourses at 390, CPU 1x,
// scripts/gate/listen-walk.mjs --only work --words --trace): opened on Cover,
// the view most open on, they were built anyway, 28,568 elements, one 257.6ms
// task for words not shown; and with them standing, the switch to Words took a
// 124.7ms task, closing 222.7ms and opening again 233.4ms, React drawing every
// span again and the browser restyling them.
//
// LiveCaptions lights only the line being read, word by word, and follows only
// its sung word; every other line is styled whole by its row. So a long text's
// line far from the one being read is drawn as its words in one text, the same
// words and spaces, laid out the same; the rows all stand, so a hand's scroll,
// a tap to seek and the rows' smooth move work as before.
//
// What a reader would notice if this broke: a catch as Now Playing opens on a
// Father's work or a life, or as Words is chosen, closed or opened again; or a
// chapter's or a chant's words no longer lighting word by word.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveCaptions } from "@/components/player/LiveCaptions";
import { WORDS_BUILT_CLOSED, WORDS_SPANNED_NEAR, buildsLongWords, captionLines, captionWordCount } from "@/lib/player/captions";

/** `lines` caption lines of `words` words each, a second apart. */
const text = (lines: number, words: number) =>
  Array.from({ length: lines }, (_, i) => ({ time: i, text: Array.from({ length: words }, (_, j) => `w${i}x${j}`).join(" ") }));

function draw(source: { time: number; text: string }[], current: number, spanNear?: number) {
  const lines = captionLines(source, source.length);
  return renderToStaticMarkup(
    createElement(LiveCaptions, { source, lines, timed: true, current, live: true, look: "player", onSeek() {}, spanNear }),
  );
}

/** The lines whose words are a span each, by index. */
const spannedLines = (html: string) => [...new Set([...html.matchAll(/<span>w(\d+)x\d+ ?<\/span>/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
const wordSpans = (html: string) => (html.match(/<span>w\d+x\d+ ?<\/span>/g) ?? []).length;
const plain = (html: string) => html.replace(/<[^>]+>/g, "");

describe("a long text's words are built only in the Words view", () => {
  it("builds them once the player is up, its slide ended and Words shown; never on Cover", () => {
    expect(buildsLongWords({ up: true, settled: true, words: true })).toBe(true);
    // Cover, the view most open on: nothing built for words not shown.
    expect(buildsLongWords({ up: true, settled: true, words: false })).toBe(false);
    // Closed (98m), and while it slides.
    expect(buildsLongWords({ up: false, settled: false, words: true })).toBe(false);
    expect(buildsLongWords({ up: true, settled: false, words: true })).toBe(false);
  });
});

describe("a long text's words are a span each only near the line being read", () => {
  const discourse = text(2000, 12);

  it("is a long text", () => {
    expect(captionWordCount(discourse)).toBeGreaterThan(WORDS_BUILT_CLOSED);
  });

  it("spans the line before the one being read to four after it, and draws every row", () => {
    const html = draw(discourse, 1000, WORDS_SPANNED_NEAR);
    expect(spannedLines(html)).toEqual([999, 1000, 1001, 1002, 1003, 1004]);
    expect(wordSpans(html)).toBe(6 * 12);
    expect((html.match(/<li /g) ?? []).length).toBe(2000);
    // Before any line is read: from the first.
    expect(spannedLines(draw(discourse, -1, WORDS_SPANNED_NEAR))).toEqual([0, 1, 2, 3, 4]);
  });

  it("draws the same words and spaces as a span each, so the lines lay out the same", () => {
    const near = draw(discourse.slice(0, 300), 150, WORDS_SPANNED_NEAR);
    const every = draw(discourse.slice(0, 300), 150);
    expect(wordSpans(every)).toBe(300 * 12);
    expect(plain(near)).toBe(plain(every));
    // A far line is its words in one text, inside the same holders.
    expect(near).toContain(`<span data-sung-grow="true" class="block">${discourse[10].text}</span>`);
  });

  it("leaves a chapter's and a chant's words a span each, as note 8 has them", () => {
    const psalm = text(176, 14);
    expect(wordSpans(draw(psalm, 40))).toBe(176 * 14);
  });
});
