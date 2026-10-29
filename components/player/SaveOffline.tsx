"use client";

// Save a book to listen offline (1.8, for Plus): in the apps, while a chapter
// of the Bible is playing. One tap saves every chapter of that book that has
// a reading (lib/readAloud/offline.ts), saying how far it has come; a saved
// book says so and can be taken off again. Shown to everyone, as every Plus
// feature is; a reader without Plus who taps it meets the upgrade sheet named
// for it.
//
// Drawn as the owner's pick of 2026-10-27 draws it (round 8, the player's two
// views): a download mark at the end of the title's line, a ring while the
// book is saved, a check once it is. What the words said before is said by
// the mark to a screen reader and on one line over the player's controls
// (SaveOfflineNote): how far the saving has come, a book that could not all
// be saved, and the saved book with Remove. The saving is the app's, not the
// screen's: it goes on, and is still shown, when the player is closed and
// opened again or its view is switched.
//
// From 1.8's second round it is also the first row of the player's •••
// sheet (SaveOfflineRow; the owner's round 8 A drew the ••• and his "add
// everything we left out" of 2026-10-28 filled it), the same saving with its
// words on it.

import { useEffect, useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { getBook, localBookNames } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";
import { bookOfSrc, hasReadAloud, readAloudRecording } from "@/lib/readAloud/chapters";
import { checkSaved, onSavedChange, removeBook, saveChapters, savedChapters } from "@/lib/readAloud/offline";

type State = {
  /** The book being saved, and how far it has come. */
  job: { book: string; done: number; total: number } | null;
  /** The last book whose saving missed some chapters. */
  failed: string | null;
  /** The book whose saved line (with Remove) is open. */
  open: string | null;
};

const EMPTY: State = { job: null, failed: null, open: null };
let state: State = EMPTY;
const listeners = new Set<() => void>();

function set(patch: Partial<State>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function useSaving(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
    () => EMPTY,
  );
}

function useSavedKeys(): string {
  return useSyncExternalStore(
    onSavedChange,
    () => Object.keys(savedChapters()).sort().join(","),
    () => "",
  );
}

/** The playing chapter's book, if it can be saved here: its chapters that have a reading, and how many are saved. */
function useOfflineBook(src: string | null) {
  const { t } = useTranslate();
  const saved = useSavedKeys();
  const book = bookOfSrc(src);
  if (!book || !isNativeClient()) return null;
  const meta = getBook(book);
  if (!meta) return null;
  const chapters = Array.from({ length: meta.chapters }, (_, i) => i + 1).filter((c) => hasReadAloud(book, c));
  if (!chapters.length) return null;
  const savedHere = saved.split(",").filter((k) => k.startsWith(`${book}/`)).length;
  return { book, chapters, name: localBookNames(t)[book] ?? meta.name, saved: savedHere >= chapters.length };
}

/**
 * The playing book's saving, for the mark and the row: the book, how far its
 * saving has come, and the one way to start it (Plus first: a reader without
 * it meets the upgrade sheet named for it, over the player).
 */
function useSaveBook(src: string | null) {
  const upgrade = useUpgradeModal();
  const saving = useSaving();
  const offline = useOfflineBook(src);
  const job = offline && saving.job?.book === offline.book ? saving.job : null;

  async function save() {
    if (!offline || state.job) return;
    const { book, chapters } = offline;
    if ((await plusFeaturesNow()) === false) {
      upgrade.open("offline", { overPlayer: true });
      return;
    }
    set({ job: { book, done: 0, total: chapters.length }, failed: null, open: null });
    const { failed: missed } = await saveChapters(
      book,
      chapters,
      (c) => ({ mp3: readAloudRecording(book, c), json: streamedUrl(`/audio/read/${book}/${c}.json`, true) }),
      (done, total) => set({ job: { book, done, total } }),
    );
    set({ job: null, failed: missed > 0 ? book : null });
  }

  return { offline, job, saving, save };
}

/** The download mark, at the end of the title's line. */
export function SaveOffline({ src, className }: { src: string | null; className?: string }) {
  const { t } = useTranslate();
  const { offline, job, saving, save } = useSaveBook(src);
  if (!offline) return null;
  const { book, name, saved } = offline;

  const box = cn(
    "tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full motion-safe:transition-colors",
    className,
  );

  if (job) {
    const share = job.total > 0 ? job.done / job.total : 0;
    return (
      <span role="img" aria-label={t("player.offline.saving", { done: job.done, total: job.total })} className={cn(box, "text-paper")}>
        <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2} />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${(share * 56.55).toFixed(2)} 56.55`}
            transform="rotate(-90 12 12)"
          />
        </svg>
      </span>
    );
  }

  if (saved) {
    const open = saving.open === book;
    return (
      <button
        type="button"
        onClick={() => set({ open: open ? null : book })}
        aria-expanded={open}
        aria-label={t("player.offline.saved", { book: name })}
        className={cn(box, "text-paper hover:bg-paper/[0.06] [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.45))]")}
      >
        <svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.2 12.3l2.6 2.6 5-5.4" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void save()}
      aria-label={t("player.offline.save", { book: name })}
      className={cn(box, "text-paper/80 hover:bg-paper/[0.06] hover:text-paper")}
    >
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    </button>
  );
}

/**
 * Save for offline as a row of the player's ••• sheet (1.8): what the mark
 * does, in words. Save the book; while it saves, how far it has come; once
 * saved, the book and Remove. Only where the mark is: a chapter of the Bible
 * playing, in the apps. Starting the saving closes the sheet (`onLeave`), so
 * the upgrade sheet, for a reader without Plus, never opens over another,
 * and the saving goes on, shown over the player's controls.
 */
export function SaveOfflineRow({ src, onLeave, className }: { src: string | null; onLeave: () => void; className?: string }) {
  const { t } = useTranslate();
  const { offline, job, save } = useSaveBook(src);
  if (!offline) return null;
  const { book, name, saved } = offline;
  const row = cn(
    "flex min-h-12 w-full items-center gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 text-start font-sans text-detail font-medium text-paper/85",
    className,
  );
  const mark = (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );

  if (job) {
    return (
      <p role="status" className={row}>
        {mark}
        <span className="min-w-0 truncate">{t("player.offline.saving", { done: job.done, total: job.total })}</span>
      </p>
    );
  }

  if (saved) {
    return (
      <div className={row}>
        {mark}
        <span className="min-w-0 flex-1 truncate">{t("player.offline.saved", { book: name })}</span>
        <button
          type="button"
          onClick={() => {
            set({ open: null });
            void removeBook(book);
          }}
          className="tap-press hit-44 shrink-0 font-semibold text-paper hover:underline"
        >
          {t("player.offline.remove")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onLeave();
        void save();
      }}
      className={cn(row, "hover:border-paper/30 hover:bg-paper/10")}
    >
      {mark}
      <span className="min-w-0 truncate">{t("player.offline.save", { book: name })}</span>
    </button>
  );
}

/**
 * The one line about saving, over the player's controls: how far the saving
 * has come, that some chapters could not be saved, or (once the check is
 * tapped) the saved book with Remove. Nothing when there is nothing to say.
 */
export function SaveOfflineNote({ src, className }: { src: string | null; className?: string }) {
  const { t } = useTranslate();
  const saving = useSaving();
  const offline = useOfflineBook(src);
  // Once a session, forget saved chapters whose files the phone no longer
  // has. Here, drawn once under both views, rather than on each mark.
  useEffect(() => {
    if (isNativeClient()) void checkSaved();
  }, []);
  if (!offline) return null;
  const { book, name, saved } = offline;
  const job = saving.job?.book === book ? saving.job : null;
  const line = job
    ? { text: t("player.offline.saving", { done: job.done, total: job.total }), remove: false }
    : saving.failed === book
      ? { text: t("player.offline.failed"), remove: false }
      : saved && saving.open === book
        ? { text: t("player.offline.saved", { book: name }), remove: true }
        : null;
  return (
    <p role="status" className={cn("flex min-h-0 flex-wrap items-center justify-center gap-x-2 text-center font-sans text-caption text-paper/60", className)}>
      {line ? <span>{line.text}</span> : null}
      {line?.remove ? (
        <button
          type="button"
          onClick={() => {
            set({ open: null });
            void removeBook(book);
          }}
          className="tap-press hit-44 px-1 font-semibold text-paper/85 underline-offset-4 hover:underline"
        >
          {t("player.offline.remove")}
        </button>
      ) : null}
    </p>
  );
}
