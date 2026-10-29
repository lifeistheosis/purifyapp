"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";
import { useReaderType } from "@/lib/onboarding/useReaderType";
import { smallLook, type SmallLook } from "@/lib/today/smallLook";

/**
 * Today's Catechism on Today, in the look for the type of reader (1.8, the
 * owner's round 17, transitionary "A and B"; lib/today/smallLook.ts): one
 * quiet line for an Orthodox reader, a card with Begin for a reader who is
 * learning or new to the faith. Drawn only while the bank holds questions:
 * components/catechism/CatechismCard.tsx asks the bank on the server and
 * draws nothing when it is empty. The words are the Catechism's own name
 * and title; no question is ever shown here.
 */
export function CatechismToday({ className }: { className?: string }) {
  const type = useReaderType();
  return <CatechismLook look={smallLook(type)} className={className} />;
}

export function CatechismLook({ look, className }: { look: SmallLook; className?: string }) {
  const { t } = useTranslate();
  if (look === "line") {
    // A: one quiet line, the cross lit.
    return (
      <Link
        href="/catechism"
        data-look="line"
        className={cn("today-small tap-press flex items-center gap-3 border-y border-paper/8 py-[13px] pe-1 ps-1", className)}
      >
        <Cross size={18} className="today-glyph-lit shrink-0 text-paper" />
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-ui font-semibold leading-snug text-paper">{t("catechism.card.eyebrow")}</span>
          <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{t("catechism.title")}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
      </Link>
    );
  }
  // B: a card, the title large, and Begin.
  return (
    <Link
      href="/catechism"
      data-look="card"
      className={cn(
        "today-small press-card flex items-center gap-3 rounded-[22px] border border-paper/11 bg-paper/[0.035] px-[18px] py-4 hover:bg-paper/[0.06]",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-caption font-semibold text-paper/60">{t("catechism.card.eyebrow")}</span>
        <span className="mt-1 block font-heading text-lede font-bold leading-snug text-paper">{t("catechism.title")}</span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center rounded-pill border border-paper/22 px-[18px] font-sans text-ui font-semibold text-paper">
        {t("today.prayNow.begin")}
      </span>
    </Link>
  );
}
