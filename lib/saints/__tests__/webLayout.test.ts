// Where each saint sits on the web (1.8, lib/saints/webLayout.ts). There is
// no browser here (vitest runs in node), so the drawing is held by its
// numbers: every saint's box (his circle and his name under it) inside the
// canvas, none touching another, none on the saint in the middle, for every
// size of web the app has and more.

import { describe, expect, it } from "vitest";

import {
  BOX,
  CENTER_BOX,
  WEB_WIDTH,
  filtersOf,
  lineStyle,
  primaryTie,
  webFilters,
  webLayout,
  type WebNode,
} from "@/lib/saints/webLayout";

type Rect = { left: number; right: number; top: number; bottom: number };
const overlap = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe("the web's places", () => {
  it("keep every saint inside the canvas and clear of every other, up to twenty-four", () => {
    for (let n = 0; n <= 24; n++) {
      const { height, center, places } = webLayout(n);
      expect(places, `n=${n}`).toHaveLength(n);
      const middle: Rect[] = CENTER_BOX.map((b) => ({
        left: b.left,
        right: b.right,
        top: center.y + b.top,
        bottom: center.y + b.bottom,
      }));
      const boxes: Rect[] = places.map((p) => ({ left: p.x - BOX.half, right: p.x + BOX.half, top: p.y - BOX.up, bottom: p.y + BOX.down }));
      for (const [i, box] of boxes.entries()) {
        expect(box.left, `n=${n} #${i} left`).toBeGreaterThanOrEqual(0);
        expect(box.right, `n=${n} #${i} right`).toBeLessThanOrEqual(WEB_WIDTH);
        expect(box.top, `n=${n} #${i} top`).toBeGreaterThanOrEqual(0);
        expect(box.bottom, `n=${n} #${i} bottom`).toBeLessThanOrEqual(height);
        for (const m of middle) expect(overlap(box, m), `n=${n} #${i} on the middle saint`).toBe(false);
        for (let j = i + 1; j < boxes.length; j++) expect(overlap(box, boxes[j]), `n=${n} #${i} and #${j}`).toBe(false);
      }
      for (const m of middle) {
        expect(m.top, `n=${n} middle`).toBeGreaterThanOrEqual(0);
        expect(m.bottom, `n=${n} middle`).toBeLessThanOrEqual(height);
      }
    }
  });

  it("puts the first two beside the saint in the middle, then above and below him", () => {
    const { center, places } = webLayout(4);
    expect(places[0].y).toBe(center.y);
    expect(places[1].y).toBe(center.y);
    expect(places[0].x).toBeGreaterThan(center.x);
    expect(places[1].x).toBeLessThan(center.x);
    expect(places[2]).toEqual({ x: center.x, y: center.y - 132 });
    expect(places[3]).toEqual({ x: center.x, y: center.y + 132 });
  });

  it("grows the canvas with the web, and keeps a small web small", () => {
    expect(webLayout(2).height).toBeLessThan(webLayout(8).height);
    expect(webLayout(8).height).toBeLessThan(webLayout(14).height);
    expect(webLayout(2).height).toBeLessThan(220);
  });
});

describe("a node's look", () => {
  const council: WebNode = { kind: "council", id: "council:x", slug: "x", name: "X", year: 325, mark: "I", ties: [{ kind: "council", text: "" }] };
  const saint = (kinds: ("disciple" | "teacher" | "council" | "history" | "life")[]): WebNode => ({
    kind: "saint",
    id: "saint:y",
    person: { slug: "y", name: "St. Y", short: "Y", initial: "Y", pronoun: "his" },
    ties: kinds.map((kind) => ({ kind, text: "" })),
  });

  it("is drawn by its strongest tie", () => {
    expect(primaryTie(saint(["life", "history"])).kind).toBe("history");
    expect(primaryTie(saint(["life", "teacher"])).kind).toBe("teacher");
    expect(lineStyle("history")).toBe("dash");
    expect(lineStyle("life")).toBe("dot");
    expect(lineStyle("disciple")).toBe("solid");
  });

  it("answers to the chips of its ties, a council always among the councils", () => {
    expect([...filtersOf(council)]).toEqual(["councils"]);
    expect([...filtersOf(saint(["life", "history"]))].sort()).toEqual(["history", "lives"]);
  });

  it("offers chips only when a web has two kinds or more", () => {
    expect(webFilters([saint(["life"])])).toEqual([]);
    expect(webFilters([saint(["life"]), council])).toEqual(["councils", "lives"]);
  });
});
