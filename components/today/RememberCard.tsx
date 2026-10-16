"use client";

// Remember a verse (1.7, Purify Plus): one of the reader's saved verses a
// day, its words cut to their first letters to be said from memory, then
// shown, then marked "I know it" or "Not yet" (lib/remember/schedule.ts says
// when it comes back). Only when the reader has saved a verse.
//
// A Plus feature is never hidden (the owner's rule, components/billing/
// UpgradeModal.tsx): a reader without Plus sees the card with its mark, and
// "Show the words" opens the upgrade sheet named for it.

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { addDays, answer, dayOf, dueVerse, firstLetters, keepText, textOf, verseKey, type Entry, type SavedVerse } from "@/lib/remember/schedule";

const noop = () => () => {};

function LockMark() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function RememberCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const { bookmarks } = useBookmarks();
  // The schedule lives on the device: nothing is drawn until the page is.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [today] = useState(() => dayOf(new Date()));
  const [shown, setShown] = useState(false);
  const [answered, setAnswered] = useState<Entry | null>(null);
  const [fetched, setFetched] = useState<{ key: string; text: string | null } | null>(null);

  const saved = useMemo<SavedVerse[]>(
    () =>
      bookmarks.flatMap((b) =>
        b.kind === "bible-verse"
          ? [{ key: verseKey(b.book, b.chapter, b.verse), book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, addedAt: b.addedAt }]
          : [],
      ),
    [bookmarks],
  );
  const due = useMemo(() => (client && !answered ? dueVerse(saved, today) : null), [client, answered, saved, today]);
  const kept = due ? textOf(due.key) : null;
  const text = kept ?? (fetched && due && fetched.key === due.key ? fetched.text : null);

  // The words, the first time: from the website, then kept on the device.
  useEffect(() => {
    if (!due || kept) return;
    let cancelled = false;
    apiFetch(`/api/bible/verse?book=${encodeURIComponent(due.book)}&chapter=${due.chapter}&verse=${due.verse}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { verses?: { text: string }[] } | null) => {
        const words = json?.verses?.map((v) => v.text).join(" ") ?? null;
        if (words) keepText(due.key, words);
        if (!cancelled) setFetched({ key: due.key, text: words });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: due.key, text: null });
      });
    return () => {
      cancelled = true;
    };
  }, [due, kept]);

  if (!client || (!due && !answered)) return null;
  const books = localBookNames(t);
  const locked = plus === false;
  const back = answered
    ? answered.box > 5
      ? t("remember.known")
      : answered.due === addDays(today, 1)
        ? t("remember.backTomorrow")
        : t("remember.backIn", { count: Math.round((Date.parse(answered.due) - Date.parse(today)) / 86_400_000) })
    : null;

  return (
    <section aria-labelledby="remember-title" className={cn("rounded-2xl border border-paper/10 bg-paper/[0.03] p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p id="remember-title" className="font-sans text-caption text-paper/55">
          {t("remember.eyebrow")}
        </p>
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-pill border border-paper/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-paper/60">
            <LockMark />
            {t("plus.badge")}
          </span>
        ) : null}
      </div>

      {back ? (
        <p role="status" className="mt-3 font-sans text-ui text-paper/75">
          {back}
        </p>
      ) : due ? (
        <>
          <Link href={`/bible/${due.book}/${due.chapter}#v${due.verse}`} className="mt-2 block font-heading text-ui font-semibold text-paper">
            {referenceIn(due.label, due.book, books)}
          </Link>
          <p className="mt-2 font-serif text-detail leading-[1.6] text-paper/85" dir="auto">
            {text ? (shown && !locked ? text : firstLetters(text)) : <span className="italic text-paper/50">{fetched ? t("remember.offline") : " "}</span>}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!shown || locked ? (
              <button
                type="button"
                disabled={!text}
                onClick={() => (locked ? upgrade.open("remember") : setShown(true))}
                className="tap-press inline-flex h-11 items-center gap-1.5 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night disabled:opacity-50"
              >
                {t("remember.show")}
                {locked ? <LockMark /> : null}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAnswered(answer(due.key, false, today))}
                  className="tap-press h-11 rounded-pill border border-paper/20 px-4 font-sans text-caption font-semibold text-paper/85"
                >
                  {t("remember.notYet")}
                </button>
                <button
                  type="button"
                  onClick={() => setAnswered(answer(due.key, true, today))}
                  className="tap-press h-11 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
                >
                  {t("remember.knew")}
                </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
