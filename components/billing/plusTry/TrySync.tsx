"use client";

// Try "Your reading, on every device" (r3-07 A). Sync happens out of sight,
// so its live look is what it carries: this device and another one, the same
// page on both with the same line marked, a light passing between them, and
// under them what syncs, counted from what the reader has kept on this
// device today (lib/profile/useReadingStats.ts, the counts Account shows;
// read only).
//
// It claims no sync that has not happened: there is no "last synced" here,
// only what Plus would carry.

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Pen } from "@/components/ui/icons/Pen";
import { Scroll } from "@/components/ui/icons/Scroll";
import { useReadingStats } from "@/lib/profile/useReadingStats";

import { TryWindow } from "./TryKit";

/** A page of words on a device, one line of it marked: the same on both. */
function Page({ wide }: { wide: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width={wide ? 132 : 64} height={wide ? 96 : 116} rx={wide ? 9 : 11} className="fill-paper/[0.04] stroke-paper/35" strokeWidth="1.4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={wide ? 14 : 10}
          y={(wide ? 20 : 26) + i * (wide ? 13 : 15)}
          width={(wide ? 104 : 44) - (i === 4 ? (wide ? 36 : 16) : 0)}
          height={i === 2 ? 8 : 4}
          rx={i === 2 ? 3 : 2}
          className={i === 2 ? "plus-try-mark fill-paper/70" : "fill-paper/25"}
        />
      ))}
    </g>
  );
}

export default function TrySync({ row }: TryProps) {
  const { t } = useTranslate();
  const stats = useReadingStats();
  const kept = [
    { id: "verses", label: t("ui.versesHighlighted"), value: stats.verses, icon: <Book size={18} /> },
    { id: "paragraphs", label: t("ui.paragraphsHighlighted"), value: stats.paragraphs, icon: <Scroll size={18} /> },
    { id: "notes", label: t("ui.notesWritten"), value: stats.notes, icon: <Pen size={18} /> },
    { id: "bookmarks", label: t("ui.bookmarksSaved"), value: stats.bookmarks, icon: <Bookmark size={18} /> },
  ];

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-6">
        <figure aria-hidden className="relative mx-auto w-full max-w-[300px]">
          <svg viewBox="0 0 300 150" className="block w-full text-paper" fill="none">
            {/* This phone, and another of the reader's devices. */}
            <g transform="translate(22 14)">
              <Page wide={false} />
            </g>
            <g transform="translate(150 24)">
              <Page wide />
            </g>
            {/* What passes between them. */}
            <path d="M92 52 C 116 18, 132 18, 150 40" className="stroke-paper/30" strokeWidth="1.4" strokeDasharray="3 4" />
            <circle r="3.5" className="plus-try-carry fill-paper" cx="121" cy="27" />
          </svg>
          <figcaption className="mt-1 grid grid-cols-[108px_1fr] font-sans text-caption text-paper/55">
            <span className="text-center">{t("ui.thisDevice")}</span>
          </figcaption>
        </figure>

        <p className="mt-6 font-sans text-caption font-semibold text-paper/55">{t("ui.whatSyncs")}</p>
        <ul className="mt-2 divide-y divide-paper/[0.08] border-y border-paper/[0.08]">
          {kept.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper/[0.07] text-paper/85 ring-1 ring-inset ring-paper/10">
                {k.icon}
              </span>
              <span className="min-w-0 flex-1 font-sans text-ui text-paper/85">{k.label}</span>
              <span className="shrink-0 font-sans text-ui font-semibold tabular-nums text-paper">{k.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </TryWindow>
  );
}
