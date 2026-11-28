"use client";

import Link from "next/link";

import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { RunningCampaign } from "@/lib/community/runningCampaign";

/**
 * A prayer campaign on the overview, Pray together (1.8, the owner's pick of
 * r3-02: "B with A's top"): its own picture, the kind of campaign and its
 * days, and its name. Brief, and one tap (his words, 2026-11-28: "don't
 * actually show the prayer on the overview, the overview should be brief",
 * then "make the whole entire card a button you click and add the pray and
 * in my prayers somewhere"): the whole card opens the campaign's own page,
 * where the prayer stands whole and Pray, In my prayers and Share stand once
 * (components/campaigns/CampaignPage.tsx). One link, stretched over the card,
 * named by the campaign's title; no control inside it.
 */
export function CampaignCard({ campaign }: { campaign: RunningCampaign }) {
  return (
    <article data-campaign-card="" className="community-campaign relative overflow-hidden rounded-[18px] border border-paper/[0.09] transition-colors hover:border-paper/[0.2]">
      {/* At least as tall as the picture is wide, so the picture stays square beside two lines. */}
      <div className="flex min-h-[92px] gap-3">
        <div className="relative w-[92px] shrink-0">
          {/* Whole or not at all, as the wall's faces (build 85, note 52). */}
          <ArrivingImage
            src={campaign.picture.src}
            alt={campaign.picture.alt}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[44%_30%]"
          />
          <span aria-hidden className="community-campaign-edge absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1 self-center py-3">
          {campaign.eyebrow ? (
            <p className="text-balance font-sans text-caption font-semibold text-paper/55">{campaign.eyebrow}</p>
          ) : null}
          <h2 dir="auto" className="mt-1 font-heading text-[15.5px] font-semibold leading-[1.25] text-paper">
            <Link
              href={campaign.href}
              className="after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-paper/70"
            >
              {campaign.title}
            </Link>
          </h2>
        </div>
        <ChevronRight size={18} aria-hidden className="me-3 shrink-0 self-center text-paper/45 rtl:-scale-x-100" />
      </div>
    </article>
  );
}
