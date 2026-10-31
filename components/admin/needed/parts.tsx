"use client";

// The small parts the When needed pages share (r3-16, the owner's picks of
// 2026-10-30): the admin's own icons, the state marks, the stages on a line
// and as a ladder, the segmented switch with counts, the buttons, the hold to
// confirm and the switch. Drawn from the panel's tokens and
// ./needed.module.css, so each works on both palettes the same way.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import s from "./needed.module.css";

/* ── Icons: the admin's own drawing, 20 x 20 on a 1.6 stroke ─────────── */

const PATHS = {
  ext: "M11 3.5h5.5V9M16.5 3.5 9 11M14.5 12v4.5h-11v-11H8",
  copy: "M6.5 6.5h10v10h-10ZM13.5 6.5V4.2a.7.7 0 0 0-.7-.7H4.2a.7.7 0 0 0-.7.7v8.6c0 .4.3.7.7.7h2.3",
  print: "M5.5 7.5V3.5h9v4M3 7.5h14v6.5H3ZM5.5 12h9v4.5h-9Z",
  download: "M10 3v9.5M6 8.8l4 4 4-4M3.5 13.5v3h13v-3",
  back: "M12.5 4.5 7 10l5.5 5.5",
  chev: "M7.5 4.5 13 10l-5.5 5.5",
  down: "m5 7.5 5 5 5-5",
  refund: "M7.5 6H13a4 4 0 0 1 0 8H6M9.8 3.2 7 6l2.8 2.8",
  gift: "M3 7h14v3.6H3ZM4.4 10.6v6h11.2v-6M10 7v9.6M10 7S9 3.4 6.8 3.4a1.8 1.8 0 0 0 0 3.6M10 7s1-3.6 3.2-3.6a1.8 1.8 0 0 1 0 3.6",
  reship: "M2.8 5.5h9v8h-9ZM11.8 8.5h3.4l2 2.6v2.4h-5.4M7.5 14.6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.7 14.6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  track: "M10 17s5-4.6 5-8.6a5 5 0 0 0-10 0C5 12.4 10 17 10 17ZM11.8 8.4a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z",
  reply: "M8 4.5 3.5 9 8 13.5M3.5 9h7a6 6 0 0 1 6 6v.5",
  send: "M3.5 10 16.5 4l-4.5 12.5-2.4-5.1ZM9.6 11.4l6.9-7.4",
  plus: "M10 4v12M4 10h12",
  lock: "M4.5 9h11v8h-11ZM7 9V6.5a3 3 0 0 1 6 0V9",
  edit: "M4 16h3.2L16 7.2 12.8 4 4 12.8Z",
  phone: "M6 2.8h8v14.4H6ZM9 14.6h2",
  attach: "M15.5 9.5 9.8 15.2a3.6 3.6 0 0 1-5.1-5.1l6.4-6.4a2.4 2.4 0 0 1 3.4 3.4L8.2 13.4a1.2 1.2 0 0 1-1.7-1.7L12 6.2",
  orders: "M4.5 2.8h11v14.4l-2.2-1.4-2.15 1.4-2.15-1.4-2.15 1.4-2.35-1.4ZM7.6 7.2h4.8M7.6 10.4h4.8",
  search: "M14.6 9A5.6 5.6 0 1 1 3.4 9a5.6 5.6 0 0 1 11.2 0ZM13.2 13.2l3.8 3.8",
  mail: "M3 5.2h14v9.6H3ZM3.4 5.6l6.6 5.2 6.6-5.2",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={{ flex: "none" }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ── Marks ─────────────────────────────────────────────────────────── */

export type MarkKind = "done" | "wait" | "late" | "idle" | "lit";

const MARK_CLASS: Record<MarkKind, string> = {
  done: s.markDone,
  wait: s.markWait,
  late: s.markLate,
  idle: s.markIdle,
  lit: s.markLit,
};

/** A state as a shape: solid done, a ring waiting, dashed late, grey quiet, lit for the one thing now. */
export function Mark({ kind }: { kind: MarkKind }) {
  return <span aria-hidden className={`${s.mark} ${MARK_CLASS[kind]}`} />;
}

/** A mark and its word. The word is what a screen reader gets. */
export function State({ kind, children, className }: { kind: MarkKind; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[7px] ${className ?? ""}`}>
      <Mark kind={kind} />
      {kind === "lit" ? <span className={s.litWord}>{children}</span> : <span>{children}</span>}
    </span>
  );
}

export const litClass = s.lit;
export const dashedClass = s.dashed;

export function LateBox({ children }: { children: ReactNode }) {
  return <span className={s.latebox}>{children}</span>;
}

/* ── The stages ────────────────────────────────────────────────────── */

export type Step = { label: string; state: "done" | "now" | "late" | "todo"; note?: string | null };

const STEP_CLASS = { done: s.stepDone, now: s.stepNow, late: s.stepLate, todo: "" } as const;
const RUNG_CLASS = { done: s.rungDone, now: s.rungNow, late: s.rungLate, todo: "" } as const;

/** Stages on one line: done solid, now lit, late dashed, ahead hollow. */
export function StepLine({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol className={s.steps} aria-label={label}>
      {steps.map((st) => (
        <li key={st.label} className={`${s.step} ${STEP_CLASS[st.state]}`} aria-current={st.state === "now" || st.state === "late" ? "step" : undefined}>
          <div className={s.stepDot} />
          {st.state === "done" || st.state === "now" || st.state === "late" ? <b className="font-semibold">{st.label}</b> : st.label}
          {st.note ? <em className={`${s.stepDate} not-italic`}>{st.note}</em> : null}
          {st.state === "late" ? <span className="sr-only"> (late)</span> : null}
        </li>
      ))}
    </ol>
  );
}

/** The same stages down the page, with a line under the one it is on. */
export function Ladder({
  steps,
  label,
}: {
  steps: (Step & { sub?: string | null })[];
  label: string;
}) {
  return (
    <ol aria-label={label}>
      {steps.map((st) => (
        <li key={st.label} className={`${s.rung} ${RUNG_CLASS[st.state]}`} aria-current={st.state === "now" || st.state === "late" ? "step" : undefined}>
          <div className={s.rungDot} />
          <div className={s.rungText}>
            <b className="font-semibold">{st.label}</b>
            {st.sub ? <span className={s.rungSub}>{st.sub}</span> : null}
          </div>
          {st.note ? <div className={s.rungDate}>{st.note}</div> : null}
        </li>
      ))}
    </ol>
  );
}

/** Five short bars: the reader's own steps, the one they are on lit. */
export function Bar5({ step, of = 5 }: { step: number; of?: number }) {
  return (
    <div className={s.bar5} aria-hidden>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={`${s.bar} ${i + 1 < step ? s.barDone : i + 1 === step ? (step === of ? s.barDone : s.barNow) : ""}`} />
      ))}
    </div>
  );
}

/** What a sale keeps: Temu, then the card fee, then what is ours, as one bar. */
export function KeepBar({ costPct, feePct, keepPct }: { costPct: number; feePct: number; keepPct: number }) {
  return (
    <div className={s.keep} aria-hidden>
      <i className={s.keepCost} style={{ width: `${costPct}%` }} />
      <i className={s.keepFee} style={{ width: `${feePct}%` }} />
      <i className={s.keepKept} style={{ width: `${keepPct}%` }} />
    </div>
  );
}

/* ── A photo of the piece ──────────────────────────────────────────── */

export function Thumb({
  src,
  size,
  height,
  cutout,
  className,
  rounded = true,
}: {
  src: string | null | undefined;
  size?: number;
  height?: number;
  cutout?: boolean;
  className?: string;
  rounded?: boolean;
}) {
  const style: CSSProperties = size ? { width: size, height: size } : { width: "100%", height: height ?? 120 };
  if (!rounded) Object.assign(style, { borderRadius: 0, border: 0 });
  // A piece cut out on a clear ground (the shop's PNGs) reads best whole on a
  // light well; a photograph fills its box.
  const cut = cutout ?? (!!src && /\.png(\?|#|$)/i.test(src));
  return (
    <span className={`${s.thumb} ${cut ? s.thumbCut : ""} ${className ?? ""} block`} style={style}>
      {src ? (
        // A plain img: these come from our own storage and from supplier
        // hosts the image optimizer is not configured for.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" />
      ) : null}
    </span>
  );
}

/* ── Text ──────────────────────────────────────────────────────────── */

/** A section's quiet name, with an optional count. */
export function Label({ children, count, right }: { children: ReactNode; count?: number | null; right?: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 font-sans text-[11.5px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
      <span>{children}</span>
      {count != null ? <span className="font-mono text-[11px]" style={{ color: "var(--adm-ink-2)" }}>{count}</span> : null}
      {right ? <span className="ml-auto">{right}</span> : null}
    </div>
  );
}

export function KV({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t py-[7px] font-sans text-[12.5px] first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
      <span style={{ color: "var(--adm-ink-3)" }}>{k}</span>
      <span className="text-right" style={{ color: "var(--adm-ink)" }}>
        {children}
      </span>
    </div>
  );
}

export const dollars = (cents: number | null | undefined) =>
  typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "not recorded";

/* ── Controls ──────────────────────────────────────────────────────── */

/**
 * A switch of joined parts with counts, the open one solid. The panel's
 * SubTabs, with the count each part carries in the drawings.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full,
  label,
}: {
  options: readonly (readonly [T, string, (number | null)?])[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className={`${full ? "flex w-full" : "inline-flex"} pl-px pt-px`}>
      {options.map(([id, text, count]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={on}
            className={`adm-control relative -ml-px -mt-px inline-flex min-h-[34px] items-center justify-center gap-1.5 border px-3 font-sans text-[12.5px] font-medium first:rounded-l-[var(--adm-radius-sm)] last:rounded-r-[var(--adm-radius-sm)] ${full ? "flex-1" : ""}`}
            style={
              on
                ? ({
                    "--_bg": "var(--adm-accent)",
                    "--_bg-hover": "var(--adm-accent)",
                    borderColor: "var(--adm-accent)",
                    color: "var(--adm-on-accent)",
                    zIndex: 1,
                  } as CSSProperties)
                : ({
                    "--_bg": "var(--adm-control)",
                    "--_bg-hover": "var(--adm-panel-2)",
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  } as CSSProperties)
            }
          >
            {text}
            {count != null ? <span className="font-mono text-[11px] opacity-75">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A button. `primary` is the solid; `lit` adds the glow to the one move that
 * needs him now. `tall` is the phone's icon-over-word button.
 */
export function Btn({
  children,
  onClick,
  icon,
  primary,
  lit,
  disabled,
  busy,
  small,
  wide,
  tall,
  href,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: IconName;
  primary?: boolean;
  lit?: boolean;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  wide?: boolean;
  tall?: boolean;
  href?: string | null;
  title?: string;
  type?: "button" | "submit";
}) {
  const style = (
    primary
      ? {
          "--_bd": "transparent",
          "--_bd-hover": "transparent",
          "--_bg": "var(--adm-accent)",
          "--_bg-hover": "color-mix(in oklab, var(--adm-accent), var(--adm-bg) 14%)",
          color: "var(--adm-on-accent)",
        }
      : {
          "--_bd": "var(--adm-line-strong)",
          "--_bg": "var(--adm-control)",
          "--_bg-hover": "var(--adm-panel-2)",
          color: "var(--adm-ink)",
        }
  ) as CSSProperties;
  const cls =
    "adm-control adm-outline inline-flex items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] border font-sans font-medium disabled:cursor-not-allowed disabled:opacity-45 " +
    (tall
      ? "min-h-[50px] flex-1 flex-col gap-[3px] px-1 text-[11.5px]"
      : small
        ? "min-h-[30px] px-2.5 text-[12px]"
        : "min-h-[38px] px-3.5 text-[13px]") +
    (wide ? " w-full" : "") +
    (lit ? ` ${s.lit}` : "");
  const inner = (
    <>
      {icon ? <Icon name={icon} size={tall ? 17 : 14} /> : null}
      <span>{busy ? "Working…" : children}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls} style={style} title={title}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined} className={cls} style={style} title={title}>
      {inner}
    </button>
  );
}

/** An on/off switch with its words beside it. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`${s.toggle} ${on ? s.toggleOn : ""}`}
    />
  );
}

/**
 * Hold to confirm. Nothing happens on a click: the action runs only once the
 * button has been held down for `ms`, and letting go before then cancels it.
 * Space and Enter hold it from the keyboard. The fill shows how far along the
 * hold is, and the line under it says why.
 */
export function HoldButton({
  children,
  onHeld,
  disabled,
  busy,
  ms = 1600,
}: {
  children: ReactNode;
  onHeld: () => void;
  disabled?: boolean;
  busy?: boolean;
  ms?: number;
}) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const done = useRef(false);
  const held = useRef(onHeld);
  useEffect(() => {
    held.current = onHeld;
  }, [onHeld]);
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function tick(t: number) {
    if (start.current === null) return;
    const p = Math.min(1, (t - start.current) / ms);
    setProgress(p);
    if (p >= 1) {
      start.current = null;
      done.current = true;
      held.current();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }
  function down() {
    if (disabled || busy || start.current !== null) return;
    done.current = false;
    start.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }
  function up() {
    if (start.current === null) return;
    start.current = null;
    if (frame.current) cancelAnimationFrame(frame.current);
    if (!done.current) setProgress(0);
  }

  return (
    <button
      type="button"
      className={s.hold}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        down();
      }}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          down();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") up();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={s.holdFill} style={{ width: `${Math.round(progress * 100)}%`, borderRightWidth: progress > 0 ? 2 : 0 }} />
      <span className={s.holdLabel}>{busy ? "Working…" : children}</span>
      {progress > 0 && progress < 1 && !busy ? <span className={s.holdState}>holding</span> : null}
    </button>
  );
}

export const bubbleClass = s.bubble;
export const bubbleOursClass = s.bubbleOurs;
export const systemClass = s.system;
