"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { CollectionIndexEntry } from "@/lib/catechism/collections";
import { useCollectionProgress } from "@/lib/catechism/useCollectionProgress";

import { CollectionCard } from "./CollectionCard";

const SECTION = "px-5 md:px-8 py-12 md:py-20";

/**
 * The list. The page (a server shell) hands this the collections with their
 * published question ids; the sets come from the device after mount and,
 * signed in, from the account's rows merged in. Everything here is free.
 */
export function CollectionsClient({ index }: { index: CollectionIndexEntry[] }) {
  const { t } = useTranslate();
  const progress = useCollectionProgress(index);

  return (
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
      <article className="mx-auto w-full max-w-[640px]">
        <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/80">
          {t("catechism.eyebrow")}
        </p>
        <h1 className="mt-2 font-serif text-title md:text-heading font-bold leading-[1.15] text-paper">
          {t("catechism.collections.title")}
        </h1>
        <p className="mt-3 font-serif text-body leading-[1.7] text-paper/70 max-w-[52ch]">
          {t("catechism.collections.lede")}
        </p>

        {index.length === 0 ? (
          <CollectionsEmpty />
        ) : (
          <ul className="mt-8 divide-y divide-paper/[0.08]">
            {index.map((c) => (
              <CollectionCard key={c.slug} collection={c} progress={progress[c.slug]} />
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

export function CollectionsEmpty() {
  const { t } = useTranslate();
  return (
    <p className="mt-8 font-serif italic text-body leading-[1.7] text-paper/55 max-w-[52ch]">
      {t("catechism.collections.empty")}
    </p>
  );
}
