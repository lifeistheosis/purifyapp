"use client";

// Whatever should happen next, from the attention summary. Lived inside
// HeroRow.tsx until the Summary replaced the hero row; the derivation and
// the four branches are unchanged.
//
// Faults outrank queues; a queue whose source did not answer outranks a
// queue that did, because "nothing is waiting" is a claim this card must
// not make on a partial read. The other queues ride along as rows so the
// count of everything waiting is on the card without opening anything.

import { LEVEL_WORD, type AttentionSummary } from "@/lib/admin/attention";
import { FeatureCard } from "./hero";

const QUEUE_SOURCES = new Set(["overview", "support", "verification", "community"]);

export function WaitingCard({
  summary,
  onOpenTab,
  onRetry,
}: {
  summary: AttentionSummary;
  onOpenTab: (id: string) => void;
  onRetry: (url: string) => void;
}) {
  const rows = summary.queues.map((q) => ({ label: q.label, onClick: () => onOpenTab(q.go.tab) }));
  const fault = summary.faults[0];
  const queueGaps = summary.unmeasured.filter((u) => QUEUE_SOURCES.has(u.source));
  // A queue that has not answered yet is not a gap, and not a zero either.
  // Without this, one failed non-queue source put the summary in "unknown",
  // skipped the checking branch, and the card said "No unpaid orders, no open
  // tickets" before support or verification had answered at all.
  const queueLoading = summary.loading.some((s) => QUEUE_SOURCES.has(s));

  if (fault) {
    return (
      <FeatureCard
        badge={fault.word}
        title={fault.title}
        body={fault.body}
        rows={rows}
        primary={
          fault.retryUrl && fault.level === "critical" && fault.source === "overview"
            ? { label: "Retry", onClick: () => onRetry(fault.retryUrl as string) }
            : { label: fault.go.label, onClick: () => onOpenTab(fault.go.tab) }
        }
        secondary={fault.also ? { label: fault.also.label, onClick: () => onOpenTab(fault.also!.tab) } : undefined}
      />
    );
  }

  if (queueGaps.length > 0) {
    const k = queueGaps.length;
    return (
      <FeatureCard
        badge={LEVEL_WORD.unmeasured}
        title="Cannot tell what is waiting"
        body={
          k === 1
            ? "1 of the queues did not answer, so this card cannot say nothing is waiting."
            : `${k} of the queues did not answer, so this card cannot say nothing is waiting.`
        }
        rows={rows}
        primary={{
          label: "Retry",
          onClick: () => queueGaps.forEach((u) => u.retryUrl && onRetry(u.retryUrl)),
        }}
      />
    );
  }

  if (queueLoading && summary.queues.length === 0) {
    return (
      <FeatureCard
        badge="Checking"
        title="Checking what is waiting"
        body="The queues have not answered yet. This card fills in the moment they do."
      />
    );
  }

  const top = summary.queues[0];
  if (top) {
    return (
      <FeatureCard
        badge={`${top.count ?? 0} waiting`}
        title={top.title}
        body={top.body}
        rows={rows.slice(1)}
        primary={{ label: top.go.label, onClick: () => onOpenTab(top.go.tab) }}
        secondary={top.also ? { label: top.also.label, onClick: () => onOpenTab(top.also!.tab) } : undefined}
      />
    );
  }

  return (
    <FeatureCard
      badge="Clear"
      title="Nothing is waiting"
      body="No unpaid orders, no open tickets, no requests, no reports. This card fills in when something needs a decision from you."
    />
  );
}
