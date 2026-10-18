"use client";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { ShownPassage } from "@/lib/reading/collectionView";
import { collectionIntroKey, collectionNameKey, type CollectionSlug } from "@/lib/reading/feelings";
import type { TileCard } from "@/lib/reading/select";

import { CoverRow, CoverTile, cardMeta } from "./CoverRow";
import styles from "./room.module.css";

/**
 * A Purify collection (1.8): a calm page to read. The feeling's name, one
 * line of introduction in our own words, then the passages, each in the
 * words of its text and in the reading face, with its exact place under it:
 * the author, the work by its own numbering and its edition, or the book,
 * chapter and verses and the translation: the line every quotation in the
 * app has (components/citations/SourceLine.tsx, 1.8). The place is the link,
 * and it opens the passage where it stands, the paragraph in its work or the
 * verses in the Bible. At the foot, the books the Fathers' passages come
 * from, to read whole.
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
                  <SourceLine cite={p} />
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
