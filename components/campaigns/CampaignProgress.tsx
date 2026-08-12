"use client";

/**
 * The reader's own progress on one campaign: their streak, the days they
 * have kept, and the daily reminder switch.
 *
 * Shown only to someone who has joined. It is a record of what they did, not
 * a prompt to do more: there is no target, no percentage toward a goal, no
 * "don't lose your streak", and the number is never used to make anyone
 * look. CONTRIBUTING is explicit that a streak may be shown when the reader
 * looks for it and may never be used to make them look.
 *
 * Today is forgiven by lib/campaigns/streak.ts, so this reads the same at
 * 6am as it did at midnight. A counter that resets every morning until the
 * app is opened is precisely the pressure that rule forbids.
 */

import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { fetchCampaignDays, setCampaignReminder } from "@/lib/campaigns/client";
import { rhythm, summarize, type CampaignDay } from "@/lib/campaigns/streak";
import { cn } from "@/lib/cn";

export function CampaignProgress({
  campaignId,
  joined,
  remindEnabled,
  onRemindChange,
}: {
  campaignId: string;
  joined: boolean;
  remindEnabled: boolean;
  onRemindChange: (next: boolean) => void;
}) {
  const { t, tn } = useTranslate();
  const [days, setDays] = useState<CampaignDay[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!joined) return;
    let alive = true;
    void fetchCampaignDays(campaignId).then((rows) => {
      if (alive) setDays(rows);
    });
    return () => {
      alive = false;
    };
  }, [campaignId, joined]);

  const toggleRemind = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const next = !remindEnabled;
    // Optimistic: the switch is the reader's own setting and should move
    // under their thumb, not after a round trip.
    onRemindChange(next);
    const res = await setCampaignReminder(campaignId, next);
    setBusy(false);
    if (!res.ok) {
      onRemindChange(!next);
      setError(res.error ?? t("campaigns.loadFailed"));
    }
  }, [busy, campaignId, onRemindChange, remindEnabled, t]);

  if (!joined) return null;

  const progress = summarize(days ?? []);
  const strip = rhythm(days ?? [], 14);

  return (
    <section className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {progress.streak > 0 ? (
          <p className="font-display-serif text-title-sm text-paper">
            {tn("campaigns.streak", progress.streak)}
          </p>
        ) : null}
        <p className="font-sans text-detail text-paper/55">
          {tn("campaigns.totalDays", progress.totalDays)}
        </p>
        {progress.prayedToday ? (
          <p className="font-sans text-detail text-gold-pale/80">
            {t("campaigns.prayedToday")}
          </p>
        ) : null}
      </div>

      {/* Fourteen days, oldest on the left. A quiet record, not a chart:
          no axis, no percentage, nothing to fill in. */}
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {strip.map((d) => (
          <span
            key={d.key}
            className={cn(
              "h-6 flex-1 rounded-sm transition-colors",
              d.kept ? "bg-gold/55" : "bg-paper/8",
            )}
          />
        ))}
      </div>
      {/* The same information, for a screen reader, without fourteen spans. */}
      <p className="sr-only">
        {tn("campaigns.totalDays", progress.totalDays)}
        {progress.longest > progress.streak
          ? ` ${t("campaigns.longestWas", { count: progress.longest })}`
          : ""}
      </p>

      {progress.longest > progress.streak && progress.longest > 2 ? (
        <p className="mt-3 font-sans text-caption text-paper/40">
          {t("campaigns.longestWas", { count: progress.longest })}
        </p>
      ) : null}

      <div className="mt-5 border-t border-paper/8 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-ui font-semibold text-paper">
              {t("campaigns.remindMe")}
            </p>
            <p className="mt-1 font-sans text-caption leading-relaxed text-paper/50">
              {t("campaigns.remindMeBody")}
            </p>
          </div>
          {/* Reachable from the surface it appears on, which the reminders
              bar in CONTRIBUTING requires: never only from a settings page
              three levels away. */}
          <button
            type="button"
            role="switch"
            aria-checked={remindEnabled}
            aria-label={
              remindEnabled
                ? t("campaigns.reminderOn")
                : t("campaigns.reminderOff")
            }
            onClick={() => void toggleRemind()}
            disabled={busy}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-pill border transition-colors disabled:opacity-50",
              remindEnabled
                ? "border-gold/50 bg-gold/25"
                : "border-paper/20 bg-paper/[0.06]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-paper transition-[left]",
                remindEnabled ? "left-[26px]" : "left-[3px]",
              )}
            />
          </button>
        </div>
        {error ? (
          <p className="mt-2 font-sans text-detail text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
