"use client";

// Desktop "Continue reading" card for the Bible index: reads the same
// purify:bible:last pointer the mobile shell uses (written by
// ReadingProgressBar as the reader scrolls) and resumes at the exact verse.
// Renders nothing until mounted so SSR and client agree, and renders a
// quiet invitation when no pointer exists yet.

import Link from "next/link";
import { useEffect, useState } from "react";

import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function BibleContinueDesktop() {
  const { t } = useTranslate();
  const [last, setLast] = useState<LastRead | null>(null);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): the pointer lives in localStorage. */
  useEffect(() => {
    setLast(readLastRead());
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted || !last) return null;

  const cap = last.bookName.charAt(0).toUpperCase() + last.bookName.slice(1);
  const resumeVerse = last.verse > 1 ? last.verse : 0;
  const href = resumeVerse
    ? `/bible/${last.book}/${last.chapter}#v${resumeVerse}`
    : `/bible/${last.book}/${last.chapter}`;

  return (
    <Link
      href={href}
      className="group mx-auto flex w-full max-w-[640px] items-center justify-between gap-4 rounded-lg border border-gold/30 bg-gold/[0.05] px-5 py-4 transition-colors hover:border-gold/55"
    >
      <span className="min-w-0">
        <span className="block font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85">
          {t("bible.continueReading")}
        </span>
        <span className="mt-1 block truncate font-display-serif text-title-sm text-paper transition-colors group-hover:text-gold">
          {cap} {last.chapter}
          {resumeVerse ? `, ${t("bible.verseWord")} ${resumeVerse}` : ""}
        </span>
      </span>
      <span aria-hidden className="shrink-0 font-serif text-lede text-gold/70 transition-colors group-hover:text-gold">
        →
      </span>
    </Link>
  );
}
