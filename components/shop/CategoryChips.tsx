"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { cn } from "@/lib/cn";
import type { ShopCategory } from "@/lib/shop/types";

/**
 * The shop's kinds, as one row of chips: the shop's front page, every
 * category page and a store's page all draw this row, so the three no longer
 * differ in height, colour and spacing.
 *
 * Redrawn for 1.5.2 (the owner, 2026-10-05, of the shop on a phone: "the
 * collection bars where you scroll ... could have a better design"):
 *
 *   - The chip the reader is on is solid gold, the shop's own gold (the
 *     `premium` tokens). It was a faint gold outline, hard to tell from its
 *     neighbours at a glance.
 *   - The others are quiet filled pills with no outline, so the row reads as
 *     one band and not as a string of boxes.
 *   - Each kind says how many pieces it holds, when the shop has said. The
 *     number is the catalogue's own count, never typed.
 *   - The row fades at the end that has more, shows no scrollbar, and opens
 *     with the current chip in the middle (ScrollRail).
 *
 * 44px tall: these are the shop's main way around on a phone.
 */
export function CategoryChips({
  categories,
  counts,
  current,
  lead = false,
  all = true,
  className,
}: {
  /** The kinds to offer, in order. */
  categories: ShopCategory[];
  /** Pieces per kind, from the shop's front-page payload. Absent: no numbers. */
  counts?: Partial<Record<ShopCategory, number>> | null;
  /** The page the reader is on: a kind, or "all". */
  current?: string | null;
  /**
   * Draw "Everything" in gold although no chip is the current page: the
   * shop's front page, where it is the way into the whole collection.
   */
  lead?: boolean;
  /** Offer the "Everything" chip. Off on a store's page, which is not the whole shop. */
  all?: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const total = counts
    ? Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : null;

  const chips: { slug: string; label: string; count: number | null }[] = [
    ...(all
      ? [{ slug: "all", label: current ? t("common.all") : t("shop.everything"), count: total }]
      : []),
    ...categories.map((slug) => ({
      slug: slug as string,
      label: t(`shop.category.${slug}`),
      count: counts ? (counts[slug] ?? 0) : null,
    })),
  ];

  return (
    <nav aria-label={t("shop.browseByCategory")} className={className}>
      <ScrollRail as="ul" current={current ?? null} trackClassName="gap-2 px-5 md:px-0" className="-mx-5 md:mx-0">
        {chips.map(({ slug, label, count }) => {
          const active = slug === current;
          const gold = active || (lead && slug === "all");
          return (
            <li key={slug}>
              <Link
                href={`/shop/category/${slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap-press inline-flex min-h-11 items-center gap-2 rounded-pill px-4 font-sans text-detail transition-colors",
                  gold
                    ? "bg-premium font-semibold text-night hover:bg-premium-soft"
                    : "bg-paper/[0.06] font-medium text-paper/80 hover:bg-paper/[0.11] hover:text-paper",
                )}
              >
                {label}
                {count !== null && count > 0 ? (
                  <span
                    className={cn(
                      "font-sans text-caption font-semibold tabular-nums",
                      gold ? "text-night/60" : "text-paper/40",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ScrollRail>
    </nav>
  );
}
