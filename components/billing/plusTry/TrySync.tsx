"use client";

// Try "Your reading, on every device" (r3-07 A). Sync happens out of sight,
// so its live look is what it carries, counted from what the reader has kept
// on this device (lib/profile/useReadingStats.ts, the counts Account shows;
// read only).
//
// 1.9, from the owner's Plus review: a reader who had kept nothing yet saw a
// column of zeros ("Verses highlighted 0"), a sales preview selling an empty
// shelf. A count now shows only once something is kept; before that each row
// carries a check, saying it will travel, and no number at all. The drawing
// of two devices with a light passing between them went too: a custom
// drawing of the kind he called vibe coded (1.7, note 24), saying less than
// the list under it.
//
// It claims no sync that has not happened: there is no "last synced" here,
// only what Plus would carry.

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Check } from "@/components/ui/icons/Check";
import { Pen } from "@/components/ui/icons/Pen";
import { Scroll } from "@/components/ui/icons/Scroll";
import { useReadingStats } from "@/lib/profile/useReadingStats";

import { TryWindow } from "./TryKit";

export default function TrySync({ row }: TryProps) {
  const { t } = useTranslate();
  const stats = useReadingStats();
  const kept = [
    { id: "verses", label: t("ui.versesHighlighted"), value: stats.verses, icon: <Book size={18} /> },
    { id: "paragraphs", label: t("ui.paragraphsHighlighted"), value: stats.paragraphs, icon: <Scroll size={18} /> },
    { id: "notes", label: t("ui.notesWritten"), value: stats.notes, icon: <Pen size={18} /> },
    { id: "bookmarks", label: t("ui.bookmarksSaved"), value: stats.bookmarks, icon: <Bookmark size={18} /> },
  ];
  const anyKept = kept.some((k) => k.value > 0);

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-6">
        <p className="font-sans text-caption font-semibold text-paper/55">{t("ui.whatSyncs")}</p>
        <ul className="mt-2 divide-y divide-paper/[0.08] border-y border-paper/[0.08]">
          {kept.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper/[0.07] text-paper/85 ring-1 ring-inset ring-paper/10">
                {k.icon}
              </span>
              <span className="min-w-0 flex-1 font-sans text-ui text-paper/85">{k.label}</span>
              {anyKept ? (
                <span className="shrink-0 font-sans text-ui font-semibold tabular-nums text-paper">{k.value}</span>
              ) : (
                <Check size={16} aria-hidden className="shrink-0 text-paper/70" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </TryWindow>
  );
}
