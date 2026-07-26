"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { parseReferencesVerbose, type ParsedSegment } from "@/lib/bible/parseReferences";
import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Multi-reference results, rendered client-side.
 *
 * This used to be a force-dynamic server page that called loadChapter and
 * loadVerseRange directly. Those are server-only (they read data/bible off the
 * filesystem), so the route could not be exported and was stashed out of the
 * Android bundle in scripts/android-build.mjs. In the app the push to
 * /bible/multi?q= therefore hit a route that did not exist and the shell
 * dropped the user back on Today, which reads as "it kicked me out" and loses
 * the query. Reported from the Android beta on 2026-07-26.
 *
 * Same shape the rest of the native-safe tree uses: a static server shell for
 * metadata, a client child that fetches at runtime. Verse text comes from the
 * public /api/bible/verse route through apiFetch, so the native shell reaches
 * purifyapp.net instead of https://localhost.
 */

type Block = ParsedSegment & {
  body: { name: string; verses: { n: number; text: string }[] } | null;
};

/** A whole-chapter reference has no verse count in the citation, so ask for a
 *  generous range. The API caps a span at 200 and returns only the verses that
 *  exist, so this yields the full chapter without a second lookup. */
const CHAPTER_SPAN = 200;

export function MultiVerseClient() {
  const { t } = useTranslate();
  const query = (useSearchParams().get("q") ?? "").trim();
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const segments = query ? parseReferencesVerbose(query) : [];

    (async () => {
      if (segments.length === 0) {
        // Not set synchronously: a bare setState in the effect body trips
        // react-hooks/set-state-in-effect and can cascade renders.
        if (!cancelled) setBlocks([]);
        return;
      }
      const resolved = await Promise.all(
        segments.map(async (seg): Promise<Block> => {
          const h = seg.hit;
          if (!h) return { ...seg, body: null };
          const from =
            h.kind === "verse" ? h.verse : h.kind === "range" ? h.verseFrom : 1;
          const to =
            h.kind === "verse"
              ? h.verse
              : h.kind === "range"
                ? h.verseTo
                : CHAPTER_SPAN;
          try {
            const res = await apiFetch(
              `/api/bible/verse?book=${encodeURIComponent(h.book.slug)}&chapter=${h.chapter}&from=${from}&to=${to}`,
            );
            if (!res.ok) return { ...seg, body: null };
            const json = (await res.json()) as {
              name?: string;
              verses?: { n: number; text: string }[];
            };
            if (!json.name || !json.verses?.length) return { ...seg, body: null };
            return { ...seg, body: { name: json.name, verses: json.verses } };
          } catch {
            // Offline in the app, or the lookup failed. The reference still
            // renders as an unresolved row rather than vanishing.
            return { ...seg, body: null };
          }
        }),
      );
      if (!cancelled) setBlocks(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (blocks === null) {
    return (
      <Shell query={query}>
        <p className="font-sans text-ui text-paper/55">
          <T k="bible.multiLoading" />
        </p>
      </Shell>
    );
  }

  const resolvedCount = blocks.filter((b) => b.body && b.hit).length;
  const totalCount = blocks.length;

  if (totalCount === 0) {
    return (
      <Shell query={query}>
        <p className="font-serif text-lede text-paper/75">
          <T k="bible.multiEmptyHint" />
        </p>
        <Link
          href="/bible"
          className="mt-5 inline-flex font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          <T k="bible.multiBackToBible" /> →
        </Link>
      </Shell>
    );
  }

  return (
    <Shell
      query={query}
      heading={<T k="bible.referenceCount" count={resolvedCount} />}
      lede={
        resolvedCount === totalCount
          ? t("bible.multiAllResolved")
          : t("bible.multiSomeResolved", {
              resolved: resolvedCount,
              total: totalCount,
            })
      }
    >
      <div className="space-y-10 md:space-y-12">
        {blocks.map((b, i) => {
          if (!b.hit || !b.body) {
            return (
              <div
                key={`unresolved-${i}`}
                className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-4"
              >
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-1">
                  <T k="bible.multiCouldNotResolve" />
                </p>
                <p className="font-serif text-ui text-paper/70">{b.raw}</p>
              </div>
            );
          }
          const h = b.hit;
          const label =
            h.kind === "verse"
              ? `${b.body.name} ${h.chapter}:${h.verse}`
              : h.kind === "range"
                ? `${b.body.name} ${h.chapter}:${h.verseFrom}-${h.verseTo}`
                : `${b.body.name} ${h.chapter}`;
          const verseAnchor =
            h.kind === "verse"
              ? `#v${h.verse}`
              : h.kind === "range"
                ? `#v${h.verseFrom}-${h.verseTo}`
                : "";
          return (
            <article key={`hit-${i}`} className="min-w-0">
              <header className="mb-3 flex items-baseline justify-between gap-4 flex-wrap">
                <h2 className="font-display-serif text-title text-paper leading-tight">
                  {label}
                </h2>
                <Link
                  href={`/bible/${h.book.slug}/${h.chapter}${verseAnchor}`}
                  className="font-sans text-detail font-medium text-paper/55 hover:text-paper transition-colors"
                >
                  <T k="bible.openInChapter" /> →
                </Link>
              </header>
              <div className="font-serif text-body text-paper/85 leading-[1.75] space-y-3">
                {b.body.verses.map((v) => (
                  <p key={v.n}>
                    <span className="font-sans text-caption font-semibold text-paper/45 mr-2 align-baseline">
                      {v.n}
                    </span>
                    {v.text}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <footer className="mt-12 pt-6 border-t border-paper/8">
        <p className="font-sans text-detail text-paper/45">
          <T k="bible.multiBookmarkNote" />
        </p>
      </footer>
    </Shell>
  );
}

function Shell({
  query,
  heading,
  lede,
  children,
}: {
  query: string;
  heading?: React.ReactNode;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16 safe-pb-reader">
      <div className="mx-auto max-w-[820px] w-full">
        <header className="mb-8 md:mb-10">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            <T k="bible.multiEyebrow" />
          </p>
          {heading ? (
            <h1 className="font-display-serif text-display-sm md:text-display text-paper tracking-[-0.01em] leading-[1.05]">
              {heading}
            </h1>
          ) : null}
          {lede ? (
            <p className="mt-3 font-serif text-lede text-paper/65">{lede}</p>
          ) : null}
          {query ? (
            <p className="mt-2 font-sans text-detail text-paper/45 break-words">
              <span className="text-paper/55">
                <T k="bible.multiQuery" />
              </span>{" "}
              {query}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </section>
  );
}
