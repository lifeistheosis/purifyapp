"use client";

import Link from "next/link";
import { useRef } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { plusFeaturesNow, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { gatheringHref } from "@/lib/florilegium/href";
import { keptStarter, starterById, starterItems, starterPicture, starterReference, type Starter } from "@/lib/florilegium/starters";
import { useCoversVersion } from "@/lib/readAloud/useCovers";
import { useMounted } from "@/lib/useMounted";

import { FLOR_BUTTON, FLOR_H1, FLOR_KICKER, FLOR_PLATE, FLOR_ROW, FLOR_TITLE, FLOR_TRAY } from "./florStyle";
import { useBookName } from "./useBookName";

/**
 * A starter's own page (1.9, build 89 note 6, "where it leads to"): one of
 * the four whole passages of Scripture a reader may begin with
 * (lib/florilegium/starters.ts). It was a bare sheet: the reference, Keep,
 * and the passage in small type; and Keep left the sheet for the new
 * gathering before the reader had seen that anything was kept.
 *
 *   the head      the tile's picture, on its plate, carried in from the tile
 *                 (lib/ui/routeMotion.ts, build 89 note 4), the passage's
 *                 name in Lora, and where it is from and how many lines it
 *                 keeps, as a prayer's page is headed
 *                 (components/prayers/service/ServiceHeader.tsx).
 *   one action    Keep this gathering. Once kept the button gives way to a
 *                 row that says so in words, "In your gatherings", and opens
 *                 the reader's own copy. The page stays where it is.
 *   the passage   set to read: a verse a line, as it will be kept, in the
 *                 size the app reads Scripture at, its verse numbers small
 *                 beside it.
 *
 * Keeping is Plus's, like every way of gathering: the button is shown to
 * every reader, with the Plus mark where it is locked, and there it opens
 * the upgrade sheet named for the Florilegium (lib/entitlements/
 * usePlusFeatures.ts). The passage itself is Scripture, and anyone reads it.
 *
 * The words are the app's own Bible's, in English, whatever the reader's
 * language (data/florilegium/starters.json): they say so to a screen reader,
 * and are set from the left in a page that reads from the right, where a
 * line of English otherwise ends with its full stop at the wrong end.
 */
export function StarterPage({ id }: { id: string }) {
  useCoversVersion();
  const { t, tn } = useTranslate();
  const { florilegia, create, addItem } = useFlorilegia();
  const mounted = useMounted();
  const bookName = useBookName();
  const upgrade = useUpgradeModal();
  const locked = usePlusFeatures() === false;
  // One tap keeps once, however fast a second follows while Plus is asked.
  const keeping = useRef(false);

  const starter = starterById(id);
  if (!starter) return null;

  const name = t(starter.nameKey);
  const reference = starterReference(starter, bookName(starter.book));
  const kept = mounted ? keptStarter(florilegia, name, reference) : undefined;
  const picture = starterPicture(starter);

  function keep(s: Starter) {
    if (keeping.current) return;
    keeping.current = true;
    void plusFeaturesNow()
      .then((ok) => {
        if (ok === false) {
          upgrade.open("florilegium");
          return;
        }
        const id = create(t(s.nameKey), starterReference(s, bookName(s.book)));
        for (const item of starterItems(s, bookName(s.book))) addItem(id, item);
      })
      .finally(() => {
        keeping.current = false;
      });
  }

  return (
    <section data-starter-page={starter.id} className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      <div className="cascade cascade-tight mx-auto w-full max-w-[640px]">
        {/* On a computer, the way back up to the Florilegium; a phone has the bar's. */}
        <p className="mb-6 hidden font-sans text-detail font-semibold text-paper/55 md:block native-md-hidden">
          <Link href="/florilegium" className="hover:text-paper">
            {t("study.florilegium.title")}
          </Link>
        </p>

        <header className="flex flex-col items-center text-center">
          <span
            aria-hidden
            data-carry-into={picture.src}
            className="relative block aspect-[4/5] w-[132px] shrink-0 overflow-hidden rounded-[16px] bg-night-soft shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
          >
            <CoverArt src={picture.src} fallback={picture.fallback} size={264} className="absolute inset-0 h-full w-full" />
            <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/10" />
          </span>
          <h1 id={FLOR_TITLE} className={cn(FLOR_H1, "mt-6 text-balance")}>
            {name}
          </h1>
          <p className={FLOR_KICKER}>
            {reference} · <span className="tabular-nums">{tn("study.florilegium.lineCount", starter.lines.length)}</span>
          </p>
        </header>

        {/* Said aloud when it changes: a reader who cannot see the button give way to the row hears that it is kept. */}
        <div className="mt-6" data-starter-action="" aria-live="polite">
          {kept ? (
            // Kept, in words, with the way to open it (build 89 note 6).
            <div className={FLOR_TRAY} data-starter-kept="">
              <Link href={gatheringHref(kept.id)} className={FLOR_ROW}>
                <span aria-hidden className={FLOR_PLATE}>
                  <Check size={18} />
                </span>
                <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("study.florilegium.inYours")}</span>
                <span className="shrink-0 font-sans text-detail font-semibold text-paper/75">{t("journal.composer.open")}</span>
                <ChevronRight size={14} aria-hidden className="shrink-0 text-paper/45 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : locked ? (
            <button
              type="button"
              onClick={() => keep(starter)}
              data-starter-keep=""
              className="tap-press inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-pill border border-paper/20 bg-paper/[0.05] px-6 font-sans text-ui font-semibold text-paper transition-colors hover:bg-paper/10"
            >
              {t("study.florilegium.keepStarter")}
              <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span>
            </button>
          ) : (
            <button type="button" onClick={() => keep(starter)} data-starter-keep="" className={FLOR_BUTTON}>
              {t("study.florilegium.keepStarter")}
            </button>
          )}
        </div>

        <ol lang="en" dir="ltr" className="mt-8 space-y-3.5" data-starter-passage="">
          {starter.lines.map((l) => (
            <li key={l.verse} className="flex gap-3 font-serif text-[17px] leading-[1.7] text-paper/90">
              <span aria-hidden className="w-6 shrink-0 pt-[5px] text-end font-sans text-caption tabular-nums text-paper/55">
                {l.verse}
              </span>
              <span className="min-w-0">{l.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
