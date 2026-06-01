"use client";

// Tiny client island: reads "last opened chapter" from localStorage so
// the mobile Bible shell can show a one-tap "Continue reading" card.
// Writes happen in the chapter reader (existing) under purify:bible:last.

import { useEffect, useState } from "react";
import { MobileCard } from "./MobileCard";

type Last = {
  book: string;
  bookName: string;
  chapter: number;
  ts: number;
};

export function BibleMobileContinue() {
  const [last, setLast] = useState<Last | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("purify:bible:last");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.book && parsed.chapter) {
        setLast({
          book: String(parsed.book),
          bookName: String(parsed.bookName ?? parsed.book),
          chapter: Number(parsed.chapter),
          ts: Number(parsed.ts ?? 0),
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!last) {
    return (
      <MobileCard eyebrow="Continue reading">
        <p className="mt-2 font-sans text-detail text-paper/55 italic">
          Open any chapter and this card will remember where you left off.
        </p>
      </MobileCard>
    );
  }

  const cap = last.bookName.charAt(0).toUpperCase() + last.bookName.slice(1);
  return (
    <MobileCard
      eyebrow="Continue reading"
      title={`${cap} ${last.chapter}`}
      href={`/bible/${last.book}/${last.chapter}`}
    >
      <p className="mt-2 font-sans text-detail text-paper/55">
        Pick up where you left off.
      </p>
      <p className="mt-3 font-sans text-detail font-medium text-paper/75">
        Open chapter →
      </p>
    </MobileCard>
  );
}
