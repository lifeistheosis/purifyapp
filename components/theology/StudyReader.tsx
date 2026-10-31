"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { partFromHash, partHash, readIdOf, withPart, withRead, type ReadKind } from "@/lib/theology/path";
import { updatePathProgress } from "@/lib/theology/usePathProgress";
import { useScrollAway } from "@/lib/ui/scrollAway";

import { noteOpened } from "./PathRead";

/** Said in-tab when the part in view changes, as the address's # does between tabs. */
const PART_EVENT = "purify:study-part";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(PART_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(PART_EVENT, onChange);
  };
}

/** The part in view, kept in the address (#part-2), so the way back and a link come back to it. */
export function usePart(total: number): number {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  return partFromHash(hash, total);
}

/** Show another part: the address says it with replaceState, so back leaves the reading and does not walk its parts. */
function showPart(n: number): void {
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + partHash(n));
  window.dispatchEvent(new Event(PART_EVENT));
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

/** The bar's second line while a study is read: "Part 2 of 5". */
export function ReaderPartLine({ total }: { total: number }) {
  const { t } = useTranslate();
  const part = usePart(total);
  return (
    <p aria-live="polite" className="truncate font-sans text-[11.5px] font-medium leading-tight text-paper/55">
      {t("paths.part", { n: part, total })}
    </p>
  );
}

export type ReaderEnd = {
  /** What comes after the study on the path: the step's next read, the next step, or none (Go deeper). */
  title: string | null;
  href: string;
  /** A read of the step, which counts as read once opened from here; none for a step. */
  read?: { id: string; kind: ReadKind; step: string };
};

/**
 * Reading a study (1.8, round 3 r3-13): C's "one part at a time" in the
 * owner's hybrid of B and C, on B's "the icon's light". The study's parts as
 * a bar of segments under the page's bar, the one in view lit, each a tap
 * away; the part's own words, and at its end the Fathers it rests on, as a
 * deck (components/theology/PassageDeck.tsx); then Up next, the next part,
 * or after the last what comes next on the path.
 *
 * Every part is in the page, the others `hidden`, so a search engine still
 * reads the whole study. The part in view is kept in the address and read on
 * the device; the furthest part reached, and the study once its last part is
 * reached, are kept on the device (lib/theology/usePathProgress.ts), so
 * Begin on the study's page becomes Continue at that part.
 *
 * The tab bar steps away while the reader reads on, and comes back on a
 * scroll up, as in the Bible (lib/ui/scrollAway.ts).
 */
export function StudyReader({
  slug,
  title,
  headings,
  panels,
  light,
  end,
}: {
  slug: string;
  title: string;
  /** Each part's own heading, in order. */
  headings: string[];
  /** Each part's words and its deck, drawn on the server. */
  panels: ReactNode[];
  /** The study's subject's icon, whose light the words lie on. */
  light: string;
  end: ReaderEnd;
}) {
  const { t } = useTranslate();
  const total = headings.length;
  const part = usePart(total);
  useScrollAway();

  // The furthest part reached, and the study read once its last part is.
  useEffect(() => {
    updatePathProgress((p) => {
      const reached = withPart(p, slug, part);
      return part === total ? withRead(reached, readIdOf.study(slug)) : reached;
    });
  }, [slug, part, total]);

  const nextHeading = part < total ? headings[part] : null;

  return (
    <div data-study-reader="" className="relative">
      {/* The subject's icon in grey: the light the page lies on. */}
      <span aria-hidden className="reader-light" style={{ backgroundImage: `url(${light})` }} />

      {/* On a computer, the study's name, the way back to it, and where the reader is; a phone's bar says both. */}
      <header className="relative mb-4 hidden md:block native-md-hidden">
        <h1 lang="en" className="font-serif text-title-sm font-bold leading-tight text-paper">
          <Link href={`/theology/${slug}`} className="hover:underline">
            {title}
          </Link>
        </h1>
        <p className="mt-1 font-sans text-detail font-semibold text-paper/55">{t("paths.part", { n: part, total })}</p>
      </header>

      {/* The parts as a bar of segments, under the page's bar on a phone. */}
      <nav
        aria-label={t("saints.contents")}
        data-part-segments=""
        className="fixed inset-x-0 top-12 below-topbar z-20 bg-night/95 px-5 pb-1.5 md:static md:bg-transparent md:px-0"
      >
        <ol className="mx-auto flex w-full max-w-[680px] gap-[5px]">
          {headings.map((heading, i) => {
            const n = i + 1;
            return (
              <li key={n} className="flex-1">
                <button
                  type="button"
                  aria-label={`${t("paths.part", { n, total })}: ${heading}`}
                  aria-current={n === part ? "step" : undefined}
                  onClick={() => (n === part ? undefined : showPart(n))}
                  className="hit-44 flex h-6 w-full items-center"
                >
                  <span data-state={n < part ? "read" : n === part ? "current" : "ahead"} className="part-segment w-full" />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="relative pt-9 md:pt-6">
        {headings.map((heading, i) => {
          const n = i + 1;
          return (
            <section key={n} data-part={n} hidden={n !== part} aria-labelledby={`study-part-${n}`}>
              <h2 id={`study-part-${n}`} lang="en" className="font-serif text-[13.5px] italic leading-snug text-paper/58">
                {heading || t("paths.part", { n, total })}
              </h2>
              {panels[i]}
            </section>
          );
        })}

        {/* Up next: the next part, or after the last what the path brings next. */}
        <div data-reader-next="" className="theology-tray mt-10 flex items-center gap-3 rounded-[22px] px-3.5 py-[13px]">
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/50">
              {nextHeading !== null ? `${t("walk.upNext")} · ${part + 1}` : t("walk.upNext")}
            </span>
            <span
              lang={(nextHeading !== null && nextHeading) || (nextHeading === null && end.title) ? "en" : undefined}
              className="mt-1 block font-serif text-[15px] font-semibold leading-[1.3] text-paper"
            >
              {nextHeading !== null ? nextHeading || t("paths.part", { n: part + 1, total }) : end.title ?? t("study.apologetics.goDeeper")}
            </span>
          </span>
          {nextHeading !== null ? (
            <button
              type="button"
              onClick={() => showPart(part + 1)}
              className="reader-lit tap-press inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-[14.5px] font-semibold text-night"
            >
              {t("common.next")}
              <ChevronRight size={15} className="rtl:-scale-x-100" />
            </button>
          ) : (
            <Link
              href={end.href}
              onClick={() => (end.read ? noteOpened(end.read, end.read.step) : undefined)}
              className="reader-lit tap-press inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-[14.5px] font-semibold text-night"
            >
              {t("common.next")}
              <ChevronRight size={15} className="rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
