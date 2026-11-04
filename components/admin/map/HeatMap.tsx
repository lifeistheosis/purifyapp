"use client";

/**
 * The heat map: where readers are, as a map you can open.
 *
 * The owner's pick on sheet r3-15 (2026-10-30), Traffic A with C's zoom:
 * "Traffic looks insane, brother. Okay. Do A, but allow you to zoom in like
 * how C's mobile has it. So zoom into a specific country." And his note 31 in
 * r18/BUILD-80-NOTES.md: "The live map becomes a heat map you can open."
 *
 *   - each country filled by its visits in the period, in five rising steps,
 *     the most visited lit (white with a soft glow; the ink in Light)
 *   - the readers on the site now as lit points
 *   - a card with all of a country's numbers: at the pointer with a mouse,
 *     pinned by a click, and as a sheet above the phone's bar on a tap
 *   - a click (or Open its regions on the card) zooms into the country and
 *     its regions, as C's phone does: the way back to the world at the top,
 *     the regions as rows under the map. The United States' states are drawn
 *     (their shapes came with the sheet); a country whose regions are not
 *     drawn yet shows its card, and its top regions on it, until they are.
 *
 * It replaces components/admin/WorldMap.tsx, which fetched a topojson from a
 * CDN on every open. The shapes here are two small static files in the build
 * (lib/admin/map/world.json and us.json), loaded when a map is first drawn,
 * so nothing is fetched from anyone else at run time.
 *
 * The map is pointer-only by nature. Every country and region on it is also a
 * row in the list beside or under it, and the rows are the way in for a
 * keyboard and a screen reader (they open the same card through `chosen`).
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { heatStep, heatThresholds } from "@/lib/admin/map/heat";
import { projectUs, projectWorld, US_VIEW, WORLD_VIEW } from "@/lib/admin/map/projection";
import { countsLine, sameRegion, type Place } from "@/lib/admin/map/tally";

import { Chevron, Figure, LiveDot } from "../daily/parts";

type Shape = { key: string; name: string; d: string; c: [number, number] };
// As the JSON reads: a centre is two numbers, typed as a list by the import.
type WorldFile = { countries: { a2: string; name: string; d: string; c: number[] }[] };
type RegionsFile = { regions: { name: string; d: string; c: number[] }[] };

/** The countries whose regions are drawn, and where their shapes are. Add one here when its shapes are added. */
export const REGION_SHAPES: Record<string, () => Promise<RegionsFile>> = {
  US: () => import("@/lib/admin/map/us.json").then((m) => m.default as RegionsFile),
};

/** Whether a country opens into its drawn regions. */
export const opensRegions = (code: string): boolean => Object.prototype.hasOwnProperty.call(REGION_SHAPES, code);

export type LivePoint = { id: string; lat: number | null; lng: number | null; code: string | null; region: string | null };

let worldCache: Shape[] | null = null;
const regionCache = new Map<string, Shape[]>();

function useWorld(): Shape[] | null {
  const [shapes, setShapes] = useState<Shape[] | null>(worldCache);
  useEffect(() => {
    if (worldCache) return;
    let alive = true;
    void import("@/lib/admin/map/world.json").then((m) => {
      const file = m.default as WorldFile;
      worldCache = file.countries.map((c): Shape => ({ key: c.a2, name: c.name, d: c.d, c: [c.c[0], c.c[1]] }));
      if (alive) setShapes(worldCache);
    });
    return () => {
      alive = false;
    };
  }, []);
  return shapes;
}

function useRegions(code: string | null): Shape[] | null {
  const [got, setGot] = useState<{ code: string; shapes: Shape[] } | null>(null);
  useEffect(() => {
    if (!code || !opensRegions(code) || regionCache.has(code)) return;
    let alive = true;
    void REGION_SHAPES[code]().then((file) => {
      const shapes = file.regions.map((r): Shape => ({ key: r.name, name: r.name, d: r.d, c: [r.c[0], r.c[1]] }));
      regionCache.set(code, shapes);
      if (alive) setGot({ code, shapes });
    });
    return () => {
      alive = false;
    };
  }, [code]);
  if (!code) return null;
  return regionCache.get(code) ?? (got?.code === code ? got.shapes : null);
}

/** The steps' legend: five swatches with their thresholds, then the lit point. */
export function HeatLegend({ thresholds, head = "Visits" }: { thresholds: readonly number[]; head?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
      <span>{head}</span>
      <div className="flex items-start gap-[3px]" aria-hidden>
        {thresholds.map((t, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <i className="adm-map-swatch block h-[9px] w-[26px] rounded-[2px]" data-step={i + 1} />
            <em className="font-mono text-[9.5px] not-italic">{t.toLocaleString("en-US")}+</em>
          </div>
        ))}
      </div>
      <span className="flex items-center gap-1.5">
        <LiveDot />
        on the site now
      </span>
    </div>
  );
}

/** The card's figures and lists, the same at the pointer, pinned, and in the phone's sheet. */
function CardBody({
  place,
  total,
  live,
  periodWord,
  placesWord,
}: {
  place: Place | null;
  total: number;
  live: number;
  periodWord: string;
  placesWord: string;
}) {
  const visits = place?.visits ?? 0;
  const share = total > 0 && visits > 0 ? Math.max(1, Math.round((visits / total) * 100)) : 0;
  return (
    <>
      <div className="mt-1.5 flex gap-5">
        <div>
          <Figure size={21}>{visits.toLocaleString("en-US")}</Figure>
          <p className="mt-1 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {visits === 0 ? `no visits ${periodWord}` : `visits, ${share}% of all`}
          </p>
        </div>
        <div>
          <Figure size={21} lit={live > 0}>
            {live.toLocaleString("en-US")}
          </Figure>
          <p className="mt-1 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            on the site now
          </p>
        </div>
      </div>
      {place && place.visits > 0 ? (
        <dl className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          {place.places.length > 0 ? (
            <>
              <dt className="mt-2 text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                {placesWord}
              </dt>
              <dd>{countsLine(place.places)}</dd>
            </>
          ) : null}
          <dt className="mt-2 text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
            Arrived from
          </dt>
          <dd>{countsLine(place.from)}</dd>
          <dt className="mt-2 text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
            Read on
          </dt>
          <dd>{countsLine(place.on)}</dd>
        </dl>
      ) : null}
    </>
  );
}

type Box = { x: number; y: number; w: number };

export type HeatMapProps = {
  /** Visits by country in the period, or null while they are read. */
  countries: Place[] | null;
  /** Every visit in the period, for the shares. */
  total: number;
  /** The readers on the site now. */
  live: LivePoint[];
  /** "today", "in 7 days": what the period is called on the card. */
  periodWord: string;
  /** The country opened, or null for the world. */
  zoom: string | null;
  onZoom: (code: string | null) => void;
  /** The opened country's regions, or null while they are read. */
  regions: Place[] | null;
  /** Visits in the opened country. */
  zoomTotal: number;
  /** The country or region whose card is open, from a tap or from a row of the list. */
  chosen: string | null;
  onChoose: (key: string | null) => void;
  /** A tap on a reader's point opens that reader (Traffic's Live view); without it the points are only drawn. */
  onLive?: (id: string) => void;
};

/**
 * Where the most readers are close together, in the map's own units: the
 * point with the most others within `reach`. The first press of Zoom in goes
 * there rather than to the middle of the world, which is the Atlantic.
 */
export function busiestSpot(points: readonly { x: number; y: number }[], reach: number): [number, number] | null {
  let best: { x: number; y: number; n: number } | null = null;
  for (const p of points) {
    const near = points.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) <= reach);
    if (!best || near.length > best.n) {
      best = { x: near.reduce((a, q) => a + q.x, 0) / near.length, y: near.reduce((a, q) => a + q.y, 0) / near.length, n: near.length };
    }
  }
  return best ? [best.x, best.y] : null;
}

/** The deepest the map zooms: a twelfth of the world across. */
const MAX_ZOOM = 12;
type ViewBox = [number, number, number, number];

export function HeatMap({ countries, total, live, periodWord, zoom, onZoom, regions, zoomTotal, chosen, onChoose, onLive }: HeatMapProps) {
  const world = useWorld();
  const regionShapes = useRegions(zoom);
  const [hover, setHover] = useState<(Box & { key: string }) | null>(null);
  // How the last press came: a finger opens the card, a mouse click opens the
  // regions. Written and read only in event handlers.
  const lastPointer = useRef<string>("mouse");

  const byCode = useMemo(() => new Map((countries ?? []).map((c) => [c.key, c])), [countries]);
  const liveByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of live) if (p.code) m.set(p.code.toUpperCase(), (m.get(p.code.toUpperCase()) ?? 0) + 1);
    return m;
  }, [live]);

  const zoomed = zoom !== null;
  const drawn = zoomed && regionShapes !== null;
  const view = drawn ? US_VIEW : WORLD_VIEW;
  const shapes: Shape[] | null = drawn ? regionShapes : world;

  // ZOOM AND PAN (the owner, 2026-11-04: "allow me to zoom in the map ... the
  // dots are massive because it's so zoomed out"). The map's own view is the
  // whole world (or the opened country); this is the part of it on screen.
  // Buttons, a double tap, two fingers, Ctrl or Cmd with the wheel, and a drag
  // once zoomed in. The points keep one small size at every zoom, so the
  // closer he goes the cleaner they read. Kept per view: opening a country or
  // going back to the world starts that view whole.
  const viewKey = drawn ? `r:${zoom}` : "world";
  const [zb, setZb] = useState<{ key: string; box: ViewBox } | null>(null);
  const vb: ViewBox = zb && zb.key === viewKey ? zb.box : [0, 0, view[0], view[1]];
  const scale = view[0] / vb[2];
  const clampBox = (b: ViewBox): ViewBox => {
    const w = Math.min(view[0], Math.max(view[0] / MAX_ZOOM, b[2]));
    const h = (w * view[1]) / view[0];
    return [Math.min(view[0] - w, Math.max(0, b[0])), Math.min(view[1] - h, Math.max(0, b[1])), w, h];
  };
  const zoomAt = (factor: number, cx: number, cy: number) => {
    setZb({ key: viewKey, box: clampBox([cx - (cx - vb[0]) / factor, cy - (cy - vb[1]) / factor, vb[2] / factor, vb[3] / factor]) });
  };
  // A button press puts its point in the middle of the frame; a wheel, a
  // pinch or a double tap keeps the point under the finger where it is.
  const centerOn = (factor: number, cx: number, cy: number) => {
    const w = vb[2] / factor;
    const h = vb[3] / factor;
    setZb({ key: viewKey, box: clampBox([cx - w / 2, cy - h / 2, w, h]) });
  };
  const frame = useRef<HTMLDivElement | null>(null);
  const toView = (clientX: number, clientY: number): [number, number] => {
    const r = frame.current?.getBoundingClientRect();
    if (!r || r.width === 0) return [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2];
    return [vb[0] + ((clientX - r.left) / r.width) * vb[2], vb[1] + ((clientY - r.top) / r.height) * vb[3]];
  };
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const dragged = useRef(false);
  const lastTap = useRef(0);
  // Ctrl or Cmd with the wheel zooms, as a map does; the wheel alone still
  // scrolls the page. A native listener, because React's wheel is passive.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const [cx, cy] = toView(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, cx, cy);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  const onFramePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
    dragged.current = false;
    if (e.pointerType !== "mouse") {
      const now = Date.now();
      if (now - lastTap.current < 300 && fingers.current.size === 1) {
        const [cx, cy] = toView(e.clientX, e.clientY);
        zoomAt(2, cx, cy);
        dragged.current = true;
        lastTap.current = 0;
      } else lastTap.current = now;
    }
  };
  const onFramePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = fingers.current.get(e.pointerId);
    if (!prev) return;
    const r = frame.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    if (fingers.current.size >= 2) {
      const pts = [...fingers.current.values()];
      const other = pts.find((p) => p !== prev) ?? prev;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (before > 10) {
        const [cx, cy] = toView((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
        zoomAt(after / before, cx, cy);
      }
      dragged.current = true;
      return;
    }
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current += Math.abs(dx) + Math.abs(dy);
    if (scale > 1.001 && moved.current > 4) {
      dragged.current = true;
      setZb({ key: viewKey, box: clampBox([vb[0] - (dx / r.width) * vb[2], vb[1] - (dy / r.height) * vb[3], vb[2], vb[3]]) });
    }
  };
  const onFramePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    fingers.current.delete(e.pointerId);
  };
  const zoomButton = (word: string, onClick: () => void, path: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={word}
      title={word}
      className="hit-44 grid h-8 w-8 place-items-center rounded-[8px] border"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)", boxShadow: "var(--adm-shadow-pop)" }}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d={path} />
      </svg>
    </button>
  );
  const at = (x: number, y: number) => ({ left: ((x - vb[0]) / vb[2]) * 100, top: ((y - vb[1]) / vb[3]) * 100 });

  const regionOf = (shapeName: string): Place | null => (regions ?? []).find((r) => sameRegion(r.key, shapeName)) ?? null;
  const values: number[] = drawn ? (regions ?? []).map((r) => r.visits) : (countries ?? []).map((c) => c.visits);
  const thresholds = heatThresholds(Math.max(0, ...values));
  const visitsOf = (key: string) => (drawn ? (regionOf(key)?.visits ?? 0) : (byCode.get(key)?.visits ?? 0));

  const points = live
    .map((p) => {
      if (p.lat === null || p.lng === null) return null;
      if (zoomed) {
        if (!drawn || (p.code ?? "").toUpperCase() !== zoom) return null;
        const xy = zoom === "US" ? projectUs(p.lng, p.lat) : null;
        return xy ? { id: p.id, x: xy[0], y: xy[1] } : null;
      }
      const xy = projectWorld(p.lng, p.lat);
      return xy ? { id: p.id, x: xy[0], y: xy[1] } : null;
    })
    .filter((p): p is { id: string; x: number; y: number } => p !== null);

  const label = drawn
    ? `Visits by region in ${byCode.get(zoom!)?.name ?? zoom}, ${periodWord}: ${(regions ?? [])
        .slice(0, 8)
        .map((r) => `${r.name} ${r.visits}`)
        .join(", ")}`
    : `Visits by country, ${periodWord}: ${(countries ?? [])
        .slice(0, 8)
        .map((c) => `${c.name} ${c.visits}`)
        .join(", ")}`;

  const nameOfKey = (key: string) => (drawn ? key : (byCode.get(key)?.name ?? world?.find((s) => s.key === key)?.name ?? key));
  const placeOf = (key: string): Place | null => (drawn ? regionOf(key) : (byCode.get(key) ?? null));
  const liveOf = (key: string) =>
    drawn
      ? live.filter((p) => (p.code ?? "").toUpperCase() === zoom && p.region && sameRegion(p.region, key)).length
      : (liveByCode.get(key) ?? 0);
  const zoomableKey = (key: string) => !zoomed && opensRegions(key);

  const boxOf = (e: { currentTarget: Element; clientX: number; clientY: number }): Box => {
    const svg = e.currentTarget.closest("svg");
    const r = (svg ?? e.currentTarget).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
  };

  function press(key: string) {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    const touch = lastPointer.current === "touch" || lastPointer.current === "pen";
    if (!touch && zoomableKey(key)) {
      setHover(null);
      onChoose(null);
      onZoom(key);
      return;
    }
    setHover(null);
    onChoose(key);
  }

  const outlined = hover?.key ?? chosen;
  const pinnedAt = (() => {
    if (!chosen || !shapes) return null;
    const s = shapes.find((x) => x.key === chosen);
    return s ? at(s.c[0], s.c[1]) : null;
  })();

  const cardTitle = (key: string) => (
    <p className="flex items-center gap-2 font-sans text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
      {nameOfKey(key)}
      <span className="ml-auto font-sans text-[11px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
        {periodWord}
      </span>
    </p>
  );
  const body = (key: string) => (
    <CardBody
      place={placeOf(key)}
      total={drawn ? zoomTotal : total}
      live={liveOf(key)}
      periodWord={periodWord}
      placesWord={drawn ? "Top cities" : "Top regions"}
    />
  );
  const openRegions = (key: string) => (
    <button
      type="button"
      onClick={() => {
        onChoose(null);
        onZoom(key);
      }}
      className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[8px] font-sans text-[13.5px] font-semibold"
      style={{ background: "var(--adm-accent)", color: "var(--adm-on-accent)", boxShadow: "var(--adm-lit)" }}
    >
      Open its regions
      <Chevron size={13} />
    </button>
  );
  const closeButton = (
    <button
      type="button"
      onClick={() => onChoose(null)}
      aria-label="Close the card"
      className="grid min-h-11 min-w-11 place-items-center rounded-full"
      style={{ color: "var(--adm-ink-2)" }}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
      </svg>
    </button>
  );

  return (
    <div className="relative">
      {zoomed ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 font-sans text-[12px]">
          <button
            type="button"
            onClick={() => {
              setHover(null);
              onChoose(null);
              onZoom(null);
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-[6px] pr-1"
            style={{ color: "var(--adm-ink-2)" }}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 4.5 6.5 10l5.5 5.5" />
            </svg>
            World
          </button>
          <span aria-hidden style={{ color: "var(--adm-ink-3)" }}>
            /
          </span>
          <span style={{ color: "var(--adm-ink)" }}>
            {byCode.get(zoom!)?.name ?? zoom}, {zoomTotal.toLocaleString("en-US")} {zoomTotal === 1 ? "visit" : "visits"}
          </span>
        </div>
      ) : null}

      {zoomed && !opensRegions(zoom!) ? (
        <p className="py-6 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Its regions are not drawn on the map yet, so they are listed below.
        </p>
      ) : !shapes ? (
        <div className="adm-skeleton w-full rounded-[6px]" style={{ aspectRatio: `${view[0]} / ${view[1]}` }} aria-hidden />
      ) : (
        <div
          ref={frame}
          className="relative select-none"
          style={{ aspectRatio: `${view[0]} / ${view[1]}`, touchAction: scale > 1.001 ? "none" : "pan-y" }}
          onPointerDown={onFramePointerDown}
          onPointerMove={onFramePointerMove}
          onPointerUp={onFramePointerEnd}
          onPointerCancel={onFramePointerEnd}
          onDoubleClick={(e) => {
            const [cx, cy] = toView(e.clientX, e.clientY);
            zoomAt(2, cx, cy);
          }}
        >
          <svg
            role="img"
            aria-label={label}
            viewBox={vb.map((v) => v.toFixed(2)).join(" ")}
            className={`adm-map block h-full w-full ${scale > 1.001 ? "overflow-hidden" : "overflow-visible"}`}
            onPointerDown={(e) => {
              lastPointer.current = e.pointerType;
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHover(null);
            }}
          >
            {shapes.map((s, i) => (
              <path
                key={`${s.key}-${i}`}
                d={s.d}
                data-step={heatStep(visitsOf(s.key), thresholds)}
                className="cursor-pointer"
                onPointerMove={(e) => {
                  if (e.pointerType !== "mouse") return;
                  setHover({ key: s.key, ...boxOf(e) });
                }}
                onClick={() => press(s.key)}
              />
            ))}
            {outlined
              ? shapes
                  .filter((s) => s.key === outlined)
                  .map((s, i) => <path key={`outline-${i}`} d={s.d} data-hover="" />)
              : null}
          </svg>
          {/* The readers on the site now, as lit points: drawn over the map in
              HTML so each stays a round point of one size at any width. */}
          {points.map((p) => {
            const pos = at(p.x, p.y);
            if (pos.left < 0 || pos.left > 100 || pos.top < 0 || pos.top > 100) return null;
            const style = { left: `${pos.left.toFixed(2)}%`, top: `${pos.top.toFixed(2)}%` };
            return onLive ? (
              <button
                key={p.id}
                type="button"
                aria-label="A reader on the site now"
                onClick={() => onLive(p.id)}
                className="hit-44 absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={style}
              >
                <span className="adm-live-dot" style={{ width: 6, height: 6 }} />
              </button>
            ) : (
              <span key={p.id} aria-hidden className="adm-live-dot pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ ...style, width: 6, height: 6 }} />
            );
          })}

          {/* Zoom: in, out, and the whole view again. */}
          <div className="absolute right-1.5 top-1.5 z-[5] flex flex-col gap-1.5">
            {zoomButton(
              "Zoom in",
              () => {
                const spot = scale <= 1.001 ? busiestSpot(points, view[0] / 12) : null;
                centerOn(1.8, spot?.[0] ?? vb[0] + vb[2] / 2, spot?.[1] ?? vb[1] + vb[3] / 2);
              },
              "M10 4.5v11M4.5 10h11",
            )}
            {scale > 1.001 ? zoomButton("Zoom out", () => zoomAt(1 / 1.8, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2), "M4.5 10h11") : null}
            {scale > 1.001 ? zoomButton("The whole map", () => setZb(null), "M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4") : null}
          </div>

          {/* The card at the pointer, with a mouse. */}
          {hover && hover.key !== chosen ? (
            <div
              className="pointer-events-none absolute z-10 hidden w-[250px] rounded-[10px] border px-3.5 pb-2.5 pt-3 md:block"
              style={{
                left: hover.x + 274 > hover.w ? Math.max(0, hover.x - 274) : hover.x + 24,
                top: Math.max(0, hover.y - 12),
                background: "var(--adm-rail)",
                borderColor: "var(--adm-line-strong)",
                boxShadow: "var(--adm-shadow-pop)",
              }}
            >
              {cardTitle(hover.key)}
              {body(hover.key)}
              {zoomableKey(hover.key) ? (
                <p className="mt-2 flex items-center gap-1 font-sans text-[11.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                  Click to open its regions
                  <Chevron size={11} />
                </p>
              ) : null}
            </div>
          ) : null}

          {/* The card pinned to its country, from a click, a row of the list,
              or a tap on a tablet. */}
          {chosen && pinnedAt ? (
            <div
              role="dialog"
              aria-label={nameOfKey(chosen)}
              className="absolute z-10 hidden w-[262px] rounded-[10px] border px-3.5 pb-3 pt-2 md:block"
              style={{
                left: pinnedAt.left > 55 ? undefined : `calc(${pinnedAt.left.toFixed(2)}% + 18px)`,
                right: pinnedAt.left > 55 ? `calc(${(100 - pinnedAt.left).toFixed(2)}% + 18px)` : undefined,
                top: `min(${pinnedAt.top.toFixed(2)}%, calc(100% - 120px))`,
                background: "var(--adm-rail)",
                borderColor: "var(--adm-line-strong)",
                boxShadow: "var(--adm-shadow-pop)",
              }}
            >
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">{cardTitle(chosen)}</div>
                {closeButton}
              </div>
              {body(chosen)}
              {zoomableKey(chosen) ? openRegions(chosen) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* The card as a sheet above the phone's bar, from a tap or a row. */}
      {chosen ? (
        <div
          role="dialog"
          aria-label={nameOfKey(chosen)}
          className="fixed inset-x-2 z-[55] rounded-[22px] border px-4 pb-3 pt-2 md:hidden"
          style={{
            bottom: "calc(74px + env(safe-area-inset-bottom, 0px) + 8px)",
            background: "var(--adm-rail)",
            borderColor: "var(--adm-line-strong)",
            boxShadow: "var(--adm-shadow-pop)",
          }}
        >
          <div className="flex items-center gap-2">
            <p className="font-sans text-[19px] font-semibold" style={{ color: "var(--adm-ink)" }}>
              {nameOfKey(chosen)}
            </p>
            <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {periodWord}
            </span>
            <span className="ml-auto">{closeButton}</span>
          </div>
          {body(chosen)}
          {zoomableKey(chosen) ? openRegions(chosen) : null}
        </div>
      ) : null}

      {!zoomed || drawn ? (
        <div className="mt-2.5">
          <HeatLegend thresholds={thresholds} />
        </div>
      ) : null}
    </div>
  );
}
