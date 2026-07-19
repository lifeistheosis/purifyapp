"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  INTENTIONS,
  intentionLabel,
  statusLabel,
  type CampaignIntention,
  type PrayerCampaign,
} from "@/lib/campaigns/campaigns";
import { fetchCampaigns } from "@/lib/campaigns/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function CampaignsClient() {
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
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[760px]">
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
  const closed = statusLabel(campaign.status);
  return (
    <Link
      href={`/campaigns/detail?id=${campaign.id}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      className="reveal-rise block rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 transition-[transform,border-color] duration-150 hover:border-paper/25 active:scale-[0.99]"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-pill border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[0.5px] text-gold-pale">
          {intentionLabel(campaign.intention)}
        </span>
        {closed ? (
          <span className="font-sans text-caption text-paper/50">{closed}</span>
        ) : null}
      </div>
      <p className="mt-3 font-display-serif text-title-sm text-paper">
        {campaign.title}
      </p>
      {campaign.note ? (
        <p className="mt-1.5 line-clamp-2 font-sans text-ui leading-relaxed text-paper/60">
          {campaign.note}
        </p>
      ) : null}
      <p className="mt-3 font-sans text-caption text-paper/45">
        {campaign.praying_count === 1
          ? "1 person praying"
          : `${campaign.praying_count} praying`}
        {campaign.prayer_count > 0
          ? ` · ${campaign.prayer_count} prayers offered`
          : ""}
      </p>
    </Link>
  );
}
