import type { CSSProperties } from "react";

import type { Saint } from "@/lib/saints/saints";
import { heroTitle } from "@/lib/saints/page";
import { cn } from "@/lib/cn";
import { T } from "@/components/i18n/T";
import { ShareButton } from "@/components/ui/ShareButton";
import { BookmarkSaintButton } from "./BookmarkSaintButton";
import { BumpButton } from "./BumpButton";
import { FeastDays } from "./FeastDays";
import { SaintHeroPicture } from "./SaintHeroPicture";

type Props = {
  saint: Pick<Saint, "slug" | "name" | "epithet" | "feastDays" | "iconUrl" | "complete">;
  /** The saint's hero picture (lib/saints/heroes.ts), its address decided by the build. */
  hero: { src: string; width: number; height: number } | null;
  bump: { bumped: boolean; total: number; signedIn: boolean };
};

/**
 * The head of a saint's page: the top of round 3b D, "Fade and doors" (1.8,
 * the owner's pick of 2026-10-27), over the 1.7 page of his note 19.
 *
 * On a phone: the icon fills the top of the screen and fades in as the page
 * opens (SaintHeroPicture), the name in Lora set over its foot, at the
 * start of the line as the design draws it, and under it his title and his
 * feast day; then one row, what asking for his writings means, the request,
 * and Share; then the doors (SaintDoors), each arriving after the one above.
 * Save is in the top bar beside the way back on a phone, as the design puts
 * it (the page passes it to MobileTopBar), and at the end of the row on a
 * computer, which has no such bar.
 *
 * The design's row opens with "Listen to his Life". No saint's Life has a
 * recording in the app yet (read-aloud covers the Bible), so the request
 * keeps that place until one does, rather than a button with nothing to play.
 *
 * Without a sharp picture of him, the icon stands at its own size on its
 * plate and the name is centred under it, as before. On a tablet and a
 * computer the picture stands beside the name.
 *
 * The h1 carries the id the top bar watches: the bar's name arrives when
 * this one has scrolled away (MobileTopBar, revealTitleOn).
 */
export function SaintHero({ saint, hero, bump }: Props) {
  const title = heroTitle(saint.epithet);
  const picture = Boolean(hero || saint.iconUrl);
  return (
    <header
      className={cn(
        "pb-5 md:grid md:items-end md:gap-10 md:pb-10 md:pt-14",
        picture ? "md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]" : "pt-8",
      )}
    >
      {picture ? <SaintHeroPicture name={saint.name} iconUrl={saint.iconUrl} hero={hero} /> : null}
      <div className={cn(hero ? "relative -mt-28 text-start md:mt-0" : "mt-6 text-center md:mt-0 md:text-start")}>
        <div className="saint-head-in" style={{ "--i": 1 } as CSSProperties}>
          <h1 id="saint-name" className="text-title leading-[1.1] text-balance text-paper md:text-display">
            {saint.name}
          </h1>
          <p className="mt-2 font-sans text-ui leading-snug text-paper/70">
            {title ? (
              <>
                {title}
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              </>
            ) : null}
            <span className="whitespace-nowrap">
              <T k="saints.feastLabel" /> <FeastDays days={saint.feastDays.slice(0, 1)} />
            </span>
          </p>
        </div>
        <div className="saint-head-in mt-5" style={{ "--i": 2 } as CSSProperties}>
          <BumpButton
            slug={saint.slug}
            saintName={saint.name}
            initialBumped={bump.bumped}
            initialTotal={bump.total}
            signedIn={bump.signedIn}
            complete={saint.complete}
            trailing={
              <>
                <BookmarkSaintButton slug={saint.slug} name={saint.name} className="hidden md:inline-flex native-md-hidden" />
                <ShareButton title={saint.name} round />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
