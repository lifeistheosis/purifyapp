"use client";

// Three-row preview of the user's most recent bookmarks. Reads
// purify:bookmarks directly — same shape VerseCardActions and the
// /saved page use. Empty state is a single quiet line.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type AnyBookmark = {
  id: string;
  kind: string;
  label?: string;
  book?: string;
  chapter?: number;
  verse?: number;
  saintSlug?: string;
  workSlug?: string;
  ruleId?: string;
  prayerId?: string;
  href?: string;
  eventSlug?: string;
  addedAt?: number;
};

const KIND_LABEL: Record<string, string> = {
  "bible-verse": "Verse",
  "bible-chapter": "Chapter",
  "writing-section": "Writing",
  "prayer": "Prayer",
  "prayer-rule": "Prayer rule",
  "history-event": "History",
};

function hrefFor(b: AnyBookmark): string {
  if (b.kind === "bible-verse" && b.book && b.chapter && b.verse)
    return `/bible/${b.book}/${b.chapter}#v${b.verse}`;
  if (b.kind === "bible-chapter" && b.book && b.chapter)
    return `/bible/${b.book}/${b.chapter}`;
  if (b.kind === "writing-section" && b.saintSlug && b.workSlug)
    return `/saints/${b.saintSlug}/${b.workSlug}`;
  if (b.kind === "prayer" && b.ruleId)
    return `/prayers/${b.ruleId}#${b.prayerId ?? ""}`;
  if (b.kind === "prayer-rule" && typeof b.href === "string") return b.href;
  if (b.kind === "history-event" && typeof b.eventSlug === "string")
    return `/history/${b.eventSlug}`;
  return "/saved";
}

export function SavedPreview() {
  const { t } = useTranslate();
  const [items, setItems] = useState<AnyBookmark[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    function recompute() {
      try {
        const raw = localStorage.getItem("purify:bookmarks");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort(
            (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0),
          );
          setItems(sorted.slice(0, 3) as AnyBookmark[]);
          setTotal(parsed.length);
        } else {
          setItems([]);
          setTotal(0);
        }
      } catch {
        setItems([]);
        setTotal(0);
      }
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:bookmark", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:bookmark", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55">
          {t("ui.recentlySaved")}
        </p>
        <Link
          href="/saved"
          className="font-sans text-caption text-paper/65 active:text-paper transition-colors"
        >
          {total > 0 ? `All ${total} →` : "Saved →"}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="font-sans text-detail text-paper/55 italic">
          {t("ui.starAVerseChapterPrayer")}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={hrefFor(b)}
                className="flex items-center justify-between gap-3 rounded-md border border-paper/8 bg-paper/[0.02] px-3 py-2.5 active:scale-[0.99] transition-transform"
              >
                <span className="font-sans text-detail text-paper truncate flex-1">
                  {b.label ?? "Bookmark"}
                </span>
                <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.04] px-2 py-[1px] font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/65">
                  {KIND_LABEL[b.kind] ?? b.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
