"use client";

// Tiny client island: reads the "last read" pointer from localStorage so the
// mobile Bible shell can show a one-tap "Continue reading" card. The pointer
// (purify:bible:last) is written by ReadingProgressBar as the reader scrolls,
// and now carries the in-view verse + chapter length, so this card can resume
// at the exact verse via a #v{n} deep link (picked up by VerseFocusFlash).

import { useEffect, useState } from "react";
import { MobileCard } from "./MobileCard";
import { readLastRead, type LastRead } from "@/lib/bible/lastRead";

export function BibleMobileContinue() {
  const [last, setLast] = useState<LastRead | null>(null);

  useEffect(() => {
    setLast(readLastRead());
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
  // Resume at the verse when we have one past the chapter top; the #v{n} hash
  // is handled by VerseFocusFlash (scroll + flash). Otherwise open at the top.
  const resumeVerse = last.verse > 1 ? last.verse : 0;
  const href = resumeVerse
    ? `/bible/${last.book}/${last.chapter}#v${resumeVerse}`
    : `/bible/${last.book}/${last.chapter}`;

  return (
    <MobileCard
      eyebrow="Continue reading"
      title={`${cap} ${last.chapter}`}
      href={href}
    >
      <p className="mt-2 font-sans text-detail text-paper/55">
        Pick up where you left off.
      </p>
      <p className="mt-3 font-sans text-detail font-medium text-paper/75">
        {resumeVerse
          ? `Continue at v${resumeVerse}${
              last.totalVerses ? ` of ${last.totalVerses}` : ""
            } →`
          : "Open chapter →"}
      </p>
    </MobileCard>
  );
}
