"use client";

// The quiet rows at the foot of the You tab: Your rule and Settings, and the
// reader's own rows between them (the EIKON Box, the campaigns they pray
// with). Since 1.8 (note 71, the owner's pick A of r3-25, "the Ladder, then
// the day") they are the lightest thing on the page: a faint list on the
// page's own ground. They were the iOS-style SettingsList, a card as heavy
// as every other part of the tab; the desktop account dashboard keeps that
// list (components/profile/AccountSettingsLinks.tsx).
//
// Each row is the house's row (round 1 of the fifteen screens, the rule he
// approved: "a name, one line, the chevron, a hairline between, in one tray;
// no icon tile; a picture only when it is the thing itself"). Until round 3
// each was led by a glyph on the lit plate Settings is made of: fresh eyes,
// of this list, "puts an icon tile on every row". None of these rows has a
// picture that is the thing itself, so none has anything before its name.

import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";

/**
 * One row: where it goes, its name and a line under it. `mark` is
 * the Plus mark on a row whose page is Plus's and not yet this reader's
 * (components/billing/PlusMark.tsx): shown, never hidden, and never promised.
 */
export type YouRow = { label: string; href: string; hint?: string; mark?: ReactNode };

export function YouRows({ items }: { items: readonly YouRow[] }) {
  return (
    <ul className="overflow-hidden rounded-[18px] bg-paper/[0.03] ring-1 ring-inset ring-paper/[0.08]">
      {items.map((it, i) => (
        <li key={it.href} className="relative">
          {/* The hairline between rows begins where the words do. */}
          {i > 0 ? <span aria-hidden className="absolute inset-x-0 top-0 ms-4 h-px bg-paper/[0.065]" /> : null}
          <Link href={it.href} className="set-link flex min-h-[58px] items-center gap-3 py-3 pe-3.5 ps-4 motion-safe:transition-colors">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[14.5px] font-semibold leading-tight text-paper">{it.label}</p>
              {it.hint ? <p className="mt-0.5 font-sans text-caption leading-snug text-paper/55">{it.hint}</p> : null}
            </div>
            {it.mark ?? null}
            <span aria-hidden className="shrink-0 text-paper/30">
              <ChevronLeft size={15} className="-scale-x-100 rtl:scale-x-100" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
