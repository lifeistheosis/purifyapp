"use client";

/**
 * "Is anything wrong", above every tab.
 *
 * ── What it is, and is not ─────────────────────────────────────────────
 *
 * A band that holds CONDITIONS: things that are broken, unmeasured, or
 * stuck, each with a word, a hue and one action. It is not the activity
 * feed, which is news and fades. It is not a notification: nothing here can
 * be dismissed, because a fault that can be swiped away is a fault that will
 * be. It goes away when the condition does.
 *
 * ── The one status colour on the page ──────────────────────────────────
 *
 * The theme reserves four status hues and requires each to travel with a
 * word. This band is the only place on the panel that paints one, and only
 * while there is something to say. On a clear day it is a single line of
 * ink-3 on Overview and nothing at all on any other tab, so the day it turns
 * amber the amber still means something.
 *
 * ── States ─────────────────────────────────────────────────────────────
 *
 *   findings   a measured fault exists. Band in the worst hue, headline
 *              count, chips: measured faults first, then any sources that did
 *              not answer.
 *   unknown    no measured fault, but a source did not answer. Band at warn,
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
 * exactly the persistent yellow strip everyone learns to scroll past.
 */

import { useEffect, useState } from "react";

import { Skeleton } from "./primitives";
import { headline, type AttentionItem, type AttentionLevel, type AttentionSummary } from "@/lib/admin/attention";

const TONE: Record<Exclude<AttentionLevel, "queue">, string> = {
  critical: "var(--adm-critical)",
  serious: "var(--adm-serious)",
  warn: "var(--adm-warn)",
  // Warn, not ink-3. A cannot-tell must not look calm; the WORD carries the
  // distinction from a measured warning.
  unmeasured: "var(--adm-warn)",
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
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-[var(--adm-radius-pill)]"
          style={{ background: "var(--adm-good)" }}
        />
        {/* The live region is the sentence, not the clock beside it: a
            ticking "checked 4m ago" inside role=status re-announced the line
            once a minute for as long as the panel was open. */}
        <span role="status">{h.text}</span>
        {h.meta ? <span>{h.meta}</span> : null}
      </p>
    );
  }

  const worst = (summary.worst ?? "unmeasured") as Exclude<AttentionLevel, "queue">;
  const tone = TONE[worst];
  const chips: AttentionItem[] = [...summary.faults, ...summary.unmeasured];

  return (
    <section
      aria-label="Attention"
      className="mb-4 rounded-[var(--adm-radius)] border p-3 md:p-4"
      style={{
        borderColor: `color-mix(in oklab, ${tone}, transparent 55%)`,
        background: `color-mix(in oklab, ${tone}, transparent 92%)`,
      }}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {/* role=status on the headline alone: it changes only when the state
            or the count does, which is what a live region should announce. */}
        <h2 role="status" className="font-sans text-[13px] font-semibold" style={{ color: tone }}>
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
  const tone = TONE[level];
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
        className="adm-control flex min-h-11 max-w-full items-center gap-2 rounded-[var(--adm-radius-sm)] border px-3 py-2 text-left"
        style={
          {
            borderColor: `color-mix(in oklab, ${tone}, transparent 55%)`,
            "--_bg": "var(--adm-panel)",
            "--_bg-hover": "var(--adm-hover)",
          } as React.CSSProperties
        }
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-[var(--adm-radius-pill)]"
          style={{ background: tone }}
        />
        <span className="shrink-0 font-sans text-[12.5px] font-semibold" style={{ color: tone }}>
          {item.word}
        </span>
        <span className="min-w-0 font-sans text-[12.5px] leading-snug" style={{ color: "var(--adm-ink)" }}>
          {item.label}
        </span>
        <span className="ml-1 shrink-0 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {action}
        </span>
      </button>
    </li>
  );
}
