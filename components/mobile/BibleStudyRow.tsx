"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "./IndexRows";

/**
 * The phone's way to the two study tools that live beside the Bible and not
 * in a chapter: the reading plans (/plans) and the journal of the reader's
 * notes (/journal). Each page says Plus itself when it is locked.
 *
 * One quiet row of two halves, in the look of the book list (IndexRows.tsx).
 * Until 1.6 the phone drew the desktop's two tinted pills here
 * (components/bible/BibleStudyLinks.tsx, which the desktop page still uses):
 * a fourth look on a screen the owner called too busy, 2026-10-13. Both ways
 * in are kept, where they were, under the day's readings and over the books.
 *
 * border-s, not border-l: the line between the halves is at the start of the
 * second one, which is its right in Arabic and Urdu.
 */
export function BibleStudyRow() {
  const { t } = useTranslate();
  const half =
    "flex min-h-11 items-center justify-center px-3 py-3 text-center font-sans text-detail font-semibold text-paper/75 transition-colors active:bg-paper/[0.04]";
  return (
    <nav
      aria-label={t("plans.studyTools")}
      data-bible-study=""
      className={`mt-3 grid grid-cols-2 ${INDEX_LIST_LOOK}`}
    >
      <Link href="/plans" className={half}>
        {t("plans.title")}
      </Link>
      <Link href="/journal" className={`${half} border-s border-paper/[0.06]`}>
        {t("journal.title")}
      </Link>
    </nav>
  );
}
