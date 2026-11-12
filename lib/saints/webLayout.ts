/**
 * The saint web (1.8): the shapes its screen is handed and where each saint
 * sits on it. The owner's pick of 2026-10-27 for round 1 was "A and B, both,
 * with a switch": one screen, the Constellation (the saint in the middle and
 * everyone around him) and the Timeline (the same people, year by year down
 * his life), a Web / Timeline switch in the top bar ("I want that to just be
 * a button, instead of merging the two screens").
 *
 * The web itself is built from the app's own data by lib/saints/web.ts, on
 * the server. This file imports a type and the posters' measure of words
 * (lib/reading/coverText.ts, which imports nothing), so the screen, a client
 * file, can read it without carrying the saints' registry into the app's script
 * (lib/saints/__tests__/brief.test.ts).
 */

import { emWidth } from "@/lib/reading/coverText";

import type { Pronoun } from "./pronoun";

/**
 * How two saints are joined, as the app's data says it:
 *  - disciple / teacher: the registry's named disciples (Saint.disciples),
 *    from either end;
 *  - council: the center was one of a council's principal fathers
 *    (lib/councils/councils.ts), with the council itself, or with another
 *    father of the same council;
 *  - history: both are named in the same event of Orthodox History
 *    (lib/history/events.ts, rel.saints);
 *  - life: one is named in the other's Life (the name links of 1.8,
 *    lib/saints/nameLinks.ts).
 */
export type WebTieKind = "disciple" | "teacher" | "council" | "history" | "life";

/** The chips over the web: the kinds a reader can pick out. */
export type WebFilter = "disciples" | "councils" | "history" | "lives";

export const WEB_FILTERS: readonly WebFilter[] = ["disciples", "councils", "history", "lives"];

export type WebPerson = {
  slug: string;
  /** As the registry writes it: "St. Gregory the Theologian". */
  name: string;
  /** The name without its "St.": "Gregory the Theologian". */
  short: string;
  /** The icon the app carries, when it has one. */
  icon?: string;
  /** The letter a saint without an icon shows. */
  initial: string;
  /** "c. 329–390", when both ends of the life are known. */
  years?: string;
  /** "their" for a pair or a company (lib/saints/pronoun.ts). */
  pronoun: Pronoun;
};

export type WebTie = {
  kind: WebTieKind;
  /** The line under the name on the web, from the data ("Nicaea, 325", "Nicaea I"). Absent where a catalog word says it. */
  tag?: string;
  /** What joins them, as the data names it: the relation, the council and its year, the event and its date. */
  title?: string;
  /** For a tie read in a Life: whose Life the words are from. */
  life?: { slug: string; name: string };
  /** The words: the disciple's line, a father's part at the council, the event's line, the sentence of the Life. */
  text: string;
  /** The page the tie is read on: the council, the event. */
  href?: string;
  /** A father joined only through a council hangs from that council's node. */
  via?: string;
};

export type WebSaintNode = { kind: "saint"; id: string; person: WebPerson; ties: WebTie[] };
export type WebCouncilNode = {
  kind: "council";
  id: string;
  slug: string;
  /** "First Council of Nicaea". */
  name: string;
  year: number;
  /** The council's number in the seven ("I" to "VII"), or its place's first letter. */
  mark: string;
  ties: WebTie[];
};
export type WebNode = WebSaintNode | WebCouncilNode;

/**
 * A moment on the Timeline. `at` places it (a year); `year` is what the
 * year column shows, and a moment the data gives no year has none.
 * `people` are node ids, shown as chips under the words.
 */
export type TimelineRow =
  | { kind: "born"; at: number; year: string; note?: string }
  | { kind: "reposed"; at: number; year: string; note?: string }
  | { kind: "life"; at: number; year?: string; text: string; people: string[] }
  | { kind: "event"; at: number; year: string; title: string; text: string; href: string; people: string[] }
  | { kind: "council"; at: number; year: string; council: string; text: string; href: string; people: string[] };

export type SaintWebData = {
  center: WebPerson;
  /** Strongest first: the order the web fills its places in. */
  nodes: WebNode[];
  timeline: TimelineRow[];
  /** The year he reposed, when it is known: the Timeline's line runs dashed after it. */
  reposedAt?: number;
  /** The web's people the Timeline has no moment for, in the web's order. */
  undated: string[];
};

/** Which tie names a node: the order a reader would ask in. */
const TIE_RANK: Record<WebTieKind, number> = { disciple: 0, teacher: 1, council: 2, history: 3, life: 4 };

/** The tie a node is drawn and labelled by. */
export function primaryTie(node: WebNode): WebTie {
  return [...node.ties].sort((a, b) => TIE_RANK[a.kind] - TIE_RANK[b.kind])[0];
}

const FILTER_OF: Record<WebTieKind, WebFilter> = {
  disciple: "disciples",
  teacher: "disciples",
  council: "councils",
  history: "history",
  life: "lives",
};

/** The chips a node answers to: a council is always among the councils. */
export function filtersOf(node: WebNode): Set<WebFilter> {
  const out = new Set<WebFilter>(node.ties.map((t) => FILTER_OF[t.kind]));
  if (node.kind === "council") out.add("councils");
  return out;
}

/** The chips a web offers: only the kinds it has, and none when it has one kind. */
export function webFilters(nodes: readonly WebNode[]): WebFilter[] {
  const present = new Set<WebFilter>();
  for (const node of nodes) for (const f of filtersOf(node)) present.add(f);
  const out = WEB_FILTERS.filter((f) => present.has(f));
  return out.length > 1 ? out : [];
}

/** The line to a node: solid for disciples and councils, dashed for history, dotted for the Lives. */
export function lineStyle(kind: WebTieKind): "solid" | "dash" | "dot" {
  if (kind === "history") return "dash";
  if (kind === "life") return "dot";
  return "solid";
}

/* ---- Where each saint sits ----
 *
 * The web is laid out on a canvas 390 wide (a phone), in places chosen so
 * that no two saints' boxes touch: a box is the 48px circle and the label
 * under it, 100 wide and 97 tall, and the saint in the middle keeps his
 * circle (104, with its ring) and his name under it clear. The places fill strongest first:
 * left and right of him, above and below, the four corners, then rows further
 * out, so a web of three looks whole and a web of fourteen still fits.
 * lib/saints/__tests__/webLayout.test.ts holds every count to it.
 *
 * Across, a place is a share of the width, so a narrower phone draws the same
 * web a little closer; down, it is pixels, so the rows never close up.
 */

export const WEB_WIDTH = 390;
/** A saint's circle. */
export const NODE_SIZE = 48;
/** The saint in the middle, as the design draws him. */
export const CENTER_SIZE = 104;
/** A saint's box: half its width, and how far it reaches above and below its centre. */
export const BOX = { half: 50, up: 24, down: 73 } as const;
/** The middle saint's circle and his name under it, around his centre. */
export const CENTER_BOX = [
  { left: 137, right: 253, top: -58, bottom: 58 },
  { left: 105, right: 285, top: 58, bottom: 100 },
] as const;

/*
 * A name is shown whole (the gate's confirm run, 2026-11-12: on 43 webs a
 * long name was cut at its second line, "Holy Apostle and Evangelist John",
 * "Eustratius, Auxentius, Eugene, Mardarius and Orestes"). A box holds two
 * lines of name; a longer name makes its box as much taller, and the saints
 * past it, from the middle out, stand that much further out where they would
 * meet it. A web whose names take two lines or fewer is laid out as before.
 *
 * The lines are counted as the phone draws them, on the narrowest phone the
 * app is held to (320 wide, whose web is 277.5 across inside the page's
 * edges, a saint's label 25.6 percent of that), with the posters' measure of
 * the app's own letters, a step narrower than the label for the semibold the
 * web sets them in: so no wider phone breaks a name into more lines than its
 * box holds. The middle saint's name stands in the share of the web its box
 * is drawn at (180 of 390), so it never reaches the saints beside him.
 */

/** A line of a saint's name under his circle (11.5px at 1.22, WebConstellation's NAME_CLASS). */
export const NAME_LINE = 14.03;
/** A line of the middle saint's name (16px at 1.2, MIDDLE_NAME_CLASS). */
export const MIDDLE_LINE = 19.2;
/** The lines of name a box holds as drawn above (BOX, CENTER_BOX). */
export const BOX_LINES = 2;
/** The web's width on the narrowest phone it is held to (320, less the page's edges), and the share of it a saint's label takes. */
const NARROWEST = 277.5;
export const LABEL_SHARE = 0.256;
/** The share of the web the middle saint's name stands in (WebConstellation, data-web-middle): CENTER_BOX[1]'s 180 of 390. */
export const MIDDLE_SHARE = (CENTER_BOX[1].right - CENTER_BOX[1].left) / WEB_WIDTH;
/** How much of a line the measure fills, for the weight the web sets names in over the one it sums. */
const NAME_FILL = 0.95;

/** How many lines `text` takes at `size` px in a column `width` px wide, broken where the browser breaks it: at a space, or after a hyphen ("Trophy-bearer"). */
export function linesOf(text: string, width: number, size: number, face: "serif" | "sans"): number {
  const measure = (width / size) * NAME_FILL;
  const space = emWidth(" ", face);
  let lines = 1;
  let run = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    for (const [k, part] of word.split(/(?<=-)/).entries()) {
      const w = emWidth(part, face);
      const gap = k === 0 ? space : 0;
      if (run > 0 && run + gap + w > measure) {
        lines += 1;
        run = w;
      } else {
        run = run > 0 ? run + gap + w : w;
      }
    }
  }
  return lines;
}

/** The lines a saint's name takes under his circle, on the narrowest phone. */
export function nameLines(name: string): number {
  return linesOf(name, NARROWEST * LABEL_SHARE, 11.5, "sans");
}

/** The lines the middle saint's name takes under his circle. */
export function middleLines(name: string): number {
  return linesOf(name, NARROWEST * MIDDLE_SHARE, 16, "serif");
}

const PLACES: readonly (readonly [number, number])[] = [
  [336, 0],
  [54, 0],
  [195, -132],
  [195, 132],
  [336, -110],
  [54, 110],
  [54, -110],
  [336, 110],
  [128, -234],
  [262, 236],
  [262, -234],
  [128, 236],
  [54, -334],
  [336, 336],
  [336, -334],
  [54, 336],
];

/** The i-th place, x across the 390 and y from the middle saint's centre. */
export function webPlace(i: number): { x: number; y: number } {
  if (i < PLACES.length) return { x: PLACES[i][0], y: PLACES[i][1] };
  // Past sixteen, rows further out, a hundred apart, alternating inward and
  // outward columns so each clears the row before it.
  const k = i - PLACES.length;
  const ring = Math.floor(k / 4) + 1;
  const inner = ring % 2 === 1;
  const xs = inner ? [128, 262] : [54, 336];
  const side = k % 4;
  const x = side === 0 || side === 3 ? xs[0] : xs[1];
  const down = side === 1 || side === 3;
  const y = (334 + ring * 100) * (down ? 1 : -1);
  return { x, y };
}

export type WebLayout = {
  /** The canvas's height in pixels. */
  height: number;
  /** The middle saint's centre. */
  center: { x: number; y: number };
  /** Each node's centre, in the canvas, in the order given. */
  places: { x: number; y: number }[];
  /** How far each node's box reaches below its centre: BOX.down, and more for a name of more than two lines. */
  down: number[];
  /** How far the middle saint's name reaches below his centre: CENTER_BOX[1].bottom, and more for a long name. */
  middleDown: number;
};

/** What the names take: each node's lines of name, in the order given, and the middle saint's. */
export type WebNames = { names?: readonly number[]; middle?: number };

/** The room the places leave between a box and the circle under it, row to row: what a longer name keeps from the next. */
const ROW_GAP = 13;

/** Where `count` saints sit around the middle one, and how tall the canvas is. */
export function webLayout(count: number, lines: WebNames = {}): WebLayout {
  const n = Math.max(0, count);
  const raw = Array.from({ length: n }, (_, i) => webPlace(i));
  // In whole pixels, rounded up, so the places stay whole as the places above are.
  const down = raw.map((_, i) => BOX.down + Math.ceil(Math.max(0, (lines.names?.[i] ?? BOX_LINES) - BOX_LINES) * NAME_LINE));
  const middleDown = CENTER_BOX[1].bottom + Math.ceil(Math.max(0, (lines.middle ?? BOX_LINES) - BOX_LINES) * MIDDLE_LINE);

  // From the middle out, each saint where his place puts him, moved further out, up or down, only
  // where a box already standing over him (or under him, above the middle) has grown into the room
  // his place left: he keeps that room, or a row's gap where it was wider. Two lines of name grow
  // nothing, so nothing moves.
  type Rect = { left: number; right: number; top: number; bottom: number; was: { top: number; bottom: number } };
  const standing: Rect[] = [
    { ...CENTER_BOX[0], was: { top: CENTER_BOX[0].top, bottom: CENTER_BOX[0].bottom } },
    { left: CENTER_BOX[1].left, right: CENTER_BOX[1].right, top: CENTER_BOX[1].top, bottom: middleDown, was: { top: CENTER_BOX[1].top, bottom: CENTER_BOX[1].bottom } },
  ];
  const ys = raw.map((p) => p.y);
  const order = raw.map((_, i) => i).sort((a, b) => Math.abs(raw[a].y) - Math.abs(raw[b].y) || a - b);
  for (const i of order) {
    const left = raw[i].x - BOX.half;
    const right = raw[i].x + BOX.half;
    const was = { top: raw[i].y - BOX.up, bottom: raw[i].y + BOX.down };
    for (const r of standing) {
      if (!(r.left < right && left < r.right)) continue;
      if (raw[i].y >= 0 && r.was.bottom <= was.top) {
        // Over him: his top stays clear of its foot by the room his place left, at most a row's gap.
        const keep = Math.min(was.top - r.was.bottom, ROW_GAP);
        ys[i] = Math.max(ys[i], r.bottom + keep + BOX.up);
      } else if (raw[i].y < 0 && r.was.top >= was.bottom) {
        // Under him, above the middle: his foot stays clear of its top the same way.
        const keep = Math.min(r.was.top - was.bottom, ROW_GAP);
        ys[i] = Math.min(ys[i], r.top - keep - down[i]);
      }
    }
    standing.push({ left, right, top: ys[i] - BOX.up, bottom: ys[i] + down[i], was });
  }

  const PAD = 14;
  let top: number = CENTER_BOX[0].top;
  let bottom: number = middleDown;
  for (const [i, y] of ys.entries()) {
    top = Math.min(top, y - BOX.up);
    bottom = Math.max(bottom, y + down[i]);
  }
  const cy = PAD - top;
  return {
    height: Math.round(bottom - top + PAD * 2),
    center: { x: WEB_WIDTH / 2, y: cy },
    places: raw.map((p, i) => ({ x: p.x, y: ys[i] + cy })),
    down,
    middleDown,
  };
}

/** A share of the canvas's width, for CSS. */
export function across(x: number): string {
  return `${Math.round((x / WEB_WIDTH) * 10000) / 100}%`;
}
