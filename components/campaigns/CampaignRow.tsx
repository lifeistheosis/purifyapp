"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { WayPicture } from "@/components/prayers/mine/WayRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { isRunning, type ForWhom, type PublicCampaign } from "@/lib/campaigns/model";
import { campaignIcon, forWhomLabel, kindLabel, lengthTo, standingLabel } from "@/lib/campaigns/words";
import { getPrayerIcon } from "@/lib/prayers/icons";

/** A campaign's own page, at the address that works in the apps (a query, not a segment). */
export function campaignHref(id: string): string {
  return `/campaigns/detail?id=${encodeURIComponent(id)}`;
}

/**
 * One campaign as a row of a lit panel (.set-panel), drawn as Your rule's
 * rows are (components/prayers/mine/WayRow.tsx): the picture of its kind at
 * the start, its title and one line under it, the arrow at the end. A link,
 * where a way row is a button, because it opens the campaign's own page.
 *
 * Rows with a small picture each, never pills (his word of 2026-11-10: a list
 * of places to go gets a form of its own). Never a count of anyone.
 *
 * `onOpen`: for a row that stands on something laid over the page (a
 * profile's card), which steps aside as the campaign's page opens.
 */
export function CampaignRow({ id, forWhom, title, line, onOpen }: { id: string; forWhom: ForWhom; title: string; line: string; onOpen?: () => void }) {
  const icon = getPrayerIcon(campaignIcon(forWhom));
  return (
    <Link href={campaignHref(id)} onClick={onOpen} data-campaign-row="" className="set-link rule-way flex w-full items-center gap-3 text-start">
      {icon ? <WayPicture src={icon.src} focus="50% 22%" /> : null}
      <span className="min-w-0 flex-1">
        <span dir="auto" className="set-label break-words">{title}</span>
        {line ? <span className="set-desc">{line}</span> : null}
      </span>
      <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
    </Link>
  );
}

/**
 * A campaign of the board, or one of the reader's own, as a row: what it is
 * for and until when ("An illness · A week, to November 17"), or how it
 * stands once it is no longer running ("For the reposed · Waiting for a
 * moderator").
 */
export function BoardRow({ campaign, onOpen }: { campaign: PublicCampaign; onOpen?: () => void }) {
  const { t, tn, locale } = useTranslate();
  const standing = campaign.status === "active" && !isRunning(campaign) ? "campaigns.ended" : standingLabel(campaign.status);
  const what = campaign.for_whom === "departed" ? t(forWhomLabel("departed")) : t(kindLabel(campaign));
  const when = standing ? t(standing) : lengthTo(campaign, locale, t, tn);
  const line = when ? `${what} · ${when}` : what;
  // One kept to a circle says which circle first: a reader may be in several.
  return <CampaignRow id={campaign.id} forWhom={campaign.for_whom} title={campaign.title} line={campaign.circle ? `${campaign.circle.name} · ${line}` : line} onOpen={onOpen} />;
}
