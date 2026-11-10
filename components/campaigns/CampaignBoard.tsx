"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BoardRow } from "@/components/campaigns/CampaignRow";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { WayPlate } from "@/components/prayers/mine/WayRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Plus } from "@/components/ui/icons/Plus";
import { Scroll } from "@/components/ui/icons/Scroll";
import { SkeletonList } from "@/components/ui/Skeleton";
import { fetchBoard, type BoardResult } from "@/lib/campaigns/client";
import { useCampaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";

/** The id of the page's own heading: its bar takes the name once this has gone up under it. */
export const BOARD_TITLE = "campaigns-title";

const DOOR_ROW = "set-link rule-way flex w-full items-center gap-3 text-start";

/**
 * Every campaign running now (1.9.1), where "See all" under Pray together
 * leads: the page's name and its one line, the way to start one, the
 * campaigns as rows of one lit panel, newest first, and under them the
 * reader's own and the rules. A choice of kind behind the sliders comes with
 * the campaigns to choose among (phase 4 of docs/1.9-build/notes/
 * campaigns-fable.md); until then the board is one list.
 *
 * Nobody is counted, here or anywhere: a row says what a campaign is for and
 * until when.
 */
export function CampaignBoard() {
  const { t } = useTranslate();
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [version, setVersion] = useState(0);
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

  return (
    <section data-campaign-board="" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[640px]">
        <header>
          <h1 id={BOARD_TITLE} className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper">
            {t("community.prayerCampaigns")}
          </h1>
          <p className="mt-3 max-w-[58ch] font-serif text-[15px] italic leading-[1.5] text-paper/70">{t("shop.prayWithTheFaithfulFor")}</p>
          <Link
            href="/campaigns/new"
            className="tap-press reader-lit mt-5 inline-flex min-h-11 items-center gap-2 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night"
          >
            <Plus size={17} />
            {t("shop.startACampaign")}
          </Link>
        </header>

        <h2 id="board-asked" className="mt-9 font-sans text-detail font-semibold text-paper/80">
          {t("campaigns.newlyAsked")}
        </h2>
        <div className="mt-2">
          {board === null ? (
            <div aria-busy aria-label={t("shop.gatheringTheCampaigns")}>
              <SkeletonList rows={4} />
            </div>
          ) : board.state !== "ok" ? (
            <p role="alert" className="font-sans text-detail leading-relaxed text-paper/70">
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
          ) : board.campaigns.length === 0 ? (
            <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.newlyAskedNone")}</p>
          ) : (
            <div className="set-panel" role="group" aria-labelledby="board-asked">
              {board.campaigns.map((c) => (
                <BoardRow key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>

        {/* The reader's own, and the rules, as rows of a panel of their own. */}
        <div className="set-panel mt-9">
          <Link href="/campaigns/mine" className={DOOR_ROW}>
            <WayPlate>
              <Lampada size={18} />
            </WayPlate>
            <span className="min-w-0 flex-1">
              <span className="set-label">{t("campaigns.mine.title")}</span>
            </span>
            <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
          </Link>
          <Link href="/campaigns/rules" className={DOOR_ROW}>
            <WayPlate>
              <Scroll size={18} />
            </WayPlate>
            <span className="min-w-0 flex-1">
              <span className="set-label">{t("campaigns.rules.title")}</span>
            </span>
            <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
          </Link>
        </div>

        <p className="mt-9 border-t border-paper/10 pt-5 font-sans text-caption leading-[1.6] text-paper/70">{t("shop.campaignsAreThePrayersOf")}</p>
      </div>
    </section>
  );
}
