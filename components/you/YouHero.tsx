"use client";

import { useRef, type ReactNode } from "react";

import { useBarOverPicture } from "@/components/mobile/barOverPicture";
import { YouIdentity, type YouWho } from "@/components/you/YouIdentity";
import { sectionMedia } from "@/lib/media/sections";

/**
 * The head of the You tab on a phone (1.8, note 71): the owner's pick A of
 * r3-25, "A, the ladder, then the day" (Homebase/boards/purify-master/
 * variants/r3-25-you.html, 2026-10-31).
 *
 * The Ladder of Divine Ascent fills the top of the screen from its very top,
 * under the clear tab bar, and fades into the page, as Prayers' Pantocrator
 * does (components/mobile/PrayersHero.tsx, the model): the bar is clear over
 * it until the reader's own words on it reach the bar, or the picture has
 * gone up under it (components/mobile/barOverPicture.ts), so the tab's name
 * and the reader's never cross; and the picture is pulled up by the bar's
 * height (app/globals.css, the Prayers block, which holds both). The reader stands on it (YouIdentity): their picture, their
 * name, the way to their profile and their badges, or Sign in. At its foot
 * `children`: the prayer rope and the week's line. The picture and the reader
 * fade in as the tab arrives, and with motion off they are simply there.
 *
 * The picture is the section's own, from the rights-checked registry
 * (lib/media/sections.ts), cut square for this box in 1.8 so it is sharp on
 * a 3x phone. It was a plate with its credit line under the bar
 * (SectionMasthead) until 1.8; the record stays in the registry and
 * docs/licensing/SECTION_MEDIA.md. On a tablet the bar stays solid and the
 * picture sits under it, in the column.
 */
export function YouHero({ who, children }: { who: YouWho; children?: ReactNode }) {
  const media = sectionMedia("you");
  const picture = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  useBarOverPicture(picture, words);

  return (
    <section data-you-hero="" className="you-hero relative md:mx-auto md:mt-6 md:w-full md:max-w-[760px] lg:max-w-[880px]">
      <div ref={picture} className="you-hero-picture pointer-events-none absolute inset-x-0 top-0 overflow-hidden md:rounded-[26px]">
        {media ? (
          // Plain <img>, as Prayers' is: the apps' export serves files as they
          // are. Above the fold, so it is asked for first. Its top right is
          // Christ at the head of the ladder, so it is held there.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            fetchPriority="high"
            decoding="async"
            className="you-hero-img h-full w-full object-cover object-right-top"
          />
        ) : null}
        {/* Under the bar, so its name and buttons read on the picture. */}
        <div aria-hidden className="you-hero-shade-top absolute inset-x-0 top-0 bg-gradient-to-b from-night/75 to-transparent md:hidden" />
      </div>

      <div data-you-who-place={who.state === "in" ? "in" : "out"} className="you-hero-who you-hero-in relative px-5">
        {/* What the bar watches. Its box starts 12px over its first line (taken up and given
            back, so nothing moves), and the bar has closed by the time the words arrive. */}
        <div ref={words} data-you-words="" className="-mt-3 pt-3">
          <YouIdentity who={who} />
        </div>
      </div>

      {children ? <div className="you-hero-in you-hero-foot relative mt-4 px-5">{children}</div> : null}
    </section>
  );
}
