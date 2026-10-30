"use client";

// Try the word study (r3-07 A): the study itself, as the Bible's word study
// sheet draws it (components/bible/WordStudySheet.tsx, WordStudyBody), for
// the Word of John 1:1, λόγος: its dictionary entry, how often it stands in
// each testament, and every verse it stands in with the word marked. Under
// it, the three words John 1 begins with, to study each in turn.
//
// The verses come from the website's public word study (app/api/bible/word),
// the texts being public domain: the same answer a subscriber gets.

import { useState } from "react";

import { WordStudyBody } from "@/components/bible/WordStudySheet";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TRY_WORDS } from "@/lib/premium/plusTry";

import { TrySwitch, TryWindow } from "./TryKit";

/** The Greek in the Bible's Greek face, as the study sets it. */
const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

export default function TryWordStudy({ row }: TryProps) {
  const { t } = useTranslate();
  const [strongs, setStrongs] = useState(TRY_WORDS[0].strongs);
  const word = TRY_WORDS.find((w) => w.strongs === strongs) ?? TRY_WORDS[0];

  return (
    <>
      <TryWindow label={t(row.name)} tall>
        <div className="px-5 pb-16 pt-5">
          {/* Afresh for each word, as the sheet opens afresh for each. */}
          <WordStudyBody key={strongs} strongs={strongs} lemma={word.lemma} startIn="nt" />
        </div>
      </TryWindow>
      <TrySwitch
        label={t("bible.wordStudyTitle")}
        value={strongs}
        onChange={setStrongs}
        options={TRY_WORDS.map((w) => ({ id: w.strongs, label: <span style={GREEK}>{w.lemma}</span>, lang: "grc", className: "text-ui" }))}
      />
    </>
  );
}
