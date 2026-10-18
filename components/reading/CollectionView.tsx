"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import type { ShownPassage } from "@/lib/reading/collectionView";
import { collectionIntroKey, collectionNameKey, type CollectionSlug } from "@/lib/reading/feelings";
import type { TileCard } from "@/lib/reading/select";

import { CoverRow, CoverTile, cardMeta } from "./CoverRow";
import styles from "./room.module.css";

type T = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * A Purify collection (1.8): a calm page to read. The feeling's name, one
 * line of introduction in our own words, then the passages, each in the
 * words of its text and in the reading face, with its exact place under it:
 * the author, the work and the section the work itself names, or the book,
 * chapter and verses and the translation. The place is the link, and it opens
 * the passage where it stands, the paragraph in its work or the verses in the
 * Bible. At the foot, the books the Fathers' passages come from, to read
 * whole.
 *
 * The passages are English in every language, as the app's texts are, and
 * marked so; the page says so in one line to a reader in another language.
 * The names of the books of the Bible are the reader's (bible.books.*).
 */
export function CollectionView({
  slug,
  passages,
  sources,
}: {
  slug: CollectionSlug;
  passages: ShownPassage[];
  sources: TileCard[];
}) {
  const { t, tn, locale } = useTranslate();

  return (
    <article data-collection={slug} className="bg-night px-5 pb-24 pt-5 md:px-8 md:pt-14">
      <div className="mx-auto w-full max-w-[680px]">
        <header>
          <h1 id="collection-title" className="text-heading font-semibold leading-[1.08] tracking-[-0.02em] text-paper text-balance md:text-display-sm">
            {t(collectionNameKey(slug))}
          </h1>
          <p className="mt-3 max-w-[46ch] font-sans text-body leading-[1.55] text-paper/70">{t(collectionIntroKey(slug))}</p>
          <p className="mt-3 font-sans text-caption text-paper/50">
            {tn("reading.collection.passages", passages.length)}
            {locale !== "en" ? ` · ${t("reading.collection.english")}` : ""}
          </p>
        </header>

        <ol className="mt-10 md:mt-14">
          {passages.map((p, i) => (
            <li key={`${p.href}-${i}`} className={cn(styles.passage, "border-t border-paper/10 py-9 first:border-t-0 first:pt-2 md:py-11")}>
              <figure>
                <blockquote lang="en" className="font-serif text-[19px] leading-[1.7] text-paper/90 md:text-[21px]">
                  <p>{p.text}</p>
                </blockquote>
                <figcaption className="mt-4">
                  <Link
                    href={p.href}
                    prefetch={false}
                    className="tap-press inline-flex max-w-full items-start gap-1.5 font-sans text-detail leading-[1.45] text-paper/60 hover:text-paper"
                  >
                    <span className="min-w-0">
                      <Place p={p} t={t} />
                    </span>
                    <ChevronRight size={14} className="mt-[3px] shrink-0 rtl:-scale-x-100" />
                  </Link>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>

        <p className="mt-4 border-t border-paper/10 pt-8 font-sans text-detail leading-[1.55] text-paper/55">{t("reading.collection.note")}</p>

        {sources.length ? (
          <CoverRow id="sources" title={t("reading.collection.sources")} className="mt-12">
            {sources.map((c) => (
              <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
            ))}
          </CoverRow>
        ) : null}
      </div>
    </article>
  );
}

/** A passage's exact place, as the link under it says it. */
function Place({ p, t }: { p: ShownPassage; t: T }) {
  if (p.kind === "scripture") {
    const book = t(`bible.books.${p.book}`);
    return (
      <>
        <span className="font-medium text-paper/80">{`${book} ${p.reference}`}</span>
        <span>{`, ${t(p.translation === "kjv" ? "reading.collection.kjv" : "reading.collection.brenton")}`}</span>
      </>
    );
  }
  return (
    <span lang="en">
      <span className="font-medium text-paper/80">{p.author}</span>
      {`, ${p.work}, ${p.place}${p.mark ? `, ${p.mark}` : ""}`}
    </span>
  );
}
