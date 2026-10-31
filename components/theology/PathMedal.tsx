import type { StepState } from "@/lib/theology/path";

/**
 * A step's medallion on the path (1.8, round 3 r3-13, C's "where you left
 * off"): the subject's icon in a round frame, ringed by the path, one
 * segment a step, the walked ones filled, the one in hand lit white, the
 * rest dim. Decoration: the step's name and "6 of 9" beside it say it.
 */
export function PathMedal({
  src,
  focus = "50% 30%",
  size,
  inner,
  states,
}: {
  src: string;
  focus?: string;
  size: number;
  inner: number;
  states: readonly StepState[];
}) {
  const stroke = 3;
  const r = size / 2 - stroke;
  const around = 2 * Math.PI * r;
  const n = Math.max(states.length, 1);
  const dash = around / n - (n > 1 ? 5 : 0);
  const at = (size - inner) / 2;
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        {states.map((state, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(2)} ${(around - dash).toFixed(2)}`}
            strokeDashoffset={((-i * around) / n + around / 4).toFixed(2)}
            className={state === "walked" ? "text-paper/80" : state === "current" ? "path-ring-lit text-paper" : "text-paper/15"}
          />
        ))}
      </svg>
      <span className="absolute overflow-hidden rounded-full ring-1 ring-paper/15" style={{ left: at, top: at, width: inner, height: inner }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
        <img src={src} alt="" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: focus }} />
      </span>
    </span>
  );
}
