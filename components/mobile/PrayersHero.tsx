"use client";

import { useRef, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { sectionMedia } from "@/lib/media/sections";

import { useBarOverPicture } from "./barOverPicture";

/**
 * The head of Prayers on a phone (1.8): the owner's merged pick of round 4,
 * 2026-10-27, "the Pantocrator and the verse fading in at the top, then your
 * rule as a checklist" (Homebase/boards/purify-master/variants/m04-prayers.png,
 * Merged: round 4 B's picture over C's system).
 *
 * Christ Pantocrator of Sinai fills the top of the screen from its very top,
 * under the bar, and melts into the page; "Pray without ceasing." stands on
 * its lower half; the reader's rule (`children`, components/prayers/
 * RuleToday.tsx) begins at its foot. The picture and the verse fade in as the
 * screen arrives, and with motion off they are simply there (globals.css).
 *
 * The tab bar is the one bar every tab wears (components/mobile/MobileHeader).
 * While this picture is on the page the bar is clear over it, its round
 * buttons on plates, decided in CSS before the first paint (html:has); once
 * the picture has gone up under the bar it is solid again (./barOverPicture,
 * which the Ladder at the top of You shares since note 71). On a tablet the
 * bar stays solid and the picture sits under it, in the column.
 *
 * The picture is the section's own, from the rights-checked registry
 * (lib/media/sections.ts). The plate it stood on until 1.8 printed its credit
 * line; the picture is in the public domain, and the record stays in the
 * registry and docs/licensing/SECTION_MEDIA.md.
 */
export function PrayersHero({ children }: { children?: ReactNode }) {
  const { t } = useTranslate();
  const media = sectionMedia("prayers");
  const picture = useRef<HTMLDivElement>(null);
  // The verse stands on the picture: the bar is solid again as its first line reaches it, so the
  // tab's name and the verse never cross (1.9; ./barOverPicture, and You's reader the same).
  const words = useRef<HTMLQuoteElement>(null);
  useBarOverPicture(picture, words);

  return (
    <section className="prayers-hero relative md:mx-auto md:mt-6 md:w-full md:max-w-[760px] lg:max-w-[880px]">
      <div
        ref={picture}
        className="prayers-hero-picture pointer-events-none absolute inset-x-0 top-0 overflow-hidden md:rounded-[26px]"
      >
        {media ? (
          // Plain <img>, as SectionMasthead's: the apps' export serves files
          // as they are. Above the fold, so it is asked for first.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            fetchPriority="high"
            decoding="async"
            className="prayers-hero-img h-full w-full object-cover object-[50%_20%]"
          />
        ) : null}
        {/* Under the bar, so its name and buttons read on the picture. */}
        <div aria-hidden className="prayers-hero-shade-top absolute inset-x-0 top-0 bg-gradient-to-b from-night/90 to-transparent md:hidden" />
        {/* The picture melts into the page below the verse. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[232px] bg-gradient-to-b from-night/0 via-night/85 via-55% to-night"
        />
      </div>

      <figure className="prayers-hero-verse prayers-hero-in relative px-5">
        {/* What the bar watches: 12px of room over the first line, taken up and given back. */}
        <blockquote ref={words} data-prayers-words="" className="-mt-3 pt-3">
          <p className="words-halo font-heading text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper text-balance">
            {t("ui.prayWithoutCeasing")}
          </p>
        </blockquote>
        <figcaption className="words-halo mt-1.5 font-serif text-detail italic text-paper/85">{t("ui.1Thessalonians517")}</figcaption>
      </figure>

      {children ? <div className="prayers-hero-in prayers-hero-rule relative mt-10">{children}</div> : null}
    </section>
  );
}
