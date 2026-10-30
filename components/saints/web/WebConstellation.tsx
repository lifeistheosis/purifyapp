"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import {
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
  advance,
  grab,
  keepPlaces,
  letGo,
  moved,
  pull,
  putBack,
  restorePlaces,
  settle,
  threadPath,
  threadThinning,
  webMotion,
  type WebMotion,
  type WebPlaces,
} from "@/lib/saints/webMotion";
import { haptic, prefersReducedMotion, scrollBehavior } from "@/lib/ui/motion";

import { WebAvatar } from "./WebAvatar";
import { SHORT_CARD_H, WebCard, type CardState } from "./WebCard";
import { WebKey } from "./WebKey";
import { kindCounts, tagOf } from "./webWords";

/** Legible over the lines and the icon's light, in the page's own ground. */
const LABEL_SHADOW = "[text-shadow:0_1px_6px_var(--color-night),0_0_2px_var(--color-night)]";

/** How far a finger moves on a saint before it is moving him, not tapping him. */
const DRAG_SLOP = 6;

/** What the screen keeps of the web while the reader stays on it (SaintWebScreen). */
export type WebKept = { places?: WebPlaces; selectedId?: string };

type Drag = { node: number; id: number; x0: number; y0: number; from: { x: number; y: number }; moving: boolean };

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
 *    chosen as the screen arrives. Pulled up, the web scrolls so the saint sits
 *    just above the card, the rest stepped back.
 *  - A saint can be moved, and the web holds together (lib/saints/webMotion.ts):
 *    his line stretches like a thread, the saint it runs to follows a little,
 *    the others make room; let go, he stays where he was put and they settle
 *    round him, the saint in the middle back home. While a finger moves a
 *    saint the card ducks into its handle. Put back returns the web to its own
 *    places. The places are kept while the reader stays on the page (the
 *    Timeline and back), and a new visit starts from the web's own.
 *
 * Positions are painted straight onto the elements, never through React
 * state, so a drag re-renders nothing. With Purify's motion off a drag still
 * moves the saint, and everything else is simply where it settles.
 *
 * Places come from lib/saints/webLayout.ts, held there by a test so no two
 * saints' names touch: a share of the width across, pixels down.
 */
export function WebConstellation({
  data,
  kept,
  onKeep,
}: {
  data: SaintWebData;
  /** The web as the reader left it on this visit, coming back from the Timeline. */
  kept?: WebKept;
  onKeep?: (next: WebKept) => void;
}) {
  const { t } = useTranslate();
  const { center, nodes } = data;
  const layout = useMemo(() => webLayout(nodes.length), [nodes.length]);
  const filters = useMemo(() => webFilters(nodes), [nodes]);
  const counts = useMemo(() => kindCounts(nodes), [nodes]);
  // The node each line runs to: the council a father sat at, else the saint in the middle (-1).
  const parents = useMemo(
    () =>
      nodes.map((node) => {
        const via = primaryTie(node).via;
        return via ? nodes.findIndex((n) => n.id === via) : -1;
      }),
    [nodes],
  );
  const [first] = useState(kept);
  const [filter, setFilter] = useState<WebFilter | "all">("all");
  const [selectedId, setSelectedId] = useState(() =>
    first?.selectedId && nodes.some((n) => n.id === first.selectedId) ? first.selectedId : (nodes[0]?.id ?? ""),
  );
  const [card, setCard] = useState<CardState>("short");
  const [dragging, setDragging] = useState(false);
  const [shifted, setShifted] = useState(() => Boolean(first?.places?.anchor.some(Boolean)));
  const [tallHeight, setTallHeight] = useState(0);

  const lit = (node: WebNode) => filter === "all" || filtersOf(node).has(filter);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const tall = card === "tall" && !dragging;

  const canvasRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<(HTMLButtonElement | null)[]>([]);
  const lineEls = useRef<(SVGPathElement | null)[]>([]);
  const motion = useRef<WebMotion | null>(null);
  /** Canvas pixels to one of the web's units across (its 390). */
  const scale = useRef(1);
  const raf = useRef(0);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const onKeepRef = useRef(onKeep);
  useEffect(() => {
    onKeepRef.current = onKeep;
  }, [onKeep]);

  /** Every saint and thread where the springs have them. */
  const paint = useCallback(() => {
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
    onKeepRef.current?.({ places: keepPlaces(m) });
  }, []);

  /** Step the springs on animation frames until everything is still. */
  const run = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const frame = (now: number) => {
      const m = motion.current;
      if (!m) {
        raf.current = 0;
        return;
      }
      const going = advance(m, Math.max(0, (now - last) / 1000));
      last = now;
      paint();
      if (going || m.held >= 0) {
        raf.current = requestAnimationFrame(frame);
      } else {
        raf.current = 0;
        keepNow(m);
      }
    };
    raf.current = requestAnimationFrame(frame);
  }, [paint, keepNow]);

  // The web's springs, at its own places or as the reader left it on this visit.
  useLayoutEffect(() => {
    const m = webMotion(layout, parents);
    if (first?.places) {
      restorePlaces(m, first.places);
      settle(m);
    }
    motion.current = m;
    paint();
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      motion.current = null;
    };
  }, [layout, parents, first, paint]);

  // How wide the canvas is drawn: a unit across is a share of it.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      scale.current = (canvas.clientWidth || WEB_WIDTH) / WEB_WIDTH;
      paint();
    };
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(canvas);
    return () => ro?.disconnect();
  }, [paint]);

  // React redraws only what it owns; the places are painted again after it.
  useLayoutEffect(() => {
    paint();
  });

  useEffect(() => {
    onKeepRef.current?.({ selectedId });
  }, [selectedId]);

  // A tap on the empty web tucks the card away (or, pulled up, brings it down).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => {
      if (e.target !== canvas) return;
      setCard((c) => (c === "tall" ? "short" : "tucked"));
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, []);

  // Pulled up, the web scrolls so the saint sits just above the card, clear of the bar.
  useEffect(() => {
    if (!tall || !tallHeight) return;
    const el = nodeEls.current[nodes.findIndex((n) => n.id === selectedId)];
    const cardEl = document.querySelector<HTMLElement>("[data-saint-web-card]");
    if (!el || !cardEl) return;
    const cardTop = window.innerHeight - (parseFloat(getComputedStyle(cardEl).bottom) || 0) - tallHeight;
    const bar = document.querySelector("[data-mobile-topbar]")?.getBoundingClientRect().bottom ?? 0;
    const box = el.getBoundingClientRect();
    let by = 0;
    if (box.bottom > cardTop - 14) by = box.bottom - (cardTop - 14);
    else if (box.top < bar + 10) by = box.top - (bar + 10);
    if (Math.abs(by) > 1) window.scrollBy({ top: by, behavior: scrollBehavior() });
  }, [tall, selectedId, tallHeight, nodes]);

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

  function onNodeDown(i: number, e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // A finger moves a saint from his circle; on his name it scrolls the page.
    if (e.pointerType === "touch" && !(e.target as Element).closest("[data-web-grip]")) return;
    const m = motion.current;
    if (!m) return;
    swallowClick.current = false;
    drag.current = { node: i, id: e.pointerId, x0: e.clientX, y0: e.clientY, from: { ...m.p[i + 1] }, moving: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
  }

  function onNodeMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    const m = motion.current;
    if (!g || !m || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.moving) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      g.moving = true;
      m.exact = prefersReducedMotion();
      grab(m, g.node + 1);
      nodeEls.current[g.node]?.setAttribute("data-held", "");
      setSelectedId(nodes[g.node].id);
      setDragging(true);
      setCard((c) => (c === "tall" ? "short" : c));
      haptic("light");
    }
    pull(m, { x: g.from.x + dx / scale.current, y: g.from.y + dy });
    if (m.exact) {
      settle(m);
      paint();
    } else {
      run();
    }
  }

  function onNodeUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    drag.current = null;
    const m = motion.current;
    if (!g.moving || !m) return;
    // The click that ends a move is not a tap. It comes in the same task, if at all.
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
    nodeEls.current[g.node]?.removeAttribute("data-held");
    letGo(m);
    setDragging(false);
    setShifted(moved(m));
    if (m.exact) {
      settle(m);
      m.exact = false;
      paint();
    } else {
      run();
    }
    // Kept at once, so the Timeline and back finds him even before the web is still.
    keepNow(m);
  }

  function onPutBack() {
    const m = motion.current;
    if (!m) return;
    putBack(m);
    setShifted(false);
    if (prefersReducedMotion()) {
      settle(m);
      paint();
    } else {
      run();
    }
    keepNow(m);
  }

  const putBackShown = shifted && !dragging && !tall;

  return (
    <div
      className="saint-web-room"
      style={{ "--saint-web-card-h": `${tall && tallHeight ? tallHeight : SHORT_CARD_H}px` } as CSSProperties}
    >
      {filters.length ? <WebKey filters={filters} filter={filter} counts={counts} onPick={pick} /> : null}

      {/* The light reaches past the screen's sides and is cut there, never the page made wider. */}
      <div className="-mx-5 overflow-x-clip px-5 md:mx-0 md:px-0">
        <div
          ref={canvasRef}
          data-saint-web-canvas
          className="relative mx-auto mt-2 w-full max-w-[560px]"
          style={{ height: layout.height }}
        >
          {/* The icon's own light behind him: the one warmth the design allows. */}
          {center.icon ? (
            <div
              ref={lightRef}
              aria-hidden
              className="pointer-events-none absolute left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-cover bg-center opacity-30 blur-[52px]"
              style={{ top: layout.center.y - 230, backgroundImage: `url(${center.icon})` }}
            />
          ) : null}

          <svg
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

          {/* The saint in the middle: pinned, he follows a pull a little and is always home after. */}
          <div
            ref={centerRef}
            className="absolute flex w-[180px] -translate-x-1/2 flex-col items-center"
            style={{ left: "50%", top: layout.center.y - CENTER_SIZE / 2 }}
          >
            <span className="rounded-full shadow-[0_0_0_4px_var(--color-night),0_0_0_5.5px_color-mix(in_srgb,var(--color-paper)_55%,transparent),0_14px_40px_rgb(0_0_0/0.55)]">
              <WebAvatar node={{ kind: "saint", id: "center", person: center, ties: [] }} size={CENTER_SIZE} />
            </span>
            <span className={cn("mt-2.5 line-clamp-2 text-center font-serif text-[16px] font-bold leading-[1.2] text-paper", LABEL_SHADOW)}>
              {center.short}
            </span>
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
                aria-pressed={on}
                aria-label={tag ? `${name}, ${tag}` : name}
                onClick={() => {
                  if (swallowClick.current) {
                    swallowClick.current = false;
                    return;
                  }
                  choose(node.id);
                }}
                onPointerDown={(e) => onNodeDown(i, e)}
                onPointerMove={onNodeMove}
                onPointerUp={onNodeUp}
                onPointerCancel={onNodeUp}
                className={cn(
                  "saint-web-node tap-press absolute flex w-[25.6%] -translate-x-1/2 flex-col items-center rounded-[14px] text-center",
                  !lit(node) ? "opacity-25" : tall && !on ? "opacity-30" : "opacity-100",
                )}
                style={{ left: across(p.x), top: p.y - NODE_SIZE / 2 }}
              >
                <span
                  data-web-grip
                  className={cn("saint-web-ring rounded-full", node.kind === "council" && "rounded-[13px]", on && "saint-web-ring-on")}
                >
                  <WebAvatar node={node} size={NODE_SIZE} />
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 line-clamp-2 font-sans text-[11.5px] font-semibold leading-[1.22]",
                    node.kind === "saint" && !node.person.icon ? "text-paper/75" : "text-paper/95",
                    LABEL_SHADOW,
                  )}
                >
                  {name}
                </span>
                {tag ? (
                  <span aria-hidden className={cn("mt-0.5 max-w-full truncate font-sans text-[10.5px] text-paper/50", LABEL_SHADOW)}>
                    {tag}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Who is chosen, said once, without reading the whole card again. */}
      <p className="sr-only" aria-live="polite">
        {selected ? (selected.kind === "saint" ? selected.person.name : selected.name) : ""}
      </p>

      {selected ? (
        <WebCard
          node={selected}
          state={card}
          away={card === "tucked" || dragging}
          onState={setCard}
          onTallHeight={setTallHeight}
        />
      ) : null}

      {/* The way back to the web's own places, once a saint has been moved. */}
      <button
        type="button"
        data-shown={putBackShown ? "" : undefined}
        data-low={card === "tucked" ? "" : undefined}
        inert={!putBackShown}
        onClick={onPutBack}
        className="saint-web-putback tap-press fixed z-20 flex h-9 items-center gap-[7px] rounded-pill pe-3.5 ps-3 font-sans text-[13px] font-semibold text-paper"
      >
        <PutBackMark />
        {t("saints.web.putBack")}
      </button>
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
