"use client";

// Try Remember the verse (r3-07 A): the card as it comes on Today
// (components/today/RememberCard.tsx, RememberCardView, the one card): a
// saved verse's reference large, the verse with its longer words left blank,
// Show the words to light them up, then Not yet or I know it, and when it
// comes back.
//
// The verse is the reader's own on Today; here it is an example, marked so,
// in the Bible's own words (John 1:5). Answering it works for the moment and
// is kept nowhere: the reader's saved verses and their schedule are not read
// or written by a preview.

import { useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { RememberCardView, backWords } from "@/components/today/RememberCard";
import { TRY_CHAPTER, TRY_REMEMBER_VERSE } from "@/lib/premium/plusTry";
import { INTERVALS, addDays, dayOf, type Entry } from "@/lib/remember/schedule";

import { johnVerse, useJohnReference } from "./TryBible";
import { ExampleTag, TryWindow } from "./TryKit";

export default function TryRemember({ row }: TryProps) {
  const { t } = useTranslate();
  const reference = useJohnReference();
  const [today] = useState(() => dayOf(new Date()));
  const [shown, setShown] = useState(false);
  const [answered, setAnswered] = useState<{ entry: Entry; knew: boolean } | null>(null);

  // A verse met for the first time comes back after the first interval, known or not yet.
  const reply = (knew: boolean) => setAnswered({ entry: { box: 1, due: addDays(today, INTERVALS[0]) }, knew });

  return (
    <TryWindow label={t(row.name)}>
      <div className="px-4 pb-16 pt-5">
        <RememberCardView
          reference={reference(TRY_REMEMBER_VERSE)}
          href={`/bible/${TRY_CHAPTER.book}/${TRY_CHAPTER.chapter}#v${TRY_REMEMBER_VERSE}`}
          text={johnVerse(TRY_REMEMBER_VERSE)}
          failed={false}
          shown={shown}
          back={answered ? backWords(t, answered.entry, today) : null}
          knew={answered?.knew ?? false}
          locked={false}
          onShow={setShown}
          onReply={reply}
          onLocked={() => {}}
          badge={<ExampleTag className="ms-2" />}
        />
      </div>
    </TryWindow>
  );
}
