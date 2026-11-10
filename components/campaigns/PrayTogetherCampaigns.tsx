"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CampaignJoinSheet } from "@/components/campaigns/CampaignJoinSheet";
import { BoardRow, CampaignRow, campaignHref } from "@/components/campaigns/CampaignRow";
import { CampaignCard } from "@/components/community/CampaignCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Plus } from "@/components/ui/icons/Plus";
import { SkeletonList } from "@/components/ui/Skeleton";
import { carriedNow, type CarriedCampaign, type CarryPick } from "@/lib/campaigns/carried";
import { fetchBoard, fetchCircles, type BoardResult } from "@/lib/campaigns/client";
import type { PublicCampaign } from "@/lib/campaigns/model";
import { useCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { useCampaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";
import { useCarried } from "@/lib/campaigns/useCarried";
import { campaignIcon, dayText, forWhomLabel } from "@/lib/campaigns/words";
import type { RunningCampaign } from "@/lib/community/runningCampaign";
import { DEPARTED_PRAYER, departedPrayer } from "@/lib/prayers/commemoration";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { todayKey } from "@/lib/rhythm/dayKey";

/** How many of the board's rows Pray together shows before "See all". */
const SHOWN = 4;

/**
 * Prayer campaigns in Pray together (1.9), under its head: the campaign the
 * reader carries as the card the owner picked for it
 * (components/community/CampaignCard.tsx, r3-02), any others they carry as
 * rows, those running in the reader's own circles ("In your circles", for a
 * reader who has any), then "Newly asked" as rows with a small picture each,
 * and the way to start one.
 *
 * Nothing at all is drawn, and nothing is asked of anyone, unless campaigns
 * are open for this reader (lib/campaigns/useCampaignsOpen.ts): in a closed
 * build Pray together stands exactly as it did before campaigns were built.
 */
export function PrayTogetherCampaigns({ signedIn }: { signedIn: boolean }) {
  const open = useCampaignsOpen();
  return open ? <Campaigns signedIn={signedIn} /> : null;
}

function Campaigns({ signedIn }: { signedIn: boolean }) {
  const { t, locale } = useTranslate();
  const today = todayKey();
  const carried = carriedNow(useCarried(), today);
  const [board, setBoard] = useState<BoardResult | null>(null);
  // Campaigns kept to the reader's own circles: on no board, so this is where a member finds one.
  const [inCircles, setInCircles] = useState<PublicCampaign[]>([]);
  const [version, setVersion] = useState(0);
  const [moving, setMoving] = useState<CarriedCampaign | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useCampaignUpkeep(true);

  useEffect(() => {
    let live = true;
    void fetchBoard().then((res) => {
      if (live) setBoard(res);
    });
    return () => {
      live = false;
    };
  }, [version]);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void fetchCircles().then((found) => {
      if (live) setInCircles(found.campaigns);
    });
    return () => {
      live = false;
    };
  }, [signedIn, version]);

  const [first, ...rest] = carried;
  const pick: CarryPick | null = moving
    ? { id: moving.id, name: moving.name, title: moving.title, forWhom: moving.forWhom, prayer: moving.prayer, lastDay: moving.lastDay }
    : null;
  // Those the reader carries already stand above: the board's rows are the others.
  const mine = new Set(carried.map((c) => c.id));
  const asked = board?.state === "ok" ? board.campaigns.filter((c) => !mine.has(c.id)) : [];
  const circled = signedIn ? inCircles.filter((c) => !mine.has(c.id)) : [];
  const until = (c: CarriedCampaign) => t("prayers.diptychs.wallUntil", { date: dayText(c.until, locale) });

  function cardOf(c: CarriedCampaign): RunningCampaign {
    const icon = getPrayerIcon(campaignIcon(c.forWhom));
    return {
      id: c.id,
      title: c.title,
      eyebrow: `${t(forWhomLabel(c.forWhom))} · ${until(c)}`,
      picture: { src: icon?.src ?? "", alt: icon?.alt ?? "" },
      // The Church's prayer over the reposed, with the name where the book
      // prints NN.; over the living, the line the app's own prayers say.
      prayer:
        c.forWhom === "departed"
          ? { text: departedPrayer([c.name]).join(" "), source: DEPARTED_PRAYER.source }
          : { text: t("prayers.commemorate.living"), source: "" },
      href: `${campaignHref(c.id)}#campaign-prayer`,
      name: c.name,
      // The link names nobody, whatever the title says.
      shareTitle: t("community.prayerCampaigns"),
    };
  }

  return (
    <section aria-labelledby="campaigns-heading" data-campaigns="">
      <div className="flex items-center justify-between gap-3">
        <h2 id="campaigns-heading" className="min-w-0 font-heading text-lede leading-tight text-paper">
          {t("community.prayerCampaigns")}
        </h2>
        <Link
          href="/campaigns/new"
          className="tap-press hit-44 inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-pill border border-paper/[0.24] px-3 font-sans text-detail font-semibold text-paper transition-colors hover:border-paper/45"
        >
          <Plus size={15} />
          {t("shop.startACampaign")}
        </Link>
      </div>

      {first ? (
        <div className="mt-3">
          <CampaignCard campaign={cardOf(first)} added onAdd={() => setMoving(first)} />
          {notice ? (
            <p role="status" className="mt-2 px-1 font-sans text-caption text-paper/70">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="set-panel mt-3" data-campaigns-carried="">
          {rest.map((c) => (
            <CampaignRow key={c.id} id={c.id} forWhom={c.forWhom} title={c.title} line={`${t("community.wallInMyPrayers")} · ${until(c)}`} />
          ))}
        </div>
      ) : null}

      {circled.length > 0 ? (
        <>
          <h3 id="campaigns-circles" className="mt-5 font-sans text-detail font-semibold text-paper/80">
            {t("campaigns.inYourCircles")}
          </h3>
          <div className="set-panel mt-2" role="group" aria-labelledby="campaigns-circles" data-campaigns-circles="">
            {circled.map((c) => (
              <BoardRow key={c.id} campaign={c} />
            ))}
          </div>
        </>
      ) : null}

      <h3 id="campaigns-asked" className="mt-5 font-sans text-detail font-semibold text-paper/80">
        {t("campaigns.newlyAsked")}
      </h3>
      <div className="mt-2">
        {board === null ? (
          <div aria-busy aria-label={t("shop.gatheringTheCampaigns")}>
            <SkeletonList rows={2} />
          </div>
        ) : board.state !== "ok" ? (
          <p className="font-sans text-detail leading-relaxed text-paper/70">
            {t("campaigns.loadFailed")}{" "}
            <button
              type="button"
              onClick={() => {
                setBoard(null);
                setVersion((v) => v + 1);
              }}
              className="hit-44 font-semibold text-paper underline underline-offset-4"
            >
              {t("community.tryAgain")}
            </button>
          </p>
        ) : asked.length === 0 ? (
          <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.newlyAskedNone")}</p>
        ) : (
          // The rows stand in the panel themselves, as Your rule's do: the
          // carved line and the rounded ends are the panel's own children's.
          <div className="set-panel" role="group" aria-labelledby="campaigns-asked">
            {asked.slice(0, SHOWN).map((c) => (
              <BoardRow key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-5 font-sans text-detail font-semibold">
        <Link href="/campaigns" className="hit-44 inline-flex min-h-11 items-center text-paper underline underline-offset-4">
          {t("common.seeAll")}
        </Link>
        {signedIn ? (
          <Link href="/campaigns/mine" className="hit-44 inline-flex min-h-11 items-center text-paper underline underline-offset-4">
            {t("campaigns.mine.title")}
          </Link>
        ) : null}
      </p>

      <CampaignJoinSheet
        key={moving?.id ?? "none"}
        open={moving !== null}
        pick={pick}
        onClose={() => setMoving(null)}
        onDone={(message) => {
          setMoving(null);
          setNotice(message);
        }}
      />
    </section>
  );
}
