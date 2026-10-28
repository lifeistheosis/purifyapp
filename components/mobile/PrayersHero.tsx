"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { sectionMedia } from "@/lib/media/sections";

/**
 * The attribute on <html> that turns the tab bar solid again once this
 * picture has gone up under it (app/globals.css, "Prayers: the picture at the
 * top"). Until then the bar is clear over it, from the first paint.
 */
export const BAR_SOLID = "data-bar-solid";

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
 * the picture has gone up under the bar, this sets data-bar-solid on <html>
 * and the bar is solid again. One observer that speaks only when the
 * picture's foot crosses the bar's, and nothing done while scrolling. On a
 * tablet the bar stays solid and the picture sits under it, in the column.
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

  // Before the paint, so a page come back to scrolled down never shows the
  // bar clear over its words for a frame.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = picture.current;
    const bar = document.querySelector<HTMLElement>("[data-tab-topbar]");
    const solid = (on: boolean) => {
      if (on) root.setAttribute(BAR_SOLID, "");
      else root.removeAttribute(BAR_SOLID);
    };
    if (!el || !bar || typeof IntersectionObserver === "undefined") {
      // With no way to know when the picture has gone, the bar stays solid.
      solid(true);
      return () => solid(false);
    }
    const top = Math.round(bar.getBoundingClientRect().height);
    // Where the page is now, before the observer's first word a frame later.
    solid(el.getBoundingClientRect().bottom <= top);
    const io = new IntersectionObserver(([entry]) => solid(!entry.isIntersecting), {
      rootMargin: `-${top}px 0px 0px 0px`,
      threshold: 0,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      solid(false);
    };
  }, []);

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
        <blockquote>
          <p className="font-heading text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper text-balance">
            {t("ui.prayWithoutCeasing")}
          </p>
        </blockquote>
        <figcaption className="mt-1.5 font-serif text-detail italic text-paper/70">{t("ui.1Thessalonians517")}</figcaption>
      </figure>

      {children ? <div className="prayers-hero-in prayers-hero-rule relative mt-10">{children}</div> : null}
    </section>
  );
}
