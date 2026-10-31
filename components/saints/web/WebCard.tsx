"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { lineStyle, type WebNode } from "@/lib/saints/webLayout";
import {
  advanceGlide,
  afterPull,
  fingerSpeed,
  glide,
  keepTrack,
  openOf,
  pullCard,
  type Glide,
  type Track,
} from "@/lib/saints/webMotion";
import { prefersReducedMotion } from "@/lib/ui/motion";

import { WebAvatar } from "./WebAvatar";
import { WebLineMark } from "./WebLineMark";
import { FILTER_LABEL, FILTER_LINE, kindsOf, tieHeading, tieHref } from "./webWords";

export type CardState = "short" | "tall" | "tucked";

/** The short card, as the design draws it: all of St John's web stays in view above it. */
export const SHORT_CARD_H = 78;

/**
 * Where the card is, as it moves: its height, how far it has dropped below
 * its place toward the handle, the height it pulls up to, whether a finger
 * has it, and whether it was simply put there (on its first paint, or out of
 * sight in its handle) rather than moved. Said on every frame it moves, so the
 * web goes with it.
 */
export type CardMove = { height: number; drop: number; tall: number; live: boolean; jump: boolean };

/** What the tall card leaves above it: the bar, and the saint it is about. */
const TOP_ROOM = 210;
/** Movement before a press becomes a pull. */
const PULL_SLOP = 6;
/** The fastest a finger hands the card to its spring, pixels a second. */
const MAX_THROW = 4000;

type Pull = {
  id: number;
  /** Where the finger pressed, and where the card began to follow it. */
  y0: number;
  yAt: number;
  dy: number;
  moved: boolean;
  from: "short" | "tall" | "handle";
  /** The card as the finger took it, perhaps halfway along its spring. */
  start: { height: number; drop: number };
  track: Track;
};

/**
 * The saint web's card (1.8, round 3, sheet r3-06, card A "the handle"; the
 * owner left the pick to the design job on 2026-10-30). His note 15 on build
 * 80: tapping a saint brought a card that covered almost half the screen; let
 * it shrink, short by default, the rest on a pull, better to look at.
 *
 * Short, it is 78px over the tab bar: the saint's icon, his name, his years,
 * and each kind that joins him beside the line the web draws for it. Tap it or
 * pull it up and it grows to the height of what it holds: every tie in full,
 * each heading a way on to where it is read, and the ways on to his page or
 * his own web. Pull it down and it is short again; pull the short card down,
 * or tap the empty web, and it tucks into a handle on the tab bar's edge,
 * which a tap or a pull brings back. While a finger moves a saint it ducks
 * into the handle by itself (`away`).
 *
 * The build 84 note 45 ("make sure it's very motiony"): the card is under the
 * finger the whole way. Pulled up it grows with the finger to its full height
 * and gives past it, its short face giving way to the tall one as it goes;
 * pulled down it comes with the finger. Let go, it settles on the middle
 * saint's spring (lib/saints/webMotion.ts) with the finger's speed, and a tap
 * moves it on the same spring. Each frame it says where it is (`onMove`), and
 * the web above goes with it. With Purify's motion off it is simply where it
 * goes.
 *
 * It stands over the foot of the screen and above whatever the foot already
 * holds, the mini player and Today's readings bar included
 * (--now-playing-h, --readings-flow-h; globals.css, "The saint web"). Solid,
 * never blurred: a blurred layer over a moving page is repainted on every
 * frame on Android.
 */
export function WebCard({
  node,
  state,
  away,
  onState,
  onMove,
}: {
  node: WebNode;
  state: CardState;
  /** Out of sight in its handle: tucked, or ducked while a saint is moved. */
  away: boolean;
  onState: (next: CardState) => void;
  /** Where the card is, on every frame it moves. */
  onMove?: (move: CardMove) => void;
}) {
  const { t } = useTranslate();
  const cardId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const tallRef = useRef<HTMLDivElement>(null);
  const shortRef = useRef<HTMLButtonElement>(null);
  const lessRef = useRef<HTMLButtonElement>(null);
  const pullRef = useRef<Pull | null>(null);
  const swallow = useRef(false);
  const focusNext = useRef<"tall" | "short" | null>(null);
  const [content, setContent] = useState(0);
  const [room, setRoom] = useState(0);

  const saint = node.kind === "saint";
  const name = saint ? node.person.name : node.name;
  const short = saint ? node.person.short : node.name;
  const years = saint ? node.person.years : String(node.year);
  const icon = saint ? node.person.icon : undefined;
  const kinds = kindsOf(node);
  const tall = state === "tall" && !away;
  const tallHeight = Math.max(SHORT_CARD_H, room ? Math.min(content, room) : content);

  /** Where the card is drawn, the height it pulls up to, and its spring after a finger. */
  const at = useRef({ height: SHORT_CARD_H, drop: 0 });
  const full = useRef(tallHeight);
  const spring = useRef<Glide | null>(null);
  const raf = useRef(0);
  const placed = useRef(false);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // What the card holds when it is pulled up, and how much of the screen it
  // may take. The observer's first word comes before the first paint.
  useLayoutEffect(() => {
    const body = tallRef.current;
    const card = cardRef.current;
    if (!body || !card) return;
    // Another saint's card opens at its top.
    body.scrollTop = 0;
    const measure = () => {
      setContent(Math.ceil(body.scrollHeight));
      const bottom = parseFloat(getComputedStyle(card).bottom) || 0;
      setRoom(Math.max(240, Math.round(window.innerHeight - bottom - TOP_ROOM)));
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (ro && body.firstElementChild) ro.observe(body.firstElementChild);
    const first = ro ? 0 : requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(first);
      window.removeEventListener("resize", measure);
    };
  }, [node.id]);

  /** The card where it is, painted straight onto it, and said to the web. */
  const draw = useCallback((height: number, drop: number, live: boolean, jump = false) => {
    at.current = { height, drop };
    const card = cardRef.current;
    if (card) {
      card.style.height = `${Math.round(height * 100) / 100}px`;
      if (Math.abs(drop) >= 0.01) card.style.setProperty("--saint-web-pull", `${Math.round(drop * 100) / 100}px`);
      else card.style.removeProperty("--saint-web-pull");
      // The short face gives way to the tall one as the card is pulled up (globals.css).
      card.style.setProperty("--saint-web-open", String(Math.round(openOf(height, SHORT_CARD_H, full.current) * 1000) / 1000));
    }
    onMoveRef.current?.({ height, drop, tall: full.current, live, jump });
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    spring.current = null;
    cardRef.current?.removeAttribute("data-moving");
  }, []);

  /** To a height on the spring, from where the card is, carrying on with a finger's speed. */
  const settleTo = useCallback(
    (height: number, speed?: { height: number; drop: number }) => {
      const there = Math.abs(at.current.height - height) < 0.25 && Math.abs(at.current.drop) < 0.25;
      const reduced = prefersReducedMotion();
      if (reduced || (!spring.current && !speed && there)) {
        stop();
        draw(height, 0, false, reduced);
        return;
      }
      // A spring already under way keeps its speed unless a finger gives it a new one.
      const was = spring.current;
      spring.current = glide(
        was ? was.p : { x: at.current.height, y: at.current.drop },
        { x: height, y: 0 },
        speed ? { x: speed.height, y: speed.drop } : (was?.v ?? { x: 0, y: 0 }),
      );
      cardRef.current?.setAttribute("data-moving", "");
      if (raf.current) return;
      let last = performance.now();
      const frame = (now: number) => {
        const s = spring.current;
        if (!s) {
          raf.current = 0;
          return;
        }
        const going = advanceGlide(s, Math.max(0, (now - last) / 1000));
        last = now;
        draw(s.p.x, s.p.y, false);
        if (going) raf.current = requestAnimationFrame(frame);
        else stop();
      };
      raf.current = requestAnimationFrame(frame);
    },
    [draw, stop],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Short, pulled up, or out of sight: the card goes there on its spring. On
  // its first paint, and out of sight, it is simply there.
  useLayoutEffect(() => {
    full.current = tallHeight;
    if (pullRef.current?.moved) return;
    const height = tall ? tallHeight : SHORT_CARD_H;
    if (!placed.current || away) {
      placed.current = true;
      stop();
      draw(height, 0, false, true);
      return;
    }
    settleTo(height);
  }, [tall, tallHeight, away, draw, settleTo, stop]);

  // A keyboard that opened or closed the card keeps its place on the control that closes or opens it.
  useEffect(() => {
    const want = focusNext.current;
    focusNext.current = null;
    if (want === "tall" && tall) lessRef.current?.focus();
    if (want === "short" && !tall && !away) shortRef.current?.focus();
  }, [tall, away]);

  function pullStart(from: Pull["from"], e: ReactPointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swallow.current = false;
    const track: Track = [];
    keepTrack(track, e.timeStamp, e.clientX, e.clientY);
    pullRef.current = { id: e.pointerId, y0: e.clientY, yAt: e.clientY, dy: 0, moved: false, from, start: { ...at.current }, track };
  }

  function pullMove(e: ReactPointerEvent<HTMLElement>) {
    const g = pullRef.current;
    if (!g || g.id !== e.pointerId) return;
    keepTrack(g.track, e.timeStamp, e.clientX, e.clientY);
    g.dy = e.clientY - g.y0;
    if (!g.moved) {
      if (Math.abs(g.dy) < PULL_SLOP) return;
      g.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
      if (g.from !== "handle") {
        // The finger takes the card where it is, even halfway along its spring, and it follows from here.
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        spring.current = null;
        g.start = { ...at.current };
        g.yAt = e.clientY;
        cardRef.current?.setAttribute("data-moving", "");
      }
    }
    if (g.from === "handle") return;
    const next = pullCard(g.start, e.clientY - g.yAt, SHORT_CARD_H, full.current, g.from === "short");
    draw(next.height, next.drop, true);
  }

  function pullEnd(e: ReactPointerEvent<HTMLElement>) {
    const g = pullRef.current;
    if (!g || g.id !== e.pointerId) return;
    pullRef.current = null;
    if (!g.moved) return;
    // The click that follows a pull is not a tap. It comes in the same task, if at all.
    swallow.current = true;
    setTimeout(() => {
      swallow.current = false;
    }, 0);
    const v = fingerSpeed(g.track, e.timeStamp);
    const next = e.type === "pointercancel" ? null : afterPull(g.from, g.dy, v.y / 1000);
    if (g.from === "handle") {
      if (next) onState(next);
      return;
    }
    if (next === "tucked") {
      // Its own slide carries it down from where the finger left it (globals.css, data-away).
      stop();
      onState("tucked");
      return;
    }
    const to = next ?? g.from;
    const speed = Math.max(-MAX_THROW, Math.min(MAX_THROW, v.y));
    settleTo(to === "tall" ? full.current : SHORT_CARD_H, { height: -speed, drop: at.current.drop > 0 ? speed : 0 });
    if (next) onState(next);
  }

  function tapped(e: ReactMouseEvent, next: CardState, focus?: "tall" | "short") {
    if (swallow.current) {
      swallow.current = false;
      return;
    }
    // detail 0: a key pressed it, not a finger.
    if (focus && e.detail === 0) focusNext.current = focus;
    onState(next);
  }

  return (
    <>
      <section
        ref={cardRef}
        id={cardId}
        data-saint-web-card
        data-state={tall ? "tall" : "short"}
        data-away={away ? "" : undefined}
        inert={away}
        aria-label={name}
        className="saint-web-sheet saint-web-card fixed inset-x-3 z-20 mx-auto max-w-[560px] overflow-hidden"
        style={{ height: SHORT_CARD_H }}
      >
        {icon ? <span aria-hidden className="saint-web-card-light" style={{ backgroundImage: `url(${icon})` }} /> : null}
        <span aria-hidden className="saint-web-grab" />

        {/* Short: one tap, or a pull up, and it grows; a pull down tucks it away. */}
        <button
          ref={shortRef}
          type="button"
          inert={tall}
          aria-expanded={false}
          aria-controls={cardId}
          onClick={(e) => tapped(e, "tall", "tall")}
          onPointerDown={(e) => pullStart("short", e)}
          onPointerMove={pullMove}
          onPointerUp={pullEnd}
          onPointerCancel={pullEnd}
          className="saint-web-card-short saint-web-pull absolute inset-x-0 top-0 flex h-[78px] items-center gap-3 pe-3 ps-3.5 pt-1 text-start"
        >
          <WebAvatar node={node} size={46} className="saint-web-card-face" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-[16.5px] font-bold leading-[1.25] text-paper">{name}</span>
            <span className="mt-[5px] block truncate font-sans text-[12px] font-medium leading-4 text-paper/60">
              {years ? <span>{years}</span> : null}
              {years && kinds.length ? <span aria-hidden className="mx-[7px] text-paper/30">·</span> : null}
              {kinds.map((k, i) => (
                <span key={k} className={cn("whitespace-nowrap", i > 0 && "ms-[9px]")}>
                  <WebLineMark line={FILTER_LINE[k]} className="me-[5px] text-paper/70" />
                  {t(FILTER_LABEL[k])}
                </span>
              ))}
            </span>
          </span>
          <span aria-hidden className="saint-web-roundel">
            <ChevronDown size={16} className="rotate-180" />
          </span>
        </button>

        {/* Pulled up: everything it holds, and the ways on. */}
        <div ref={tallRef} inert={!tall} className="saint-web-card-tall absolute inset-0 overflow-y-auto overscroll-contain">
          <div className="px-[18px] pb-4 pt-[22px]">
            <div
              onPointerDown={(e) => pullStart("tall", e)}
              onPointerMove={pullMove}
              onPointerUp={pullEnd}
              onPointerCancel={pullEnd}
              className="saint-web-pull flex items-center gap-[13px]"
            >
              <WebAvatar node={node} size={54} className="saint-web-card-face" />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[19px] font-bold leading-[1.22] text-paper">{name}</h2>
                {years ? <p className="mt-[5px] font-sans text-[12.5px] font-medium text-paper/60">{years}</p> : null}
              </div>
              <button
                ref={lessRef}
                type="button"
                aria-expanded={true}
                aria-controls={cardId}
                aria-label={name}
                onClick={(e) => tapped(e, "short", "short")}
                className="saint-web-roundel tap-press hit-44 self-start"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              {node.ties.map((tie, i) => {
                const heading = tieHeading(tie, t);
                const href = tieHref(tie);
                const head = (
                  <>
                    <WebLineMark line={lineStyle(tie.kind)} className="mt-[5px] text-paper/70" />
                    <span className="min-w-0">{heading}</span>
                  </>
                );
                return (
                  <div key={i}>
                    {heading ? (
                      href ? (
                        <Link
                          href={href}
                          prefetch={false}
                          className="flex items-start gap-2 font-sans text-[12.5px] font-semibold leading-4 text-paper/60 underline-offset-4 hover:text-paper hover:underline"
                        >
                          {head}
                          <ChevronRight size={11} className="mt-0.5 shrink-0 text-paper/35 rtl:-scale-x-100" />
                        </Link>
                      ) : (
                        <p className="flex items-start gap-2 font-sans text-[12.5px] font-semibold leading-4 text-paper/60">{head}</p>
                      )
                    ) : null}
                    <p
                      className={cn(
                        "mt-[5px] text-paper/85",
                        tie.kind === "life" ? "font-serif text-[15px] italic leading-[1.46]" : "font-sans text-[14.5px] leading-[1.45]",
                      )}
                    >
                      {tie.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-[18px] flex gap-2.5">
              {saint ? (
                <>
                  <Link
                    href={`/saints/${node.person.slug}`}
                    className="saint-web-way-lit tap-press grid min-h-11 flex-1 place-items-center rounded-pill bg-paper px-3 text-center font-sans text-ui font-semibold text-night"
                  >
                    {t(node.person.pronoun === "her" ? "saints.web.openHerPage" : "saints.web.openHisPage")}
                  </Link>
                  <Link
                    href={`/saints/${node.person.slug}/web`}
                    className="tap-press grid min-h-11 flex-1 place-items-center rounded-pill border border-paper/25 bg-paper/[0.03] px-3 text-center font-sans text-ui font-semibold text-paper"
                  >
                    {t("saints.web.center")}
                  </Link>
                </>
              ) : (
                <Link
                  href={`/councils/${node.slug}`}
                  className="saint-web-way-lit tap-press grid min-h-11 flex-1 place-items-center rounded-pill bg-paper px-3 text-center font-sans text-ui font-semibold text-night"
                >
                  {t("saints.web.openCouncil")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tucked: a handle on the tab bar's edge, the saint still named on it. */}
      <button
        type="button"
        data-saint-web-handle
        data-shown={away ? "" : undefined}
        inert={!away}
        aria-expanded={false}
        aria-controls={cardId}
        onClick={(e) => tapped(e, "short")}
        onPointerDown={(e) => pullStart("handle", e)}
        onPointerMove={pullMove}
        onPointerUp={pullEnd}
        onPointerCancel={pullEnd}
        className="saint-web-handle saint-web-pull fixed left-1/2 z-20 flex h-10 max-w-[calc(100vw-24px)] items-center gap-2 rounded-t-[14px] pb-3 pe-3 ps-[7px] pt-1.5"
      >
        <span aria-hidden className="saint-web-grab saint-web-grab-small" />
        <WebAvatar node={node} size={18} className="saint-web-handle-face" />
        <span className="min-w-0 truncate font-sans text-[12.5px] font-semibold text-paper">{short}</span>
        <ChevronDown size={14} className="shrink-0 rotate-180 text-paper/50" />
      </button>
    </>
  );
}
