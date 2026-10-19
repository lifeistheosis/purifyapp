"use client";

// The features as small posters you swipe through and open (1.7.2). The
// owner picked the paywall drawn with posters ("B is the best") and then
// asked: "Make it so that you can scroll through all the different features,
// and you can click on each one and see what it does."
//
// The row scrolls sideways and fades where it goes on, with arrows for a
// mouse (components/ui/ScrollRail.tsx). A tap opens the poster in the shared
// movable sheet: its mark large in its pool of light, its name, what it does
// in the plan's own words (lib/premium/plans.ts), and the posters on either
// side of it, so every feature can be read one after another without going
// back to the row. Where the reader already has the feature (Your plan), a
// way straight to it.

import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FeatureMark, PREMIUM_GHOST, SoonPill, posterGround } from "@/components/premium/PremiumUI";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { PlanFeature } from "@/lib/premium/plans";

/** Where a feature lives in the app, for a reader who has it: the place the upgrade sheet's welcome sends them too. */
export const FEATURE_PLACES: Readonly<Record<string, { href: string; label: string }>> = {
  "cross-refs": { href: "/bible/john/1", label: "plus.active.crossrefs" },
  "word-study": { href: "/bible/genesis/1", label: "plus.active.wordstudy" },
  journal: { href: "/journal", label: "plus.active.journal" },
  plans: { href: "/plans", label: "plus.active.plans" },
  "reading-modes": { href: "/bible/john/1", label: "plus.active.modes" },
  florilegium: { href: "/florilegium", label: "plus.active.florilegium" },
};

export function FeatureShowcase({
  items,
  soonLabel,
  label,
  owned = false,
  className,
}: {
  items: PlanFeature[];
  soonLabel: string;
  /** Names the row for assistive technology. */
  label: string;
  /** The reader has these: an opened poster offers the way to it. */
  owned?: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const [at, setAt] = useState<number | null>(null);
  const item = at === null ? null : items[at];
  const before = at !== null && at > 0 ? items[at - 1] : null;
  const after = at !== null && at < items.length - 1 ? items[at + 1] : null;
  const place = item && owned ? FEATURE_PLACES[item.id] : undefined;

  return (
    <>
      <ScrollRail as="ul" label={label} snap className={cn("-mx-5 md:-mx-8", className)} trackClassName="gap-2.5 px-5 scroll-px-5 pb-1 md:px-8 md:scroll-px-8">
        {items.map((it, i) => (
          <li key={it.id} className="w-[124px]">
            <button
              type="button"
              onClick={() => setAt(i)}
              aria-haspopup="dialog"
              data-plus-poster={it.id}
              className="tap-press dark-island flex h-[152px] w-full flex-col justify-between overflow-hidden rounded-[10px] p-3.5 text-start ring-1 ring-inset ring-paper/[0.08] transition-shadow hover:ring-paper/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
              style={{ background: posterGround(i) }}
            >
              <FeatureMark id={it.id} className="text-paper/85" />
              <span className="font-serif text-[16px] font-semibold leading-[1.2] text-paper">
                {it.title}
                {it.soon ? <SoonPill label={soonLabel} /> : null}
              </span>
            </button>
          </li>
        ))}
      </ScrollRail>

      <Sheet open={item !== null} onClose={() => setAt(null)} title={item?.title ?? label} desktop>
        {item && at !== null ? (
          <div className="pb-2">
            {/* The poster, opened: its mark large in its own light. */}
            <div
              aria-hidden
              className="dark-island -mx-5 flex h-[168px] items-center justify-center"
              style={{ background: posterGround(at, 70, "var(--color-night)") }}
            >
              <FeatureMark id={item.id} size={56} className="text-paper/90" />
            </div>
            <p className="mt-5 font-sans text-body leading-[1.6] text-paper/85">
              {/* The plan's lines are written for a list; here each is a sentence. */}
              {/[.!?]$/.test(item.sub) ? item.sub : `${item.sub}.`}
              {item.soon ? <SoonPill label={soonLabel} /> : null}
            </p>
            {place ? (
              <Link href={place.href} onClick={() => setAt(null)} className={cn(PREMIUM_GHOST, "mt-6 w-full")}>
                {t(place.label)}
                <ChevronRight size={15} className="rtl:-scale-x-100" />
              </Link>
            ) : null}
            {/* The posters on either side, so all of them can be read in turn. */}
            <div className="mt-6 flex items-stretch justify-between gap-3 border-t border-paper/10 pt-3">
              {before ? (
                <button
                  type="button"
                  onClick={() => setAt(at - 1)}
                  aria-label={`${t("common.previous")}: ${before.title}`}
                  className="tap-press inline-flex min-h-11 min-w-0 items-center gap-1 rounded-pill pe-3 font-sans text-detail font-semibold text-paper/70 hover:text-paper"
                >
                  <ChevronRight size={15} className="shrink-0 -scale-x-100 rtl:scale-x-100" />
                  <span className="truncate">{before.title}</span>
                </button>
              ) : (
                <span />
              )}
              {after ? (
                <button
                  type="button"
                  onClick={() => setAt(at + 1)}
                  aria-label={`${t("common.next")}: ${after.title}`}
                  className="tap-press inline-flex min-h-11 min-w-0 items-center gap-1 rounded-pill ps-3 font-sans text-detail font-semibold text-paper/70 hover:text-paper"
                >
                  <span className="truncate">{after.title}</span>
                  <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-center font-sans text-caption tabular-nums text-paper/40">
              {at + 1} / {items.length}
            </p>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
