"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { askCampaignsAgain } from "@/lib/campaigns/useCampaignsOpen";

/**
 * What a campaign's address shows when campaigns are not this reader's to
 * open (1.9; found by the fresh-eyes walk of 2026-11-11). Until then such an
 * address drew the app's page for a link that leads nowhere, which says "the
 * page may not be built yet": false twice over, since the page is built and
 * the link is right.
 *
 * Two things can stand here, and they are not the same:
 *
 *   not open       the server answered, and its answer was no. Said plainly,
 *                  with a way on to Community.
 *   not reached    the server did not answer: no signal, or it failed. Said
 *                  in the words the board already uses for a read that
 *                  failed, with Try again. It is asked again by itself when
 *                  the signal returns (lib/campaigns/useCampaignsOpen.ts).
 *
 * Nothing of campaigns is drawn in either: no board, no name, no count.
 */
export function CampaignsClosed({ unreached }: { unreached: boolean }) {
  const { t } = useTranslate();
  return (
    <section data-campaigns-closed={unreached ? "unreached" : "closed"} className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="mx-auto w-full max-w-[520px] text-center">
        <h1 role={unreached ? "alert" : undefined} className="font-serif text-heading leading-[1.2] text-paper">
          {t(unreached ? "campaigns.loadFailed" : "campaigns.notOpen")}
        </h1>
        <div className="mt-8">
          {unreached ? (
            <button
              type="button"
              onClick={askCampaignsAgain}
              className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {t("community.tryAgain")}
            </button>
          ) : (
            <Link
              href="/community"
              className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper transition-colors hover:border-paper/45"
            >
              {t("nav.community")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
