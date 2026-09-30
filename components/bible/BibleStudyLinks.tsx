"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * The two Purify Plus study tools that live beside the Bible rather than in a
 * chapter: the reading plans (/plans) and the journal of the reader's notes
 * (/journal). Two quiet pills on the Bible index, on the desktop page and in
 * the phone shell alike; each page says Plus itself when it is locked.
 */
export function BibleStudyLinks({ className }: { className?: string }) {
  const { t } = useTranslate();
  const pill =
    "inline-flex min-h-11 items-center rounded-pill border border-premium/35 bg-premium/[0.06] px-5 font-sans text-detail font-semibold text-premium-ink transition-colors hover:border-premium/60 hover:text-premium-bright";
  return (
    <nav aria-label={t("plans.studyTools")} className={cn("flex flex-wrap justify-center gap-2.5", className)}>
      <Link href="/plans" className={pill}>
        {t("plans.title")}
      </Link>
      <Link href="/journal" className={pill}>
        {t("journal.title")}
      </Link>
    </nav>
  );
}
