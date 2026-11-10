"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import type { SectionHead } from "@/lib/saints/parts";
import { openWorkContents } from "@/lib/saints/workNow";

import { usePartWords } from "./partWords";
import { textDir } from "@/lib/i18n/textDir";

/** The id of a chapter's head: the running line over the pill opens once it has gone up. */
export const WORK_HEAD_ID = "work-chapter-title";

/**
 * A chapter of a Father's work opens as a chapter of the Bible does (1.8, the
 * owner's pick A of r3-29, "As the Bible reads"; components/bible/
 * ChapterScreen.tsx): the work's larger part large where the book's name
 * stands ("Conference 1", "Homily 15"), the chapter under it with the small
 * chevron that says the title opens the contents ("Chapter 1"), the
 * chapter's own title in italic where the Bible shows a named passage, and
 * the short rule; then the words. One heading, read as "Conference 1,
 * Chapter 1". It arrives as the Bible's does (globals.css, "The page"), and
 * with motion off it is simply there.
 *
 * The way to the contents lies over the heading, a button of its own, so the
 * heading stays the page's one h1; a work of one section has nothing to
 * choose and no chevron.
 */
export function WorkHead({ head }: { head: SectionHead }) {
  const { t } = useTranslate();
  const { say, pill } = usePartWords();
  const name = say(head.name);
  const sub = head.sub ? say(head.sub) : null;
  // A long name of our own ("The witness of Polycrates of Ephesus") steps down
  // a size, so it does not fill the screen; a part's name never needs to.
  const long = "text" in head.name && name.length > 26;
  // A name of the work's own is English and says so; a part's name from the
  // catalog is the reader's (build 90 note 4).
  const nameLang = "text" in head.name ? "en" : undefined;
  const subLang = head.sub && "text" in head.sub ? "en" : undefined;
  return (
    <header id={WORK_HEAD_ID} data-work-head="" className="mb-5 text-center">
      <div className="relative">
        <h1 className="font-heading text-paper">
          <span
            lang={nameLang}
            dir={textDir(nameLang)}
            className={cn(
              "page-open-title block text-balance break-words leading-[1.08] tracking-[-0.3px]",
              long ? "text-[30px] min-[380px]:text-[32px]" : "text-[40px] min-[380px]:text-[44px]",
            )}
          >
            {name}
          </span>{" "}
          {sub ? (
            <span lang={subLang} dir={textDir(subLang)} className="page-open-sub mt-1.5 block font-sans text-ui font-normal tracking-normal text-paper/55">
              {sub}
              <span aria-hidden data-reader-chrome className="ms-[5px] inline-flex align-[-3px] text-paper/50">
                <ChevronDown size={17} />
              </span>
            </span>
          ) : null}
        </h1>
        {sub ? (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t("bible.pickChapterCurrentAria", { book: pill(head), chapter: "" }).trim()}
            data-title-contents=""
            data-reader-chrome
            onClick={openWorkContents}
            className="absolute inset-0 rounded-2xl"
          />
        ) : null}
      </div>
      {head.caption ? (
        <p lang="en" dir="ltr" data-work-caption="" className="page-open-sub mx-auto mt-2.5 max-w-[30ch] text-balance font-serif text-[19px] italic leading-[1.42] text-paper/75 md:text-title-sm">
          {head.caption}
        </p>
      ) : null}
      <span aria-hidden className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper/25" />
    </header>
  );
}
