import { wordSpans, type Span } from "./anchor";

/**
 * The page side of marks on words: from a finger to the word under it, and
 * from a span of a paragraph's text to where it is drawn.
 *
 * A paragraph that can be marked is an element with `data-mk` (its place,
 * lib/marks/place.ts) holding one `data-mk-text` element whose text is the
 * paragraph's text, character for character. Offsets count from there, so
 * links and marks drawn inside it change nothing.
 *
 * The apps turn the system's selection off (app/globals.css, "The apps
 * select nothing by themselves"), so a finger's word is found here from the
 * words' own boxes, not from a caret.
 */

export const MARK_HOST = "[data-mk]";
export const MARK_TEXT = "[data-mk-text]";

export function textOf(host: Element): { el: HTMLElement; text: string } | null {
  const el = host.querySelector<HTMLElement>(MARK_TEXT);
  return el ? { el, text: el.textContent ?? "" } : null;
}

type Leaf = { node: Text; s: number; e: number };

function leaves(el: Node): Leaf[] {
  const out: Leaf[] = [];
  const walk = el.ownerDocument!.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let at = 0;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const len = (n as Text).data.length;
    if (len) out.push({ node: n as Text, s: at, e: at + len });
    at += len;
  }
  return out;
}

/** The range of the page that a span of the paragraph's text covers. */
export function rangeOf(el: HTMLElement, span: Span, among: Leaf[] = leaves(el)): Range | null {
  if (!among.length) return null;
  const first = among.find((l) => span.s >= l.s && span.s < l.e) ?? among[among.length - 1];
  const last = among.find((l) => span.e > l.s && span.e <= l.e) ?? among[among.length - 1];
  const range = el.ownerDocument.createRange();
  try {
    range.setStart(first.node, Math.max(0, Math.min(first.node.data.length, span.s - first.s)));
    range.setEnd(last.node, Math.max(0, Math.min(last.node.data.length, span.e - last.s)));
  } catch {
    return null;
  }
  return range;
}

/** How far into the paragraph's text a point of the page's own selection is. */
export function offsetIn(el: HTMLElement, node: Node, offset: number): number | null {
  if (!el.contains(node)) return null;
  const range = el.ownerDocument.createRange();
  try {
    range.setStart(el, 0);
    range.setEnd(node, offset);
  } catch {
    return null;
  }
  return range.toString().length;
}

export type Box = { left: number; top: number; right: number; bottom: number };

/** One box a line, in the page's own coordinates, for a span as it is drawn. */
export function lineBoxes(el: HTMLElement, span: Span): Box[] {
  const range = rangeOf(el, span);
  if (!range) return [];
  const sx = window.scrollX;
  const sy = window.scrollY;
  const lines: Box[] = [];
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 0.5 || r.height < 0.5) continue;
    const box = { left: r.left + sx, top: r.top + sy, right: r.right + sx, bottom: r.bottom + sy };
    const mid = (box.top + box.bottom) / 2;
    const line = lines.find((l) => mid > l.top && mid < l.bottom);
    if (line) {
      line.left = Math.min(line.left, box.left);
      line.right = Math.max(line.right, box.right);
      line.top = Math.min(line.top, box.top);
      line.bottom = Math.max(line.bottom, box.bottom);
    } else lines.push(box);
  }
  return lines.sort((a, b) => a.top - b.top);
}

export type WordBoxes = { el: HTMLElement; words: { span: Span; boxes: Box[] }[] };

/** Every word of a paragraph with where it is drawn, in the page's own coordinates: good until the page is laid out again. */
export function measureWords(el: HTMLElement): WordBoxes {
  const text = el.textContent ?? "";
  const among = leaves(el);
  const sx = window.scrollX;
  const sy = window.scrollY;
  const words = wordSpans(text).map((span) => {
    const range = rangeOf(el, span, among);
    const boxes: Box[] = range
      ? Array.from(range.getClientRects())
          .filter((r) => r.width > 0.5 && r.height > 0.5)
          .map((r) => ({ left: r.left + sx, top: r.top + sy, right: r.right + sx, bottom: r.bottom + sy }))
      : [];
    return { span, boxes };
  });
  return { el, words };
}

/**
 * The word under a point of the screen: the one whose box holds it, else the
 * nearest on the point's own line, else the nearest of all. Null where the
 * paragraph has no word.
 */
export function wordAt(measured: WordBoxes, clientX: number, clientY: number): Span | null {
  const x = clientX + window.scrollX;
  const y = clientY + window.scrollY;
  let best: Span | null = null;
  let bestScore = Infinity;
  for (const w of measured.words) {
    for (const b of w.boxes) {
      const dx = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;
      const dy = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
      // A word on the finger's line beats a nearer word on another line.
      const score = dy * 1000 + dx;
      if (score < bestScore) {
        bestScore = score;
        best = w.span;
      }
    }
  }
  return best;
}
