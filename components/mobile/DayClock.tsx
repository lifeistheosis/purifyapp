"use client";

// A small SVG clock arc showing today's canonical Hours and Compline
// laid around a 24-hour ring, with a pulse at the current local time.
//
// The marker the user is "in" enlarges. The component is intentionally
// quiet — no analog hands, no second-by-second redraw; one-minute tick
// is plenty for liturgical pace.

import { useEffect, useState } from "react";

type Mark = {
  hour: number; // 0–23, local clock
  label: string;
  short: string;
};

const HOURS: Mark[] = [
  { hour: 6, label: "First Hour", short: "1st" },
  { hour: 9, label: "Third Hour", short: "3rd" },
  { hour: 12, label: "Sixth Hour", short: "6th" },
  { hour: 15, label: "Ninth Hour", short: "9th" },
  { hour: 21, label: "Compline", short: "Compline" },
];

function angleFor(hour: number, minute = 0): number {
  // Top of the dial is 6 a.m. (matins). Clockwise from there.
  // 24 hours mapped to 360°.
  const offset = -90 + (6 / 24) * 360 + 180; // 6am at 12 o'clock position
  return offset + ((hour + minute / 60) / 24) * 360;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export type DayClockNow = {
  /** Closest "in" hour, or null when nothing matches (e.g. dead of night). */
  current: Mark | null;
  /** Next Hour coming up. */
  next: Mark;
};

export function nowAgainstHours(d: Date = new Date()): DayClockNow {
  const h = d.getHours() + d.getMinutes() / 60;
  // "In" the hour means within 90 minutes after its mark.
  let current: Mark | null = null;
  for (const m of HOURS) {
    if (h >= m.hour && h < m.hour + 1.5) {
      current = m;
      break;
    }
  }
  let next: Mark = HOURS[0];
  for (const m of HOURS) {
    if (m.hour >= h) {
      next = m;
      break;
    }
  }
  // After the last hour for the day, the next is tomorrow's First Hour.
  if (h >= HOURS[HOURS.length - 1].hour + 1.5) next = HOURS[0];
  return { current, next };
}

export function DayClock() {
  const [tick, setTick] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const now = nowAgainstHours(tick);
  const nowPt = polar(cx, cy, r, angleFor(tick.getHours(), tick.getMinutes()));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="block"
    >
      {/* Outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(245,235,210,0.10)"
        strokeWidth={1.5}
      />

      {/* Hour markers */}
      {HOURS.map((m) => {
        const p = polar(cx, cy, r, angleFor(m.hour));
        const isCurrent = now.current?.hour === m.hour;
        return (
          <g key={m.hour}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isCurrent ? 7 : 4}
              fill={isCurrent ? "var(--color-gold)" : "rgba(245,235,210,0.65)"}
              opacity={isCurrent ? 0.95 : 0.7}
            />
            <text
              x={polar(cx, cy, r + 18, angleFor(m.hour)).x}
              y={polar(cx, cy, r + 18, angleFor(m.hour)).y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fill={isCurrent ? "var(--color-gold)" : "rgba(245,235,210,0.55)"}
              fontFamily="ui-sans-serif, system-ui"
              fontWeight={isCurrent ? 700 : 500}
            >
              {m.short}
            </text>
          </g>
        );
      })}

      {/* Now pulse */}
      <circle
        cx={nowPt.x}
        cy={nowPt.y}
        r={4}
        fill="#c1272d"
      />
      <circle
        cx={nowPt.x}
        cy={nowPt.y}
        r={9}
        fill="none"
        stroke="#c1272d"
        strokeWidth={1}
        opacity={0.4}
      >
        <animate
          attributeName="r"
          from={4}
          to={12}
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from={0.4}
          to={0}
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Center copy */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={10}
        fill="rgba(245,235,210,0.45)"
        fontFamily="ui-sans-serif, system-ui"
        style={{ textTransform: "uppercase", letterSpacing: "1.5px" }}
      >
        {now.current ? "Now" : "Next"}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill="var(--color-paper)"
        fontFamily="ui-sans-serif, system-ui"
      >
        {(now.current ?? now.next).label}
      </text>
    </svg>
  );
}
