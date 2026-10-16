"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayWith } from "@/components/player/PrayWith";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { Sheet } from "@/components/ui/Sheet";
import { ShareButton } from "@/components/ui/ShareButton";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Info } from "@/components/ui/icons/Info";
import { cn } from "@/lib/cn";
import type { Rule } from "@/lib/prayers/types";

const ROUND =
  "tap-press inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-paper/15 text-paper/75 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper motion-safe:transition-colors";

/**
 * The head of a prayer page (1.7, the owner's note 16): the prayer's icon on
 * its dark plate, its name, how long it is, and the way in, on the first
 * screen of a phone, as a chant's page and a walked book's page begin.
 *
 *  - Begin goes to the first prayer. It always begins: a prayer page keeps
 *    no place and offers no "continue" (the owner, 2026-10-16: no retention
 *    loops inside prayers).
 *  - Share, and the bookmark that keeps the whole rule in Saved, drawn as
 *    the app's icons, never as characters.
 *  - Pray with: chant for everyone, ambience with Plus (components/player/
 *    PrayWith.tsx).
 *  - What the prayer is and how it is prayed: on a phone in a sheet, so the
 *    head stays one screen; beside it on a computer.
 *
 * The page's one h1 is here; the slim bar above (MobileTopBar, mounted by
 * the route) takes the name once it has scrolled away.
 */
export function ServiceHeader({
  rule,
  title,
  titleId,
  artId,
  kept,
  bookmarked,
  onBookmark,
  onBegin,
  contentLang,
  notInYourLanguage,
}: {
  rule: Rule;
  title: string;
  titleId: string;
  artId: string;
  /** Kept today, on this device or another: the quiet done mark, never a count. */
  kept: boolean;
  bookmarked: boolean;
  /** Absent where the page cannot be kept whole in Saved. */
  onBookmark?: () => void;
  onBegin: () => void;
  /** The language the prayers' words are in. */
  contentLang: string;
  /** The reader's language has no wording of these prayers yet. */
  notInYourLanguage: boolean;
}) {
  const { t, tn } = useTranslate();
  const [about, setAbout] = useState(false);
  const meta = [
    t("prayers.reader.aboutMin", { min: rule.estimatedMinutes }),
    tn("prayers.reader.prayerCount", rule.prayers.length),
    rule.jurisdiction,
  ].filter(Boolean);

  return (
    <header className="flex flex-col items-center text-center">
      <ArtPlate id={artId} size="md" className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]" />
      <h1
        id={titleId}
        className="mt-6 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper text-balance md:text-heading"
      >
        {title}
      </h1>
      {rule.subtitle ? (
        <p lang={contentLang} className="mt-2 max-w-[44ch] font-serif text-detail italic leading-[1.55] text-paper/60">
          {rule.subtitle}
        </p>
      ) : null}
      <p className="mt-2 font-sans text-caption text-paper/50">{meta.join(" · ")}</p>
      {kept ? (
        <p className="mt-2 inline-flex items-center gap-1.5 font-sans text-caption font-semibold text-paper/80">
          <Check size={14} className="shrink-0" />
          {t("shop.prayedToday")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onBegin}
          className="tap-press inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          {t("today.prayNow.begin")}
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </button>
        <ShareButton title={title} className="min-h-12 px-4" />
        {onBookmark ? (
          <button
            type="button"
            onClick={onBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? t("prayers.reader.removeRuleBookmark") : t("prayers.reader.bookmarkRule")}
            title={bookmarked ? t("prayers.reader.bookmarked") : t("prayers.reader.bookmarkRule")}
            className={cn(ROUND, bookmarked && "text-paper")}
          >
            <Bookmark size={19} filled={bookmarked} />
          </button>
        ) : null}
      </div>

      <PrayWith className="mt-5 justify-center" />

      {rule.intro ? (
        <button
          type="button"
          onClick={() => setAbout(true)}
          aria-haspopup="dialog"
          className="tap-press mt-3 inline-flex min-h-11 items-center gap-1.5 px-2 font-sans text-detail font-semibold text-paper/70 hover:text-paper md:hidden native-md-inline-flex"
        >
          <Info size={16} className="shrink-0" />
          {t("prayers.reader.aboutThis")}
        </button>
      ) : null}

      {notInYourLanguage ? (
        <p className="mt-3 font-sans text-caption text-paper/50">{t("prayers.reader.notInYourLanguage")}</p>
      ) : null}

      {rule.intro ? (
        <>
          {/* A computer has the room: the words stand under the head. A
              tablet in the apps keeps the phone's sheet. */}
          <p
            lang={contentLang}
            className="mt-8 hidden max-w-[60ch] text-start font-serif text-body leading-[1.75] text-paper/70 md:block native-md-hidden"
          >
            {rule.intro}
          </p>
          <Sheet open={about} onClose={() => setAbout(false)} title={t("prayers.reader.aboutThis")}>
            <p lang={contentLang} className="font-serif text-body leading-[1.75] text-paper/80">
              {rule.intro}
            </p>
          </Sheet>
        </>
      ) : null}
    </header>
  );
}
