"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  daysLeft,
  INTENTIONS,
  intentionLabel,
  statusLabel,
  type CampaignIntention,
  type PrayerCampaign,
} from "@/lib/campaigns/campaigns";
import { fetchCampaigns } from "@/lib/campaigns/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function CampaignsClient({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslate();
  const [campaigns, setCampaigns] = useState<PrayerCampaign[] | null>(null);
  const [intention, setIntention] = useState<CampaignIntention | null>(null);

  const load = useCallback(async (filter: CampaignIntention | null) => {
    setCampaigns(null);
    const list = await fetchCampaigns(filter ?? undefined);
    setCampaigns(list);
  }, []);

  useEffect(() => {
    // External-system effect (the campaigns API); state is set after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(intention);
  }, [intention, load]);

  return (
    <section
      className={
        embedded
          ? "bg-night px-5 pb-16 pt-8 md:px-8"
          : "min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14"
      }
    >
      <div className="relative mx-auto w-full max-w-[760px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-56 max-w-[560px] rounded-full bg-gold/[0.06] blur-3xl"
        />
        <header className="reveal-rise text-center" style={{ animationDelay: "40ms" }}>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold-pale/70">
            {t("shop.together")}
          </p>
          <h1 className="mt-3 font-display-serif text-display-sm font-bold text-paper">
            {t("nav.discoverMenu.campaigns")}
          </h1>
          <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
            {t("shop.prayWithTheFaithfulFor")}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 rounded-pill bg-paper px-5 py-3 font-sans text-ui font-semibold text-night transition-[transform,background-color] duration-150 hover:bg-paper/90 active:scale-[0.98]"
            >
              {t("shop.startACampaign")}
            </Link>
            <Link
              href="/campaigns/mine"
              className="inline-flex items-center gap-2 rounded-pill border border-paper/20 px-5 py-3 font-sans text-ui font-semibold text-paper/80 transition-[transform,border-color] duration-150 hover:border-paper/40 active:scale-[0.98]"
            >
              {t("shop.myPrayers")}
            </Link>
          </div>
        </header>

        {/* Intention filter */}
        <div
          className="reveal-rise mt-8 flex flex-wrap justify-center gap-2"
          style={{ animationDelay: "120ms" }}
        >
          <FilterChip
            label={t("common.all")}
            active={intention === null}
            onClick={() => setIntention(null)}
          />
          {INTENTIONS.map((i) => (
            <FilterChip
              key={i.slug}
              label={i.label}
              active={intention === i.slug}
              onClick={() => setIntention(i.slug)}
            />
          ))}
        </div>

        {/* List */}
        <div className="mt-8 space-y-3">
          {campaigns === null ? (
            <p className="py-10 text-center font-sans text-ui text-paper/40">
              {t("shop.gatheringTheCampaigns")}
            </p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
              <p className="font-serif text-lede text-paper/80">
                {t("shop.noCampaignsHereYet")}
              </p>
              <p className="mt-2 font-sans text-ui text-paper/55">
                {t("shop.beTheFirstToAsk")}
              </p>
            </div>
          ) : (
            campaigns.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-1.5 font-sans text-caption font-semibold transition-[transform,border-color,background-color,color] duration-150 active:scale-95 ${
        active
          ? "border-gold/50 bg-gold/10 text-gold-pale"
          : "border-paper/15 text-paper/60 hover:border-paper/30"
      }`}
    >
      {label}
    </button>
  );
}

function CampaignCard({
  campaign,
  index,
}: {
  campaign: PrayerCampaign;
  index: number;
}) {
  const { t } = useTranslate();
  const closed = statusLabel(campaign.status);
  const left = campaign.status === "active" ? daysLeft(campaign.ends_at) : null;
  return (
    <Link
      href={`/campaigns/detail?id=${campaign.id}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      className="reveal-rise block overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03] transition-[transform,border-color] duration-150 hover:border-gold/30 active:scale-[0.99]"
    >
      {campaign.image_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element -- images are
              unoptimized in the static export; a plain img keeps the native
              shell and the web on one code path. */}
          <img
            src={campaign.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {/* Scrim so the pills below never sit on a bright photo edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-night/70 to-transparent"
          />
        </div>
      ) : null}
      <div className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[0.5px] text-gold-pale">
          {intentionLabel(campaign.intention)}
        </span>
        {left != null ? (
          <span className="rounded-pill border border-paper/15 px-2.5 py-0.5 font-sans text-eyebrow font-semibold text-paper/55">
            {left === 0 ? "Last day" : left === 1 ? "1 day left" : `${left} days left`}
          </span>
        ) : null}
        {closed ? (
          <span className="font-sans text-caption text-paper/50">{closed}</span>
        ) : null}
      </div>
      <p className="mt-3 font-display-serif text-title-sm text-paper">
        {campaign.title}
      </p>
      {campaign.subject_name ? (
        <p className="mt-0.5 font-sans text-caption text-paper/50">
          {t("community.forName", { name: campaign.subject_name })}
        </p>
      ) : null}
      {campaign.note ? (
        <p className="mt-1.5 line-clamp-2 font-sans text-ui leading-relaxed text-paper/60">
          {campaign.note}
        </p>
      ) : null}
      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
        <p className="font-sans text-caption text-paper/55">
          <span className="font-semibold text-gold-pale">
            {campaign.praying_count === 1
              ? "1 person praying"
              : `${campaign.praying_count} praying`}
          </span>
          {campaign.prayer_count > 0
            ? ` · ${campaign.prayer_count} prayers offered`
            : ""}
        </p>
        <span className="shrink-0 font-sans text-caption font-semibold text-paper/45">
          {t("community.join")}
        </span>
      </div>
      </div>
    </Link>
  );
}
