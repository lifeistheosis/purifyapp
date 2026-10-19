import type { Saint } from "@/lib/saints/saints";
import { heroTitle } from "@/lib/saints/page";
import { cn } from "@/lib/cn";
import { T } from "@/components/i18n/T";
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
 * The head of a saint's page (1.7, the owner's note 19 of 2026-10-16: "Clean,
 * but it reads like the desktop page shrunk").
 *
 * On a phone: the icon at the top, full width where a sharp picture of him
 * exists (SaintHeroPicture), the name in Lora under it, and one line with
 * his title and his feast day; then one row, what asking for his writings
 * means, the request, and Save. Everything that was stacked under the name
 * before (the label and cross over it, the byname, the epithet, the short
 * life, the facts) is in his Life now, below the switch.
 *
 * On a tablet and a computer the picture stands beside the name.
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
        "pb-6 md:grid md:items-end md:gap-10 md:pb-10 md:pt-14",
        picture ? "md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]" : "pt-8",
      )}
    >
      {picture ? <SaintHeroPicture name={saint.name} iconUrl={saint.iconUrl} hero={hero} /> : null}
      <div className={cn("text-center md:text-start", hero ? "relative -mt-16 md:mt-0" : "mt-6 md:mt-0")}>
        <h1 id="saint-name" className="text-heading leading-[1.1] text-balance text-paper md:text-display">
          {saint.name}
        </h1>
        <p className="mt-2 font-sans text-detail leading-snug text-paper/65">
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
        <div className="mt-5">
          <BumpButton
            slug={saint.slug}
            saintName={saint.name}
            initialBumped={bump.bumped}
            initialTotal={bump.total}
            signedIn={bump.signedIn}
            complete={saint.complete}
            trailing={<BookmarkSaintButton slug={saint.slug} name={saint.name} />}
          />
        </div>
      </div>
    </header>
  );
}
