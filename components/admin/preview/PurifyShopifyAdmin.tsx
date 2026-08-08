"use client";

// Purify admin, Shopify Polaris grade design preview.
//
// This is a DESIGN PREVIEW, not a live operator surface. Every number below is
// sample data and the page says so in the topbar. The real metrics it is shaped
// around already exist:
//   * subscriptionStats  lib/entitlements/adminStats.ts
//   * estimatedMrrCents  lib/premium/mrr.ts
//   * live sessions / visitors / pageviews, already rendered by
//     components/admin/tabs/OverviewTab.tsx
// Two of the three cards were originally specified as "Daily Active Prayers"
// and "Average Session Depth". Neither metric exists anywhere in this codebase
// (lib/analytics/ holds only geo.ts), so they are shaped here against the real
// equivalents rather than invented. See the plan for the binding step.
//
// Self contained on purpose: no chart or animation dependency is added. The
// area chart is hand rolled SVG in the same spirit as components/admin/charts.tsx,
// the map is inline SVG rather than react-simple-maps (which components/admin/
// WorldMap.tsx uses) so there is no topojson fetch and no React 19 peer risk.
//
// Admin is web only: scripts/native-build.mjs stashes it out of the native
// export, so none of this reaches the iOS or Android binary.

import { useCallback, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ tokens */

// Radius is written as an explicit arbitrary value, never `rounded-lg`. The
// reader theme redefines the named scale (rounded-md is 12px here, rounded-lg
// is 20px), so a named token would silently miss the Polaris 8px spec.
const R8 = "rounded-[8px]";
const CARD =
  `${R8} border border-[#E1E3E5] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.02)]`;
const SNAP = "transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]";
const INK = "text-[#202223]";
const MUTED = "text-[#6D7175]";

/* -------------------------------------------------------------- sample data */

type Kpi = {
  id: string;
  title: string;
  value: string;
  trend: number;
  comparison: string;
  note: string;
};

const KPIS: Kpi[] = [
  {
    id: "patrons",
    title: "Active patrons, recurring revenue",
    value: "$1,240.00",
    trend: 14.2,
    comparison: "vs last month",
    note: "62 active subscriptions",
  },
  {
    id: "live",
    title: "Readers praying now",
    value: "48",
    trend: 8.6,
    comparison: "vs last month",
    note: "sessions in the last 90s",
  },
  {
    id: "depth",
    title: "Average session depth",
    value: "5.8",
    trend: 2.4,
    comparison: "vs last month",
    note: "pageviews per session",
  },
];

type Point = { label: string; value: number };

const SERIES: Point[] = [
  { label: "Jul 10", value: 620 },
  { label: "Jul 11", value: 648 },
  { label: "Jul 12", value: 705 },
  { label: "Jul 13", value: 690 },
  { label: "Jul 14", value: 742 },
  { label: "Jul 15", value: 806 },
  { label: "Jul 16", value: 795 },
  { label: "Jul 17", value: 838 },
  { label: "Jul 18", value: 901 },
  { label: "Jul 19", value: 884 },
  { label: "Jul 20", value: 932 },
  { label: "Jul 21", value: 1010 },
  { label: "Jul 22", value: 998 },
  { label: "Jul 23", value: 1064 },
  { label: "Jul 24", value: 1122 },
  { label: "Jul 25", value: 1098 },
  { label: "Jul 26", value: 1175 },
  { label: "Jul 27", value: 1240 },
];

type Hub = { id: string; city: string; lat: number; lng: number; readers: number };

const HUBS: Hub[] = [
  { id: "nyc", city: "New York", lat: 40.71, lng: -74.01, readers: 9 },
  { id: "ath", city: "Athens", lat: 37.98, lng: 23.73, readers: 11 },
  { id: "bel", city: "Belgrade", lat: 44.79, lng: 20.45, readers: 7 },
  { id: "cai", city: "Cairo", lat: 30.04, lng: 31.24, readers: 5 },
  { id: "mos", city: "Moscow", lat: 55.75, lng: 37.62, readers: 6 },
  { id: "tbi", city: "Tbilisi", lat: 41.72, lng: 44.79, readers: 3 },
  { id: "add", city: "Addis Ababa", lat: 9.03, lng: 38.74, readers: 4 },
  { id: "syd", city: "Sydney", lat: -33.87, lng: 151.21, readers: 3 },
];

/* ------------------------------------------------------- map: projection */

// Equirectangular, cropped to the inhabited band so Antarctica does not eat
// a third of the frame. Landmasses and markers share this projection, which is
// what keeps the pins sitting on the right coastlines.
const MAP_W = 1000;
const MAP_H = 394;
const LAT_MAX = 84;
const LAT_MIN = -58;

function projectX(lng: number): number {
  return ((lng + 180) / 360) * MAP_W;
}
function projectY(lat: number): number {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;
}

// Coarse continent outlines as [lat, lng] perimeters. Deliberately simplified:
// at dashboard scale a recognisable silhouette reads better than a heavy
// topojson payload, and this keeps the component dependency free.
const LANDMASSES: [number, number][][] = [
  // North America
  [
    [71, -157], [70, -145], [69, -135], [69, -125], [68, -115], [67, -105],
    [66, -95], [63, -90], [60, -85], [57, -82], [55, -80], [58, -78],
    [61, -77], [62, -72], [59, -66], [55, -60], [51, -56], [47, -52],
    [44, -60], [41, -68], [39, -74], [35, -76], [32, -79], [28, -80],
    [25, -80], [27, -83], [30, -87], [29, -92], [26, -97], [22, -97],
    [19, -95], [16, -94], [14, -91], [12, -86], [9, -80], [8, -77],
    [13, -90], [16, -95], [20, -105], [23, -110], [28, -115], [32, -117],
    [36, -122], [40, -124], [45, -124], [49, -125], [54, -131], [58, -137],
    [60, -145], [59, -152], [62, -165], [65, -168], [68, -166],
  ],
  // Greenland
  [
    [83, -30], [81, -20], [77, -18], [73, -22], [70, -22], [68, -32],
    [65, -40], [60, -43], [65, -51], [70, -53], [75, -58], [78, -70],
    [81, -60], [83, -40],
  ],
  // South America
  [
    [12, -72], [11, -64], [10, -61], [8, -60], [5, -52], [0, -50],
    [-5, -36], [-8, -35], [-13, -38], [-18, -39], [-23, -41], [-27, -48],
    [-33, -53], [-38, -57], [-42, -63], [-46, -67], [-50, -69], [-55, -68],
    [-53, -72], [-47, -75], [-42, -73], [-37, -73], [-30, -71], [-24, -70],
    [-18, -70], [-14, -76], [-8, -79], [-4, -81], [0, -80], [5, -77],
    [8, -77], [11, -74],
  ],
  // Eurasia
  [
    [43, -9], [48, -5], [50, 0], [54, -5], [58, -6], [58, 5], [63, 5],
    [58, 10], [56, 12], [60, 18], [63, 21], [66, 24], [70, 28], [69, 33],
    [68, 40], [66, 45], [70, 55], [73, 70], [75, 85], [76, 100], [73, 113],
    [72, 130], [70, 140], [66, 170], [62, 180], [60, 170], [55, 160],
    [52, 158], [46, 145], [43, 135], [39, 128], [35, 126], [30, 122],
    [23, 117], [21, 110], [10, 105], [8, 100], [1, 104], [7, 98], [16, 95],
    [21, 92], [22, 89], [19, 85], [16, 81], [8, 77], [14, 74], [20, 70],
    [25, 66], [25, 60], [20, 58], [26, 53], [30, 48], [29, 42], [25, 37],
    [30, 33], [36, 36], [36, 30], [40, 26], [38, 24], [40, 20], [42, 19],
    [45, 13], [43, 7], [43, 3], [40, 0], [37, -6], [37, -9], [41, -9],
  ],
  // Africa
  [
    [37, 10], [33, 11], [31, 20], [31, 25], [28, 34], [22, 37], [15, 40],
    [12, 43], [11, 51], [5, 48], [0, 42], [-7, 39], [-15, 40], [-21, 35],
    [-26, 33], [-34, 26], [-34, 19], [-29, 17], [-23, 15], [-17, 12],
    [-12, 13], [-6, 12], [0, 9], [4, 9], [6, 3], [5, -4], [10, -13],
    [15, -17], [20, -17], [25, -15], [30, -10], [33, -6], [36, -2],
  ],
  // Australia
  [
    [-11, 131], [-12, 137], [-15, 141], [-11, 143], [-15, 145], [-20, 149],
    [-25, 153], [-31, 153], [-37, 150], [-38, 145], [-38, 141], [-35, 138],
    [-32, 134], [-34, 124], [-34, 118], [-31, 115], [-26, 113], [-22, 114],
    [-18, 122], [-14, 127],
  ],
  // British Isles
  [[58, -5], [57, -2], [54, 0], [51, 1], [50, -4], [52, -5], [55, -6]],
  // Japan
  [
    [45, 142], [43, 145], [39, 142], [35, 141], [34, 136], [33, 131],
    [31, 130], [34, 133], [37, 138], [41, 140],
  ],
  // Madagascar
  [[-12, 49], [-15, 50], [-20, 49], [-25, 47], [-25, 45], [-21, 43], [-16, 44]],
  // New Zealand
  [[-35, 173], [-38, 177], [-42, 174], [-46, 168], [-44, 171], [-40, 173]],
];

function landPath(ring: [number, number][]): string {
  return (
    ring
      .map(
        ([lat, lng], i) =>
          `${i === 0 ? "M" : "L"} ${projectX(lng).toFixed(1)} ${projectY(lat).toFixed(1)}`,
      )
      .join(" ") + " Z"
  );
}

/* ------------------------------------------------- chart: monotone cubic */

// Fritsch-Carlson monotone cubic interpolation. Produces a smooth curve that
// never overshoots a data point, which is what stops a "nice looking" chart
// from implying a value the data never had.
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  const tan: number[] = new Array(n);
  tan[0] = slope[0];
  tan[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tan[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tan[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (tan[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (tan[i + 1] * dx[i]) / 3;
    d +=
      ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)},` +
      ` ${c2x.toFixed(2)} ${c2y.toFixed(2)},` +
      ` ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

/* ------------------------------------------------------------- primitives */

function EllipsisButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6D7175] ${SNAP} hover:bg-[#F1F2F4] hover:text-[#202223] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/50`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <circle cx="4" cy="10" r="1.6" fill="currentColor" />
        <circle cx="10" cy="10" r="1.6" fill="currentColor" />
        <circle cx="16" cy="10" r="1.6" fill="currentColor" />
      </svg>
    </button>
  );
}

function TrendPill({ value }: { value: number }) {
  const up = value >= 0;
  // Positive uses Shopify's success pair. Negative gets a critical pair rather
  // than reusing the mint, so the colour never contradicts the arrow.
  const tone = up
    ? "bg-[#E2F1E8] text-[#008060]"
    : "bg-[#FED3D1] text-[#8E1F0B]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-sans text-[12px] font-semibold tabular-nums ${tone}`}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <path
          d={up ? "M2.5 8.5 L6 4.5 L9.5 8.5" : "M2.5 4.5 L6 8.5 L9.5 4.5"}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {up ? "" : "-"}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className={`${CARD} ${SNAP} p-5 hover:border-[#C9CCCF]`}>
      <div className="flex items-start justify-between gap-3">
        <p
          className={`font-sans text-[13px] font-medium leading-5 ${MUTED}`}
        >
          {kpi.title}
        </p>
        <EllipsisButton label={`Actions for ${kpi.title}`} />
      </div>

      <p
        className={`mt-3 font-sans text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${INK}`}
      >
        {kpi.value}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <TrendPill value={kpi.trend} />
        <span className={`font-sans text-[12px] ${MUTED}`}>
          {kpi.comparison}
        </span>
      </div>

      <p className={`mt-3 font-sans text-[12px] ${MUTED}`}>{kpi.note}</p>
    </div>
  );
}

/* ------------------------------------------------------------- the chart */

const CH_W = 960;
const CH_H = 260;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 16;
const PAD_B = 28;

function AnalyticsChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { pts, area, line, min, max } = useMemo(() => {
    const values = data.map((d) => d.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    // A little headroom so the peak never touches the top edge.
    const top = hi + (hi - lo) * 0.15;
    const bottom = lo - (hi - lo) * 0.1;
    const span = top - bottom || 1;

    const innerW = CH_W - PAD_L - PAD_R;
    const innerH = CH_H - PAD_T - PAD_B;

    const p = data.map((d, i) => ({
      x: PAD_L + (i / Math.max(1, data.length - 1)) * innerW,
      y: PAD_T + (1 - (d.value - bottom) / span) * innerH,
    }));

    const l = monotonePath(p);
    const baseline = PAD_T + innerH;
    const a =
      l +
      ` L ${p[p.length - 1].x.toFixed(2)} ${baseline}` +
      ` L ${p[0].x.toFixed(2)} ${baseline} Z`;

    return { pts: p, area: a, line: l, min: lo, max: hi };
  }, [data]);

  // Four horizontal rules, evenly spaced across the plot area.
  const rules = useMemo(() => {
    const innerH = CH_H - PAD_T - PAD_B;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => PAD_T + f * innerH);
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const x = ratio * CH_W;
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const dist = Math.abs(pts[i].x - x);
        if (dist < best) {
          best = dist;
          nearest = i;
        }
      }
      setActive(nearest);
    },
    [pts],
  );

  const activePt = active === null ? null : pts[active];
  const activeDatum = active === null ? null : data[active];

  // Flip the tooltip to the left of the cursor near the right edge so it never
  // clips out of the card.
  const tipLeftPct = activePt ? (activePt.x / CH_W) * 100 : 0;
  const flip = tipLeftPct > 72;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CH_W} ${CH_H}`}
        className="w-full"
        style={{ height: CH_H }}
        role="img"
        aria-label={`Recurring revenue trend, ${data.length} days, from ${min} to ${max} dollars`}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="purifyAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c6ecb" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#2c6ecb" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal rules only. No axis lines at all, per Polaris analytics. */}
        {rules.map((y) => (
          <line
            key={y}
            x1={PAD_L}
            x2={CH_W - PAD_R}
            y1={y}
            y2={y}
            stroke="#F1F2F4"
            strokeWidth={1}
            strokeDasharray="2 4"
            shapeRendering="crispEdges"
          />
        ))}

        <path d={area} fill="url(#purifyAreaFill)" stroke="none" />
        <path
          d={line}
          fill="none"
          stroke="#2c6ecb"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {activePt && (
          <>
            <line
              x1={activePt.x}
              x2={activePt.x}
              y1={PAD_T}
              y2={CH_H - PAD_B}
              stroke="#C9CCCF"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={activePt.x}
              cy={activePt.y}
              r={5.5}
              fill="#FFFFFF"
              stroke="#2c6ecb"
              strokeWidth={2}
            />
          </>
        )}

        {/* Sparse date labels, so the axis reads without a rule under it. */}
        {data.map((d, i) =>
          i % 4 === 0 || i === data.length - 1 ? (
            <text
              key={d.label}
              x={pts[i].x}
              y={CH_H - 8}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="font-sans"
              fontSize={11}
              fill="#6D7175"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>

      {activeDatum && activePt && (
        <div
          className="pointer-events-none absolute z-10 rounded-[8px] border border-[#E1E3E5] bg-white px-3 py-2 shadow-[0px_1px_3px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.02)]"
          style={{
            left: `${tipLeftPct}%`,
            top: `${(activePt.y / CH_H) * 100}%`,
            transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)`,
          }}
        >
          <p className={`font-sans text-[11px] font-medium ${MUTED}`}>
            {activeDatum.label}
          </p>
          <p
            className={`mt-0.5 font-sans text-[15px] font-semibold tabular-nums ${INK}`}
          >
            ${activeDatum.value.toLocaleString("en-US")}
          </p>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- the map */

function LiveMap({ hubs }: { hubs: Hub[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = hubs.reduce((n, h) => n + h.readers, 0);

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-[8px] bg-white">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full"
          role="img"
          aria-label={`Live reader locations, ${total} readers across ${hubs.length} cities`}
        >
          {LANDMASSES.map((ring, i) => (
            <path
              key={i}
              d={landPath(ring)}
              fill="#EBECEE"
              stroke="none"
              fillRule="evenodd"
            />
          ))}

          {hubs.map((h, i) => {
            const cx = projectX(h.lng);
            const cy = projectY(h.lat);
            const on = hover === h.id;
            return (
              <g
                key={h.id}
                onMouseEnter={() => setHover(h.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Expanding ring. Staggered so the hubs never pulse in lockstep. */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#2c6ecb"
                  className="purify-glow"
                  style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${i * 0.45}s` }}
                />
                {/* Solid core. */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={on ? 5 : 4}
                  fill="#2c6ecb"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  className={SNAP}
                />
                {/* Generous invisible hit area, so a 4px dot is still reachable. */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
                {on && (
                  <g pointerEvents="none">
                    <rect
                      x={cx + 12}
                      y={cy - 15}
                      width={Math.max(96, h.city.length * 8 + 42)}
                      height={30}
                      rx={6}
                      fill="#FFFFFF"
                      stroke="#E1E3E5"
                      strokeWidth={1}
                    />
                    <text
                      x={cx + 22}
                      y={cy - 2}
                      fontSize={12}
                      fontWeight={600}
                      fill="#202223"
                      className="font-sans"
                    >
                      {h.city}
                    </text>
                    <text
                      x={cx + 22}
                      y={cy + 10}
                      fontSize={11}
                      fill="#6D7175"
                      className="font-sans"
                    >
                      {h.readers} reading now
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {hubs.map((h) => (
          <li key={h.id} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2c6ecb]" aria-hidden="true" />
            <span className={`font-sans text-[12px] ${INK}`}>{h.city}</span>
            <span className={`font-sans text-[12px] tabular-nums ${MUTED}`}>
              {h.readers}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- the topbar */

const RANGES = [
  "Today vs. Last 7 Days",
  "Last 7 days vs. previous 7",
  "Last 30 days vs. previous 30",
  "Last 90 days vs. previous 90",
];

function DateRange() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(RANGES[0]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-2 rounded-[8px] border border-[#E1E3E5] bg-white px-3 py-1.5 font-sans text-[13px] font-medium ${INK} ${SNAP} hover:border-[#C9CCCF] hover:bg-[#FAFBFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/50`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#6D7175]" aria-hidden="true">
          <rect
            x="3" y="4.5" width="14" height="12" rx="2"
            fill="none" stroke="currentColor" strokeWidth={1.5}
          />
          <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
        {choice}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-[#6D7175] ${SNAP} ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Comparison range"
          className={`absolute right-0 z-20 mt-2 w-[248px] overflow-hidden rounded-[8px] border border-[#E1E3E5] bg-white py-1 shadow-[0px_1px_3px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.02)]`}
        >
          {RANGES.map((r) => (
            <li key={r}>
              <button
                type="button"
                role="option"
                aria-selected={r === choice}
                onClick={() => {
                  setChoice(r);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left font-sans text-[13px] ${SNAP} ${
                  r === choice ? `bg-[#F1F2F4] font-medium ${INK}` : `${INK} hover:bg-[#F6F6F7]`
                }`}
              >
                {r}
                {r === choice && (
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#008060]" aria-hidden="true">
                    <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopBar({ adminEmail }: { adminEmail: string }) {
  const initial = (adminEmail.trim()[0] ?? "A").toUpperCase();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className={`font-sans text-[20px] font-semibold tracking-[-0.01em] ${INK}`}
        >
          Purify Dashboard
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-pill border border-[#E1E3E5] bg-[#F1F2F4] px-2.5 py-1 font-sans text-[12px] font-medium ${MUTED}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#008060]" aria-hidden="true" />
          Production v2.1
        </span>
        {/* Standing rule 6: sample data is never presented as real. */}
        <span className="inline-flex items-center rounded-pill border border-[#E1E3E5] bg-white px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8E1F0B]">
          Sample data
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DateRange />
        <button
          type="button"
          className={`flex items-center gap-2 rounded-[8px] border border-[#E1E3E5] bg-white py-1.5 pl-1.5 pr-3 font-sans text-[13px] font-medium ${INK} ${SNAP} hover:border-[#C9CCCF] hover:bg-[#FAFBFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c6ecb]/50`}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008060] font-sans text-[11px] font-semibold text-white"
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="hidden sm:inline">{adminEmail}</span>
        </button>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------- the page */

export function PurifyShopifyAdmin({ adminEmail }: { adminEmail: string }) {
  // Period over period, not first point vs last. Comparing the two ends of one
  // series and calling it a trend overstates it (here it would read 100.0%,
  // which is arithmetically true and analytically meaningless).
  const half = Math.floor(SERIES.length / 2);
  const sum = (xs: Point[]) => xs.reduce((n, p) => n + p.value, 0);
  const prevPeriod = sum(SERIES.slice(0, half));
  const thisPeriod = sum(SERIES.slice(SERIES.length - half));
  const delta = prevPeriod === 0 ? 0 : ((thisPeriod - prevPeriod) / prevPeriod) * 100;

  return (
    <div className="min-h-dvh bg-[#F6F6F7] px-4 py-6 md:px-8 md:py-8">
      {/* The spec asks for the keyframe to live with the component, so it does.
          Scoped by class name; nothing here leaks to the reader app. */}
      <style>{`
        @keyframes shopifyGlow {
          0%   { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .purify-glow {
          animation: shopifyGlow 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .purify-glow { animation: none; opacity: 0.18; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1200px]">
        <TopBar adminEmail={adminEmail} />

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KPIS.map((k) => (
            <KpiCard key={k.id} kpi={k} />
          ))}
        </section>

        <section className={`${CARD} mt-4 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`font-sans text-[14px] font-semibold ${INK}`}>
                Recurring revenue
              </h2>
              <p className={`mt-1 font-sans text-[12px] ${MUTED}`}>
                Daily total, last {SERIES.length} days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendPill value={delta} />
              <EllipsisButton label="Actions for recurring revenue" />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[560px]">
              <AnalyticsChart data={SERIES} />
            </div>
          </div>
        </section>

        <section className={`${CARD} mt-4 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`flex items-center gap-2 font-sans text-[14px] font-semibold ${INK}`}>
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#008060] opacity-60 purify-glow" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#008060]" />
                </span>
                Live view
              </h2>
              <p className={`mt-1 font-sans text-[12px] ${MUTED}`}>
                Where Purify is open right now
              </p>
            </div>
            <EllipsisButton label="Actions for live view" />
          </div>

          <div className="mt-5">
            <LiveMap hubs={HUBS} />
          </div>
        </section>

        <p className={`mt-6 font-sans text-[12px] ${MUTED}`}>
          Design preview. Numbers are sample data, not live figures.
        </p>
      </div>
    </div>
  );
}
