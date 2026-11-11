"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { warmWeb } from "@/lib/saints/webFiles";
import {
  advanceGlideRun,
  finishGlideRun,
  followAt,
  glideFrame,
  glideLeavers,
  glidePlan,
  glideRun,
  type GlidePlan,
  type GlideRun,
  type GlideWeb,
} from "@/lib/saints/webGlide";
import {
  BOX,
  CENTER_SIZE,
  NODE_SIZE,
  WEB_WIDTH,
  across,
  filtersOf,
  lineStyle,
  primaryTie,
  webFilters,
  webLayout,
  type SaintWebData,
  type WebFilter,
  type WebNode,
} from "@/lib/saints/webLayout";
import {
  KEEP_IN_SIGHT,
  advance,
  advanceGlide,
  aimFrame,
  fingerSpeed,
  flickOf,
  flingPan,
  frameAt,
  givePan,
  grab,
  keepPlaces,
  keepTrack,
  letGo,
  moved,
  openOf,
  panRange,
  pull,
  putBack,
  restorePlaces,
  settle,
  settleFrame,
  threadPath,
  threadThinning,
  throwFrame,
  webBox,
  webFrame,
  webMotion,
  webTarget,
  type CardNow,
  type CardSide,
  type PanRange,
  type Point,
  type Track,
  type WebFrame,
  type WebMotion,
  type WebPlaces,
  type WebScreen,
} from "@/lib/saints/webMotion";
import { haptic, prefersReducedMotion } from "@/lib/ui/motion";
import { visibleBand } from "@/lib/ui/readingPlace";

import { WebAvatar } from "./WebAvatar";
import { SHORT_CARD_H, WebCard, type CardMove, type CardState } from "./WebCard";
import { WebKey } from "./WebKey";
import { kindCounts, tagOf } from "./webWords";
import { PictureCreditNote } from "@/components/saints/PictureCredit";
import { creditWords } from "@/lib/credits/saintPictures";

/** Legible over the lines and the icon's light, in the page's own ground. */
const LABEL_SHADOW = "[text-shadow:0_1px_6px_var(--color-night),0_0_2px_var(--color-night)]";
/** A saint's name and its line under his circle, and the middle saint's ring and name: drawn the same for a saint who leaves in a glide. */
const NAME_CLASS = "mt-1.5 line-clamp-2 font-sans text-[11.5px] font-semibold leading-[1.22]";
const TAG_CLASS = "mt-0.5 max-w-full truncate font-sans text-[10.5px] text-paper/50";
const MIDDLE_RING_CLASS =
  "rounded-full shadow-[0_0_0_4px_var(--color-night),0_0_0_5.5px_color-mix(in_srgb,var(--color-paper)_55%,transparent),0_14px_40px_rgb(0_0_0/0.55)]";
const MIDDLE_NAME_CLASS = "mt-2.5 line-clamp-2 text-center font-serif text-[16px] font-bold leading-[1.2] text-paper";

/** How far a finger moves before it is moving something, not tapping it. */
const DRAG_SLOP = 6;
/** A press held this long without moving lifts what is under it, as the phones' own long press does: how a saint is moved straight up or down where the page scrolls. */
const HOLD_MS = 400;
/**
 * A saint's hit area round his box (his circle, his name and its line): 20px
 * over his circle, so 44px stand above its centre; 10px at each side, so 44px
 * stand beside it even on a 320px phone; 4px under the line. Drawn behind
 * every saint, so where two meet, a saint's own box wins over the other's
 * margin.
 */
const HIT = { up: 20, side: 10, down: 4 } as const;
/**
 * The card coming down from the saint just centred turns to its new saint
 * here, pulled up this share of the way: its tall face and its short one are
 * both all but gone (globals.css, --saint-web-open), so the change is unseen.
 */
const CARD_TURN = 0.315;

/** What the screen keeps of the web while the reader stays on it (SaintWebScreen). */
export type WebKept = { places?: WebPlaces; selectedId?: string; pan?: Point };

/**
 * The web on the screen the moment another saint's web takes its place in the
 * room (the build 80 note 55), measured in the window: where each circle's
 * centre stands, its size and how lit it is, how its threads were drawn, and
 * its card. The new web glides from it (lib/saints/webGlide.ts).
 */
export type WebSnapshot = {
  data: SaintWebData;
  /** The saint chosen on it, his ring lit. */
  selectedId: string;
  /** How far the card was pulled up (0 short, 1 at its height), and the saint it was about. */
  card: { open: number; node: WebNode | null };
  middle: { at: Point; size: number };
  nodes: { at: Point; size: number; opacity: number }[];
  /** Each saint's thread: to body `to` (0, the middle; j + 1, the council j), drawn as it was. */
  threads: { to: number; className: string; width: number; dash?: string; round: boolean; opacity: number }[];
};

/** How this web came into the room: from whose web, and the picture of it to glide from (none with Purify's motion off). */
export type WebArrival = { from: string | null; glide: WebSnapshot | null };

/** What the screen asks of the web on it. */
export type WebLive = { snapshot: () => WebSnapshot | null };

/**
 * The web as it came into the room: on the first draw, or in place of another
 * (`n` counts the changes). `kinds` are its key's, `keyFrom` the last web's,
 * so a key is faded in only where the kinds change.
 */
type Came = { slug: string; kept?: WebKept; glide: WebSnapshot | null; n: number; kinds: string; keyFrom: string | null };

/** A glide under way: its springs, its plan, the web it came from, and where each body of the new web rests. */
type Glider = { run: GlideRun; plan: GlidePlan; snap: WebSnapshot; rest: Point[]; oldMiddle: Point };

/**
 * The old look of the two who change places in a glide, carried with them as
 * it fades: the name and the lit ring of the saint who grows to the middle,
 * the name and the middle's ring of the one who shrinks to a place.
 */
type OldPart = "growName" | "growRing" | "shrinkName" | "shrinkRing";

/** The node each line runs to: the council a father sat at, else the saint in the middle (-1). */
function parentsOf(nodes: readonly WebNode[]): number[] {
  return nodes.map((node) => {
    const via = primaryTie(node).via;
    return via ? nodes.findIndex((n) => n.id === via) : -1;
  });
}

/** The web as the glide sees it. */
function glideWebOf(data: SaintWebData): GlideWeb {
  return { middle: data.center.slug, nodes: data.nodes.map((n) => n.id) };
}

/**
 * The saint chosen as a web is drawn: the first of `wanted` who is on it, else
 * the web's first. A web gliding in chooses the saint whose web the reader
 * came from (note 55: the card then tells how the two are joined, and Back
 * finds the saint he centred on chosen again), then the one he chose when he
 * was last on it; a web drawn again (back from the Timeline) the other way
 * round.
 */
function firstChoice(nodes: readonly WebNode[], wanted: readonly (string | null | undefined)[]): string {
  for (const id of wanted) if (id && nodes.some((n) => n.id === id)) return id;
  return nodes[0]?.id ?? "";
}

/** "saint:<slug>" for the saint whose web the reader came from. */
const cameFrom = (arrival: WebArrival | null | undefined) => (arrival?.from ? `saint:${arrival.from}` : null);

const keptShifted = (kept: WebKept | undefined) => Boolean(kept?.places?.anchor.some(Boolean)) || isMoved(kept?.pan);

const num = (n: number) => (Math.round(n * 1000) / 1000).toString();
/** An opacity read off the screen, kept between 0 and 1. */
const brightness = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1);

/** A glide's size or fade, painted straight onto the element; nothing at all once it is the element's own. */
function paintScale(el: HTMLElement | null | undefined, s: number) {
  if (el) el.style.scale = Math.abs(s - 1) < 0.002 ? "" : num(s);
}
function paintOpacity(el: Element | null | undefined, o: number) {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.opacity = o > 0.998 ? "" : num(Math.max(0, o));
}

/** A finger (or the mouse) on the web, from the moment it comes down. */
type Press = {
  id: number;
  /** The saint under it, or -1 for the web itself: the middle saint or the empty web. */
  node: number;
  x0: number;
  y0: number;
  touch: boolean;
  /** The page could scroll when it came down. */
  scrolls: boolean;
  /** Moving what it took. */
  moving: boolean;
  /** Left to the page: it started up or down where the page scrolls. */
  page: boolean;
  timer: number;
  /** Where the saint was (the web's units), or how far the web was moved (pixels), as it was taken. */
  from: Point;
  /** Where the web was drawn as a saint was taken, so he stays under the finger if the web moves on. */
  frame0: Point;
  range: PanRange | null;
  track: Track;
};

/** What the web's place is measured from, read on arrival, on a resize, and when the foot of the screen changes. */
type Geo = {
  vh: number;
  vw: number;
  /** The foot of the bar. */
  bandTop: number;
  /** The card's foot above the window's, and the tucked handle's top. */
  cardBottom: number;
  handleTop: number;
  /** The canvas's own top on the page, and its middle across the screen. */
  slotTop: number;
  slotX: number;
  /** The room's foot on the page. */
  floor: number;
  /** How far the key goes up to clear the bar as the card is pulled up. */
  keyTravel: number;
};

const NO_MOVE: Point = { x: 0, y: 0 };
const isMoved = (p: Point | undefined) => Boolean(p && (Math.abs(p.x) > 0.5 || Math.abs(p.y) > 0.5));

/**
 * The saint web's first view (1.8, round 1 A, "Constellation", the owner's
 * pick with B and a switch): the saint in the middle and everyone the app's
 * data joins him to around him (lib/saints/web.ts). The line's style says how
 * they are joined: solid for disciples and councils, dashed for a moment of
 * the Church's history, dotted for a Life that names them. A father joined
 * only through a council hangs from that council.
 *
 * Round 3 (sheet r3-06, the build 80 notes 15 and 30; the owner left the pick
 * to the design job on 2026-10-30, and it is card A with drag B):
 *
 *  - The key over the web (WebKey) picks out one kind: a carved track of the
 *    kinds this web has, each beside its line and how many it holds.
 *  - Tapping a saint brings the short card at the foot (WebCard), 78px, which
 *    pulls up to all it holds and tucks into a handle. The first saint is
 *    chosen as the screen arrives.
 *  - A saint can be moved, and the web holds together (lib/saints/webMotion.ts):
 *    his line stretches like a thread, the saint it runs to follows a little,
 *    the others make room; let go, he stays where he was put and they settle
 *    round him, the saint in the middle back home. While a finger moves a
 *    saint the card ducks into its handle. Put back returns the web to its own
 *    places. The places are kept while the reader stays on the page (the
 *    Timeline and back), and a new visit starts from the web's own.
 *
 * The build 84 note 45 (St Macarius's web, "a big gap" under it, "very
 * motiony", "these very small images"):
 *
 *  - The web stands in the middle of the space between the bar and the card,
 *    the middle saint at its middle, short or tucked (webTarget). Pulled up,
 *    the key goes up under the bar and the web goes up with the card, frame by
 *    frame, until the chosen saint stands in the middle of what the card leaves
 *    above it; let go, it settles with the card on the middle saint's spring.
 *    Down again, it comes back to the middle the same way.
 *  - A saint is taken by his whole box, his circle, his name and its line, and
 *    a margin round it (HIT). The middle saint, or the empty web, moves the
 *    whole web; it stays where it is put, inside the screen, and Put back
 *    brings it home with the saints.
 *  - Where the page scrolls (a web taller than the screen, or the website with
 *    its footer), a finger that starts up or down scrolls it, as before; one
 *    that starts sideways, or a press held still for a moment, moves the saint
 *    or the web. Where it does not scroll, every drag moves them
 *    (`data-page-scrolls` and touch-action, globals.css).
 *  - The middle icon's light behind him is a grey from its own lightness, never
 *    its hue: white light, ink on Parchment (globals.css, .saint-web-light).
 *
 * The build 80 note 55 ("make sure the transition from their web to the
 * other person's web is smooth"): another saint's web takes this one's place
 * in the same room, with no page swap (lib/saints/webGlide.ts). The screen
 * hands over the new web and a picture of the old one (`arrival`); the chosen
 * saint glides to the middle and grows, the old middle shrinks to his place
 * in the new web, the saints of both move, the others fade out or come out of
 * the new middle, the threads and the middle's light go over, and the card
 * comes down short and turns to the saint the reader came from. Everything a
 * new visit starts with is started again (the key, the choice, the card, the
 * places kept for that web). With Purify's motion off the new web is simply
 * there.
 *
 * Positions are painted straight onto the elements, never through React
 * state, so a drag re-renders nothing. With Purify's motion off a drag still
 * moves the saint or the web, and everything else is simply where it settles.
 *
 * Places come from lib/saints/webLayout.ts, held there by a test so no two
 * saints' names touch: a share of the width across, pixels down.
 */
export function WebConstellation({
  data,
  kept,
  onKeep,
  arrival,
  liveRef,
  onCenter,
}: {
  data: SaintWebData;
  /** The web as the reader left it on this visit, coming back from the Timeline. */
  kept?: WebKept;
  onKeep?: (next: WebKept) => void;
  /** How this web came into the room (note 55): from whose web, and the picture of it to glide from. */
  arrival?: WebArrival | null;
  /** What the screen asks of the web on it: a picture of it, the moment another web takes its place. */
  liveRef?: Ref<WebLive>;
  /** Glide to a saint's own web, from "Center the web here" on his card. */
  onCenter?: (slug: string) => void;
}) {
  const { t } = useTranslate();
  const { center, nodes } = data;
  const layout = useMemo(() => webLayout(nodes.length), [nodes.length]);
  const box = useMemo(() => webBox(layout), [layout]);
  const filters = useMemo(() => webFilters(nodes), [nodes]);
  const counts = useMemo(() => kindCounts(nodes), [nodes]);
  const parents = useMemo(() => parentsOf(nodes), [nodes]);
  const [came, setCame] = useState<Came>(() => ({ slug: center.slug, kept, glide: null, n: 0, kinds: filters.join(" "), keyFrom: null }));
  const [filter, setFilter] = useState<WebFilter | "all">("all");
  const [selectedId, setSelectedId] = useState(() => firstChoice(nodes, [kept?.selectedId, cameFrom(arrival)]));
  const [card, setCard] = useState<CardState>("short");
  const [dragging, setDragging] = useState(false);
  const [shifted, setShifted] = useState(() => keptShifted(kept));
  // Until the page is measured, as if it scrolls: a page that cannot be scrolled from the web is worse than a saint that waits for a sideways start.
  const [pageScrolls, setPageScrolls] = useState(true);
  /** The card coming down from the saint just centred stays about him until its faces are all but gone (CARD_TURN). */
  const [cardFrom, setCardFrom] = useState<WebNode | null>(null);
  /** The old web's last look, drawn over the new one while the glide lasts. */
  const [ghosts, setGhosts] = useState(false);

  // Another saint's web takes this one's place in the room (note 55): a new
  // visit's start, the saint come from chosen, gliding from the picture of the
  // old web when the screen sent one of it.
  if (came.slug !== center.slug) {
    const snap = arrival?.glide && arrival.glide.data.center.slug === came.slug ? arrival.glide : null;
    setCame({ slug: center.slug, kept, glide: snap, n: came.n + 1, kinds: filters.join(" "), keyFrom: came.kinds });
    setFilter("all");
    setSelectedId(firstChoice(nodes, [cameFrom(arrival), kept?.selectedId]));
    setCard("short");
    setDragging(false);
    setShifted(keptShifted(kept));
    setCardFrom(snap && snap.card.open > CARD_TURN ? snap.card.node : null);
    setGhosts(snap !== null);
  }

  const lit = (node: WebNode) => filter === "all" || filtersOf(node).has(filter);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const tall = card === "tall" && !dragging;
  const cardNode = cardFrom ?? selected;
  /** The web leaving the room, drawn until the glide is done. */
  const gone = ghosts ? came.glide : null;
  const leaving = useMemo(() => (gone ? glideLeavers(glideWebOf(gone.data), glideWebOf(data)) : []), [gone, data]);

  const roomRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<(HTMLButtonElement | null)[]>([]);
  const hitEls = useRef<(HTMLSpanElement | null)[]>([]);
  const lineEls = useRef<(SVGPathElement | null)[]>([]);
  // What a glide paints besides the places (note 55): the circles' sizes, the names, the threads' fade, and the old web's last look.
  const svgRef = useRef<SVGSVGElement>(null);
  const middleRingRef = useRef<HTMLSpanElement>(null);
  const middleNameRef = useRef<HTMLSpanElement>(null);
  const ringEls = useRef<(HTMLSpanElement | null)[]>([]);
  const nameEls = useRef<(HTMLSpanElement | null)[]>([]);
  const tagEls = useRef<(HTMLSpanElement | null)[]>([]);
  const ghostLightRef = useRef<HTMLDivElement>(null);
  const ghostLineEls = useRef<(SVGPathElement | null)[]>([]);
  const ghostEls = useRef<(HTMLDivElement | null)[]>([]);
  /** The old look of the two who change places (OldPart). */
  const ghostOld = useRef<Partial<Record<OldPart, HTMLElement | null>>>({});
  const glide = useRef<Glider | null>(null);
  const glideRaf = useRef(0);
  /** A web just come into the room, its glide not yet begun. */
  const pending = useRef<Came | null>(null);
  /** The card is still about the saint just centred. */
  const turning = useRef(false);
  /** The web as it is drawn, for the picture the screen may ask for between renders. */
  const drawn = useRef({ data, parents, cardNode, selectedId: selected?.id ?? "" });
  const motion = useRef<WebMotion | null>(null);
  /** The whole web's place on the screen. */
  const frame = useRef<WebFrame | null>(null);
  /** Canvas pixels to one of the web's units across (its 390). */
  const scale = useRef(1);
  const raf = useRef(0);
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  const geo = useRef<Geo | null>(null);
  /** The card as it last said it was, and its state. */
  const cardAt = useRef<CardMove>({ height: SHORT_CARD_H, drop: 0, tall: SHORT_CARD_H, live: false, jump: true });
  const cardState = useRef<CardState>("short");
  const selectedRef = useRef(selectedId);
  /** The reader's move of the whole web, and the side of the card it was made on (set as each web arrives). */
  const pan = useRef<Point>({ ...NO_MOVE });
  const panOn = useRef<CardSide>("short");
  /** The card and the move as the web was last aimed by them. */
  const lastLive = useRef<{ card: CardNow; pan: Point } | null>(null);
  /** Where the page was scrolled as the card began to come up: the chosen saint is shown for that, and a scroll after it moves the web with the page, not against it. */
  const liftScroll = useRef<number | null>(null);
  /** A saint is under a finger: the web holds its place meanwhile. */
  const holding = useRef(false);
  const pageScrollsRef = useRef(true);
  const onKeepRef = useRef(onKeep);
  useEffect(() => {
    onKeepRef.current = onKeep;
  }, [onKeep]);
  useLayoutEffect(() => {
    drawn.current = { data, parents, cardNode, selectedId: selected?.id ?? "" };
  });

  /** Every saint and thread where the springs have them, the web where its place is, the key clear of the card. */
  const paint = useCallback(() => {
    const f = frame.current;
    const canvas = canvasRef.current;
    if (f && canvas) {
      const at = frameAt(f);
      canvas.style.translate = `${at.x.toFixed(2)}px ${at.y.toFixed(2)}px`;
    }
    const key = keyRef.current;
    const g = geo.current;
    if (key && g) {
      const open = openOf(cardAt.current.height, SHORT_CARD_H, cardAt.current.tall);
      key.style.translate = open > 0.001 ? `0 ${(-g.keyTravel * open).toFixed(2)}px` : "";
    }
    const m = motion.current;
    if (!m) return;
    const sx = scale.current;
    const place = (el: HTMLElement | null, body: number) => {
      if (!el) return;
      const dx = (m.p[body].x - m.home[body].x) * sx;
      const dy = m.p[body].y - m.home[body].y;
      el.style.translate = `calc(-50% + ${dx.toFixed(2)}px) ${dy.toFixed(2)}px`;
    };
    place(centerRef.current, 0);
    place(lightRef.current, 0);
    nodeEls.current.forEach((el, i) => place(el, i + 1));
    hitEls.current.forEach((el, i) => place(el, i + 1));
    lineEls.current.forEach((el, i) => {
      if (!el) return;
      const body = i + 1;
      const to = m.p[m.parent[body]];
      el.setAttribute("d", threadPath(m.p[body], to, m.rest[body]));
      // A stretched thread is drawn thinner, as a thread is; a dotted one keeps its dots.
      const thin = el.dataset.dot === undefined ? threadThinning(m.p[body], to, m.rest[body]) : 1;
      el.style.strokeWidth = thin < 0.999 ? `${(Number(el.dataset.w || 1.2) * thin).toFixed(2)}px` : "";
    });
  }, []);

  const keepNow = useCallback((m: WebMotion) => {
    // A move made with the card pulled up was only a look round: it is not kept.
    onKeepRef.current?.({ places: keepPlaces(m), pan: panOn.current === "short" && isMoved(pan.current) ? { ...pan.current } : undefined });
  }, []);

  /** Step the springs on animation frames until everything is still. */
  const run = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const m = motion.current;
      const f = frame.current;
      if (!m || !f) {
        raf.current = 0;
        return;
      }
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      const going = m.held >= 0 || !m.still ? advance(m, dt) : false;
      const gliding = advanceGlide(f.left, dt);
      paint();
      if (going || gliding || m.held >= 0) {
        raf.current = requestAnimationFrame(step);
      } else {
        raf.current = 0;
        keepNow(m);
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [paint, keepNow]);

  /** The card as the web follows it. */
  const cardNow = useCallback(
    (): CardNow => ({
      open: openOf(cardAt.current.height, SHORT_CARD_H, cardAt.current.tall),
      drop: cardAt.current.drop,
      tucked: cardState.current === "tucked",
    }),
    [],
  );

  /** What the web's place is measured from, now. */
  const screenNow = useCallback((): WebScreen | null => {
    const g = geo.current;
    const m = motion.current;
    if (!g || !m) return null;
    const i = nodes.findIndex((n) => n.id === selectedRef.current);
    const a = i >= 0 ? m.anchor[i + 1] : m.home[0];
    const top = g.slotTop - (liftScroll.current ?? window.scrollY);
    return {
      bandTop: g.bandTop,
      shortTop: g.vh - g.cardBottom - SHORT_CARD_H,
      tallTop: g.vh - g.cardBottom - Math.max(SHORT_CARD_H, cardAt.current.tall),
      handleTop: g.handleTop,
      web: { middle: g.slotTop + box.middle, top: g.slotTop + box.top, bottom: g.slotTop + box.bottom },
      floor: g.floor,
      chosen: { top: top + a.y - BOX.up, bottom: top + a.y + BOX.down },
    };
  }, [nodes, box]);

  /**
   * Aim the web at its place for the card, the reader's move and the screen.
   * Carried: the card or a finger moved, and the web is there with them at
   * once; anything else that changed (the screen, the chosen saint) it glides
   * to. With Purify's motion off it is simply there.
   */
  const aimWeb = useCallback(
    (carried: boolean) => {
      const f = frame.current;
      // A glide holds the web where its card will leave it: it is aimed again once the glide is done.
      if (!f || holding.current || glide.current || pending.current) return;
      const now = cardNow();
      if (now.open <= 0) liftScroll.current = null;
      else if (liftScroll.current === null) liftScroll.current = window.scrollY;
      const s = screenNow();
      if (!s) return;
      const reduced = prefersReducedMotion();
      const before = lastLive.current;
      if (carried && before && !reduced) aimFrame(f, webTarget(s, before.card, before.pan, panOn.current), false);
      aimFrame(f, webTarget(s, now, pan.current, panOn.current), carried || reduced);
      if (reduced) settleFrame(f);
      lastLive.current = { card: now, pan: { ...pan.current } };
      // A move made on one side of the card stays on that side once the card is on the other.
      const leftBehind = (panOn.current === "tall" && now.open <= 0) || (panOn.current === "short" && now.open >= 1);
      const panning = press.current?.moving === true && press.current.node < 0;
      if (leftBehind && !panning && isMoved(pan.current)) {
        pan.current = { ...NO_MOVE };
        panOn.current = now.open >= 1 ? "tall" : "short";
        lastLive.current.pan = { ...NO_MOVE };
        setShifted(Boolean(motion.current && moved(motion.current)));
      }
      paint();
      if (!f.left.still) run();
    },
    [screenNow, cardNow, paint, run],
  );

  /** Reads the screen: the bar, the card, the canvas, the room, and whether the page scrolls. */
  const measure = useCallback(() => {
    const room = roomRef.current;
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!room || !slot || !canvas) return;
    scale.current = (canvas.clientWidth || WEB_WIDTH) / WEB_WIDTH;
    const sy = window.scrollY;
    const top = room.getBoundingClientRect().top + sy;
    // The room reaches down to the foot of the screen from where it starts (globals.css).
    room.style.setProperty("--saint-web-top", `${Math.round(top)}px`);
    const roomBox = room.getBoundingClientRect();
    const slotBox = slot.getBoundingClientRect();
    const vh = window.innerHeight;
    const bottomOf = (el: HTMLElement | null) => (el ? parseFloat(getComputedStyle(el).bottom) || 0 : 0);
    const cardEl = document.querySelector<HTMLElement>("[data-saint-web-card]");
    const handleEl = document.querySelector<HTMLElement>("[data-saint-web-handle]");
    const bandTop = visibleBand().top;
    const key = keyRef.current;
    geo.current = {
      vh,
      vw: document.documentElement.clientWidth || window.innerWidth,
      bandTop,
      cardBottom: bottomOf(cardEl),
      handleTop: handleEl ? vh - bottomOf(handleEl) - handleEl.offsetHeight : vh,
      slotTop: slotBox.top + sy,
      slotX: slotBox.left + slotBox.width / 2,
      floor: roomBox.bottom + sy,
      keyTravel: key ? Math.max(0, top + key.offsetTop + key.offsetHeight - bandTop) : 0,
    };
    const scrolls = document.documentElement.scrollHeight - vh > 4;
    pageScrollsRef.current = scrolls;
    setPageScrolls(scrolls);
  }, []);

  /* ---- The glide from another saint's web (note 55, lib/saints/webGlide.ts) ---- */

  /** Every size and fade a glide painted, gone: the elements are the web's own again. */
  const unpaintGlide = useCallback(() => {
    paintScale(middleRingRef.current, 1);
    paintOpacity(middleNameRef.current, 1);
    paintOpacity(centerRef.current, 1);
    lightRef.current?.style.removeProperty("--saint-web-arrive");
    for (const el of ringEls.current) paintScale(el, 1);
    for (const el of nodeEls.current) paintOpacity(el, 1);
    for (const el of nameEls.current) paintOpacity(el, 1);
    for (const el of tagEls.current) paintOpacity(el, 1);
    paintOpacity(svgRef.current, 1);
    canvasRef.current?.removeAttribute("data-gliding");
  }, []);

  /** The glide as it is now: each saint where his spring has him, at his size, his names, the threads, the leavers and the lights. */
  const paintGlide = useCallback(() => {
    const g = glide.current;
    const m = motion.current;
    if (!g || !m) return;
    const now = glideFrame(g.run);
    now.bodies.forEach((b, i) => {
      if (!m.p[i]) return;
      m.p[i] = { x: b.p.x, y: b.p.y };
      m.v[i] = { x: 0, y: 0 };
    });
    paint();
    const sx = scale.current;
    const at = (p: Point, top: number) => `calc(-50% + ${(p.x * sx).toFixed(2)}px) ${(p.y + top).toFixed(2)}px`;
    const middle = now.bodies[0];
    paintScale(middleRingRef.current, middle.size / CENTER_SIZE);
    paintOpacity(middleNameRef.current, middle.nameIn);
    paintOpacity(centerRef.current, middle.opacity);
    lightRef.current?.style.setProperty("--saint-web-arrive", num(now.arrive));
    const light = ghostLightRef.current;
    if (light) {
      light.style.translate = at(g.oldMiddle, -230);
      light.style.setProperty("--saint-web-arrive", num(1 - now.arrive));
    }
    for (let i = 1; i < now.bodies.length; i++) {
      const b = now.bodies[i];
      paintScale(ringEls.current[i - 1], b.size / NODE_SIZE);
      paintOpacity(nodeEls.current[i - 1], b.opacity);
      paintOpacity(nameEls.current[i - 1], b.nameIn);
      paintOpacity(tagEls.current[i - 1], b.nameIn);
    }
    // The new threads come in as the old ones go, each old one drawn to where its two saints are now.
    paintOpacity(svgRef.current, now.threadsIn);
    g.snap.threads.forEach((th, i) => {
      const el = ghostLineEls.current[i];
      if (!el) return;
      const a = followAt(g.plan, now, i + 1);
      const b = followAt(g.plan, now, th.to);
      el.setAttribute("d", `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
      el.style.opacity = num(th.opacity * now.threadsOut);
    });
    // Those not on the new web fade where they stood.
    g.plan.leavers.forEach((l, k) => {
      const el = ghostEls.current[k];
      if (!el) return;
      const own = l.old < 0 ? CENTER_SIZE : NODE_SIZE;
      el.style.translate = at(l.at, -own / 2);
      el.style.scale = num((l.size / own) * now.leavers[k].scale);
      el.style.opacity = num(now.leavers[k].opacity);
    });
    // The two who change places take their old look with them as it goes: the name under the circle, the ring round it.
    g.plan.bodies.forEach((b, i) => {
      if (b.role !== "grow" && b.role !== "shrink") return;
      const body = now.bodies[i];
      const name = ghostOld.current[b.role === "grow" ? "growName" : "shrinkName"];
      if (name) {
        name.style.translate = at(body.p, body.size / 2);
        name.style.opacity = num(body.nameOut);
      }
      const ring = ghostOld.current[b.role === "grow" ? "growRing" : "shrinkRing"];
      if (ring) {
        const own = b.role === "grow" ? NODE_SIZE : CENTER_SIZE;
        ring.style.translate = at(body.p, -own / 2);
        ring.style.scale = num(body.size / own);
        ring.style.opacity = num(body.nameOut);
      }
    });
  }, [paint]);

  /** The glide done: every saint at rest in the new web, the old web's look gone, the web aimed for the card again. */
  const endGlide = useCallback(() => {
    const g = glide.current;
    if (!g) return;
    glide.current = null;
    cancelAnimationFrame(glideRaf.current);
    glideRaf.current = 0;
    unpaintGlide();
    const m = motion.current;
    if (m) {
      g.rest.forEach((p, i) => {
        if (!m.p[i]) return;
        m.p[i] = { x: p.x, y: p.y };
        m.v[i] = { x: 0, y: 0 };
      });
    }
    paint();
    setGhosts(false);
    if (turning.current) {
      turning.current = false;
      setCardFrom(null);
    }
    aimWeb(false);
    if (m) keepNow(m);
  }, [unpaintGlide, paint, aimWeb, keepNow]);

  /** At once to the glide's end: a finger on the web before it is done. */
  const finishGlide = useCallback(() => {
    const g = glide.current;
    if (!g) return;
    finishGlideRun(g.run);
    paintGlide();
    endGlide();
  }, [paintGlide, endGlide]);

  /** Step the glide's springs on animation frames until every saint is at rest. */
  const runGlide = useCallback(() => {
    if (glideRaf.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const g = glide.current;
      if (!g) {
        glideRaf.current = 0;
        return;
      }
      const going = advanceGlideRun(g.run, Math.max(0, (now - last) / 1000));
      last = now;
      paintGlide();
      if (going) {
        glideRaf.current = requestAnimationFrame(step);
      } else {
        glideRaf.current = 0;
        endGlide();
      }
    };
    glideRaf.current = requestAnimationFrame(step);
  }, [paintGlide, endGlide]);

  /**
   * Begin the glide from the picture of the old web, before the first paint of
   * the new one: the web set where the card will leave it (short), each of the
   * old saints' places brought from the window into the new web's units, and
   * every body painted where it stood. False when it cannot begin.
   */
  const startGlide = useCallback(
    (snap: WebSnapshot): boolean => {
      const m = motion.current;
      const slot = slotRef.current;
      const canvas = canvasRef.current;
      if (!m || !slot || !canvas || snap.nodes.length !== snap.data.nodes.length) return false;
      measure();
      const s = screenNow();
      if (!s) return false;
      const short: CardNow = { open: 0, drop: 0, tucked: false };
      const target = webTarget(s, short, pan.current, panOn.current);
      frame.current = webFrame(target);
      lastLive.current = { card: short, pan: { ...pan.current } };
      const room = slot.getBoundingClientRect();
      const sx = scale.current || 1;
      const ox = room.left + target.x;
      const oy = room.top + target.y;
      const inWeb = (p: Point): Point => ({ x: (p.x - ox) / sx, y: p.y - oy });
      const rest = m.p.map((p) => ({ x: p.x, y: p.y }));
      const plan = glidePlan(
        {
          web: glideWebOf(snap.data),
          middle: { at: inWeb(snap.middle.at), size: snap.middle.size },
          nodes: snap.nodes.map((n) => ({ at: inWeb(n.at), size: n.size, opacity: n.opacity })),
        },
        { web: glideWebOf(data), rest },
      );
      glide.current = { run: glideRun(plan), plan, snap, rest, oldMiddle: inWeb(snap.middle.at) };
      canvas.setAttribute("data-gliding", "");
      paintGlide();
      runGlide();
      return true;
    },
    [measure, screenNow, data, paintGlide, runGlide],
  );

  // The web's springs, at its own places or as the reader left it on this
  // visit; each time another saint's web takes the room, started again.
  useLayoutEffect(() => {
    // Sizes and fades a glide left on elements this web keeps (one it cut short).
    unpaintGlide();
    const m = webMotion(layout, parents);
    const k = came.kept;
    if (k?.places) {
      restorePlaces(m, k.places);
      settle(m);
    }
    motion.current = m;
    frame.current = webFrame();
    lastLive.current = null;
    liftScroll.current = null;
    pan.current = k?.pan ? { ...k.pan } : { ...NO_MOVE };
    panOn.current = "short";
    pending.current = came.glide && !prefersReducedMotion() ? came : null;
    paint();
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      cancelAnimationFrame(glideRaf.current);
      glideRaf.current = 0;
      glide.current = null;
      pending.current = null;
      motion.current = null;
      frame.current = null;
    };
  }, [layout, parents, came, paint, unpaintGlide]);

  // The screen read as the web arrives, where it is simply in its place; read
  // again when the window or the foot of the screen changes (the mini player,
  // Today's readings bar), and the web glides to its new place.
  useLayoutEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    let queued = 0;
    const again = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        measure();
        aimWeb(false);
      });
    };
    measure();
    aimWeb(true);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(again);
    ro?.observe(room);
    window.addEventListener("resize", again);
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(again);
    mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", again);
      cancelAnimationFrame(queued);
    };
  }, [measure, aimWeb]);

  // Short, pulled up or tucked: the web to its place for the card.
  useLayoutEffect(() => {
    cardState.current = card;
    aimWeb(false);
  }, [card, aimWeb]);

  // Another saint chosen: pulled up, he is the one shown, and a move made to look round goes.
  useLayoutEffect(() => {
    if (selectedRef.current === selectedId) return;
    selectedRef.current = selectedId;
    if (cardState.current === "tall") {
      if (panOn.current === "tall") pan.current = { ...NO_MOVE };
      if (liftScroll.current !== null) liftScroll.current = window.scrollY;
    }
    aimWeb(false);
  }, [selectedId, aimWeb]);

  // Another saint's web just took the room, measured now: the glide begins
  // from the picture of the old one, before anything is painted; with no
  // picture (or Purify's motion off) the new web is simply in its place.
  useLayoutEffect(() => {
    const c = pending.current;
    if (!c || c !== came) return;
    pending.current = null;
    if (c.glide && startGlide(c.glide)) return;
    // A glide that could not begin leaves no old look behind.
    aimWeb(true);
    setGhosts(false);
  }, [came, startGlide, aimWeb]);

  // The card turns to the new web's saint once its faces are all but gone.
  useLayoutEffect(() => {
    turning.current = cardFrom !== null;
  }, [cardFrom]);

  // The picture the screen takes of this web when another is to take its
  // place: read from what is drawn, never from a render that has not happened.
  useImperativeHandle(
    liveRef,
    () => ({
      snapshot(): WebSnapshot | null {
        const m = motion.current;
        const canvas = canvasRef.current;
        const { data: web, parents: lines, cardNode: onCard, selectedId: chosen } = drawn.current;
        if (!m || !canvas || m.p.length !== web.nodes.length + 1) return null;
        const box = canvas.getBoundingClientRect();
        const sx = scale.current || 1;
        const g = glide.current;
        const now = g ? glideFrame(g.run) : null;
        const where = (i: number): Point => ({ x: box.left + m.p[i].x * sx, y: box.top + m.p[i].y });
        const seen = (el: Element | null | undefined) => (el ? brightness(Number.parseFloat(getComputedStyle(el).opacity)) : 1);
        const threads = now ? now.threadsIn : 1;
        return {
          data: web,
          selectedId: chosen,
          card: { open: openOf(cardAt.current.height, SHORT_CARD_H, cardAt.current.tall), node: onCard ?? null },
          middle: { at: where(0), size: now?.bodies[0]?.size ?? CENTER_SIZE },
          nodes: web.nodes.map((_, i) => ({
            at: where(i + 1),
            size: now?.bodies[i + 1]?.size ?? NODE_SIZE,
            opacity: seen(nodeEls.current[i]),
          })),
          threads: web.nodes.map((_, i) => {
            const el = lineEls.current[i];
            return {
              to: (lines[i] ?? -1) + 1,
              className: el?.getAttribute("class") ?? "stroke-paper/25",
              width: Number(el?.dataset.w || 1.2),
              dash: el?.getAttribute("stroke-dasharray") ?? undefined,
              round: el?.getAttribute("stroke-linecap") === "round",
              opacity: brightness(seen(el) * threads),
            };
          }),
        };
      },
    }),
    [],
  );

  // A saint's card pulled up offers his own web: it is read now, so the glide to it begins at once.
  useEffect(() => {
    if (onCenter && tall && selected?.kind === "saint") warmWeb(selected.person.slug);
  }, [onCenter, tall, selected]);

  // React redraws only what it owns; the places are painted again after it.
  useLayoutEffect(() => {
    paint();
  });

  useEffect(() => {
    onKeepRef.current?.({ selectedId });
  }, [selectedId]);

  // A tap in a saint's margin chooses him; a tap on the empty web tucks the card away (or, pulled up, brings it down).
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const onClick = (e: MouseEvent) => {
      if (swallowClick.current) return;
      finishGlide();
      const el = e.target as Element;
      const hit = el.closest<HTMLElement>("[data-web-hit]");
      if (hit) {
        const node = nodes[Number(hit.dataset.webHit)];
        if (node) {
          setSelectedId(node.id);
          setCard((c) => (c === "tucked" ? "short" : c));
        }
        return;
      }
      if (el === room || el === slotRef.current || el === canvasRef.current) setCard((c) => (c === "tall" ? "short" : "tucked"));
    };
    room.addEventListener("click", onClick);
    return () => room.removeEventListener("click", onClick);
  }, [nodes, finishGlide]);

  // Once a finger is moving a saint or the web, the page does not scroll under it.
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const onTouchMove = (e: TouchEvent) => {
      if (press.current?.moving && e.cancelable) e.preventDefault();
    };
    room.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => room.removeEventListener("touchmove", onTouchMove);
  }, []);

  // The card moving carries the web with it; a card simply put somewhere (out of sight, or on arrival) is glided after.
  const onCardMove = useCallback(
    (move: CardMove) => {
      cardAt.current = move;
      // Coming down from the saint just centred, it turns to the new web's saint once its faces are all but gone.
      if (turning.current && openOf(move.height, SHORT_CARD_H, move.tall) <= CARD_TURN) {
        turning.current = false;
        setCardFrom(null);
      }
      aimWeb(!move.jump);
    },
    [aimWeb],
  );

  function choose(id: string) {
    setSelectedId(id);
    setCard((c) => (c === "tucked" ? "short" : c));
  }

  function pick(next: WebFilter | "all") {
    setFilter(next);
    const current = nodes.find((n) => n.id === selectedId);
    if (next !== "all" && current && !filtersOf(current).has(next)) {
      const firstOfKind = nodes.find((n) => filtersOf(n).has(next));
      if (firstOfKind) setSelectedId(firstOfKind.id);
    }
  }

  /** How far the web may be moved from where the card puts it: until the middle saint reaches the edge of the space. */
  function panRangeNow(): PanRange {
    const s = screenNow();
    const g = geo.current;
    if (!s || !g) return { x0: 0, x1: 0, y0: 0, y1: 0 };
    const now = cardNow();
    const base = webTarget(s, now, NO_MOVE, panOn.current);
    const foot = now.tucked ? s.handleTop : s.shortTop;
    return panRange(
      { x: g.slotX + base.x, y: s.web.middle - window.scrollY + base.y },
      {
        left: KEEP_IN_SIGHT,
        right: g.vw - KEEP_IN_SIGHT,
        top: s.bandTop + KEEP_IN_SIGHT,
        bottom: foot + (s.tallTop - foot) * now.open - KEEP_IN_SIGHT,
      },
    );
  }

  /** What the finger came down on starts to move with it. */
  function begin(p: Press) {
    const m = motion.current;
    const f = frame.current;
    if (!m || !f) return;
    p.moving = true;
    clearTimeout(p.timer);
    try {
      roomRef.current?.setPointerCapture(p.id);
    } catch {
      /* the pointer is already gone */
    }
    if (p.node >= 0) {
      m.exact = prefersReducedMotion();
      p.from = { ...m.p[p.node + 1] };
      p.frame0 = frameAt(f);
      holding.current = true;
      grab(m, p.node + 1);
      nodeEls.current[p.node]?.setAttribute("data-held", "");
      canvasRef.current?.setAttribute("data-holding", "");
      setSelectedId(nodes[p.node].id);
      setDragging(true);
      setCard((c) => (c === "tall" ? "short" : c));
    } else {
      if (!isMoved(pan.current)) panOn.current = cardState.current === "tall" ? "tall" : "short";
      p.from = { ...pan.current };
      p.range = panRangeNow();
    }
    haptic("light");
  }

  function onPress(e: ReactPointerEvent<HTMLDivElement>) {
    if (press.current || !e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.target as Element;
    if (el.closest(".saint-web-key")) return;
    // A finger on the web before a glide is done takes it as it will be.
    finishGlide();
    const m = motion.current;
    const f = frame.current;
    if (!m || !f) return;
    const on = el.closest<HTMLElement>("[data-web-node], [data-web-hit]");
    const node = on ? Number(on.dataset.webNode ?? on.dataset.webHit) : -1;
    if (on && !(node >= 0 && node < nodes.length)) return;
    swallowClick.current = false;
    const track: Track = [];
    keepTrack(track, e.timeStamp, e.clientX, e.clientY);
    const p: Press = {
      id: e.pointerId,
      node,
      x0: e.clientX,
      y0: e.clientY,
      touch: e.pointerType !== "mouse",
      scrolls: pageScrollsRef.current,
      moving: false,
      page: false,
      timer: 0,
      from: { ...NO_MOVE },
      frame0: frameAt(f),
      range: null,
      track,
    };
    press.current = p;
    // Held still for a moment, it lifts: the way to move a saint straight up or down where the page scrolls.
    if (p.touch) {
      p.timer = window.setTimeout(() => {
        if (press.current === p && !p.moving && !p.page) begin(p);
      }, HOLD_MS);
    }
  }

  function onPressMove(e: ReactPointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId || p.page) return;
    keepTrack(p.track, e.timeStamp, e.clientX, e.clientY);
    const dx = e.clientX - p.x0;
    const dy = e.clientY - p.y0;
    if (!p.moving) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      // Where the page scrolls, a finger that starts up or down is scrolling it: the browser takes it.
      if (p.touch && p.scrolls && Math.abs(dy) > Math.abs(dx)) {
        p.page = true;
        clearTimeout(p.timer);
        return;
      }
      begin(p);
    }
    const m = motion.current;
    const f = frame.current;
    if (!m || !f) return;
    if (p.node >= 0) {
      const at = frameAt(f);
      pull(m, { x: p.from.x + (dx - (at.x - p.frame0.x)) / scale.current, y: p.from.y + dy - (at.y - p.frame0.y) });
      if (m.exact) {
        settle(m);
        paint();
      } else {
        run();
      }
    } else if (p.range) {
      pan.current = givePan({ x: p.from.x + dx, y: p.from.y + dy }, p.range);
      aimWeb(true);
    }
  }

  function onRelease(e: ReactPointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    clearTimeout(p.timer);
    if (!p.moving) return;
    // The click that ends a move is not a tap. It comes in the same task, if at all.
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
    const m = motion.current;
    const f = frame.current;
    if (!m || !f) return;
    if (p.node >= 0) {
      nodeEls.current[p.node]?.removeAttribute("data-held");
      canvasRef.current?.removeAttribute("data-holding");
      letGo(m);
      holding.current = false;
      setDragging(false);
      setShifted(moved(m) || isMoved(pan.current));
      if (m.exact) {
        settle(m);
        m.exact = false;
        paint();
      } else {
        run();
      }
      // Kept at once, so the Timeline and back finds him even before the web is still.
      keepNow(m);
      // The card comes back, and the web goes to its place for it.
      aimWeb(false);
      return;
    }
    if (!p.range) return;
    const reduced = prefersReducedMotion();
    const v = reduced || e.type === "pointercancel" ? { ...NO_MOVE } : flickOf(fingerSpeed(p.track, e.timeStamp));
    // The web stays where it is put, a flick carrying it on a little, inside the screen.
    pan.current = flingPan(pan.current, v, p.range);
    aimWeb(false);
    if (!reduced) throwFrame(f, v);
    setShifted(moved(m) || isMoved(pan.current));
    keepNow(m);
    run();
  }

  function onPutBack() {
    finishGlide();
    const m = motion.current;
    const f = frame.current;
    if (!m || !f) return;
    putBack(m);
    pan.current = { ...NO_MOVE };
    panOn.current = cardState.current === "tall" ? "tall" : "short";
    setShifted(false);
    if (prefersReducedMotion()) {
      settle(m);
      paint();
    } else {
      run();
    }
    aimWeb(false);
    keepNow(m);
  }

  const putBackShown = shifted && !dragging && !tall;

  // Where the glide finds the old web's last look, to paint it each frame.
  const onLeaver = useCallback((k: number, el: HTMLDivElement | null) => {
    ghostEls.current[k] = el;
  }, []);
  const onOld = useCallback((part: OldPart, el: HTMLElement | null) => {
    ghostOld.current[part] = el;
  }, []);

  return (
    <>
      {/* The web's room: from the bar down to the foot of the screen, the web
          drawn in it where its place is, and cut at its edges. */}
      <div
        ref={roomRef}
        data-page-scrolls={pageScrolls ? "" : undefined}
        onPointerDown={onPress}
        onPointerMove={onPressMove}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        onContextMenu={(e) => {
          // A long press lifts a saint; the phone's own menu does not open over him.
          if (press.current) e.preventDefault();
        }}
        className="saint-web-room -mx-5 -mt-2 px-5 pt-2 md:mx-0 md:mt-0 md:px-0 md:pt-0"
      >
        {filters.length ? (
          // A web gliding in with other kinds than the last brings its own key, fading in (note 55); the same kinds keep theirs, counted again.
          <div
            key={came.kinds}
            ref={keyRef}
            data-new={came.keyFrom !== null && came.keyFrom !== came.kinds ? "" : undefined}
            className="saint-web-key-place"
          >
            <WebKey filters={filters} filter={filter} counts={counts} onPick={pick} />
          </div>
        ) : null}

        <div ref={slotRef} className="relative mx-auto mt-2 w-full max-w-[560px]" style={{ height: layout.height }}>
          <div
            ref={canvasRef}
            data-saint-web-canvas
            // The constellation does not mirror in Arabic (the arbiter's rule of
            // 2026-11-10: only a layout that reads in a direction does). Its
            // saints fill places in balanced pairs round the middle one, right
            // and left, above and below (lib/saints/webLayout.ts, PLACES): no
            // time and no order a reader follows across it.
            data-mock-allow="mirror"
            data-mock-why="the constellation's places are pairs round the middle saint, in no reading order"
            className="saint-web-canvas absolute inset-0"
          >
            {/* The icon's own light behind him, a grey from its lightness, never its hue. */}
            {center.icon ? (
              <div
                ref={lightRef}
                aria-hidden
                className="saint-web-light pointer-events-none absolute left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-cover bg-center"
                style={{ top: layout.center.y - 230, backgroundImage: `url(${center.icon})` }}
              />
            ) : null}
            {/* The old middle's light, going as the new one comes. */}
            {gone?.data.center.icon ? (
              <div
                ref={ghostLightRef}
                aria-hidden
                className="saint-web-light saint-web-ghost pointer-events-none absolute left-0 top-0 h-[460px] w-[460px] rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${gone.data.center.icon})` }}
              />
            ) : null}

            {/* Each saint's hit area, behind them all. */}
            {nodes.map((node, i) => {
              const p = layout.places[i];
              return (
                <span
                  key={node.id}
                  ref={(el) => {
                    hitEls.current[i] = el;
                  }}
                  aria-hidden
                  data-web-hit={i}
                  className="saint-web-hit absolute -translate-x-1/2"
                  style={{
                    left: across(p.x),
                    top: p.y - BOX.up - HIT.up,
                    width: `calc(25.6% + ${HIT.side * 2}px)`,
                    height: BOX.up + BOX.down + HIT.up + HIT.down,
                  }}
                />
              );
            })}

            <svg
              ref={svgRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${WEB_WIDTH} ${layout.height}`}
              preserveAspectRatio="none"
            >
              {nodes.map((node, i) => {
                const from = layout.places[i];
                const to = parents[i] >= 0 ? layout.places[parents[i]] : layout.center;
                const style = lineStyle(primaryTie(node).kind);
                const on = node.id === selected?.id;
                const width = on ? 1.8 : style === "dot" ? 2 : 1.2;
                return (
                  <path
                    key={node.id}
                    ref={(el) => {
                      lineEls.current[i] = el;
                    }}
                    d={`M${from.x} ${from.y}L${to.x} ${to.y}`}
                    data-w={width}
                    data-dot={style === "dot" ? "" : undefined}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={width}
                    strokeLinecap={style === "dot" ? "round" : undefined}
                    strokeDasharray={style === "dash" ? "5 5" : style === "dot" ? "0.1 5" : undefined}
                    className={cn(
                      "motion-safe:transition-opacity",
                      on ? "stroke-paper/80" : "stroke-paper/25",
                      !lit(node) ? "opacity-20" : tall && !on ? "opacity-35" : "opacity-100",
                    )}
                  />
                );
              })}
            </svg>
            {/* The old web's threads, going as the new ones come in. */}
            {gone ? (
              <svg
                aria-hidden
                className="saint-web-ghost pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox={`0 0 ${WEB_WIDTH} ${layout.height}`}
                preserveAspectRatio="none"
              >
                {gone.threads.map((th, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      ghostLineEls.current[i] = el;
                    }}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={th.width}
                    strokeLinecap={th.round ? "round" : undefined}
                    strokeDasharray={th.dash}
                    className={th.className}
                    style={{ opacity: 0 }}
                  />
                ))}
              </svg>
            ) : null}

            {/* The saint in the middle: pinned, he follows a pull a little and is always home after. A drag on him moves the whole web. */}
            <div
              ref={centerRef}
              data-web-middle
              className="absolute flex w-[180px] -translate-x-1/2 flex-col items-center"
              style={{ left: "50%", top: layout.center.y - CENTER_SIZE / 2 }}
            >
              <span ref={middleRingRef} className={MIDDLE_RING_CLASS}>
                <WebAvatar node={{ kind: "saint", id: "center", person: center, ties: [] }} size={CENTER_SIZE} />
              </span>
              <span ref={middleNameRef} lang="en" dir="ltr" className={cn(MIDDLE_NAME_CLASS, LABEL_SHADOW)}>
                {center.short}
              </span>
              <PictureCreditNote src={center.icon} />
            </div>

            {nodes.map((node, i) => {
              const p = layout.places[i];
              const on = node.id === selected?.id;
              const name = node.kind === "saint" ? node.person.short : node.name;
              const tag = tagOf(node, t);
              return (
                <button
                  key={node.id}
                  ref={(el) => {
                    nodeEls.current[i] = el;
                  }}
                  type="button"
                  data-web-node={i}
                  aria-pressed={on}
                  // A picture whose licence asks its maker be named says so after the name (2026-11-11).
                  aria-label={`${tag ? `${name}, ${tag}` : name}${node.kind === "saint" ? creditWords(node.person.icon, t) : ""}`}
                  onClick={() => {
                    if (swallowClick.current) {
                      swallowClick.current = false;
                      return;
                    }
                    choose(node.id);
                  }}
                  className={cn(
                    "saint-web-node tap-press absolute flex w-[25.6%] -translate-x-1/2 flex-col items-center rounded-[14px] text-center",
                    !lit(node) ? "opacity-25" : tall && !on ? "opacity-30" : "opacity-100",
                  )}
                  style={{ left: across(p.x), top: p.y - NODE_SIZE / 2 }}
                >
                  <span
                    ref={(el) => {
                      ringEls.current[i] = el;
                    }}
                    className={cn("saint-web-ring rounded-full", node.kind === "council" && "rounded-[13px]", on && "saint-web-ring-on")}
                  >
                    <WebAvatar node={node} size={NODE_SIZE} />
                  </span>
                  <span
                    ref={(el) => {
                      nameEls.current[i] = el;
                    }}
                    aria-hidden
                    lang="en"
                    dir="ltr"
                    className={cn(NAME_CLASS, node.kind === "saint" && !node.person.icon ? "text-paper/75" : "text-paper/95", LABEL_SHADOW)}
                  >
                    {name}
                  </span>
                  {tag ? (
                    <span
                      ref={(el) => {
                        tagEls.current[i] = el;
                      }}
                      aria-hidden
                      className={cn(TAG_CLASS, LABEL_SHADOW)}
                    >
                      {tag}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {gone ? <GlideGhosts gone={gone} data={data} leaving={leaving} onLeaver={onLeaver} onOld={onOld} /> : null}
          </div>
        </div>
      </div>

      {/* Who is chosen, said once, without reading the whole card again; and whose web it is, once another web has taken the room. */}
      <p lang="en" dir="ltr" className="sr-only" aria-live="polite">
        {selected ? (selected.kind === "saint" ? selected.person.name : selected.name) : ""}
      </p>
      <p className="sr-only" aria-live="polite">
        {came.n > 0 ? t("saints.web.title", { name: center.short }) : ""}
      </p>

      {cardNode ? (
        <WebCard
          node={cardNode}
          state={card}
          away={card === "tucked" || dragging}
          onState={setCard}
          onMove={onCardMove}
          onCenter={onCenter}
        />
      ) : null}

      {/* The way back to the web's own places, once a saint or the web has been moved. */}
      <button
        type="button"
        data-shown={putBackShown ? "" : undefined}
        data-low={card === "tucked" ? "" : undefined}
        inert={!putBackShown}
        onClick={onPutBack}
        className="saint-web-putback tap-press fixed z-20 flex h-11 items-center gap-[7px] rounded-pill pe-3.5 ps-3 font-sans text-[13px] font-semibold text-paper"
      >
        <PutBackMark />
        {t("saints.web.putBack")}
      </button>
    </>
  );
}

/**
 * The old web's saints as they go (note 55): those not on the new web, fading
 * where they stood, and the old look of the two who change places (the name
 * under each circle, the lit ring of the one chosen, the middle's ring of the
 * one leaving the middle), carried with them as it fades. Drawn as the web
 * draws them, never reached by a finger or a screen reader; the web paints
 * them each frame of the glide and drops them once it is done.
 */
function GlideGhosts({
  gone,
  data,
  leaving,
  onLeaver,
  onOld,
}: {
  gone: WebSnapshot;
  data: SaintWebData;
  /** The old web's leavers (lib/saints/webGlide.ts, glideLeavers): its nodes, or -1 for its middle. */
  leaving: readonly number[];
  onLeaver: (k: number, el: HTMLDivElement | null) => void;
  onOld: (part: OldPart, el: HTMLElement | null) => void;
}) {
  const { t } = useTranslate();
  const old = gone.data;
  const chosen = old.nodes.find((n) => n.id === `saint:${data.center.slug}`);
  const oldMiddleStays = data.nodes.some((n) => n.id === `saint:${old.center.slug}`);
  const nameOf = (node: WebNode) => (node.kind === "saint" ? node.person.short : node.name);
  const tone = (node: WebNode) => (node.kind === "saint" && !node.person.icon ? "text-paper/75" : "text-paper/95");

  return (
    <div aria-hidden className="saint-web-ghost pointer-events-none">
      {leaving.map((at, k) => {
        if (at < 0) {
          return (
            <div
              key="middle"
              ref={(el) => onLeaver(k, el)}
              className="absolute left-0 top-0 flex w-[180px] flex-col items-center"
              style={{ opacity: 0, transformOrigin: `50% ${CENTER_SIZE / 2}px` }}
            >
              <span className={MIDDLE_RING_CLASS}>
                <WebAvatar node={{ kind: "saint", id: "gone", person: old.center, ties: [] }} size={CENTER_SIZE} />
              </span>
              <span lang="en" dir="ltr" className={cn(MIDDLE_NAME_CLASS, LABEL_SHADOW)}>{old.center.short}</span>
            </div>
          );
        }
        const node = old.nodes[at];
        const tag = tagOf(node, t);
        return (
          <div
            key={node.id}
            ref={(el) => onLeaver(k, el)}
            className="absolute left-0 top-0 flex w-[25.6%] flex-col items-center text-center"
            style={{ opacity: 0, transformOrigin: `50% ${NODE_SIZE / 2}px` }}
          >
            <span className={cn("saint-web-ring rounded-full", node.kind === "council" && "rounded-[13px]")}>
              <WebAvatar node={node} size={NODE_SIZE} />
            </span>
            <span lang="en" dir="ltr" className={cn(NAME_CLASS, tone(node), LABEL_SHADOW)}>{nameOf(node)}</span>
            {tag ? <span className={cn(TAG_CLASS, LABEL_SHADOW)}>{tag}</span> : null}
          </div>
        );
      })}
      {chosen && gone.selectedId === chosen.id ? (
        <span
          ref={(el) => onOld("growRing", el)}
          className="saint-web-ring saint-web-ring-on absolute left-0 top-0 rounded-full"
          style={{ width: NODE_SIZE, height: NODE_SIZE, opacity: 0 }}
        />
      ) : null}
      {chosen ? (
        <div
          ref={(el) => onOld("growName", el)}
          className="absolute left-0 top-0 flex w-[25.6%] flex-col items-center text-center"
          style={{ opacity: 0 }}
        >
          <span lang="en" dir="ltr" className={cn(NAME_CLASS, tone(chosen), LABEL_SHADOW)}>{nameOf(chosen)}</span>
          {tagOf(chosen, t) ? <span className={cn(TAG_CLASS, LABEL_SHADOW)}>{tagOf(chosen, t)}</span> : null}
        </div>
      ) : null}
      {oldMiddleStays ? (
        <>
          <span
            ref={(el) => onOld("shrinkRing", el)}
            className={cn(MIDDLE_RING_CLASS, "absolute left-0 top-0")}
            style={{ width: CENTER_SIZE, height: CENTER_SIZE, opacity: 0 }}
          />
          <div ref={(el) => onOld("shrinkName", el)} className="absolute left-0 top-0 flex w-[180px] flex-col items-center" style={{ opacity: 0 }}>
            <span lang="en" dir="ltr" className={cn(MIDDLE_NAME_CLASS, LABEL_SHADOW)}>{old.center.short}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** An arrow turning back on itself: the saints back to their places. */
function PutBackMark() {
  return (
    <svg
      aria-hidden
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 rtl:-scale-x-100"
    >
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.2 4.6v4.1h4.1" />
    </svg>
  );
}
