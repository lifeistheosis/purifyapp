"use client";

/**
 * The reader's own state on one campaign: whether today is marked, and the
 * daily reminder switch.
 *
 * WHAT THIS USED TO SHOW, and why it does not. Four figures lived here: a
 * streak, a running total of days prayed, a personal best ("your longest was
 * n"), and a fourteen-cell strip filling in behind them. The docblock argued
 * they were a record rather than a prompt, and cited CONTRIBUTING's rule that
 * a streak may be shown when the reader looks for it and never used to make
 * them look.
 *
 * That argument holds for a fast or a reading. It does not hold for prayer.
 * A personal best on a prayer rule is an invitation to compare this month's
 * praying with last month's, and there is no version of that comparison which
 * is not either pride or despondency. The figures are gone.
 *
 * WHAT REMAINS, and why it is not the same thing. "You have prayed today" is
 * a fact about today, not a tally: it counts nothing, it accumulates nothing,
 * and it is the same sentence on the first day as on the four hundredth. It
 * exists so a reader who cannot remember whether they already prayed for this
 * intention can find out without praying twice by accident.
 */

import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { fetchCampaignDays, setCampaignReminder } from "@/lib/campaigns/client";
import { summarize, type CampaignDay } from "@/lib/campaigns/streak";
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
  const { t } = useTranslate();
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

  // One boolean out of the whole summary. `summarize` still returns the
  // streak, the total and the longest run, because lib/campaigns/streak.ts is
  // also read by the admin panel's own KPI records; nothing on this screen
  // reads them any more.
  const prayedToday = summarize(days ?? []).prayedToday;

  return (
    <section className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      {prayedToday ? (
        <p className="font-sans text-detail text-gold-pale/80">
          {t("campaigns.prayedToday")}
        </p>
      ) : null}

      <div className={cn("border-t border-paper/8 pt-4", prayedToday && "mt-5")}>
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
