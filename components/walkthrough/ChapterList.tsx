"use client";

// A walk's chapters in its movements (1.7): the book page's list, and the same
// list in the chapter page's Chapters sheet. A row is the chapter's number,
// its title and, once it has been walked, the drawn check; the chapter to walk
// next says so. Clean rows parted by hairlines, as Start here and the guide's
// parts are: no card around them and no drawing beside them (the owner's note
// 24 of 2026-10-16 retired the road of stations this list replaces).

import { useEffect, useRef } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";

export type WalkChapter = { n: number; title: string };
export type WalkMovement = { id: string; title: string; from: number; to: number };

export function ChapterList({
  book,
  movements,
  chapters,
  walked,
  next,
  current,
  inSheet = false,
  onPick,
}: {
  book: string;
  movements: WalkMovement[];
  /** The chapters written so far, with their titles. */
  chapters: WalkChapter[];
  walked: ReadonlySet<number>;
  /** The chapter to walk next, which says so; null once every one is walked. */
  next: number | null;
  /** The chapter open now, in the sheet. */
  current?: number;
  /** In the Chapters sheet: smaller headings, and the open chapter brought into view. */
  inSheet?: boolean;
  onPick?: () => void;
}) {
  const { t } = useTranslate();
  const box = useRef<HTMLDivElement>(null);
  const titleOf = new Map(chapters.map((c) => [c.n, c.title]));

  // In the sheet, the open chapter stands a third of the way down its list,
  // at once: a long book opened at chapter 30 should not start at chapter 1.
  useEffect(() => {
    if (!inSheet) return;
    const row = box.current?.querySelector<HTMLElement>("[aria-current='page']");
    const scroller = row?.closest<HTMLElement>(".overflow-y-auto");
    if (!row || !scroller) return;
    scroller.scrollTop += row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientHeight / 3;
  }, [inSheet]);

  return (
    <div ref={box} className={inSheet ? "space-y-5" : "space-y-9"}>
      {movements.map((m) => {
        const ns: number[] = [];
        for (let n = m.from; n <= m.to; n++) if (titleOf.has(n)) ns.push(n);
        if (ns.length === 0) return null;
        const headingId = `walk-${inSheet ? "sheet" : "book"}-${m.id}`;
        return (
          <section key={m.id} aria-labelledby={headingId}>
            {inSheet ? (
              // A list's own label inside the sheet, not a heading of the page.
              <p id={headingId} lang="en" className="font-sans text-caption font-semibold text-paper/55">
                {m.title}
              </p>
            ) : (
              <h2 id={headingId} lang="en" className="text-title-sm font-bold leading-tight text-paper">
                {m.title}
              </h2>
            )}
            <ol start={ns[0]} className={cn("divide-y divide-paper/[0.07]", inSheet ? "mt-1" : "mt-3 border-y border-paper/[0.08]")}>
              {ns.map((n) => {
                const done = walked.has(n);
                const here = current === n;
                return (
                  <li key={n}>
                    <Link
                      href={`/walkthroughs/${book}/${n}`}
                      prefetch={false}
                      onClick={onPick}
                      aria-current={here ? "page" : undefined}
                      className="tap-press group flex min-h-12 items-center gap-3 py-2.5"
                    >
                      <span className="w-6 shrink-0 text-end font-sans text-caption font-semibold tabular-nums text-paper/50">
                        {n}
                      </span>
                      <span
                        lang="en"
                        className={cn(
                          "min-w-0 flex-1 leading-snug",
                          inSheet ? "font-sans text-ui" : "font-serif text-body",
                          here ? "font-semibold text-paper" : "text-paper/85 group-hover:text-paper",
                        )}
                      >
                        {titleOf.get(n)}
                      </span>
                      {next === n && !done ? (
                        <span className="shrink-0 font-sans text-caption font-semibold text-paper/70">{t("walk.upNext")}</span>
                      ) : null}
                      {done ? (
                        <>
                          <Check size={16} className="shrink-0 text-paper/55" />
                          <span className="sr-only">{t("walk.walked")}</span>
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
