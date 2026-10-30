"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Plus } from "@/components/ui/icons/Plus";
import { Share } from "@/components/ui/icons/Share";
import { cn } from "@/lib/cn";
import type { RunningCampaign } from "@/lib/community/runningCampaign";
import { shareLink } from "@/lib/site";
import { copyText } from "@/lib/ui/copyText";

/**
 * The campaign running now, under Pray together's head (1.8, the owner's
 * pick of r3-02: "B with A's top"). A's band, its own picture beside it, the
 * kind of campaign, its name, the Church's prayer word for word and the
 * printing it is from, then the three things a reader does with it: Pray
 * (the campaign's prayer, whole), Add to my prayers (the name goes into the
 * reader's own prayers, as a request on the wall does) and Share.
 *
 * No count of anyone praying, as the plan has it (r19/PRAYER-CAMPAIGNS.md:
 * "Nobody is counted"). Drawn only for a campaign that really runs
 * (lib/community/runningCampaign.ts); in 1.8 none does, so it is not drawn.
 */
export function CampaignCard({
  campaign,
  added,
  onAdd,
}: {
  campaign: RunningCampaign;
  /** The name is in the reader's prayers already. */
  added: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = shareLink(campaign.href);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: campaign.title, text: campaign.title, url });
      } catch {
        /* the reader closed the share sheet */
      }
      return;
    }
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <article data-campaign-card="" className="community-campaign overflow-hidden rounded-[18px] border border-paper/[0.09]">
      <div className="flex gap-3">
        <div className="relative w-[92px] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
          <img
            src={campaign.picture.src}
            alt={campaign.picture.alt}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[44%_30%]"
          />
          <span aria-hidden className="community-campaign-edge absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1 py-3 pe-3">
          {campaign.eyebrow ? (
            <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.1em] text-paper/55">{campaign.eyebrow}</p>
          ) : null}
          <h2 className="mt-1 font-heading text-[15.5px] font-semibold leading-[1.25] text-paper">{campaign.title}</h2>
          {/* The Church's words as printed, faded where the card ends: Pray opens them whole. */}
          <p className="community-campaign-prayer mt-1.5 font-serif text-[12.5px] italic leading-[1.45] text-paper/75">{campaign.prayer.text}</p>
          <p className="mt-1 font-sans text-[10.5px] text-paper/50">{campaign.prayer.source}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-paper/[0.06] px-3 py-2.5">
        <Link
          href={campaign.href}
          className="tap-press reader-lit inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-pill bg-paper px-3.5 font-sans text-ui font-semibold text-night"
        >
          <Lampada size={17} />
          {t("streak.pray")}
        </Link>
        <button
          type="button"
          onClick={onAdd}
          aria-haspopup="dialog"
          className={cn(
            "tap-press inline-flex h-[38px] min-w-0 items-center gap-1.5 rounded-pill border px-3 font-sans text-detail font-semibold",
            added ? "border-paper/40 text-paper" : "border-paper/25 text-paper/90 hover:border-paper/45",
          )}
        >
          {added ? <Check size={15} /> : <Plus size={15} />}
          <span className="truncate">{added ? t("community.wallInMyPrayers") : t("community.wallAdd")}</span>
        </button>
        <button
          type="button"
          onClick={() => void share()}
          aria-label={copied ? t("common.linkCopied") : t("common.share")}
          className="tap-press ms-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-paper/[0.18] text-paper/85 hover:text-paper"
        >
          {copied ? <Check size={15} /> : <Share size={16} />}
        </button>
      </div>
    </article>
  );
}
