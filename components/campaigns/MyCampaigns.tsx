"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BoardRow, CampaignRow } from "@/components/campaigns/CampaignRow";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SkeletonList } from "@/components/ui/Skeleton";
import { carriedNow } from "@/lib/campaigns/carried";
import { fetchMine, type MineResult } from "@/lib/campaigns/client";
import { useCampaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";
import { useCarried } from "@/lib/campaigns/useCarried";
import { dayText } from "@/lib/campaigns/words";
import { todayKey } from "@/lib/rhythm/dayKey";

/** The id of the page's own heading: its bar takes the name once this has gone up under it. */
export const MINE_TITLE = "my-campaigns-title";

/**
 * The reader's own campaigns (1.9.1), reached from You and from the board:
 * those they are praying, and those they started.
 *
 * Those they are praying are read from this device (lib/campaigns/
 * carried.ts), so the list needs no account and no signal, and says until
 * when each stands in their prayers. Those they started are asked of the
 * server and need an account; each says how it stands, so its creator finds
 * here the one still waiting for a moderator.
 */
export function MyCampaigns() {
  const { t, locale } = useTranslate();
  const carried = carriedNow(useCarried(), todayKey());
  const [mine, setMine] = useState<MineResult | null>(null);
  const [version, setVersion] = useState(0);
  useCampaignUpkeep(true);

  useEffect(() => {
    let live = true;
    void fetchMine().then((res) => {
      if (live) setMine(res);
    });
    return () => {
      live = false;
    };
  }, [version]);

  return (
    <section data-my-campaigns="" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 id={MINE_TITLE} className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {t("campaigns.mine.title")}
        </h1>

        <h2 id="mine-carried" className="mt-8 font-sans text-detail font-semibold text-paper/80">
          {t("shop.campaignsYouArePraying")}
        </h2>
        <div className="mt-2">
          {carried.length === 0 ? (
            <p className="font-sans text-detail leading-relaxed text-paper/70">{t("shop.youHaveNotJoinedA")}</p>
          ) : (
            <div className="set-panel" role="group" aria-labelledby="mine-carried">
              {carried.map((c) => (
                <CampaignRow key={c.id} id={c.id} forWhom={c.forWhom} title={c.title} line={t("prayers.diptychs.wallUntil", { date: dayText(c.until, locale) })} />
              ))}
            </div>
          )}
        </div>

        <h2 id="mine-started" className="mt-9 font-sans text-detail font-semibold text-paper/80">
          {t("shop.campaignsYouStarted")}
        </h2>
        <div className="mt-2">
          {mine === null ? (
            <div aria-busy aria-label={t("shop.gatheringTheCampaigns")}>
              <SkeletonList rows={2} />
            </div>
          ) : mine.state !== "ok" ? (
            <p role="alert" className="font-sans text-detail leading-relaxed text-paper/70">
              {t("campaigns.loadFailed")}{" "}
              <button
                type="button"
                onClick={() => {
                  setMine(null);
                  setVersion((v) => v + 1);
                }}
                className="hit-44 font-semibold text-paper underline underline-offset-4"
              >
                {t("community.tryAgain")}
              </button>
            </p>
          ) : !mine.signedIn ? (
            <p className="font-sans text-detail leading-relaxed text-paper/70">
              {t("campaigns.mine.signIn")}{" "}
              <Link href="/signin?next=/campaigns/mine" className="hit-44 font-semibold text-paper underline underline-offset-4">
                {t("common.signIn")}
              </Link>
            </p>
          ) : mine.started.length === 0 ? (
            <p className="font-sans text-detail leading-relaxed text-paper/70">{t("shop.youHaveNotStartedA")}</p>
          ) : (
            <div className="set-panel" role="group" aria-labelledby="mine-started">
              {mine.started.map((c) => (
                <BoardRow key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>

        <p className="mt-9 flex flex-wrap gap-x-5 font-sans text-detail font-semibold">
          <Link href="/campaigns/new" className="hit-44 inline-flex min-h-11 items-center text-paper underline underline-offset-4">
            {t("shop.startACampaign")}
          </Link>
          <Link href="/campaigns/rules" className="hit-44 inline-flex min-h-11 items-center text-paper underline underline-offset-4">
            {t("campaigns.rules.title")}
          </Link>
        </p>
      </div>
    </section>
  );
}
