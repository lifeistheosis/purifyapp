"use client";

import { useState } from "react";
import type { ChapterCommentary } from "@/lib/bible/load";
import { SaintIcon } from "./SaintIcon";

function CommentaryCard({
  author,
  work,
  text,
}: {
  author: string;
  work: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-paper/10 bg-paper/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-paper/[0.05] transition-colors"
      >
        <SaintIcon author={author} size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[1px] text-paper/70 truncate">
            {author}
          </p>
          <p className="font-sans text-[11px] italic text-paper/45 truncate">
            {work}
          </p>
        </div>
        <span
          aria-hidden
          className={
            "text-[11px] text-paper/40 transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-paper/8 space-y-2.5">
          {text.split(/\n\n+/).map((para, i) => (
            <p
              key={i}
              className="font-serif text-[13.5px] leading-[1.55] text-paper/80"
            >
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudyRail({
  commentary,
  anchorIds = true,
}: {
  commentary: ChapterCommentary;
  /** When false, omit the per-verse section ids so duplicate copies of the rail
   *  (e.g. mobile + desktop) don't collide on `#rail-vN` URL fragments. */
  anchorIds?: boolean;
}) {
  const verses = Object.keys(commentary)
    .map(Number)
    .filter((n) => (commentary[String(n)]?.length ?? 0) > 0)
    .sort((a, b) => a - b);

  if (verses.length === 0) {
    return (
      <div className="px-2 py-6 text-center font-sans text-[12px] text-paper/40">
        No patristic commentary for this chapter yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {verses.map((vn) => {
        const notes = commentary[String(vn)] ?? [];
        return (
          <section
            key={vn}
            {...(anchorIds ? { id: `rail-v${vn}` } : {})}
            className="rail-section space-y-2.5 -mx-2 px-2 py-1 rounded-md scroll-mt-24"
          >
            <a
              href={`#v${vn}`}
              className="inline-flex items-baseline gap-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 hover:text-paper transition-colors"
            >
              Verse {vn}
              <span className="text-paper/30 text-[10px]">↑</span>
            </a>
            <div className="space-y-2">
              {notes.map((n, i) => (
                <CommentaryCard
                  key={i}
                  author={n.author}
                  work={n.work}
                  text={n.text}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
