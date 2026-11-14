// The verse to learn's "Show the words", held under the finger (1.9, the
// gate's tap walk on round 1's export: it moved 10px in the first frames of
// its tap, and "Not yet" came under the finger; Updates 33's find).
//
// The card is drawn here as the server writes it, as it stood and in the
// first frame after the tap, and its row of buttons is laid out as the export
// lays it out at a phone's widths: a row that wraps, centred, 8px between two
// buttons and between two lines, each button its words, 18px either side and
// its 1px edge, 44px tall. Each label's width is its words at 14px in the house's sans,
// semibold, measured in Chromium on the export (below). The node under the
// finger is found in the second frame as React finds it: the element at the
// same place in the tree, when it is the same kind (the card's buttons carry
// no keys). And it is measured as the walk measures it (scripts/tap-walk.mjs,
// followMove): it moves when its left, middle and right all move more than
// 4px, or its top does.
//
// As it stood, the tap took the row from two buttons to three: the first
// button became Hide, the row was centred again, and the button's left edge
// moved by half the difference between Show the words and Hide with Not yet.
// Now Show the words, and the two it turns into, share one place as wide as
// the wider of the two: the row is the same width in both frames.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { RememberCardView } from "@/components/today/RememberCard";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

type ProviderProps = Parameters<typeof MessagesProvider>[0];

const GAP = 8;
/** Each button's padding either side, and its 1px edge. */
const PAD = 18 + 1;
const TALL = 44;
/** The 4px the walk allows a control to move under the finger. */
const STILL = 4;

/**
 * The four labels' words, in px at 14px semibold in the pill's own classes,
 * measured on the export of 1.9 cut from 12fb543d (Chromium, 390 by 844, each
 * language as the app sets it), in every language the app carries.
 */
const WORDS: Record<string, { show: number; hide: number; notYet: number; knew: number }> = {
  en: { show: 107.1, hide: 30.9, notYet: 49.3, knew: 55.8 },
  es: { show: 137.2, hide: 50.8, notYet: 72, knew: 55 },
  ro: { show: 103.1, hide: 59.7, notYet: 48.9, knew: 36 },
  el: { show: 95.6, hide: 44.4, notYet: 74.3, knew: 53.4 },
  ru: { show: 109, hide: 52.3, notYet: 62.2, knew: 48.5 },
  fr: { show: 114.7, hide: 58.9, notYet: 74.1, knew: 60.8 },
  de: { show: 93.7, hide: 80.5, notYet: 73.7, knew: 80.5 },
  sr: { show: 102.8, hide: 47.2, notYet: 46.3, knew: 36.7 },
  uk: { show: 110.2, hide: 57.2, notYet: 39.2, knew: 48.5 },
  it: { show: 108.7, hide: 63.5, notYet: 77.3, knew: 35.1 },
  pt: { show: 132.1, hide: 50.8, notYet: 67.3, knew: 38.2 },
  bg: { show: 110.6, hide: 44.3, notYet: 52.3, knew: 55 },
  ar: { show: 77, hide: 30, notYet: 51.7, knew: 41.8 },
  fil: { show: 146.8, hide: 34, notYet: 55.3, knew: 73.3 },
  tr: { show: 91, hide: 33, notYet: 77.9, knew: 62.6 },
  ka: { show: 140.9, hide: 68.9, notYet: 59.6, knew: 34.5 },
  hu: { show: 124.4, hide: 57.8, notYet: 61.7, knew: 46.5 },
  id: { show: 162.5, hide: 91.4, notYet: 42.1, knew: 68.2 },
  ne: { show: 106.9, hide: 63.2, notYet: 55.7, knew: 67 },
  pl: { show: 80.8, hide: 34.8, notYet: 77, knew: 47.4 },
  ur: { show: 79.8, hide: 46.7, notYet: 57.2, knew: 67.2 },
};

/** The card's room for its buttons, at 360, 390 and 412 wide, measured on the same export. */
const ROOM = [273, 303, 325];

const card = (lang: string, shown: boolean) =>
  renderToString(
    createElement(
      MessagesProvider,
      { locale: lang, messages: getMessages(lang) } as ProviderProps,
      createElement(RememberCardView, {
        reference: "John 3:16",
        href: "/bible/john/3#v16",
        text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
        failed: false,
        shown,
        back: null,
        knew: false,
        locked: false,
        onShow: () => {},
        onReply: () => {},
        onLocked: () => {},
      }),
    ),
  );

/** An element of the row as written: its tag, its classes, its words and what is in it. */
type Node = { tag: string; cls: string; inert: boolean; words: string; kids: Node[] };

/** The row of buttons under the verse, read from the card's markup (its tags are only spans and buttons). */
function rowOf(html: string): Node[] {
  const start = html.indexOf('<div class="mt-4 flex flex-wrap items-center justify-center gap-2">');
  expect(start, "the row of buttons").toBeGreaterThan(0);
  const body = html.slice(html.indexOf(">", start) + 1, html.indexOf("</div>", start));
  const root: Node = { tag: "row", cls: "", inert: false, words: "", kids: [] };
  const stack = [root];
  for (const m of body.matchAll(/<(\/?)(span|button|svg)\b([^>]*)>|([^<]+)/g)) {
    const [, close, tag, attrs, text] = m;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      for (const n of stack) n.words += text;
    } else if (tag === "svg") {
      continue;
    } else if (close) {
      stack.pop();
    } else {
      const node: Node = { tag, cls: /class="([^"]*)"/.exec(attrs)?.[1] ?? "", inert: /\binert=""/.test(attrs), words: "", kids: [] };
      top.kids.push(node);
      stack.push(node);
    }
  }
  return root.kids.filter((k) => !k.cls.includes("sr-only"));
}

type Box = { left: number; right: number; top: number };
type Placed = { node: Node; box: Box; at: number[] };

/**
 * The row laid out: each child a box (a button its words and its padding; a
 * place shared by faces as wide as its widest face, each face its buttons
 * and the gaps between them), wrapped onto lines and each line centred.
 */
function layout(row: Node[], width: (label: string) => number, room: number): Placed[] {
  const label = (b: Node) => b.words.replace(/\s+/g, " ").trim();
  const buttonWidth = (b: Node) => width(label(b)) + 2 * PAD;
  const faceWidth = (face: Node) => face.kids.reduce((s, b, i) => s + buttonWidth(b) + (i ? GAP : 0), 0);
  const widthOf = (n: Node) => (n.tag === "button" ? buttonWidth(n) : Math.max(...n.kids.map(faceWidth)));
  const widths = row.map(widthOf);
  const lines: number[][] = [];
  let line: number[] = [];
  let used = 0;
  widths.forEach((w, i) => {
    const need = line.length ? used + GAP + w : w;
    if (line.length && need > room) {
      lines.push(line);
      line = [i];
      used = w;
    } else {
      line.push(i);
      used = need;
    }
  });
  if (line.length) lines.push(line);
  const placed: Placed[] = [];
  lines.forEach((items, n) => {
    const total = items.reduce((s, i) => s + widths[i], 0) + GAP * (items.length - 1);
    let x = (room - total) / 2;
    for (const i of items) {
      const node = row[i];
      const box = { left: x, right: x + widths[i], top: n * (TALL + GAP) };
      if (node.tag === "button") placed.push({ node, box, at: [i] });
      else {
        // A face fills the shared place; its buttons share what is over (flex-auto), or one fills it (w-full).
        node.kids.forEach((face, f) => {
          const over = (box.right - box.left - faceWidth(face)) / face.kids.length;
          let bx = box.left;
          face.kids.forEach((b, k) => {
            const w = buttonWidth(b) + over;
            placed.push({ node: b, box: { left: bx, right: bx + w, top: box.top }, at: [i, f, k] });
            bx += w + GAP;
          });
        });
      }
      x += widths[i] + GAP;
    }
  });
  return placed;
}

/** How far the node under the finger moved between two frames, as the walk measures it. */
function moved(a: Box, b: Box): number {
  const across = Math.min(Math.abs(a.left - b.left), Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2), Math.abs(a.right - b.right));
  return Math.max(across, Math.abs(a.top - b.top));
}

/** The tap on Show the words: where it stood, and where the node React kept in its place stands in the next frame. */
function tap(lang: string, room: number) {
  const m = getMessages(lang) as unknown as Record<string, string>;
  const w = WORDS[lang];
  const width = (label: string) =>
    label === m["remember.show"] ? w.show : label === m["remember.hide"] ? w.hide : label === m["remember.notYet"] ? w.notYet : label === m["remember.knew"] ? w.knew : NaN;
  const before = layout(rowOf(card(lang, false)), width, room);
  const after = layout(rowOf(card(lang, true)), width, room);
  const show = before.find((p) => p.node.tag === "button" && p.node.words.trim() === m["remember.show"]);
  expect(show, "Show the words, as it stood").toBeDefined();
  const kept = after.find((p) => p.at.join() === show!.at.join() && p.node.tag === show!.node.tag);
  expect(kept, "the node React keeps in its place").toBeDefined();
  const knewBefore = before.find((p) => p.node.words.trim() === m["remember.knew"]);
  const knewAfter = after.find((p) => p.node.words.trim() === m["remember.knew"]);
  return { moved: moved(show!.box, kept!.box), knew: knewBefore && knewAfter ? moved(knewBefore.box, knewAfter.box) : NaN, after };
}

describe("the verse to learn's Show the words, at the tap", () => {
  it("has every label's width measured in each language it is drawn in", () => {
    expect(Object.keys(WORDS).sort()).toEqual(LOCALES.map((l) => l.code).sort());
  });

  it("stays under the finger in its first frame, at a phone's three widths, in every language measured", () => {
    for (const lang of Object.keys(WORDS)) {
      for (const room of ROOM) {
        const { moved: by, knew } = tap(lang, room);
        expect(by, `${lang} at ${room}px of room`).toBeLessThanOrEqual(STILL);
        // I know it stands where it stood too.
        expect(knew, `${lang}: I know it, at ${room}px of room`).toBeLessThanOrEqual(STILL);
      }
    }
  });

  it("measures the move as the walk did: the row as it stood carried it 10px in English at 390", () => {
    // The row as it stood, laid out by the same measure: two buttons, then three, centred again.
    const en = WORDS.en;
    const button = (w: number) => w + 2 * PAD;
    const centred = (ws: number[], room: number) => (room - ws.reduce((s, w) => s + w, 0) - GAP * (ws.length - 1)) / 2;
    const room = ROOM[1];
    const before = centred([button(en.show), button(en.knew)], room);
    const after = centred([button(en.hide), button(en.notYet), button(en.knew)], room);
    const left = Math.abs(before - after);
    const middle = Math.abs(before + button(en.show) / 2 - (after + button(en.hide) / 2));
    const right = Math.abs(before + button(en.show) - (after + button(en.hide)));
    expect(Math.min(left, middle, right)).toBeGreaterThan(STILL);
    expect(Math.round(Math.min(left, middle, right))).toBe(10);
  });

  it("keeps the face that is not shown out of reach: unseen and inert, never a second Show or Hide to tab to", () => {
    for (const shown of [false, true]) {
      const row = rowOf(card("en", shown));
      const place = row.find((n) => n.tag === "span");
      expect(place?.cls, "the shared place").toBe("grid");
      const [first, second] = place!.kids;
      const hidden = shown ? first : second;
      const live = shown ? second : first;
      expect(hidden.inert && /\binvisible\b/.test(hidden.cls)).toBe(true);
      expect(live.inert || /\binvisible\b/.test(live.cls)).toBe(false);
      for (const face of [first, second]) expect(face.cls).toMatch(/^col-start-1 row-start-1 flex/);
    }
    // Focus kept in the card goes to the first button of the face that is shown.
    const src = fs.readFileSync(path.join(process.cwd(), "components/today/RememberCard.tsx"), "utf8");
    expect(src).toContain('rowRef.current?.querySelector<HTMLButtonElement>("button:not([inert] *)")?.focus();');
  });
});
