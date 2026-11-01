"use client";

// The quiet rows at the foot of the You tab: Your rule and Settings, and the
// reader's own rows between them (the EIKON Box, the campaigns they pray
// with). Since 1.8 (note 71, the owner's pick A of r3-25, "the Ladder, then
// the day") they are the lightest thing on the page: a faint list on the
// page's own ground, each row led by its glyph on the lit plate Settings is
// made of (components/settings/LitPanel.tsx, his pick A of r3-01), its name
// and a line under it. They were the iOS-style SettingsList, a card as heavy
// as every other part of the tab; the desktop account dashboard keeps that
// list (components/profile/AccountSettingsLinks.tsx).

import Link from "next/link";
import type { ReactNode } from "react";

import { Plate } from "@/components/settings/LitPanel";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";

/** One row: where it goes, its name, a line under it and its glyph. */
export type YouRow = { label: string; href: string; hint?: string; icon?: ReactNode };

export function YouRows({ items }: { items: readonly YouRow[] }) {
  return (
    <ul className="overflow-hidden rounded-[18px] bg-paper/[0.03] ring-1 ring-inset ring-paper/[0.08]">
      {items.map((it, i) => (
        <li key={it.href} className="relative">
          {/* The hairline between rows begins where the words do. */}
          {i > 0 ? <span aria-hidden className="absolute inset-x-0 top-0 ms-[55px] h-px bg-paper/[0.065]" /> : null}
          <Link href={it.href} className="set-link flex items-center gap-3 py-3 pe-3.5 ps-[13px] motion-safe:transition-colors">
            {it.icon ? <Plate>{it.icon}</Plate> : null}
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[14.5px] font-semibold leading-tight text-paper">{it.label}</p>
              {it.hint ? <p className="mt-0.5 font-sans text-caption leading-snug text-paper/55">{it.hint}</p> : null}
            </div>
            <span aria-hidden className="shrink-0 text-paper/30">
              <ChevronLeft size={15} className="-scale-x-100 rtl:scale-x-100" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
