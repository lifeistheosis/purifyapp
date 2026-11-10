"use client";

// Try your Florilegium (r3-07 A): a gathering's own page
// (components/florilegium/FlorilegiumDetail.tsx) as it is drawn from 1.9's
// redesign (build 89 note 12): its name in Lora with how many lines it keeps
// under it, and each line as the page sets it (ItemCard, the real one): the
// words to read, where they are from, and a note of the reader's own.
//
// A reader's gatherings are their own, so this one is an example, marked so:
// "John 1", two of its verses in the Bible's words and a Father's line on it
// from the app's library (./TryExamples.ts), each with its source. A note can
// be written on a line, and a line taken away, for as long as the preview
// lasts; the reader's own gatherings are not read or written here.

import { useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { ItemCard } from "@/components/florilegium/FlorilegiumDetail";
import { FLOR_H1, FLOR_KICKER } from "@/components/florilegium/florStyle";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { TRY_CHAPTER, TRY_GATHERING } from "@/lib/premium/plusTry";

import { exampleSaying } from "./TryExamples";
import { johnVerse, useJohnReference } from "./TryBible";
import { ExampleTag, TryWindow } from "./TryKit";

export default function TryFlorilegium({ row }: TryProps) {
  const { t, tn } = useTranslate();
  const reference = useJohnReference();
  const title = `${t(`bible.books.${TRY_CHAPTER.book}`)} ${TRY_CHAPTER.chapter}`;

  const [items, setItems] = useState<FlorilegiumItem[]>(() => {
    const [first, second] = TRY_GATHERING.verses;
    const verse = (n: number, id: string): FlorilegiumItem => ({
      id,
      addedAt: 0,
      kind: "scripture",
      text: johnVerse(n),
      reference: reference(n),
      book: TRY_CHAPTER.book,
      chapter: TRY_CHAPTER.chapter,
      verse: n,
    });
    const saying = exampleSaying(TRY_GATHERING.father);
    const father: FlorilegiumItem[] = saying
      ? [{ id: "father", addedAt: 0, kind: "father", text: saying.text, author: saying.author, work: saying.work }]
      : [];
    // Newest first, as a gathering keeps them.
    return [verse(second, "second"), ...father, verse(first, "first")];
  });

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-6">
        <h3 className={FLOR_H1}>{title}</h3>
        <p className={`${FLOR_KICKER} flex flex-wrap items-center gap-2`}>
          <span>
            {t("study.florilegium.title")} · <span className="tabular-nums">{tn("study.florilegium.lineCount", items.length)}</span>
          </span>
          <ExampleTag />
        </p>
        <ul className="mt-4">
          {items.map((item) => (
            <li key={item.id} className="border-t border-paper/8 first:border-t-0">
              <ItemCard
                item={item}
                textLang="en"
                onRemove={() => setItems((was) => was.filter((i) => i.id !== item.id))}
                onNote={(note) => setItems((was) => was.map((i) => (i.id === item.id ? { ...i, note } : i)))}
              />
            </li>
          ))}
        </ul>
      </div>
    </TryWindow>
  );
}
