/**
 * The saint web (1.8): the shapes its screen is handed and where each saint
 * sits on it. The owner's pick of 2026-10-27 for round 1 was "A and B, both,
 * with a switch": one screen, the Constellation (the saint in the middle and
 * everyone around him) and the Timeline (the same people, year by year down
 * his life), a Web / Timeline switch in the top bar ("I want that to just be
 * a button, instead of merging the two screens").
 *
 * The web itself is built from the app's own data by lib/saints/web.ts, on
 * the server. This file imports nothing, so the screen, a client file, can
 * read it without carrying the saints' registry into the app's script
 * (lib/saints/__tests__/brief.test.ts).
 */

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
  pronoun: "his" | "her";
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
};

/** Where `count` saints sit around the middle one, and how tall the canvas is. */
export function webLayout(count: number): WebLayout {
  const raw = Array.from({ length: Math.max(0, count) }, (_, i) => webPlace(i));
  const PAD = 14;
  let top: number = CENTER_BOX[0].top;
  let bottom: number = CENTER_BOX[1].bottom;
  for (const p of raw) {
    top = Math.min(top, p.y - BOX.up);
    bottom = Math.max(bottom, p.y + BOX.down);
  }
  const cy = PAD - top;
  return {
    height: Math.round(bottom - top + PAD * 2),
    center: { x: WEB_WIDTH / 2, y: cy },
    places: raw.map((p) => ({ x: p.x, y: p.y + cy })),
  };
}

/** A share of the canvas's width, for CSS. */
export function across(x: number): string {
  return `${Math.round((x / WEB_WIDTH) * 10000) / 100}%`;
}
