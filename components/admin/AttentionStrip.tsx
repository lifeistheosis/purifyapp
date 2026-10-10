"use client";

/**
 * "Is anything wrong", above every tab.
 *
 * ── What it is, and is not ─────────────────────────────────────────────
 *
 * A band that holds CONDITIONS: things that are broken, unmeasured, or
 * stuck, each with a word, a mark and one action. It is not the activity
 * feed, which is news and fades. It is not a notification: nothing here can
 * be dismissed, because a fault that can be swiped away is a fault that will
 * be. It goes away when the condition does.
 *
 * ── The one box drawn in ink ───────────────────────────────────────────
 *
 * The panel is one ink, so this band cannot turn amber or red. What sets it
 * apart is its edge: every card under it is outlined in the hairline grey,
 * and this is the one box on the page outlined in full ink, solid for a
 * failure and dashed for a warning, with the matching mark beside each word.
 * It is drawn only while there is something to say. On a clear day it is a
 * single line of ink-3 on Overview and nothing at all on any other tab, so
 * the day the box appears it still means something.
 *
 * ── States ─────────────────────────────────────────────────────────────
 *
 *   findings   a measured fault exists. Band in the worst level's shape,
 *              headline count, chips: measured faults first, then any sources
 *              that did not answer.
 *   unknown    no measured fault, but a source did not answer. Band dashed,
 *              "Cannot tell", one chip per source with Retry. This is what
 *              /admin/shell-preview shows, where every route answers 403.
 *   checking   nothing has failed and something has not answered yet. A
 *              skeleton line on Overview, nothing elsewhere.
 *   clear      every source measured, zero faults. One quiet line on
 *              Overview, nothing elsewhere.
 *
 * Queues (unpaid orders, tickets, requests, moderation) never appear here.
 * They are people waiting, not things wrong, and they feed the Waiting-on-you
 * card and the rail badges instead. See lib/admin/attention.ts.
 *
 * ── In flow, not sticky ────────────────────────────────────────────────
 *
 * It sits in the canvas after the larp banner and before the section head.
 * Making it sticky would add to --adm-topbar-h, which two other surfaces
 * measure from, and a band that follows the operator down an order list is
 * exactly the persistent warning strip everyone learns to scroll past.
 */

import { useEffect, useState } from "react";

import { Skeleton, StatusDot, type StatusTone } from "./primitives";
import { headline, type AttentionItem, type AttentionLevel, type AttentionSummary } from "@/lib/admin/attention";

// How each level is drawn. The panel is one ink, so the four levels are two
// SHAPES and four words: a failure is a solid line and a dot in a halo, a
// warning is a dashed line and a ring. Critical against serious, and a
// measured warning against a cannot-tell, are told apart by the word each
// chip leads with (LEVEL_WORD in lib/admin/attention.ts), which is what a
// screen reader was already getting.
//
// Unmeasured is drawn as a warning, not left quiet. A cannot-tell must not
// look calm.
const LOOK: Record<Exclude<AttentionLevel, "queue">, { dot: StatusTone; dashed: boolean }> = {
  critical: { dot: "bad", dashed: false },
  serious: { dot: "bad", dashed: false },
  warn: { dot: "wait", dashed: true },
  unmeasured: { dot: "wait", dashed: true },
};

export function AttentionStrip({
  summary,
  isOverview,
  onOpenTab,
  onRetry,
}: {
  summary: AttentionSummary;
  isOverview: boolean;
  onOpenTab: (tab: string) => void;
  onRetry: (url: string) => void;
}) {
  // Its own coarse clock, so "checked 4m ago" stays honest without the shell
  // re-rendering for it. Thirty seconds is finer than anything the label
  // prints, the same trade Freshness and the activity bell make.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const h = headline(summary, now);

  if (summary.state === "checking") {
    if (!isOverview) return null;
    return (
      <div className="mb-4" aria-busy="true" aria-label="Checking the panel">
        <Skeleton w={260} h={16} />
      </div>
    );
  }

  if (summary.state === "clear") {
    if (!isOverview) return null;
    return (
      <p
        className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-[12.5px]"
        style={{ color: "var(--adm-ink-3)" }}
      >
        <StatusDot tone="good" />
        {/* The live region is the sentence, not the clock beside it: a
            ticking "checked 4m ago" inside role=status re-announced the line
            once a minute for as long as the panel was open. */}
        <span role="status">{h.text}</span>
        {h.meta ? <span>{h.meta}</span> : null}
      </p>
    );
  }

  const worst = (summary.worst ?? "unmeasured") as Exclude<AttentionLevel, "queue">;
  const look = LOOK[worst];
  const chips: AttentionItem[] = [...summary.faults, ...summary.unmeasured];

  return (
    <section
      aria-label="Attention"
      // The one box on the page whose edge is drawn in ink rather than in the
      // hairline grey, which is what sets it off from every card under it.
      // Solid when the worst thing in it is a failure, dashed when it is a
      // warning.
      className={"mb-4 rounded-[var(--adm-radius)] border p-3 md:p-4" + (look.dashed ? " border-dashed" : "")}
      style={{ borderColor: "var(--adm-ink)" }}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {/* role=status on the headline alone: it changes only when the state
            or the count does, which is what a live region should announce. */}
        <h2
          role="status"
          className="inline-flex items-center gap-2 font-sans text-[13px] font-semibold"
          style={{ color: "var(--adm-ink)" }}
        >
          <StatusDot tone={look.dot} />
          {h.text}
        </h2>
        {h.meta ? (
          <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
            {h.meta}
          </span>
        ) : null}
      </div>

      {/* Rectangles, not pills, wrapping to full-width rows on a phone. Each
          is a real button at the 44px floor, because each is an action: open
          the tab that fixes it, or ask the source again. */}
      <ul className="flex flex-wrap gap-2">
        {chips.map((it) => (
          <Chip key={it.id} item={it} onOpenTab={onOpenTab} onRetry={onRetry} />
        ))}
      </ul>
    </section>
  );
}

function Chip({
  item,
  onOpenTab,
  onRetry,
}: {
  item: AttentionItem;
  onOpenTab: (tab: string) => void;
  onRetry: (url: string) => void;
}) {
  const level = item.level as Exclude<AttentionLevel, "queue">;
  const look = LOOK[level];
  // Any item that names a URL to re-read offers Retry: the unmeasured chips,
  // and the "panel cannot read its own data" fault, whose fix is asking
  // again rather than opening a tab that reads the same dead route.
  const retry = item.retryUrl;
  const action = retry ? "Retry" : item.go.label;

  return (
    <li className="min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => (retry ? onRetry(item.retryUrl as string) : onOpenTab(item.go.tab))}
        title={action}
        // A plain outlined control. The dash that says "warning" is on the box
        // around the chips and on nothing inside it: dashed chips in a dashed
        // box was the same thing said twice, and noisier for it.
        className="adm-control adm-outline flex min-h-11 max-w-full items-center gap-2 rounded-[var(--adm-radius-sm)] border px-3 py-2 text-left"
        style={
          {
            "--_bd": "var(--adm-line-strong)",
            "--_bg": "var(--adm-panel)",
            "--_bg-hover": "var(--adm-panel)",
          } as React.CSSProperties
        }
      >
        <StatusDot tone={look.dot} />
        <span className="shrink-0 font-sans text-[12.5px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          {item.word}
        </span>
        <span className="min-w-0 font-sans text-[12.5px] leading-snug" style={{ color: "var(--adm-ink)" }}>
          {item.label}
        </span>
        {/* What pressing the chip does. Underlined, the panel's mark for a
            link, so the one action in the chip does not read as a caption. */}
        <span
          className="ml-1 shrink-0 font-sans text-[11.5px] font-medium underline decoration-1 underline-offset-[3px]"
          style={{ color: "var(--adm-ink-2)", textDecorationColor: "var(--adm-line-strong)" }}
        >
          {action}
        </span>
      </button>
    </li>
  );
}
