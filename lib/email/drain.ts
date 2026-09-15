import { isQuotaExceeded } from "./send";
import type { SendOnceResult } from "./sendOnce";

/**
 * Work through a queue of sends, a few at a time, inside Resend's limits.
 *
 * The daily lifecycle job, a marketing list and the terms notice each had their
 * own copy of this loop, and none of them knew Resend has a plan behind it.
 * Found 2026-09-15, before the first real key was set: the welcome catch-up had
 * 172 accounts waiting, and the Free plan sends 100 emails a day for the whole
 * account. Uncapped, that one run spends the day's allowance at 11:00 UTC, and
 * every order confirmation and payment notice after it fails until midnight UTC
 * and is never retried.
 *
 * Two rules, both here so all three callers keep them:
 *
 *   CAP. `cap.limit` real attempts at most among the items `cap.applies` to. A
 *   real attempt is one that reached Resend: sent or failed. A duplicate or a
 *   skip cost nothing, so it hands its slot back. Items past the cap are
 *   deferred, and a caller whose queue is newest first defers the oldest.
 *
 *   QUOTA STOP. The first daily_quota_exceeded or monthly_quota_exceeded ends
 *   the drain. Nothing later in this run could get through, so everything left
 *   is deferred rather than sent to be refused.
 *
 * Every item is recorded exactly once, as a SendOnceResult status or "deferred".
 * A deferred item has no ledger row from this run, so the next run treats it as
 * new.
 */

export type DrainOutcome = SendOnceResult["status"] | "deferred";

export type DrainReport = {
  /** The Resend error name that stopped the drain, or null when nothing did. */
  quotaStop: string | null;
  /** Items left unsent because the quota stopped the drain. */
  deferredByQuota: number;
  /** Items left unsent because their cap was spent. */
  deferredByCap: number;
};

export async function drain<T>(
  items: readonly T[],
  opts: {
    concurrency: number;
    send: (item: T) => Promise<SendOnceResult>;
    record: (item: T, outcome: DrainOutcome) => void;
    cap?: { applies: (item: T) => boolean; limit: number };
  },
): Promise<DrainReport> {
  const report: DrainReport = { quotaStop: null, deferredByQuota: 0, deferredByCap: 0 };
  const queue = [...items];
  let slots = opts.cap?.limit ?? 0;

  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      if (report.quotaStop) {
        report.deferredByQuota += 1;
        opts.record(item, "deferred");
        continue;
      }

      const capped = opts.cap ? opts.cap.applies(item) : false;
      if (capped) {
        if (slots <= 0) {
          report.deferredByCap += 1;
          opts.record(item, "deferred");
          continue;
        }
        // Taken before the await, so four workers cannot all see the last slot.
        slots -= 1;
      }

      const result = await opts.send(item);
      if (capped && result.status !== "sent" && result.status !== "failed") slots += 1;
      if (result.status === "failed" && isQuotaExceeded(result.code)) report.quotaStop ??= result.code ?? null;
      opts.record(item, result.status);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  return report;
}

/** The line a report shows when the quota stopped a drain. */
export function quotaStopMessage(report: DrainReport): string | null {
  if (!report.quotaStop) return null;
  const which = report.quotaStop === "monthly_quota_exceeded" ? "monthly" : "daily";
  const n = report.deferredByQuota;
  const reset = which === "daily" ? "after midnight UTC" : "next month, or on a larger Resend plan";
  return `Resend's ${which} sending quota ran out, so ${n} email${n === 1 ? "" : "s"} did not go. They go ${reset} on the next run.`;
}
