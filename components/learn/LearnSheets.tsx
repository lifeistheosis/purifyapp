"use client";

// Learn by heart's two sheets as one thing a card opens (build 93 note 11):
// the practise sheet for what is being learned (components/you/
// PractiseSheet.tsx), and the sheet that chooses it (./ChooseSheet.tsx).
// "Change" in the first leads to the second, and taking something up in the
// second leads to the first, so a reader can switch what they learn at any
// time, from You's card and from Today's alike.

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PractiseSheet, type PractiseText } from "@/components/you/PractiseSheet";
import { localBookNames } from "@/lib/bible/books";
import type { LearnItem } from "@/lib/remember/items";
import { learnName } from "@/lib/remember/useLearning";
import { useVerseWords } from "@/lib/saved/verseWords";

import { ChooseSheet } from "./ChooseSheet";

type View = { kind: "practise"; item: LearnItem } | { kind: "choose" } | null;

/**
 * An item's words as the practise sheet takes them. A verse's are the ones
 * kept on the device, or read once from the website and kept; a quote's and
 * the reader's own are the item itself.
 */
export function useLearnText(item: LearnItem | null): { text: PractiseText | null; status: "ready" | "loading" | "missing" } {
  const { t } = useTranslate();
  const verse = item?.kind === "verse" ? item : null;
  const words = useVerseWords(verse?.book ?? "", verse?.chapter ?? 0, verse?.verse ?? 0, Boolean(verse));
  return useMemo(() => {
    if (!item) return { text: null, status: "loading" as const };
    const name = learnName(item, t, localBookNames(t));
    if (item.kind === "verse") {
      return words.text
        ? { text: { key: item.key, kind: item.kind, name, text: words.text }, status: "ready" as const }
        : { text: null, status: words.status === "missing" ? ("missing" as const) : ("loading" as const) };
    }
    const text: PractiseText = { key: item.key, kind: item.kind, name, text: item.text };
    if (item.kind === "quote") text.cite = item.cite;
    return { text, status: "ready" as const };
  }, [item, t, words.text, words.status]);
}

export function useLearnSheets({ desktop = false }: { desktop?: boolean } = {}): {
  /** Open the practise sheet for this. */
  practise: (item: LearnItem) => void;
  /** Open the sheet that chooses. */
  change: () => void;
  /** The sheets themselves: draw this once, anywhere in the card. */
  sheets: ReactNode;
} {
  const [view, setView] = useState<View>(null);
  // What was practised last stays in its sheet while the sheet goes down.
  const [last, setLast] = useState<LearnItem | null>(null);
  const practise = useCallback((item: LearnItem) => {
    setLast(item);
    setView({ kind: "practise", item });
  }, []);
  const change = useCallback(() => setView({ kind: "choose" }), []);
  const close = useCallback(() => setView(null), []);
  return {
    practise,
    change,
    sheets: <Sheets view={view} last={last} desktop={desktop} onClose={close} onChange={change} onTake={practise} />,
  };
}

function Sheets({
  view,
  last,
  desktop,
  onClose,
  onChange,
  onTake,
}: {
  view: View;
  last: LearnItem | null;
  desktop: boolean;
  onClose: () => void;
  onChange: () => void;
  onTake: (item: LearnItem) => void;
}) {
  const { t } = useTranslate();
  const { text, status } = useLearnText(view?.kind === "practise" ? view.item : last);
  return (
    <>
      <PractiseSheet
        open={view?.kind === "practise"}
        onClose={onClose}
        verse={text}
        // A verse whose words have not come: said in the sheet, where its tiles would be.
        waiting={text ? null : t(status === "missing" ? "remember.offline" : "common.loading")}
        onChange={onChange}
        desktop={desktop}
      />
      <ChooseSheet open={view?.kind === "choose"} onClose={onClose} onTake={onTake} desktop={desktop} />
    </>
  );
}
