"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  canPrayAgain,
  intentionLabel,
  statusLabel,
  suggestedPrayer,
  type PrayerCampaign,
} from "@/lib/campaigns/campaigns";
import {
  closeCampaign,
  fetchCampaign,
  leaveCampaign,
  prayCampaign,
  reportCampaign,
} from "@/lib/campaigns/client";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "missing" | "ready";

export function CampaignDetailClient() {
  const id = useSearchParams().get("id") ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [campaign, setCampaign] = useState<PrayerCampaign | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [lastPrayedAt, setLastPrayedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setPhase("missing");
      return;
    }
    const c = await fetchCampaign(id);
    if (!c) {
      setPhase("missing");
      return;
    }
    setCampaign(c);
    // Your own prayer state for this campaign (self-select RLS).
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      if (user) {
        const { data: row } = await supabase
          .from("prayer_campaign_prayers")
          .select("last_prayed_at")
          .eq("campaign_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (row) {
          setJoined(true);
          setLastPrayedAt((row as { last_prayed_at: string | null }).last_prayed_at);
        }
      }
    } catch {
      /* signed out or offline: treat as not joined */
    }
    setPhase("ready");
  }, [id]);

  useEffect(() => {
    // External-system effect (the campaigns API + Supabase); state set after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onPray = useCallback(async () => {
    if (busy || !campaign) return;
    setBusy("pray");
    setNote(null);
    const res = await prayCampaign(campaign.id);
    if (res.ok) {
      if (res.alreadyToday) {
        setNote("You have already prayed this today. Thank you.");
      } else {
        setLastPrayedAt(new Date().toISOString());
        if (!joined) {
          setJoined(true);
          setCampaign({
            ...campaign,
            praying_count: campaign.praying_count + 1,
            prayer_count: campaign.prayer_count + 1,
          });
        } else {
          setCampaign({ ...campaign, prayer_count: campaign.prayer_count + 1 });
        }
      }
    } else {
      setNote(res.error ?? "Couldn't record it.");
    }
    setBusy(null);
  }, [busy, campaign, joined]);

  const onLeave = useCallback(async () => {
    if (busy || !campaign) return;
    setBusy("leave");
    const res = await leaveCampaign(campaign.id);
    if (res.ok) {
      setJoined(false);
      setLastPrayedAt(null);
      setCampaign({
        ...campaign,
        praying_count: Math.max(0, campaign.praying_count - 1),
      });
    }
    setBusy(null);
  }, [busy, campaign]);

  const onReport = useCallback(async () => {
    if (busy || !campaign) return;
    setBusy("report");
    const res = await reportCampaign(campaign.id);
    if (res.ok) setReported(true);
    else setNote(res.error ?? "Couldn't send the report.");
    setBusy(null);
  }, [busy, campaign]);

  const onClose = useCallback(
    async (status: "answered" | "memory_eternal") => {
      if (busy || !campaign) return;
      setBusy("close");
      const res = await closeCampaign(campaign.id, status);
      if (res.ok) setCampaign({ ...campaign, status });
      else setNote(res.error ?? "Couldn't update.");
      setBusy(null);
    },
    [busy, campaign],
  );

  if (phase === "loading") {
    return <Centered>Opening the campaign…</Centered>;
  }
  if (phase === "missing" || !campaign) {
    return (
      <Centered>
        <p className="font-serif text-lede text-paper/80">
          This campaign could not be found.
        </p>
        <Link
          href="/campaigns"
          className="mt-4 inline-flex rounded-pill border border-paper/20 px-4 py-2 font-sans text-ui text-paper/80 hover:border-paper/40"
        >
          Back to campaigns
        </Link>
      </Centered>
    );
  }

  const closed = statusLabel(campaign.status);
  const isCreator = userId != null && userId === campaign.creator_id;
  const prayedToday = joined && !canPrayAgain(lastPrayedAt);
  const isActive = campaign.status === "active";

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        <Link
          href="/campaigns"
          className="font-sans text-caption text-paper/50 hover:text-paper/80"
        >
          ← All campaigns
        </Link>

        <div className="mt-5 flex items-center gap-2">
          <span className="rounded-pill border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[0.5px] text-gold-pale">
            {intentionLabel(campaign.intention)}
          </span>
          {closed ? (
            <span className="font-sans text-caption font-semibold text-gold-pale/80">
              {closed}
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 font-display-serif text-title text-paper">
          {campaign.title}
        </h1>
        {campaign.subject_name ? (
          <p className="mt-1 font-sans text-ui text-paper/60">
            {campaign.for_whom === "departed"
              ? `For the repose of ${campaign.subject_name}`
              : `For ${campaign.subject_name}`}
          </p>
        ) : null}
        {campaign.note ? (
          <p className="mt-4 font-serif text-body leading-[1.7] text-paper/85">
            {campaign.note}
          </p>
        ) : null}

        <p className="mt-5 font-sans text-caption text-paper/45">
          {campaign.praying_count === 1
            ? "1 person praying"
            : `${campaign.praying_count} praying`}
          {campaign.prayer_count > 0
            ? ` · ${campaign.prayer_count} prayers offered`
            : ""}
        </p>

        {/* Suggested prayer */}
        <div className="mt-7 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
            Pray
          </p>
          <p className="mt-2.5 font-serif text-lede italic leading-[1.7] text-paper/90">
            {suggestedPrayer(campaign.intention, campaign.for_whom)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6">
          {note ? (
            <p className="mb-3 font-sans text-caption text-gold-pale/80">{note}</p>
          ) : null}

          {!isActive ? (
            <p className="font-sans text-ui text-paper/55">
              This campaign has closed. Glory to God for every prayer offered.
            </p>
          ) : userId == null ? (
            <Link
              href={`/signin?next=/campaigns/detail?id=${campaign.id}`}
              className="inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90"
            >
              Sign in to pray
            </Link>
          ) : prayedToday ? (
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center rounded-pill border border-gold/40 bg-gold/[0.08] px-6 py-4 font-display-serif text-lede text-gold-pale"
            >
              Prayed today
            </button>
          ) : (
            <button
              type="button"
              onClick={onPray}
              disabled={busy !== null}
              className="inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90 disabled:opacity-50"
            >
              {busy === "pray" ? "…" : joined ? "Pray today" : "Join and pray"}
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-sans text-caption text-paper/45">
            {joined && isActive ? (
              <button
                type="button"
                onClick={onLeave}
                disabled={busy !== null}
                className="hover:text-paper/80 disabled:opacity-50"
              >
                Remove from my prayers
              </button>
            ) : null}
            {userId != null && !isCreator ? (
              reported ? (
                <span>Reported. Thank you.</span>
              ) : (
                <button
                  type="button"
                  onClick={onReport}
                  disabled={busy !== null}
                  className="hover:text-paper/80 disabled:opacity-50"
                >
                  Report
                </button>
              )
            ) : null}
          </div>

          {/* Creator controls */}
          {isCreator && isActive ? (
            <div className="mt-6 border-t border-paper/8 pt-5">
              <p className="text-center font-sans text-caption text-paper/45">
                When the time comes, you can close this campaign.
              </p>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onClose("answered")}
                  disabled={busy !== null}
                  className="rounded-pill border border-paper/20 px-4 py-2 font-sans text-caption font-semibold text-paper/80 hover:border-paper/40 disabled:opacity-50"
                >
                  Mark answered
                </button>
                {campaign.for_whom === "departed" ? (
                  <button
                    type="button"
                    onClick={() => onClose("memory_eternal")}
                    disabled={busy !== null}
                    className="rounded-pill border border-paper/20 px-4 py-2 font-sans text-caption font-semibold text-paper/80 hover:border-paper/40 disabled:opacity-50"
                  >
                    Memory eternal
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <p className="mt-8 border-t border-paper/8 pt-5 text-center font-sans text-caption leading-[1.6] text-paper/40">
          Campaigns are the prayers of the faithful, not the teaching of the
          Church. Pray with discernment, and take what troubles you to your
          priest.
        </p>
      </div>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center bg-night px-6 text-center">
      <div className="font-sans text-ui text-paper/60">{children}</div>
    </section>
  );
}
