"use client";

/**
 * The atlas at work (1.8, the owner's pick C of r3-10, "the atlas"): the map
 * drawn on one canvas, its hands (one finger drags, two pinch, a tap on a
 * city goes to what happened there), the wheel of events at the foot (a
 * vertical swipe spins it, a tap brings a row to the band, a tap on the band
 * opens its page), the whole history small above the wheel, the year that
 * turns, and play, about one event a second.
 *
 * Imperative on purpose: the view moves every frame while it travels, and a
 * React render a frame would be the slow way to move it. React draws the
 * screen once (MapAtlas.tsx); this writes what moves. The sums are
 * lib/councils/atlas.ts, tested there.
 *
 * Time decides what is drawn, never a frame having run: every state is a
 * time it began, so a webview that skips frames shows the right thing when
 * it draws again. Motion off (Purify's motion switch, lib/ui/motion.ts): the
 * wheel moves without spinning, the view steps without the lift, the year
 * changes in place, and the ring and the thread are there at once.
 */

import {
  FLING,
  HOUSE,
  LABEL,
  ROW,
  T,
  c01,
  camBetween,
  clamp,
  clampCam,
  curveAt,
  curveLength,
  digitTurns,
  digitsOf,
  eraRuns,
  flingTo,
  frameFor,
  lerp,
  liftBetween,
  nameLines,
  overview,
  placeLabels,
  rubber,
  safeMid,
  smooth,
  stepAtMark,
  threadCurve,
  toMap,
  toScreen,
  zoomsFor,
  type Box,
  type Cam,
  type Geo,
  type LabelAsk,
  type Pt,
  type Spot,
  type Zooms,
} from "@/lib/councils/atlas";
import type { MapStep, Side } from "@/lib/councils/map";
import type { Era } from "@/lib/history/events";
import { prefersReducedMotion } from "@/lib/ui/motion";
import { handTicks } from "@/lib/ui/scrollTicks";

export type AtlasPlace = { id: string; place: string; label?: string; x: number; y: number; side: Side };

export type AtlasParts = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  year: HTMLElement;
  odo: HTMLElement;
  era: HTMLElement;
  beyond: HTMLElement;
  panel: HTMLElement;
  mini: SVGSVGElement;
  play: HTMLButtonElement;
  wheel: HTMLElement;
  rows: HTMLElement[];
  band: HTMLAnchorElement;
};

export type AtlasOptions = {
  view: [number, number];
  land: string;
  places: AtlasPlace[];
  steps: MapStep[];
  /** The step it opens on. */
  start: number;
  /** Whether it plays from there at once. */
  play: boolean;
  words: { era: (era: Era) => string; play: string; pause: string };
  /** A step's own page: a tap on the band, Enter on the wheel. */
  open: (step: number) => void;
};

/* The owner's map (his pick of 2026-10-24): Purify's own dark, no tiles. */
const SEA = "#0d0d0e";
const LAND = "#1d1d1f";
const COAST = "#3d3d40";
const INK = "#0b0b0d";
/** A thread left behind once its step has passed: a faint trace. */
const REST = 0.2;
/** The band's row, from the wheel's own top (the panel's 118 less its 68 of head). */
const BAND_TOP = 50;
/** Where the map's land fades into the sea at the cut's edges, in map units. */
const EDGE = 44;

type Light = { at: number; quiet: boolean; settled: boolean };
type Thread = {
  f: string;
  m: string;
  step: number;
  mode: "draw" | "held" | "rest" | "ending";
  t0: number;
  /** For "ending": the strength it ended from. */
  from?: number;
  gone: number | null;
};
type Glide = { from: number; to: number; t0: number; ms: number; ease: (x: number) => number; fling: boolean };
type Hand = { id: number; y0: number; x0: number; pos0: number; moved: boolean; samples: { t: number; pos: number }[]; mini: boolean };
type MapHand = { cam0: Cam; pts0: Map<number, Pt>; t0: number; moved: boolean; samples: { t: number; x: number; y: number }[] };
type RowState = { el: HTMLElement; year: HTMLElement; name: HTMLElement; line: HTMLElement | null; era: HTMLElement | null; shown: boolean; key: string };

export class AtlasEngine {
  private o: AtlasOptions;
  private p: AtlasParts;
  private ctx: CanvasRenderingContext2D;
  private land: Path2D;
  private n: number;
  private place = new Map<string, AtlasPlace>();
  private first = new Map<string, number>();
  private count = new Map<string, number>();
  private marks: (string | null)[];
  private runs: { era: Era; a: number; b: number }[];
  private runOf: number[];
  private firstOfRun: Set<number>;

  private geo!: Geo;
  private zooms!: Zooms;
  private dpr = 1;
  private rtl = false;
  private sans = "sans-serif";
  /** Where no name may go: the top row and the wheel always, the year and "Beyond the map" as they stand now. */
  private obstacles: Box[] = [];
  private fixed: Box[] = [];
  private beyondBox: Box = [0, 0, 0, 0];
  private yearBox: { x: number; y: number; h: number } = { x: 22, y: 0, h: 90 };
  private odoEm = 0.62;

  private cur = 0;
  private pos = 0;
  private cam: Cam = { cx: 0, cy: 0, z: 1 };
  private tween: { from: Cam; to: Cam; t0: number; ms: number; dip: number } | null = null;
  private arrive = 0;
  private lights = new Map<string, Light>();
  private fading = new Map<string, number>();
  private threads = new Map<string, Thread>();
  private rings: { mark: string; t0: number }[] = [];
  /** Each name drawn: how shown it is (0 to 1), where it last stood, and its mark then. */
  private labels = new Map<string, { v: number; box: Box | null; q: Pt | null }>();
  private names: { cur: number; byMark: Map<string, string> } = { cur: -1, byMark: new Map() };
  private mem = new Map<string, Spot>();
  private onScreen = new Map<string, Pt>();
  private lastDraw = -1;

  private glide: Glide | null = null;
  private hand: Hand | null = null;
  /** A hand on the wheel or the ruler: armed once it moves, and the view widens once it has gone a row. */
  private spin: { pos0: number; armed: boolean; wide: boolean; lit: number } | null = null;
  private mapHand: MapHand | null = null;
  private pointers = new Map<number, Pt>();
  private inertia: { vx: number; vy: number; t: number } | null = null;
  private wheelTimer = 0;
  /** A small click in the hand for each event a hand turns the wheel past, as the house's rows click (lib/ui/scrollTicks.ts). */
  private ticks: { tick: () => void; end: () => void } | null = null;

  private playing = false;
  private playTimer = 0;
  private raf = 0;
  private busyUntil = 0;
  private reduced = false;
  private rows: RowState[];
  private miniTeeth: SVGLineElement[] = [];
  private miniRuns: SVGLineElement[] = [];
  private miniBead: SVGCircleElement[] = [];
  private miniX: number[] = [];
  private miniW = 262;
  private miniLit = -2;
  private miniRun = -1;
  private odoYear = -1;
  private widths = new Map<string, number>();
  private sprites: { pool: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;
  private off: (() => void)[] = [];

  constructor(parts: AtlasParts, options: AtlasOptions) {
    this.p = parts;
    this.o = options;
    this.ctx = parts.canvas.getContext("2d")!;
    this.land = new Path2D(options.land);
    this.n = options.steps.length;
    this.marks = options.steps.map((s) => s.mark);
    for (const pl of options.places) this.place.set(pl.id, pl);
    options.steps.forEach((s, i) => {
      if (!s.mark) return;
      if (!this.first.has(s.mark)) this.first.set(s.mark, i);
      this.count.set(s.mark, (this.count.get(s.mark) ?? 0) + 1);
    });
    this.runs = eraRuns(options.steps.map((s) => s.era));
    this.runOf = [];
    this.runs.forEach((r, k) => {
      for (let i = r.a; i <= r.b; i++) this.runOf[i] = k;
    });
    this.firstOfRun = new Set(this.runs.map((r) => r.a).filter((a) => a > 0));
    this.rows = parts.rows.map((el) => ({
      el,
      year: el.querySelector<HTMLElement>("[data-row-year]")!,
      name: el.querySelector<HTMLElement>("[data-row-name]")!,
      line: el.querySelector<HTMLElement>("[data-row-line]"),
      era: el.querySelector<HTMLElement>("[data-row-era]"),
      shown: false,
      key: "",
    }));

    this.reduced = prefersReducedMotion();
    this.measure();
    this.buildMini();
    const start = clamp(options.start, 0, Math.max(0, this.n - 1));
    const now = performance.now();
    this.cur = start;
    this.pos = start;
    if (options.play && !this.reduced) {
      // The door's own play: the whole history in view, then down to the first place.
      this.cam = overview(this.geo, this.zooms, options.places);
      this.setYear(options.steps[start].year, false);
      this.announce(start, "open", now);
      this.playing = true;
      this.schedule(T.play + 350);
    } else {
      this.settle(start, now);
      if (options.play) {
        this.playing = true;
        this.schedule(T.play);
      }
    }
    this.syncPlay();
    this.listen();
    // The first frame now, not on a frame callback: a webview that holds
    // frames back still opens on the right year, rows and places.
    this.frame(now);
    this.wake();
    // Names measured before the type had loaded are measured again.
    document.fonts?.ready.then(() => {
      if (!this.off.length) return;
      this.widths.clear();
      this.measure();
      this.wake();
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.playTimer);
    window.clearTimeout(this.wheelTimer);
    this.ticks?.end();
    this.ticks = null;
    for (const f of this.off) f();
    this.off = [];
  }

  /** The step on screen, for the door to open on next time. */
  current(): number {
    return this.cur;
  }

  /* ------------------------------------------------------------ the screen's measure */

  /**
   * The screen's own measure, in layout terms: the atlas comes in scaled
   * (its entrance), and a measure through that scale would be wrong for as
   * long as it stayed open. Each piece is placed in the atlas itself.
   */
  private measure(): void {
    const { root, canvas, top, year, panel, beyond } = this.p;
    const w = Math.max(1, root.clientWidth);
    const h = Math.max(1, root.clientHeight);
    const box = (el: HTMLElement): Box => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
    this.rtl = getComputedStyle(root).direction === "rtl";
    this.sans = getComputedStyle(root).fontFamily || "sans-serif";
    // Twice the screen's pixels at most: on a dark map of soft lights a third
    // time over is not seen, and it is a half again more to paint each frame.
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    const yr = box(year);
    const tp = box(top);
    const pn = box(panel);
    const by = box(beyond);
    const yearBottom = yr[1] + yr[3];
    const panelTop = pn[1];
    let y0 = Math.min(yearBottom + 12, h * 0.42);
    const y1 = Math.max(panelTop - 14, y0 + 90);
    if (y1 > h) y0 = Math.max(0, h - 120);
    this.geo = {
      w,
      h,
      safe: { x0: 14, y0, x1: w - 14, y1: Math.min(y1, h) },
      vis: { y0: Math.min(yr[1], y0), y1: Math.min(h, panelTop + 2) },
      mapW: this.o.view[0],
      mapH: this.o.view[1],
    };
    this.zooms = zoomsFor(this.geo);
    this.yearBox = { x: this.rtl ? w - (yr[0] + yr[2]) : yr[0], y: yr[1], h: yr[3] };
    this.odoEm = this.textWidth("0", `700 58px ${getComputedStyle(this.p.odo).fontFamily}`) / 58 + 0.012;
    const said = this.textWidth(beyond.textContent ?? "", `600 13px ${this.sans}`);
    this.beyondBox = [w / 2 - said / 2 - 10, by[1] - 4, said + 20, by[3] + 8];
    this.fixed = [
      [tp[0] - 4, tp[1] - 4, tp[2] + 8, tp[3] + 8],
      [pn[0], pn[1] - 6, pn[2], h],
    ];
    this.room();
  }

  /** Where the names may not go, for the step on screen. */
  private room(): void {
    const st = this.o.steps[this.cur];
    this.obstacles = [...this.fixed];
    if (!st) return;
    this.obstacles.push(this.yearObstacle());
    if (!st.mark) this.obstacles.push(this.beyondBox);
  }

  /** The year and its age, as an obstacle for the names: as wide as what they say now. */
  private yearObstacle(): Box {
    const st = this.o.steps[this.cur];
    const digits = String(st?.year ?? 0).length;
    const wide = Math.max(digits * this.odoEm * 58, this.textWidth(this.o.words.era(st.era), `500 13px ${this.sans}`)) + 18;
    const x = this.rtl ? this.geo.w - this.yearBox.x - wide : this.yearBox.x - 6;
    return [x, this.yearBox.y - 6, wide + 6, this.yearBox.h + 12];
  }

  private textWidth(text: string, font: string): number {
    const k = `${font}|${text}`;
    let v = this.widths.get(k);
    if (v === undefined) {
      this.ctx.font = font;
      v = this.ctx.measureText(text).width;
      this.widths.set(k, v);
    }
    return v;
  }

  /* ------------------------------------------------------------ listening */

  private listen(): void {
    const { canvas, wheel, mini, play, root } = this.p;
    const on = (el: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on(canvas, "pointerdown", (e: PointerEvent) => this.mapDown(e));
    on(canvas, "pointermove", (e: PointerEvent) => this.mapMove(e));
    on(canvas, "pointerup", (e: PointerEvent) => this.mapUp(e, false));
    on(canvas, "pointercancel", (e: PointerEvent) => this.mapUp(e, true));
    on(canvas, "wheel", (e: WheelEvent) => this.mapWheel(e), { passive: false });
    on(wheel, "pointerdown", (e: PointerEvent) => this.wheelDown(e, false));
    on(mini, "pointerdown", (e: PointerEvent) => this.wheelDown(e, true));
    for (const el of [wheel, mini]) {
      on(el, "pointermove", (e: PointerEvent) => this.wheelMove(e));
      on(el, "pointerup", (e: PointerEvent) => this.wheelUp(e, false));
      on(el, "pointercancel", (e: PointerEvent) => this.wheelUp(e, true));
    }
    on(wheel, "wheel", (e: WheelEvent) => this.wheelScroll(e), { passive: false });
    on(wheel, "keydown", (e: KeyboardEvent) => this.wheelKey(e));
    on(play, "click", () => (this.playing ? this.pause() : this.play()));
    on(window, "resize", () => this.resize());
    on(document, "visibilitychange", () => {
      if (document.hidden) this.pause();
    });
    // Nothing under the atlas moves: a drag anywhere on it is the atlas's own.
    on(root, "touchmove", (e: TouchEvent) => e.preventDefault(), { passive: false });
  }

  private resize(): void {
    const now = performance.now();
    this.measure();
    this.buildMini();
    this.miniLit = -2;
    this.miniRun = -1;
    const f = this.frameOf(this.cur);
    if (f) {
      this.cam = f;
      this.tween = null;
    }
    this.frame(now);
  }

  /* ------------------------------------------------------------ the frame loop */

  private wake(ms = 1800): void {
    this.busyUntil = Math.max(this.busyUntil, performance.now() + ms);
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (t: number) => {
    this.raf = 0;
    this.frame(t);
    const moving = this.glide || this.hand || this.mapHand || this.tween || this.inertia || this.playing;
    if (moving || t < this.busyUntil) this.raf = requestAnimationFrame(this.tick);
  };

  private frame(t: number): void {
    this.stepWheel(t);
    this.stepInertia(t);
    this.drawMap(t);
    this.drawWheel();
    this.drawMini();
  }

  /* ------------------------------------------------------------ what happens */

  private frameOf(i: number): Cam | null {
    const st = this.o.steps[i];
    const at = st?.mark ? this.place.get(st.mark) : undefined;
    if (!at) return null;
    const from = st.from.map((m) => this.place.get(m)).filter((x): x is AtlasPlace => !!x);
    const lit = this.o.places.filter((q) => (this.first.get(q.id) ?? Infinity) <= i);
    return frameFor(this.geo, this.zooms, at, from, lit);
  }

  /** The view right now, travelling or still. */
  private camNow(t: number): Cam {
    const tw = this.tween;
    if (!tw) return this.cam;
    const e = c01((t - tw.t0) / tw.ms);
    const c = camBetween(tw.from, tw.to, HOUSE(e), tw.dip);
    if (e >= 1) {
      this.tween = null;
      this.cam = tw.to;
      return tw.to;
    }
    return c;
  }

  private moveCam(to: Cam, ms: number, dip: number, t: number): void {
    const from = this.camNow(t);
    if (this.reduced || ms <= 0) {
      this.cam = to;
      this.tween = null;
      return;
    }
    this.cam = from;
    this.tween = { from, to, t0: t, ms, dip };
  }

  /** Open on a step at rest: everything up to it lit, its threads there, the view on it. */
  private settle(i: number, t: number): void {
    this.cur = i;
    this.pos = i;
    this.glide = null;
    this.lights.clear();
    this.fading.clear();
    this.threads.clear();
    this.rings = [];
    this.sync(i, t, "settle");
    this.cam = this.frameOf(i) ?? overview(this.geo, this.zooms, this.o.places);
    this.tween = null;
    this.arrive = -1e9;
    this.setYear(this.o.steps[i].year, false);
    this.after(i);
  }

  /**
   * A step announced: by play, a tap, a key, the opening, or the wheel coming
   * to rest. The view travels to it (lifting away between places far apart,
   * except on landing from a spin), the place lights with a ring as the view
   * arrives, its threads draw in from what led there, the year turns.
   */
  private announce(i: number, how: "open" | "play" | "tap" | "land", t: number): void {
    this.reduced = prefersReducedMotion();
    const was = this.cur;
    this.cur = i;
    const st = this.o.steps[i];
    const f = this.frameOf(i);
    const ms = how === "land" ? T.camLand : T.cam;
    // Coming down from the whole map, or from a spin's wide view, is no journey to lift for.
    if (f) this.moveCam(f, ms, how === "land" || how === "open" ? 0 : liftBetween(this.camNow(t), f), t);
    this.arrive = this.reduced || !f ? t : t + ms * T.arrive;
    this.endThreads(was, i, t);
    this.sync(i, t, this.reduced ? "settle" : how === "open" ? "open" : "announce", ms);
    if (!this.reduced && st.mark) this.rings.push({ mark: st.mark, t0: this.arrive });
    if (how !== "land" && how !== "open") this.setYear(st.year, !this.reduced);
    else this.setYear(st.year, false);
    this.after(i);
    this.wake(ms + 1600);
  }

  /** A step passed by hand (the wheel spun, the ruler scrubbed): lit at once, quietly, no ring. */
  private pass(i: number, t: number): void {
    if (i === this.cur) return;
    const was = this.cur;
    this.cur = i;
    if (this.spin) this.ticks?.tick();
    this.endThreads(was, i, t);
    this.sync(i, t, "quiet");
    this.arrive = t + T.cam * T.arrive;
    this.setYear(this.o.steps[i].year, false);
    this.after(i);
    this.widen(t);
  }

  /** While a hand spins the wheel, the view widens to every place lit so far. */
  private widen(t: number): void {
    const s = this.spin;
    if (!s || !s.armed || Math.abs(this.pos - s.pos0) < 1) return;
    const lit = [...this.lights.keys()].map((id) => this.place.get(id)).filter((x): x is AtlasPlace => !!x);
    if (s.wide && lit.length === s.lit) return;
    s.wide = true;
    s.lit = lit.length;
    if (lit.length) this.moveCam(overview(this.geo, this.zooms, lit), T.camWide, 0, t);
  }

  /**
   * The lights and threads for step i, against what is drawn now. "open" is
   * an announce whose earlier places and threads are simply there, as when
   * the atlas opens partway through.
   */
  private sync(i: number, t: number, how: "settle" | "open" | "quiet" | "announce", ms: number = T.cam): void {
    const mark = this.o.steps[i]?.mark;
    for (const pl of this.o.places) {
      const want = (this.first.get(pl.id) ?? Infinity) <= i;
      const has = this.lights.get(pl.id);
      if (want && !has) {
        this.fading.delete(pl.id);
        this.lights.set(
          pl.id,
          (how === "announce" || how === "open") && pl.id === mark
            ? { at: this.arrive, quiet: false, settled: false }
            : how === "settle" || how === "open"
              ? { at: -1e9, quiet: false, settled: true }
              : { at: t, quiet: true, settled: false },
        );
      } else if (!want && has) {
        this.lights.delete(pl.id);
        if (!this.reduced && how !== "settle") this.fading.set(pl.id, t);
      }
    }
    // Every thread up to here, each from the latest step that drew it.
    const wanted = new Map<string, number>();
    for (let j = 0; j <= i; j++) {
      const s = this.o.steps[j];
      if (!s.mark) continue;
      for (const f of s.from) if (this.place.has(f)) wanted.set(`${f}>${s.mark}`, j);
    }
    for (const [key, th] of this.threads) {
      if (!wanted.has(key) && th.gone === null) th.gone = this.reduced ? t - 1e6 : t;
    }
    const drawn = how === "announce" || how === "open";
    for (const [key, j] of wanted) {
      const th = this.threads.get(key);
      if (th && th.gone === null && th.step === j && !(j === i && drawn)) continue;
      const [f, m] = key.split(">");
      const now = j === i;
      let mode: Thread["mode"] = "rest";
      let t0 = t;
      if (drawn && now) {
        mode = "draw";
        t0 = t + ms * T.threadStart;
      } else if (how === "settle" || how === "open") {
        mode = now ? "held" : "rest";
        t0 = -1e9;
      }
      this.threads.set(key, { f, m, step: j, mode, t0, gone: null });
    }
  }

  /** The threads the step before held, let go to a trace as the step changes. */
  private endThreads(was: number, now: number, t: number): void {
    if (was === now) return;
    for (const th of this.threads.values()) {
      if (th.step !== was || th.gone !== null || (th.mode !== "draw" && th.mode !== "held")) continue;
      if (this.reduced) {
        th.mode = "rest";
        th.t0 = -1e9;
        continue;
      }
      const from = this.threadStrength(th, t);
      th.mode = "ending";
      th.from = from;
      th.t0 = t;
    }
  }

  private threadStrength(th: Thread, t: number): number {
    let op: number;
    if (th.mode === "rest") op = REST * c01((t - th.t0) / 200);
    else if (th.mode === "held") op = 0.62;
    else if (th.mode === "ending") op = lerp(th.from ?? 0.62, REST, c01((t - th.t0) / 520));
    else {
      const u = (t - th.t0) / T.threadDraw;
      op = u <= 0 ? 0 : u < 1 ? 0.95 : lerp(0.95, 0.62, c01((t - th.t0 - T.threadDraw) / 700));
    }
    if (th.gone !== null) op *= 1 - c01((t - th.gone) / 200);
    return op;
  }

  /** What follows a change of step: the age, the band, the slider's words, the names' room. */
  private after(i: number): void {
    const st = this.o.steps[i];
    const era = this.o.words.era(st.era);
    if (this.p.era.textContent !== era) this.p.era.textContent = era;
    if (st.mark) delete this.p.beyond.dataset.on;
    else this.p.beyond.dataset.on = "";
    const band = this.p.band;
    band.setAttribute("href", st.href);
    // The text node React made, changed in place, so React still knows it.
    if (band.firstChild) band.firstChild.nodeValue = `${st.year}, ${st.name}`;
    this.p.wheel.setAttribute("aria-valuenow", String(i));
    this.p.wheel.setAttribute("aria-valuetext", `${st.year}, ${st.name}${st.date ? `, ${st.date}` : ""}, ${st.where}`);
    this.room();
  }

  /* ------------------------------------------------------------ play */

  private play(): void {
    if (this.n < 2) return;
    this.reduced = prefersReducedMotion();
    this.playing = true;
    this.syncPlay();
    if (this.cur >= this.n - 1) {
      this.go(0, "play");
      this.schedule(T.play);
    } else this.schedule(200);
    this.wake();
  }

  private pause(): void {
    if (!this.playing) return;
    this.playing = false;
    window.clearTimeout(this.playTimer);
    this.syncPlay();
  }

  private schedule(ms: number): void {
    window.clearTimeout(this.playTimer);
    this.playTimer = window.setTimeout(() => {
      if (!this.playing) return;
      if (this.cur >= this.n - 1) return this.pause();
      this.go(this.cur + 1, "play");
      if (this.cur >= this.n - 1) this.pause();
      else this.schedule(T.play);
    }, ms);
  }

  private syncPlay(): void {
    const b = this.p.play;
    if (this.playing) b.dataset.playing = "";
    else delete b.dataset.playing;
    b.setAttribute("aria-label", this.playing ? this.o.words.pause : this.o.words.play);
  }

  /** To a step, the wheel gliding there as the view travels. */
  private go(i: number, how: "play" | "tap"): void {
    const to = clamp(i, 0, this.n - 1);
    const t = performance.now();
    this.spin = null;
    this.ticks?.end();
    this.ticks = null;
    this.reduced = prefersReducedMotion();
    if (this.reduced) {
      this.glide = null;
      this.pos = to;
    } else this.glide = { from: this.pos, to, t0: t, ms: T.glide, ease: HOUSE, fling: false };
    this.announce(to, how, t);
  }

  /* ------------------------------------------------------------ the wheel's hands */

  private stepWheel(t: number): void {
    const g = this.glide;
    if (!g) return;
    const e = g.ms > 0 ? c01((t - g.t0) / g.ms) : 1;
    this.pos = lerp(g.from, g.to, g.ease(e));
    if (g.fling) this.pass(clamp(Math.round(this.pos), 0, this.n - 1), t);
    if (e >= 1) {
      this.glide = null;
      this.pos = g.to;
      if (g.fling) this.landAt(g.to, t);
    }
  }

  private landAt(i: number, t: number): void {
    this.pass(i, t);
    this.spin = null;
    this.ticks?.end();
    this.ticks = null;
    this.announce(i, "land", t);
  }

  private wheelDown(e: PointerEvent, mini: boolean): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (this.hand) return;
    this.pause();
    this.reduced = prefersReducedMotion();
    const t = performance.now();
    // Held where it is: a spin is stopped by a finger, as a wheel is.
    if (this.glide) {
      this.stepWheel(t);
      this.glide = null;
    }
    this.hand = { id: e.pointerId, y0: e.clientY, x0: e.clientX, pos0: this.pos, moved: false, samples: [{ t, pos: this.pos }], mini };
    this.spin = { pos0: this.pos, armed: false, wide: false, lit: 0 };
    this.ticks?.end();
    this.ticks = handTicks();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (mini) this.scrub(e, t);
    this.wake();
  }

  /** The ruler of the whole history: the step under the finger. */
  private scrub(e: PointerEvent, t: number): void {
    const r = this.p.mini.getBoundingClientRect();
    const x = ((e.clientX - r.left) / Math.max(1, r.width)) * this.miniW;
    let best = 0;
    let bestD = Infinity;
    this.miniX.forEach((mx, i) => {
      const d = Math.abs(mx - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (this.hand && Math.abs(e.clientX - this.hand.x0) > 4) {
      this.hand.moved = true;
      if (this.spin) this.spin.armed = true;
    }
    this.pos = best;
    this.pass(best, t);
  }

  private wheelMove(e: PointerEvent): void {
    const h = this.hand;
    if (!h || e.pointerId !== h.id) return;
    const t = performance.now();
    if (h.mini) {
      this.scrub(e, t);
      this.wake();
      return;
    }
    const dy = e.clientY - h.y0;
    if (!h.moved && Math.abs(dy) < 6) return;
    h.moved = true;
    if (this.spin) this.spin.armed = true;
    this.pos = rubber(h.pos0 - dy / ROW, this.n);
    h.samples.push({ t, pos: this.pos });
    while (h.samples.length > 2 && t - h.samples[0].t > 100) h.samples.shift();
    this.pass(clamp(Math.round(this.pos), 0, this.n - 1), t);
    this.wake();
  }

  private wheelUp(e: PointerEvent, cancelled: boolean): void {
    const h = this.hand;
    if (!h || e.pointerId !== h.id) return;
    this.hand = null;
    const t = performance.now();
    if (h.mini) {
      if (!h.moved && !cancelled) {
        this.go(this.cur, "tap");
        return;
      }
      this.landAt(this.cur, t);
      return;
    }
    if (!h.moved) {
      this.spin = null;
      this.ticks?.end();
      this.ticks = null;
      if (cancelled) return;
      // A tap: the band opens its step's page; another row comes to the band.
      const r = this.p.wheel.getBoundingClientRect();
      const d = (e.clientY - r.top - BAND_TOP - ROW / 2) / ROW;
      const i = clamp(Math.round(this.pos + d), 0, this.n - 1);
      if (i === Math.round(this.pos) && Math.abs(d) < 0.5) this.o.open(i);
      else this.go(i, "tap");
      return;
    }
    const last = h.samples[h.samples.length - 1];
    const firstS = h.samples[0];
    const still = t - last.t > 60;
    const v = !still && last.t > firstS.t ? (last.pos - firstS.pos) / (last.t - firstS.t) : 0;
    if (this.reduced) {
      const to = clamp(Math.round(this.pos), 0, this.n - 1);
      this.pos = to;
      this.landAt(to, t);
      return;
    }
    const { to, ms } = flingTo(this.pos, v, this.n);
    this.glide = { from: this.pos, to, t0: t, ms, ease: Math.abs(v) > 0.004 ? FLING : HOUSE, fling: true };
    this.wake();
  }

  /** A mouse's wheel or a trackpad over the wheel of events. */
  private wheelScroll(e: WheelEvent): void {
    e.preventDefault();
    this.pause();
    const t = performance.now();
    if (!this.spin) this.spin = { pos0: this.pos, armed: true, wide: false, lit: 0 };
    this.ticks ??= handTicks();
    this.glide = null;
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    this.pos = clamp(this.pos + dy / (ROW * 1.6), 0, this.n - 1);
    this.pass(Math.round(this.pos), t);
    window.clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => {
      const now = performance.now();
      const to = clamp(Math.round(this.pos), 0, this.n - 1);
      this.reduced = prefersReducedMotion();
      if (this.reduced) {
        this.pos = to;
        this.landAt(to, now);
      } else this.glide = { from: this.pos, to, t0: now, ms: 220, ease: HOUSE, fling: true };
      this.wake();
    }, 140);
    this.wake();
  }

  private wheelKey(e: KeyboardEvent): void {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 5, PageUp: -5 };
    let to: number | null = null;
    if (e.key in moves) to = this.cur + moves[e.key] * (this.rtl && (e.key === "ArrowRight" || e.key === "ArrowLeft") ? -1 : 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = this.n - 1;
    else if (e.key === "Enter") {
      e.preventDefault();
      this.o.open(this.cur);
      return;
    }
    if (to === null) return;
    e.preventDefault();
    this.pause();
    this.go(clamp(to, 0, this.n - 1), "tap");
  }

  /* ------------------------------------------------------------ the map's hands */

  /** A pointer on the atlas, in its own layout terms (the entrance's scale taken out). */
  private local(e: { clientX: number; clientY: number }): Pt {
    const r = this.p.root.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / Math.max(1, r.width)) * this.geo.w, y: ((e.clientY - r.top) / Math.max(1, r.height)) * this.geo.h };
  }

  private mapDown(e: PointerEvent): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.pause();
    this.reduced = prefersReducedMotion();
    const t = performance.now();
    this.p.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, this.local(e));
    this.cam = this.camNow(t);
    this.tween = null;
    this.inertia = null;
    this.mapHand = { cam0: { ...this.cam }, pts0: new Map(this.pointers), t0: t, moved: this.pointers.size > 1 || !!this.mapHand?.moved, samples: [] };
    this.wake();
  }

  private mapMove(e: PointerEvent): void {
    const h = this.mapHand;
    if (!h || !this.pointers.has(e.pointerId)) return;
    const t = performance.now();
    this.pointers.set(e.pointerId, this.local(e));
    const ids = [...this.pointers.keys()];
    if (ids.length === 1) {
      const p = this.pointers.get(ids[0])!;
      const p0 = h.pts0.get(ids[0]);
      if (!p0) return;
      const dx = p.x - p0.x;
      const dy = p.y - p0.y;
      if (!h.moved && Math.hypot(dx, dy) < 6) return;
      h.moved = true;
      this.cam = clampCam(this.geo, { cx: h.cam0.cx - dx / h.cam0.z, cy: h.cam0.cy - dy / h.cam0.z, z: h.cam0.z });
      h.samples.push({ t, x: p.x, y: p.y });
      while (h.samples.length > 2 && t - h.samples[0].t > 80) h.samples.shift();
    } else {
      const [a, b] = [this.pointers.get(ids[0])!, this.pointers.get(ids[1])!];
      const [a0, b0] = [h.pts0.get(ids[0]), h.pts0.get(ids[1])];
      if (!a0 || !b0) return;
      h.moved = true;
      const d0 = Math.max(10, Math.hypot(b0.x - a0.x, b0.y - a0.y));
      const d = Math.max(10, Math.hypot(b.x - a.x, b.y - a.y));
      const z = clamp((h.cam0.z * d) / d0, this.zooms.zFloor, this.zooms.zCeil);
      const anchor = toMap(this.geo, h.cam0, { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 });
      const s = safeMid(this.geo);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.cam = clampCam(this.geo, { cx: anchor.x - (m.x - s.x) / z, cy: anchor.y - (m.y - s.y) / z, z });
      h.samples = [];
    }
    this.wake();
  }

  private mapUp(e: PointerEvent, cancelled: boolean): void {
    const h = this.mapHand;
    if (!h || !this.pointers.has(e.pointerId)) return;
    const t = performance.now();
    const at = this.pointers.get(e.pointerId)!;
    const tap = !h.moved && !cancelled && this.pointers.size === 1 && t - h.t0 < 400;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size > 0) {
      // The other finger carries on from here.
      this.mapHand = { cam0: { ...this.cam }, pts0: new Map(this.pointers), t0: t, moved: true, samples: [] };
      return;
    }
    this.mapHand = null;
    if (tap) return this.mapTap(at);
    const s = h.samples;
    if (!this.reduced && s.length > 1 && t - s[s.length - 1].t < 60) {
      const dt = s[s.length - 1].t - s[0].t;
      if (dt > 0) this.inertia = { vx: (s[s.length - 1].x - s[0].x) / dt, vy: (s[s.length - 1].y - s[0].y) / dt, t };
    }
    this.wake();
  }

  private stepInertia(t: number): void {
    const m = this.inertia;
    if (!m) return;
    const dt = Math.min(48, t - m.t);
    m.t = t;
    if (dt <= 0) return;
    const c = this.cam;
    const next = clampCam(this.geo, { cx: c.cx - (m.vx * dt) / c.z, cy: c.cy - (m.vy * dt) / c.z, z: c.z });
    if (next.cx === c.cx - (m.vx * dt) / c.z) m.vx *= Math.exp(-dt / 325);
    else m.vx = 0;
    if (next.cy === c.cy - (m.vy * dt) / c.z) m.vy *= Math.exp(-dt / 325);
    else m.vy = 0;
    this.cam = next;
    if (Math.hypot(m.vx, m.vy) < 0.02) this.inertia = null;
  }

  /** A tap on a city: what happened there, up to the year on screen (or the first thing to). */
  private mapTap(at: Pt): void {
    let best: string | null = null;
    let bestD = 26;
    for (const [id, q] of this.onScreen) {
      const d = Math.hypot(q.x - at.x, q.y - at.y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    if (!best) return;
    const i = stepAtMark(this.marks, best, this.cur);
    if (i >= 0 && i !== this.cur) this.go(i, "tap");
  }

  /** A mouse's wheel over the map: nearer or further, about the pointer. */
  private mapWheel(e: WheelEvent): void {
    e.preventDefault();
    this.pause();
    const t = performance.now();
    const c = this.camNow(t);
    this.tween = null;
    this.inertia = null;
    const z = clamp(c.z * Math.exp(-e.deltaY * 0.0015), this.zooms.zFloor, this.zooms.zCeil);
    const at = this.local(e);
    const anchor = toMap(this.geo, c, at);
    const s = safeMid(this.geo);
    this.cam = clampCam(this.geo, { cx: anchor.x - (at.x - s.x) / z, cy: anchor.y - (at.y - s.y) / z, z });
    this.wake();
  }

  /* ------------------------------------------------------------ the year */

  /** The year's digits as wheels: rolled forward or back, or set in place. */
  private setYear(year: number, roll: boolean): void {
    const cols = Array.from(this.p.odo.children) as HTMLElement[];
    const from = this.odoYear < 0 ? year : this.odoYear;
    const a = digitsOf(from);
    const b = digitsOf(year);
    const turns = digitTurns(from, year);
    const animate = roll && from !== year && !this.reduced;
    cols.forEach((col, k) => {
      const strip = col.firstElementChild as HTMLElement;
      // Back to the middle copy, where nothing shows the move.
      delete col.dataset.roll;
      const start = 10 + Math.max(0, a[k]);
      strip.style.transform = `translateY(${-start}em)`;
      if (!animate) {
        strip.style.transform = `translateY(${-(10 + Math.max(0, b[k]))}em)`;
        col.style.width = b[k] < 0 ? "0em" : `${this.odoEm.toFixed(4)}em`;
        col.style.opacity = b[k] < 0 ? "0" : "1";
      }
    });
    if (animate) {
      void this.p.odo.offsetWidth;
      cols.forEach((col, k) => {
        const strip = col.firstElementChild as HTMLElement;
        col.dataset.roll = "";
        const target = a[k] < 0 ? 10 + Math.max(0, b[k]) : b[k] < 0 ? 10 + a[k] : 10 + a[k] + turns[k];
        strip.style.transform = `translateY(${-target}em)`;
        col.style.width = b[k] < 0 ? "0em" : `${this.odoEm.toFixed(4)}em`;
        col.style.opacity = b[k] < 0 ? "0" : "1";
      });
    }
    this.odoYear = year;
  }

  /* ------------------------------------------------------------ drawing: the map */

  private spritesNow(): { pool: HTMLCanvasElement; glow: HTMLCanvasElement } {
    if (this.sprites) return this.sprites;
    const make = (size: number, stops: [number, number][]) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const x = c.getContext("2d")!;
      const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      for (const [at, a] of stops) g.addColorStop(at, `rgba(255,255,255,${a})`);
      x.fillStyle = g;
      x.fillRect(0, 0, size, size);
      return c;
    };
    this.sprites = {
      pool: make(256, [
        [0, 0.15],
        [0.38, 0.055],
        [1, 0],
      ]),
      glow: make(128, [
        [0, 1],
        [0.3, 0.62],
        [0.62, 0.18],
        [1, 0],
      ]),
    };
    return this.sprites;
  }

  private drawMap(t: number): void {
    const { ctx, geo, dpr } = this;
    const { w, h } = geo;
    const cam = this.camNow(t);
    const steps = this.o.steps;
    const st = steps[this.cur];
    const sp = this.spritesNow();
    const s = safeMid(geo);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = SEA;
    ctx.fillRect(0, 0, w, h);

    // The land, under the view, its edges fading into the sea where the map is cut.
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (s.x - cam.cx * cam.z), dpr * (s.y - cam.cy * cam.z));
    ctx.fillStyle = LAND;
    ctx.fill(this.land);
    ctx.lineWidth = 0.8 / cam.z;
    ctx.lineJoin = "round";
    ctx.strokeStyle = COAST;
    ctx.stroke(this.land);
    const { mapW: W, mapH: H } = geo;
    const fade = (x0: number, y0: number, x1: number, y1: number) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, SEA);
      g.addColorStop(1, "rgba(13,13,14,0)");
      return g;
    };
    ctx.fillStyle = fade(0, 0, 0, EDGE);
    ctx.fillRect(-3000, -3000, 7000, 3000 + EDGE);
    ctx.fillStyle = fade(0, H, 0, H - EDGE);
    ctx.fillRect(-3000, H - EDGE, 7000, 3000);
    ctx.fillStyle = fade(0, 0, EDGE, 0);
    ctx.fillRect(-3000, -3000, 3000 + EDGE, 7000);
    ctx.fillStyle = fade(W, 0, W - EDGE, 0);
    ctx.fillRect(W - EDGE, -3000, 3000, 7000);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const curOn = this.arrive < -1e8 || this.reduced ? 1 : HOUSE(c01((t - this.arrive) / 520));
    this.onScreen.clear();
    type Lit = { id: string; q: Pt; isCur: boolean; on: number; fadeIn: number; fade: number };
    const lit: Lit[] = [];
    const dim: Pt[] = [];

    for (const pl of this.o.places) {
      const q = toScreen(geo, cam, pl);
      if (q.x < -40 || q.x > w + 40 || q.y < -40 || q.y > h + 40) continue;
      this.onScreen.set(pl.id, q);
      const L = this.lights.get(pl.id);
      const goneAt = this.fading.get(pl.id);
      if (!L) {
        if (goneAt !== undefined) {
          const k = 1 - c01((t - goneAt) / 200);
          if (k <= 0) this.fading.delete(pl.id);
          else lit.push({ id: pl.id, q, isCur: false, on: 1, fadeIn: 1, fade: k });
        }
        dim.push(q);
        continue;
      }
      const since = t - L.at;
      if (!L.settled && since < 0) {
        dim.push(q);
        continue;
      }
      const on = L.settled ? 1 : c01(since / 240);
      const fadeIn = L.settled ? 1 : L.quiet ? smooth(since / 220) : smooth((since - 150) / 340);
      lit.push({ id: pl.id, q, isCur: st.mark === pl.id, on, fadeIn, fade: 1 });
    }

    // Pools of light under the lit places.
    for (const l of lit) {
      const curE = l.isCur ? curOn : 0;
      const r = 50 + 42 * curE;
      ctx.globalAlpha = (0.62 + 0.38 * curE) * l.on * l.fade;
      ctx.drawImage(sp.pool, l.q.x - r, l.q.y - r, 2 * r, 2 * r);
    }

    // The threads: from what led here, drawn in, held, then a trace.
    for (const [key, th] of this.threads) {
      const op = this.threadStrength(th, t);
      if (th.gone !== null && t - th.gone > 200) {
        this.threads.delete(key);
        continue;
      }
      if (op <= 0.01) continue;
      const a = this.place.get(th.f);
      const b = this.place.get(th.m);
      if (!a || !b) continue;
      const A = toScreen(geo, cam, a);
      const B = toScreen(geo, cam, b);
      const q = threadCurve(A, B);
      const u = th.mode === "draw" ? c01((t - th.t0) / T.threadDraw) : 1;
      const pe = u < 1 ? HOUSE(u) : 1;
      const len = curveLength(q);
      ctx.setLineDash(pe < 1 ? [len * pe, len + 10] : []);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(q.a.x, q.a.y);
      ctx.quadraticCurveTo(q.c.x, q.c.y, q.b.x, q.b.y);
      ctx.strokeStyle = "#fff";
      ctx.globalAlpha = op * 0.09;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.globalAlpha = op * 0.16;
      ctx.lineWidth = 3;
      ctx.stroke();
      const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      g.addColorStop(0, "rgba(255,255,255,0.16)");
      g.addColorStop(1, "#fff");
      ctx.strokeStyle = g;
      ctx.globalAlpha = op;
      ctx.lineWidth = 1.35;
      ctx.stroke();
      ctx.setLineDash([]);
      if (pe < 1 && u > 0) {
        const head = curveAt(q, pe);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sp.glow, head.x - 7, head.y - 7, 14, 14);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Places not yet come: faint points of where things will happen.
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.17;
    for (const q of dim) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // The lit marks, softly glowing white; a bloom as each first lights.
    for (const l of lit) {
      const L = this.lights.get(l.id);
      const since = L ? t - L.at : 1e9;
      const bloom = !L || L.settled || this.reduced ? 0 : Math.sin(Math.PI * c01(since / 900)) * (L.quiet ? 0.35 : 1);
      const curE = l.isCur ? curOn : 0;
      const r = ((this.count.get(l.id) ?? 1) > 1 ? 3.7 : 3.2) + 1.1 * curE;
      const gr = r * 2.3 + bloom * 9 + 9;
      ctx.globalAlpha = Math.min(1, ((0.3 + 0.2 * curE) * l.on + bloom * 0.35) * l.fade);
      ctx.drawImage(sp.glow, l.q.x - gr, l.q.y - gr, 2 * gr, 2 * gr);
      ctx.globalAlpha = (0.25 + 0.7 * l.on) * l.fade;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(l.q.x, l.q.y, r * (0.55 + 0.45 * l.on), 0, Math.PI * 2);
      ctx.fill();
    }

    // A ring opening as each step's year comes, and the steady ring on the step now.
    ctx.strokeStyle = "#fff";
    this.rings = this.rings.filter((ring) => (t - ring.t0) / T.ring <= 1.3);
    for (const ring of this.rings) {
      const u = (t - ring.t0) / T.ring;
      if (u < 0) continue;
      const pl = this.place.get(ring.mark);
      if (!pl) continue;
      const q = toScreen(geo, cam, pl);
      for (const [lag, size] of [
        [0, 1],
        [0.22, 0.66],
      ]) {
        const v = c01((u - lag) / (1 - lag));
        if (v <= 0 || v >= 1) continue;
        const e = HOUSE(v);
        ctx.globalAlpha = 0.85 * Math.pow(1 - v, 1.4);
        ctx.lineWidth = Math.max(0.3, 1.7 - e);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 7 + 34 * size * e, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (st.mark && curOn > 0) {
      const q = this.onScreen.get(st.mark);
      if (q) {
        ctx.globalAlpha = 0.62 * curOn;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 11.5 + 9 * (1 - curOn), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    this.drawLabels(t, lit, st);
    ctx.globalAlpha = 1;
    this.lastDraw = t;
  }

  /** The names: the place now first, then where its threads began, then the rest; none colliding or cut. */
  private drawLabels(t: number, lit: { id: string; q: Pt; isCur: boolean; fadeIn: number; fade: number }[], st: MapStep): void {
    const { ctx, geo } = this;
    const asks: (LabelAsk & { prio: number; fadeIn: number; fade: number; text: [string] | [string, string] })[] = [];
    for (const l of lit) {
      const pl = this.place.get(l.id)!;
      const text = nameLines(this.markName(l.id));
      const fs = l.isCur ? LABEL.cur : LABEL.other;
      const w = Math.max(
        this.textWidth(text[0], `${l.isCur ? 600 : 500} ${fs}px ${this.sans}`),
        text[1] ? this.textWidth(text[1], `500 ${LABEL.second}px ${this.sans}`) : 0,
      );
      const firstAt = this.first.get(l.id) ?? 0;
      const prio = l.isCur ? 1000 : st.from.includes(l.id) ? 900 : 100 + (this.count.get(l.id) ?? 1) * 4 - (this.cur - firstAt) * 0.05;
      asks.push({ id: l.id, x: l.q.x, y: l.q.y, w, lines: text.length, cur: l.isCur, side: pl.side, prio, fadeIn: l.fadeIn, fade: l.fade, text });
    }
    asks.sort((a, b) => b.prio - a.prio);
    const placed = placeLabels(asks, {
      w: geo.w,
      h: geo.h,
      obstacles: this.obstacles,
      dots: lit.map((l) => ({ id: l.id, x: l.q.x, y: l.q.y, r: l.isCur ? 16 : 5.5 })),
      mem: this.mem,
    });
    // A name that loses its room fades out in 150 ms riding with its mark,
    // rather than blinking; let go at once if that would carry it over an edge.
    const seq = this.lastDraw > 0 && t > this.lastDraw && t - this.lastDraw < 80;
    const step = seq && !this.reduced ? (t - this.lastDraw) / 150 : 1;
    ctx.lineJoin = "round";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.direction = "ltr";
    const seen = new Set<string>();
    for (const a of asks) {
      seen.add(a.id);
      const got = placed.get(a.id);
      const prev = this.labels.get(a.id);
      let v = got ? Math.min(1, (prev?.v ?? (seq ? 0 : 1)) + step) : Math.max(0, (prev?.v ?? 0) - step);
      let box: Box | null = got ? got.box : null;
      if (!got && prev?.box && prev.q && v > 0) {
        // Ride with the mark: the old box, moved as far as the mark has moved since.
        const o = prev.box;
        const b: Box = [o[0] + a.x - prev.q.x, o[1] + a.y - prev.q.y, o[2], o[3]];
        const off = b[0] < 6 || b[1] < 6 || b[0] + b[2] > geo.w - 6 || b[1] + b[3] > geo.h - 6;
        const under = this.obstacles.some((x) => b[0] < x[0] + x[2] && b[0] + b[2] > x[0] && b[1] < x[1] + x[3] && b[1] + b[3] > x[1]);
        if (off || under) v = 0;
        box = b;
      }
      this.labels.set(a.id, got ? { v, box: got.box, q: { x: a.x, y: a.y } } : { v, box: prev?.box ?? null, q: prev?.q ?? null });
      const op = a.fadeIn * a.fade * v * (a.cur ? 1 : 0.74);
      if (!box || op <= 0.01) continue;
      const fs = a.cur ? LABEL.cur : LABEL.other;
      const rise = (1 - a.fadeIn) * 4;
      ctx.globalAlpha = op;
      ctx.font = `${a.cur ? 600 : 500} ${fs}px ${this.sans}`;
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = INK;
      ctx.fillStyle = "#fff";
      const y = box[1] + fs * 0.93 + rise;
      ctx.strokeText(a.text[0], box[0], y);
      ctx.fillText(a.text[0], box[0], y);
      if (a.text[1]) {
        ctx.globalAlpha = op * 0.62;
        ctx.font = `500 ${LABEL.second}px ${this.sans}`;
        ctx.lineWidth = 3;
        ctx.strokeText(a.text[1], box[0], y + LABEL.secondGap);
        ctx.fillText(a.text[1], box[0], y + LABEL.secondGap);
      }
    }
    for (const id of [...this.labels.keys()]) if (!seen.has(id)) this.labels.delete(id);
  }

  /** The name a mark carries: the place of the latest thing lit there (Nicomedia until Nicaea's council). */
  private markName(id: string): string {
    if (this.names.cur !== this.cur) {
      const byMark = new Map<string, string>();
      for (let i = 0; i <= Math.min(this.cur, this.n - 1); i++) {
        const s = this.o.steps[i];
        if (!s.mark) continue;
        const pl = this.place.get(s.mark);
        if (pl) byMark.set(s.mark, s.at ?? pl.label ?? pl.place);
      }
      this.names = { cur: this.cur, byMark };
    }
    const pl = this.place.get(id)!;
    return this.names.byMark.get(id) ?? pl.label ?? pl.place;
  }

  /* ------------------------------------------------------------ drawing: the wheel and the ruler */

  private drawWheel(): void {
    const pos = this.pos;
    const lo = Math.max(0, Math.floor(pos) - 3);
    const hi = Math.min(this.n - 1, Math.ceil(pos) + 3);
    this.rows.forEach((r, i) => {
      if (i < lo || i > hi) {
        if (r.shown) {
          r.shown = false;
          r.el.style.visibility = "hidden";
          r.key = "";
        }
        return;
      }
      const d = i - pos;
      const ad = Math.abs(d);
      const near = c01(1 - ad);
      const op = ad < 1 ? 0.5 + 0.5 * near : Math.max(0, 0.5 - (ad - 1) * 0.17);
      const y = BAND_TOP + d * ROW;
      const yearPx = 15 + 6 * near;
      const namePx = 15 + 2.5 * near;
      const on = near > 0.5;
      const line = near > 0.2;
      const era = this.firstOfRun.has(i) && near < 0.5;
      const key = `${y.toFixed(1)}|${op.toFixed(3)}|${yearPx.toFixed(2)}|${namePx.toFixed(2)}|${on}|${line}|${near.toFixed(3)}|${era}`;
      if (key === r.key) return;
      r.key = key;
      if (!r.shown) {
        r.shown = true;
        r.el.style.visibility = "visible";
      }
      r.el.style.transform = `translateY(${y.toFixed(2)}px)`;
      r.el.style.opacity = op.toFixed(3);
      r.year.style.fontSize = `${yearPx.toFixed(2)}px`;
      r.name.style.fontSize = `${namePx.toFixed(2)}px`;
      if (on) r.el.dataset.on = "";
      else delete r.el.dataset.on;
      if (r.line) {
        if (line) {
          r.line.style.display = "block";
          r.line.style.opacity = near.toFixed(3);
        } else r.line.style.display = "none";
      }
      if (r.era) r.era.style.display = era ? "" : "none";
    });
  }

  private buildMini(): void {
    const svg = this.p.mini;
    // Its layout width (the head less the play button and the gap), not a
    // measure through the entrance's scale.
    const W = Math.max(40, (svg.parentElement?.clientWidth ?? 300) - this.p.play.offsetWidth - 14);
    this.miniW = W;
    svg.setAttribute("viewBox", `0 0 ${W.toFixed(1)} 44`);
    const n = this.n;
    const gap = 5;
    const sp = n > 1 ? (W - 8 - (this.runs.length - 1) * gap) / (n - 1) : 0;
    this.miniX = this.o.steps.map((_, i) => {
      const x = 4 + i * sp + this.runOf[i] * gap;
      return this.rtl ? W - x : x;
    });
    const ns = "http://www.w3.org/2000/svg";
    const line = (x1: number, y1: number, x2: number, y2: number, width: number) => {
      const el = document.createElementNS(ns, "line");
      el.setAttribute("x1", x1.toFixed(1));
      el.setAttribute("y1", String(y1));
      el.setAttribute("x2", x2.toFixed(1));
      el.setAttribute("y2", String(y2));
      el.setAttribute("stroke", "#fff");
      el.setAttribute("stroke-width", String(width));
      el.setAttribute("stroke-linecap", "round");
      return el;
    };
    svg.replaceChildren();
    this.miniRuns = this.runs.map((r) => {
      const a = this.miniX[r.a];
      const b = this.miniX[r.b];
      const el = line(Math.min(a, b) - 2, 25, Math.max(a, b) + 2, 25, 2);
      svg.appendChild(el);
      return el;
    });
    this.miniTeeth = this.o.steps.map((s, i) => {
      const el = line(this.miniX[i], s.council ? 15 : 18, this.miniX[i], 21.5, 1.1);
      svg.appendChild(el);
      return el;
    });
    this.miniBead = [8.5, 4.6].map((r, k) => {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("r", String(r));
      c.setAttribute("cy", "25");
      c.setAttribute("fill", "#fff");
      if (k === 0) c.setAttribute("opacity", "0.18");
      svg.appendChild(c);
      return c;
    });
  }

  private drawMini(): void {
    const pos = clamp(this.pos, 0, this.n - 1);
    const i = Math.max(0, Math.min(this.n - 2, Math.floor(pos)));
    const x = this.n > 1 ? lerp(this.miniX[i], this.miniX[i + 1], pos - i) : this.miniX[0] ?? 0;
    for (const c of this.miniBead) c.setAttribute("cx", x.toFixed(1));
    const litTo = Math.floor(pos + 0.01);
    if (litTo !== this.miniLit) {
      this.miniTeeth.forEach((el, k) => el.setAttribute("stroke-opacity", k <= litTo ? "0.7" : "0.25"));
      this.miniLit = litTo;
    }
    const run = this.runOf[Math.round(pos)] ?? 0;
    if (run !== this.miniRun) {
      this.miniRuns.forEach((el, k) => el.setAttribute("stroke-opacity", k === run ? "0.6" : "0.2"));
      this.miniRun = run;
    }
  }
}
