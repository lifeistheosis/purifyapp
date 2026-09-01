"use client";

// Shared primitives used across every admin tab. Kept colocated so a
// styling tweak in one place propagates everywhere.
//
// Every export below keeps the exact signature the 21 tabs already import.
// The visual layer is rebuilt on the operator theme in app/admin/admin-theme.css;
// no tab had to change to receive it.
//
// Two rules this file now holds that it did not before:
//   1. Colour is information. The accent marks selection and primary action;
//      the four status hues are reserved for state and always ship beside a
//      word, never as colour alone.
//   2. Labels are sentence case. The old panel set every label in tracked
//      uppercase, which flattens hierarchy: when everything is a heading,
//      the eye has nothing to skip to. Size and weight carry rank instead.

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkline } from "./charts";
import { larpOn } from "@/lib/admin/larp";

/** Stamped into any file larp mode produces. See handleCsv. */
const LARP_FILE_NOTE =
  "LARP MODE: every figure in this file is invented. Not real data.";
import { Odometer } from "./Odometer";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { measureRows, moveItem, playFlip } from "@/lib/ui/flip";

// ── Skeleton ────────────────────────────────────────────────────────────────
// Loading placeholder shaped like the thing it replaces. Additive export:
// tabs can adopt it to drop their spinners.
export function Skeleton({
  w = "100%",
  h = 12,
  className = "",
}: {
  w?: string | number;
  h?: string | number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={"adm-skeleton block " + className}
      style={{ width: w, height: h }}
    />
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  action,
  children,
  accent,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className="rounded-[var(--adm-radius)] border p-4 md:p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        // None on dark, where the surface step already separates the card from
        // the ground. Light needs it: a white card on a near-white ground has
        // nothing else to sit on.
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && (
            <h3
              className="font-sans text-[14px] font-semibold leading-tight"
              // --adm-accent-line, not --adm-accent. An accent card's ground is
              // 93% panel, so it is very nearly the ordinary panel, and the
              // saturated accent as INK on it measured 3.38:1. The -line token
              // is the one each theme defines as legible against its own
              // ground, which is exactly the job a title has.
              style={{ color: accent ? "var(--adm-accent-line)" : "var(--adm-ink)" }}
            >
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {subtitle && (
        <p
          className="-mt-2 mb-3 font-sans text-[12.5px] leading-snug"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
// Centered overlay dialog. Closes on Escape, on backdrop click, and from the
// header's Esc button. The panel scrolls internally and the page behind it is
// frozen, so a long form never leaves the admin scrolled somewhere unexpected
// when it closes.
//
// KEYBOARD. This used to set aria-modal="true" and do nothing to earn it, and
// that combination is worse than doing neither: a reader stops announcing the
// page behind the dialog while Tab walks straight out into it, so the operator
// moves through controls their reader has gone silent about. Three things were
// missing and all three are here now.
//
//   1. A trap. Tab and Shift+Tab cycle inside the panel.
//   2. An entry point. Opening moves focus in, so the first keystroke acts on
//      the dialog rather than on whatever was behind it.
//   3. An exit point. Closing puts focus back where it came from. Opened from
//      the seventeenth row of a table and then closed, the operator was
//      landing at the top of the document with no idea where they had been.
//
// The full-bleed backdrop is still a real <button> so a click anywhere closes,
// but it is now aria-hidden and out of tab order. It was the FIRST tab stop in
// the dialog: a viewport-sized control announced only as "Close", ahead of the
// title and every field. Escape and the header's Esc button are the keyboard
// paths, and both are discoverable in a way an invisible one is not.
export function Modal({
  title,
  subtitle,
  onClose,
  header,
  children,
  wide,
  returnFocusTo,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Controls rendered in the header, left of the close button. */
  header?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  /**
   * Where focus goes on close. Defaults to whatever had focus when the dialog
   * opened, which is right when it was opened by keyboard and wrong when it
   * was opened by mouse from a control that has since unmounted. Pass this
   * when the caller knows better, as the calendar's day cells do.
   */
  returnFocusTo?: HTMLElement | null;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const stops = focusablesIn(panel);
      // No stops at all means a dialog of pure text. Hold focus on the panel
      // rather than letting Tab leave, so aria-modal stays honest.
      if (stops.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const from = active ? stops.indexOf(active) : -1;
      const target = stops[nextIndex(stops.length, from, e.shiftKey)];
      // preventDefault unconditionally, not only at the ends. Focus can sit
      // outside the panel entirely (a control unmounted under the operator,
      // or they clicked the backdrop), and there the browser's own next stop
      // is somewhere in the page this dialog claims is inert.
      e.preventDefault();
      target?.focus();
    }

    // Captured BEFORE the entry focus below moves it, and read off document
    // rather than from a ref so it works however the dialog was opened.
    const opener = document.activeElement as HTMLElement | null;

    window.addEventListener("keydown", onKey);
    lockBodyScroll();

    // Only when focus is not already inside. A child that focuses something
    // specific (DayDetail focuses its heading) mounts and runs its effect
    // AFTER this one, so this cannot fight it, and a re-run must not steal
    // focus back from wherever the operator has since put it.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      // The panel, not its first control. Focusing the first button reads it
      // aloud and skips the title, so the operator hears "Save" without being
      // told what they are saving. The panel carries the accessible name.
      panel.focus();
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
      // Guarded on isConnected: the opener is routinely gone by now, because
      // the dialog's own save is what re-rendered the list it lived in.
      // Focusing a detached node silently drops focus to <body>, which is the
      // exact outcome this is here to prevent.
      const home = returnFocusTo ?? opener;
      if (home && home.isConnected && home !== document.body) home.focus();
    };
  }, [onClose, returnFocusTo]);

  // The OVERLAY no longer scrolls: the panel below caps itself and scrolls its
  // own body. Leaving overflow-y-auto here with an auto-margined panel split
  // the overflow evenly above and below it, which pushed the dialog down the
  // screen and cut its bottom off. items-center is what centres it now.
  //
  // Portalled onto <body> so the `fixed` overlay is anchored to the viewport.
  // Any ancestor with a non-none transform becomes the containing block for
  // fixed descendants, which previously trapped this dialog inside the tab
  // content box. Portalling past it fixes every admin dialog, not just this one.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      // h-dvh is doing real work here, not belt and braces. `inset-0` sets
      // top AND bottom, and on iOS Safari that pair resolves against the LARGE
      // viewport, the one with the toolbar hidden. So the overlay is taller
      // than the screen, `max-h-full` on the panel below inherits that wrong
      // height, and the panel's footer, which is where every Save button
      // lives, sits underneath the browser chrome. Setting a height
      // over-constrains the box, `bottom` is dropped, and the whole thing
      // resolves against the small viewport instead, which is always visible.
      //
      // It is unreachable rather than merely awkward because line 129 calls
      // lockBodyScroll, so the page cannot be scrolled to bring it up and the
      // toolbar never minimises.
      // NO backdrop-blur. It was `backdrop-blur-sm` here, and on a viewport
      // sized overlay that asks the compositor to blur EVERYTHING behind it:
      // the product table with its per-row images, the charts, the hero
      // sparklines. Worse, it is not paid once. Anything that repaints behind
      // the scrim makes the blur recompute, and the admin has live panels doing
      // exactly that, so opening a product dialog over the shop table was
      // reported as "super laggy" and this is the cost.
      //
      // Nothing is lost. --adm-scrim is already rgb(0 0 0 / 0.7) in dark, which
      // separates the dialog on its own; the blur was decoration on top of a
      // scrim that had it covered.
      className="adm fixed inset-0 z-[100] flex h-dvh items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8 md:pb-8"
      // Was bg-black/70, which is far too heavy over a light panel. The
      // portal target is document.body, which is why the light palette keys
      // off <html> rather than off the shell root: this node carries .adm but
      // sits outside the shell entirely.
      style={{ background: "var(--adm-scrim)" }}
    >
      {/* Click-to-dismiss only. tabIndex -1 and aria-hidden keep it out of the
          trap: as a tab stop it was a viewport-sized control announced as
          "Close" sitting ahead of the dialog's own title. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      {/* The panel is capped to the viewport and scrolls INTERNALLY. Letting
          it grow past the viewport pushed the header off screen, so the only
          way back was scrolling the overlay — reported as the dialog being
          unusable on a laptop. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Focusable programmatically, never a tab stop. This is what opening
        // moves focus to, so the dialog announces itself by name.
        tabIndex={-1}
        className={
          "adm-panel-enter relative flex max-h-full w-full flex-col rounded-[var(--adm-radius-lg)] border outline-none " +
          (wide ? "max-w-[1040px]" : "max-w-[760px]")
        }
        style={{
          background: "var(--adm-panel)",
          borderColor: "var(--adm-line-strong)",
          boxShadow: "var(--adm-shadow-pop)",
        }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-3.5 md:px-6"
          style={{ borderColor: "var(--adm-line)" }}
        >
          <div className="min-w-0">
            <p
              className="truncate font-sans text-[15px] font-semibold"
              style={{ color: "var(--adm-ink)" }}
            >
              {title}
            </p>
            {subtitle ? (
              <p
                className="mt-0.5 truncate font-sans text-[12.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {header}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12px] transition-colors"
              style={{
                borderColor: "var(--adm-line-strong)",
                color: "var(--adm-ink-2)",
              }}
            >
              Esc
            </button>
          </div>
        </div>
        {/* min-h-0 is what actually lets a flex child scroll. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────
// One number and what it counts. The number is the element; the label is
// support, so the label is quiet and small and the number is not.
export function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className="rounded-[var(--adm-radius)] border p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <p
        className="font-sans text-[13px] font-medium leading-5"
        style={{ color: "var(--adm-ink-3)" }}
      >
        {label}
      </p>
      <p
        className="mt-3 font-sans text-[28px] font-semibold leading-none tracking-[-0.02em]"
        style={{ color: accent ? "var(--adm-accent)" : "var(--adm-ink)" }}
      >
        <Odometer value={value} />
      </p>
      {hint && (
        <p
          className="mt-1.5 font-sans text-[12px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Delta ───────────────────────────────────────────────────────────────────
// Change against the prior period. Carries a word, not only a colour and an
// arrow, so it survives colour-blindness, greyscale print, and forced colours.
function Delta({ value, positive }: { value: number; positive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-sans text-[12px] font-medium"
      style={{ color: positive ? "var(--adm-good)" : "var(--adm-critical)" }}
    >
      <span aria-hidden>{positive ? "↑" : "↓"}</span>
      {Math.abs(value)}%
      <span style={{ color: "var(--adm-ink-3)" }}>
        {positive ? "up on" : "down on"} prior
      </span>
    </span>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────────────────
// Big number + trend + delta vs prior period. Used on the Overview hero row.
export function KpiCard({
  label,
  value,
  trend,
  delta,
  accent,
  subtitle,
  hint,
}: {
  label: string;
  value: string | number;
  trend?: number[];
  delta?: { value: number; positive: boolean };
  accent?: boolean;
  /** Small caption above the big number (e.g. "since 2026-05-18"). */
  subtitle?: string;
  /** Small caption below the big number, replaces delta when both set. */
  hint?: ReactNode;
}) {
  return (
    <div
      // overflow-hidden is the backstop, not the fix. The sparkline below is a
      // fixed 88px SVG, and on a phone these sit two to a row at about 160px
      // each: it could not shrink, so it drew straight out of the card, across
      // the gap and over the neighbouring card's figure. Reported from the
      // mobile panel. The layout below stops it happening; this makes sure a
      // future child cannot do it again.
      className="flex flex-col overflow-hidden rounded-[var(--adm-radius)] border p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      {/* Stacked until there is room for a row. Side by side in a 160px card,
          "Revenue · 30 days" and "paid, net of refunds" both wrapped to two
          lines and interleaved into something unreadable. */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <p
          className="font-sans text-[13px] font-medium leading-5"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {label}
        </p>
        {subtitle && (
          <p
            className="font-sans text-[11.5px] leading-4"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        {/* min-w-0 so the figure is allowed to shrink. Without it a flex item
            refuses to go below its content width, which is what pushed the
            sparkline out of the card rather than squeezing the number. */}
        <p
          className="min-w-0 font-sans text-[28px] font-semibold leading-none tracking-[-0.02em]"
          style={{ color: accent ? "var(--adm-accent)" : "var(--adm-ink)" }}
        >
          <Odometer value={value} />
        </p>
        {/* The sparkline earns its place only when there is a shape to see.
            Two points is a line segment, not a trend, and 88px beside a 28px
            figure is not a trend either at phone width: hidden below sm, where
            the card is too narrow to read a line in anyway. The number is what
            the card is for; the shape is the bonus that goes first. */}
        {trend && trend.length > 2 && (
          <span className="hidden shrink-0 sm:block">
            <Sparkline data={trend} width={88} height={26} />
          </span>
        )}
      </div>

      <div className="mt-2 min-h-[16px]">
        {hint ? (
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
            {hint}
          </p>
        ) : delta ? (
          <Delta value={delta.value} positive={delta.positive} />
        ) : null}
      </div>
    </div>
  );
}

// ── ChartFrame ──────────────────────────────────────────────────────────────
// Thin wrapper for chart cards: a Card with a built-in slot for a small
// range selector or legend hint and consistent empty-state copy.
export function ChartFrame({
  title,
  subtitle,
  rangeSelector,
  legendHint,
  children,
  empty,
  isEmpty,
  accent,
}: {
  title?: string;
  subtitle?: string;
  rangeSelector?: ReactNode;
  legendHint?: ReactNode;
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
  accent?: boolean;
}) {
  return (
    <Card title={title} subtitle={subtitle} accent={accent} action={rangeSelector}>
      {isEmpty ? (
        <p
          className="py-10 text-center font-sans text-[13px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {empty ?? "Nothing in this range yet. Widen the dates to see more."}
        </p>
      ) : (
        <>
          {children}
          {legendHint && (
            <p
              className="mt-3 font-sans text-[12px]"
              style={{ color: "var(--adm-ink-3)" }}
            >
              {legendHint}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="inline-flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function ToolbarButton({
  onClick,
  children,
  loading,
  variant = "default",
  title,
}: {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loading?: boolean;
  variant?: "default" | "danger" | "primary";
  title?: string;
}) {
  // Hover is handed down as custom properties rather than set here, because
  // an inline `background` beats any class rule and a hover:bg-* utility
  // could never win. The previous workaround, hover:brightness-125, is
  // theme-blind: it does nothing to a white control and washes out a
  // saturated primary. .adm-control in admin-theme.css resolves these.
  const style: Record<string, React.CSSProperties> = {
    default: {
      borderColor: "var(--adm-line-strong)",
      "--_bg": "var(--adm-control)",
      "--_bg-hover": "color-mix(in oklab, var(--adm-control), var(--adm-ink) 8%)",
      color: "var(--adm-ink-2)",
    } as React.CSSProperties,
    // A gradient fill and a glow the same hue as the fill. .adm-control
    // assigns --_bg to `background`, which takes a gradient as happily as a
    // colour, so this needed no new mechanism.
    //
    // The gradient stops at --adm-grad-to and does NOT run on to
    // --adm-grad-vivid. White on that magenta is 3.46:1, which is legal for
    // large text and not for a 12.5px button label. The vivid stop belongs
    // to FeatureCard, where the type is big enough to earn it.
    primary: {
      borderColor: "transparent",
      "--_bg":
        "linear-gradient(135deg, var(--adm-grad-from) 0%, var(--adm-grad-to) 100%)",
      "--_bg-hover":
        "linear-gradient(135deg, var(--adm-grad-to) 0%, var(--adm-grad-from) 100%)",
      color: "var(--adm-on-accent)",
      boxShadow: "0 4px 14px color-mix(in oklab, var(--adm-accent), transparent 72%)",
    } as React.CSSProperties,
    danger: {
      borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
      "--_bg": "color-mix(in oklab, var(--adm-critical), transparent 90%)",
      "--_bg-hover": "color-mix(in oklab, var(--adm-critical), transparent 84%)",
      color: "var(--adm-critical)",
    } as React.CSSProperties,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-busy={loading || undefined}
      className={
        // adm-toolbtn exists purely so admin-theme.css can reach this one
        // control on a touch screen. Every other .adm-control in the panel is
        // already h-11; this one is py-[5px], which measures 31px, and it is
        // the only sub-44 target the ratchet cannot see, because that test
        // matches `h-1` through `h-10` classes and this button sets no height
        // class at all.
        "adm-toolbtn adm-rail-item adm-control inline-flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-2.5 py-[5px] font-sans text-[12.5px] font-medium " +
        "disabled:cursor-not-allowed disabled:opacity-45"
      }
      style={style[variant]}
    >
      {loading && (
        <span
          aria-hidden
          className="adm-skeleton"
          style={{ width: 10, height: 10, borderRadius: 999 }}
        />
      )}
      {children}
    </button>
  );
}

// ── DataTable ───────────────────────────────────────────────────────────────
// Header row + data rows + built-in CSV + Markdown export.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing here yet.",
  csvFilename,
  reorder,
}: {
  columns: {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    csv?: (row: T) => string | number | null | undefined;
    align?: "left" | "right";
  }[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  csvFilename?: string;
  /**
   * Opt in to row reordering. Absent, this table is byte-identical to what it
   * has always rendered, which is why it is a prop rather than a behaviour.
   *
   * Three mechanisms, because one is never enough here. Drag is what the owner
   * asked for and what a mouse expects. Move up / Move down is what a keyboard
   * and a screen reader can actually operate, and it is the only one that works
   * inside a horizontally scrolling table on a phone. Both write through the
   * same onReorder, so there is one code path to be correct.
   */
  reorder?: {
    /** The full new order. Persisting it is the caller's business. */
    onReorder: (next: T[]) => void;
    /** Names the row in "Move Hosting up", for screen readers. */
    name: (row: T) => string;
    /** Rows that cannot move, for example an unsaved fallback row. */
    canMove?: (row: T) => boolean;
  };
}) {
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const movable = (r: T) => !reorder?.canMove || reorder.canMove(r);

  /**
   * The single reorder path. Measures, hands the new order up, then animates
   * from the old positions in a layout effect, after React has moved the rows
   * but before the browser paints them.
   */
  function commitMove(from: number, to: number) {
    if (!reorder) return;
    if (from === to || from < 0 || to < 0) return;
    if (!movable(rows[from]) || !movable(rows[to])) return;
    pendingFlip.current = measureRows(bodyRef.current);
    reorder.onReorder(moveItem(rows, from, to));
  }

  const pendingFlip = useRef<ReturnType<typeof measureRows> | null>(null);

  useLayoutEffect(() => {
    if (!pendingFlip.current) return;
    playFlip(bodyRef.current, pendingFlip.current);
    pendingFlip.current = null;
  });

  // LARP MARKER, on both exports. The banner is painted on the PAGE, and a
  // file carries none of it. Without this, larp mode hands you a download
  // literally named orders.csv in which a real $45 order reads $36,675, with
  // nothing in the bytes saying so. That is precisely the artifact the header
  // of lib/admin/larp.ts swears must never leave the machine, so the marker
  // goes in the filename AND in the first row, because either one alone is
  // lost the moment somebody renames the file or pastes only the rows.
  function handleCsv() {
    const headers = columns.map((c) => c.label);
    const data = rows.map((r) => columns.map((c) => (c.csv ? c.csv(r) : "")));
    if (larpOn()) {
      data.unshift(columns.map((_c, i) => (i === 0 ? LARP_FILE_NOTE : "")));
      downloadCsv(`larp-invented-${csvFilename ?? "export.csv"}`, toCsv(headers, data));
      return;
    }
    downloadCsv(csvFilename ?? "export.csv", toCsv(headers, data));
  }

  function handleMarkdown() {
    const head = `| ${columns.map((c) => c.label).join(" | ")} |`;
    const sep = `| ${columns.map(() => "---").join(" | ")} |`;
    const body = rows
      .map(
        (r) =>
          `| ${columns
            .map((c) => (c.csv ? String(c.csv(r) ?? "") : ""))
            .join(" | ")} |`,
      )
      .join("\n");
    // Same marker as handleCsv, and for the same reason: this string is
    // about to sit on the clipboard, ready to paste into an email or an
    // accounting sheet, with the banner nowhere near it.
    const plain = [head, sep, body].join("\n");
    const md = larpOn() ? `**${LARP_FILE_NOTE}**\n\n${plain}` : plain;
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </p>
        <Toolbar>
          <ToolbarButton onClick={handleCsv} title="Download these rows as CSV">
            CSV
          </ToolbarButton>
          <ToolbarButton onClick={handleMarkdown} title="Copy these rows as a markdown table">
            {copied ? "Copied" : "Markdown"}
          </ToolbarButton>
        </Toolbar>
      </div>
      <div
        // overscroll-x-contain, because a table 258px wider than the phone is
        // a horizontal swipe surface sitting inside a page that treats a
        // horizontal swipe as "go back". Measured on the sample table at
        // 447px: 561 wide in a 303 box. Without this, swiping to reach the
        // Vendor column leaves the panel.
        className="hidden overflow-auto overscroll-x-contain rounded-[var(--adm-radius)] border lg:block"
        // dvh, to match the rail's h-dvh and the Modal overlay. With vh a table
        // on a phone claimed 70% of the LARGE viewport, so its bottom rows sat
        // behind the browser toolbar and the sticky header made it look like
        // the table simply ended there.
        style={{ borderColor: "var(--adm-line)", maxHeight: "70dvh" }}
      >
        <table className="w-full font-sans text-[13px]">
          <thead className="adm-thead">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={
                    "border-b px-3 py-2 font-medium " +
                    (i === 0 ? "adm-tbl-1st " : "") +
                    (c.align === "right" ? "text-right" : "text-left")
                  }
                  style={{
                    borderColor: "var(--adm-line)",
                    color: "var(--adm-ink-3)",
                  }}
                >
                  {c.label}
                </th>
              ))}
              {reorder ? (
                <th scope="col" className="border-b px-3 py-2 font-medium text-left" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
                  Order
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (reorder ? 1 : 0)}
                  className="px-3 py-10 text-center font-sans text-[13px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r, ri) => (
                <tr
                  key={rowKey(r)}
                  data-flip-key={rowKey(r)}
                  className="adm-rail-item border-b hover:bg-[var(--adm-hover)]"
                  style={{
                    borderColor: "var(--adm-line)",
                    // The row being dragged fades rather than moving with the
                    // cursor. A ghost row that follows the pointer needs a
                    // clone positioned outside the table, because a <tr> lifted
                    // out of its <tbody> loses every column width it had.
                    opacity: dragKey === rowKey(r) ? 0.45 : undefined,
                  }}
                  draggable={reorder ? movable(r) : undefined}
                  onDragStart={
                    reorder && movable(r)
                      ? (e) => {
                          setDragKey(rowKey(r));
                          e.dataTransfer.effectAllowed = "move";
                          // Firefox refuses to start a drag without payload.
                          e.dataTransfer.setData("text/plain", rowKey(r));
                        }
                      : undefined
                  }
                  onDragOver={
                    reorder
                      ? (e) => {
                          if (!dragKey || dragKey === rowKey(r)) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      : undefined
                  }
                  onDrop={
                    reorder
                      ? (e) => {
                          e.preventDefault();
                          if (!dragKey) return;
                          const from = rows.findIndex((x) => rowKey(x) === dragKey);
                          setDragKey(null);
                          commitMove(from, ri);
                        }
                      : undefined
                  }
                  onDragEnd={reorder ? () => setDragKey(null) : undefined}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={
                        "px-3 py-2 " +
                        (i === 0 ? "adm-tbl-1st " : "") +
                        (c.align === "right" ? "text-right" : "")
                      }
                      style={{ color: "var(--adm-ink)" }}
                    >
                      {c.render(r)}
                    </td>
                  ))}
                  {/* TRAILING, not leading. Below 1023px the first column is
                      position: sticky so a scrolled row stays identifiable, and
                      a drag grip inside a sticky cell is a hit-testing hazard:
                      the cell is painted over the scrolling ones, so a gesture
                      starting near its edge lands on the wrong element. */}
                  {reorder ? (
                    <td className="px-3 py-2">
                      {movable(r) ? (
                        <Toolbar>
                          <button
                            type="button"
                            aria-hidden
                            tabIndex={-1}
                            title="Drag to reorder"
                            // Sized by padding, never by a height utility.
                            // The touch-target ratchet scans the lines after a
                            // <button> for a small height class and sits at
                            // exactly its ceiling, so one here turns the suite
                            // red. It also reads comments, which is how this
                            // very note broke it once by naming the classes it
                            // was warning about. admin-theme.css lifts
                            // .adm-toolbtn to 44px on a coarse pointer.
                            className="adm-toolbtn adm-control cursor-grab rounded-[var(--adm-radius-sm)] border px-2 py-[5px]"
                            style={
                              {
                                borderColor: "var(--adm-line)",
                                color: "var(--adm-ink-3)",
                                "--_bg": "var(--adm-control)",
                                "--_bg-hover": "var(--adm-hover)",
                              } as React.CSSProperties
                            }
                          >
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <circle cx="7" cy="4" r="1.6" />
                              <circle cx="13" cy="4" r="1.6" />
                              <circle cx="7" cy="10" r="1.6" />
                              <circle cx="13" cy="10" r="1.6" />
                              <circle cx="7" cy="16" r="1.6" />
                              <circle cx="13" cy="16" r="1.6" />
                            </svg>
                          </button>
                          <ToolbarButton
                            onClick={() => commitMove(ri, ri - 1)}
                            title={`Move ${reorder.name(r)} up`}
                          >
                            Up
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => commitMove(ri, ri + 1)}
                            title={`Move ${reorder.name(r)} down`}
                          >
                            Down
                          </ToolbarButton>
                        </Toolbar>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* THE PHONE GETS CARDS, NOT A SIDEWAYS TABLE.

          What used to be here was a line reading "Swipe sideways for all N
          columns", which is the tell: a table wide enough to need instructions
          has already failed the screen. Reading one order meant swiping a
          561px grid through a 303px window and holding the row in your head,
          and the reorder controls exist partly because drag cannot work inside
          that scroller at all.

          One row becomes one card. The first column is the heading, because in
          every table here it is the identifying one (the product, the person,
          the order), and the rest become label and value pairs that wrap
          instead of scrolling.

          Both trees render and the breakpoint picks one. That is deliberate
          over a JS media query: this file is used by every tab, and a hook
          would either flash the wrong layout on first paint or force each
          caller to become a client component that already is one for other
          reasons. The card tree is plain divs, and these tables are tens of
          rows, not thousands. */}
      <div className="space-y-2 lg:hidden">
        {rows.length === 0 ? (
          <p
            className="rounded-[var(--adm-radius)] border px-3 py-6 text-center font-sans text-detail"
            style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}
          >
            {empty}
          </p>
        ) : (
          rows.map((r, ri) => {
            // THE HEADING IS THE FIRST COLUMN THAT HAS A LABEL, not simply the
            // first column. AudienceTab's regions table leads with a decorative
            // flag whose label is "", so "first column" titled every card with a
            // bare emoji and demoted the region name into a field below it.
            const headIndex = Math.max(0, columns.findIndex((c) => c.label.trim() !== ""));
            const head = columns[headIndex];
            const rest = columns.filter((_c, i) => i !== headIndex);
            return (
              <div
                key={rowKey(r)}
                className="rounded-[var(--adm-radius)] border p-3"
                style={{ borderColor: "var(--adm-line)" }}
              >
                {head ? (
                  <div className="mb-2 font-sans text-detail text-paper [overflow-wrap:anywhere]">
                    {head.render(r)}
                  </div>
                ) : null}
                <dl className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                  {rest.map((c) => {
                    const value = c.render(r);
                    // A column that renders NOTHING is not a label/value pair.
                    // EikonBox carries four CSV-only columns declared as
                    // `render: () => null`, which are invisible empty cells in
                    // the table and became four empty grid rows mid-card here.
                    if (value === null || value === undefined || value === false) return null;
                    // A column with no LABEL is a value, not a pair. Fifteen
                    // action columns across eleven tabs use `label: ""`, and an
                    // empty <dt> still claimed the whole 42% label track, so the
                    // buttons were squeezed into 161px beside 125px of nothing.
                    // Unlabelled values take the full card width instead.
                    const labelled = c.label.trim() !== "";
                    return (
                      <Fragment key={c.key}>
                        {labelled ? (
                          <dt
                            className="font-sans text-caption"
                            style={{ color: "var(--adm-ink-3)" }}
                          >
                            {c.label}
                          </dt>
                        ) : null}
                        <dd
                          className={
                            "min-w-0 font-sans text-detail text-paper/85 [overflow-wrap:anywhere]" +
                            (labelled ? "" : " col-span-2")
                          }
                        >
                          {value}
                        </dd>
                      </Fragment>
                    );
                  })}
                </dl>
                {/* The touch reorder path, and on this side it is the ONLY one.
                    HTML5 drag-and-drop does not fire on touch at all, so the
                    grip is a desktop affordance and these two buttons are what
                    a phone actually has. Leaving them in the table tree only
                    would have made every reorderable table read-only here,
                    which is worse than the sideways scroll this replaced. */}
                {reorder && movable(r) ? (
                  <div
                    className="mt-2.5 flex justify-end border-t pt-2.5"
                    style={{ borderColor: "var(--adm-line)" }}
                  >
                    <Toolbar>
                      <ToolbarButton
                        onClick={() => commitMove(ri, ri - 1)}
                        title={`Move ${reorder.name(r)} up`}
                      >
                        Up
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => commitMove(ri, ri + 1)}
                        title={`Move ${reorder.name(r)} down`}
                      >
                        Down
                      </ToolbarButton>
                    </Toolbar>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── SubTabs ─────────────────────────────────────────────────────────────────
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly (readonly [T, string])[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-[var(--adm-radius)] border p-0.5"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
    >
      {tabs.map(([id, label]) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={on}
            className="adm-rail-item rounded-[var(--adm-radius-sm)] px-3 py-1.5 font-sans text-[12.5px] font-medium"
            style={
              on
                ? { background: "var(--adm-accent)", color: "var(--adm-on-accent)" }
                : { color: "var(--adm-ink-2)" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter toolbar ──────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={"relative " + className}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
        style={{ color: "var(--adm-ink-3)" }}
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m13.2 13.2 3.8 3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--adm-radius-sm)] border py-1.5 pl-8 pr-8 font-sans text-[13px] outline-none"
        style={{
          borderColor: "var(--adm-line-strong)",
          background: "var(--adm-control)",
          color: "var(--adm-ink)",
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--adm-radius-sm)] px-1 font-sans text-[12px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const on = o.id === active;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className="adm-rail-item inline-flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-2.5 py-1 font-sans text-[12.5px] font-medium capitalize"
            style={
              on
                ? {
                    borderColor: "transparent",
                    background: "var(--adm-accent)",
                    color: "var(--adm-on-accent)",
                  }
                : {
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  }
            }
          >
            {o.label}
            {o.count != null ? (
              <span
                className="rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[11px] font-semibold"
                style={
                  on
                    ? { background: "var(--adm-on-accent-wash)" }
                    : { background: "var(--adm-panel-2)", color: "var(--adm-ink-3)" }
                }
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12.5px] outline-none"
        style={{
          borderColor: "var(--adm-line-strong)",
          background: "var(--adm-control)",
          color: "var(--adm-ink)",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  children,
  matched,
  total,
  noun,
  onClear,
}: {
  children: ReactNode;
  matched: number;
  total: number;
  /** Plural noun for the count line ("products", "reviews"). */
  noun: string;
  /** Rendered as a "Clear filters" action; pass null when nothing is active. */
  onClear?: (() => void) | null;
}) {
  const narrowed = matched !== total;
  const label = (n: number) => `${n} ${n === 1 ? noun.replace(/s$/, "") : noun}`;
  return (
    <div
      className="mb-3 rounded-[var(--adm-radius)] border p-2.5"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{children}</div>
      <p className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {narrowed ? `${matched} of ${label(total)} shown` : label(total)}
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-3 font-medium"
            style={{ color: "var(--adm-accent)" }}
          >
            Clear filters
          </button>
        ) : null}
      </p>
    </div>
  );
}

// ── Pill ────────────────────────────────────────────────────────────────────
// Status marker. Tone names are kept for compatibility with the tabs that
// already pass them; they now resolve to the reserved status vocabulary.
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "rose" | "emerald";
}) {
  const tones: Record<string, { fg: string; bg: string }> = {
    neutral: { fg: "var(--adm-ink-2)", bg: "var(--adm-panel-2)" },
    // 92%, not 88%. At a 12% tint the light-theme text lands around 4.2:1 on
    // its own wash, which is the trap Shopify's own success green falls into.
    // At 8% every tone clears 4.5:1 and the dark tint is still clearly a pill.
    gold: { fg: "var(--adm-accent)", bg: "color-mix(in oklab, var(--adm-accent), transparent 92%)" },
    rose: { fg: "var(--adm-critical)", bg: "color-mix(in oklab, var(--adm-critical), transparent 92%)" },
    emerald: { fg: "var(--adm-good)", bg: "color-mix(in oklab, var(--adm-good), transparent 92%)" },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11.5px] font-medium"
      style={{ color: t.fg, background: t.bg }}
    >
      {/* A dot in the same hue, so the state reads at a glance, while the
          word beside it carries the meaning without relying on colour. */}
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: "currentColor" }}
      />
      {children}
    </span>
  );
}
