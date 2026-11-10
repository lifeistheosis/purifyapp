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
//
// From 1.9 the saving is a job the app keeps (lib/readAloud/saving.ts): it
// waits for Wi-Fi on mobile data (Use mobile data, or Cancel, on the line
// over the controls), waits for a signal when there is none, goes on by
// itself when either comes, and skips the chapters already saved, so a book
// left half saved goes on from where it stopped.
//
// From 1.9 (item 8) a chant playing has the same mark, row and line, for its
// one recording, named with its version ("Psalm 135 (English)"): saved at
// once, its size beside the mark, kept only while the list of recordings
// names it (lib/chants/offline.ts), and Plus as a book is unless the one
// switch there, CHANT_SAVING, says every reader.

import { useEffect, useState, useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { getBook, localBookNames } from "@/lib/bible/books";
import { megabytes } from "@/lib/bible/downloads/catalog";
import { useChantAvailability } from "@/lib/chants/live";
import { isStreamed, recordingTail, variantRef } from "@/lib/chants/media";
import { chantTitleKey } from "@/lib/chants/names";
import { CHANT_SAVING, chantBytes, isChantSaved, removeChant, saveChant, useChantSaving, useSavedChants } from "@/lib/chants/offline";
import type { ChantIndexRow, ChantIndexVariant } from "@/lib/chants/types";
import { cn } from "@/lib/cn";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { isNativeClient } from "@/lib/platform/native";
import { loadChantIndex } from "@/lib/player/chants";
import { chantVersionOf } from "@/lib/player/steps";
import { bookOfSrc, hasReadAloud } from "@/lib/readAloud/chapters";
import { checkSaved, onSavedChange, removeBook, savedChapters } from "@/lib/readAloud/offline";
import { cancelSaving, saveOverMobileData, startSaving, useSaving, type SavingJob } from "@/lib/readAloud/saving";
import { unsavedBytes } from "@/lib/readAloud/size";

/** The book whose saved line (with Remove) is open; the saving itself is lib/readAloud/saving.ts. */
let open: string | null = null;
const listeners = new Set<() => void>();

function setOpen(book: string | null): void {
  open = book;
  for (const l of listeners) l();
}

function useOpen(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => open,
    () => null,
  );
}

/** What the saving says: how far it has come, or what it waits for. */
function jobText(t: (key: string, vars?: Record<string, string | number>) => string, job: SavingJob): string {
  const vars = { done: job.done, total: job.total };
  if (job.waiting === "wifi") return t("player.offline.waitingWifi", vars);
  if (job.waiting === "signal") return t("player.offline.waitingSignal", vars);
  return t("player.offline.saving", vars);
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
  const { t, locale } = useTranslate();
  const saved = useSavedKeys();
  const book = bookOfSrc(src);
  if (!book || !isNativeClient()) return null;
  const meta = getBook(book);
  if (!meta) return null;
  const chapters = Array.from({ length: meta.chapters }, (_, i) => i + 1).filter((c) => hasReadAloud(book, c));
  if (!chapters.length) return null;
  const keys = new Set(saved.split(",").filter((k) => k.startsWith(`${book}/`)));
  // What saving the rest would take, before it is saved (1.9, his yes to the
  // sheet's 16): rough, from each chapter's length (lib/readAloud/size.ts).
  const size = megabytes(unsavedBytes(book, chapters, keys), locale);
  return { book, chapters, name: localBookNames(t)[book] ?? meta.name, saved: keys.size >= chapters.length, size };
}

/**
 * The playing book's saving, for the mark and the row: the book, how far its
 * saving has come, and the one way to start it (Plus first: a reader without
 * it meets the upgrade sheet named for it, over the player).
 */
function useSaveBook(src: string | null) {
  const upgrade = useUpgradeModal();
  const saving = useSaving();
  const opened = useOpen();
  const offline = useOfflineBook(src);
  const job = offline && saving.job?.book === offline.book ? saving.job : null;

  async function save() {
    if (!offline) return;
    const { book, chapters } = offline;
    if ((await plusFeaturesNow()) === false) {
      upgrade.open("offline", { overPlayer: true });
      return;
    }
    setOpen(null);
    await startSaving(book, chapters);
  }

  return { offline, job, opened, save };
}

// ---- A chant (1.9, item 8): one recording kept on the phone, in the same
// places as a book's readings, with the same mark, row and line. It is kept
// only while the list of recordings names it (lib/chants/offline.ts), and it
// is Plus, as a book is, or every reader's, by one switch (CHANT_SAVING).

/** The open saved line's key for a recording, apart from any book's. */
const chantKey = (ref: string) => `chant:${ref}`;

/**
 * The chant in the player, if its recording can be kept here: in the apps, a
 * streamed recording that is saved already or that the list names now. Its
 * name says which version ("Psalm 135 (English)"), and its size is told from
 * its length, as a book's is.
 */
function useOfflineChant(src: string | null) {
  const { t, locale } = useTranslate();
  const saved = useSavedChants();
  const availabilityFor = useChantAvailability(false);
  const isChant = recordingTail(src) !== null;
  const [index, setIndex] = useState<ChantIndexRow[] | null>(null);
  useEffect(() => {
    if (!isChant || index) return;
    let alive = true;
    void loadChantIndex().then((rows) => {
      if (alive && rows) setIndex(rows);
    });
    return () => {
      alive = false;
    };
  }, [isChant, index]);
  if (!isChant || !isNativeClient()) return null;
  const found = chantVersionOf<ChantIndexVariant, ChantIndexRow>(src, index);
  if (!found || !isStreamed(found.variant.audio.src)) return null;
  const { row, variant } = found;
  const ref = variantRef(row.slug, variant.id);
  const isSaved = saved.has(ref) && isChantSaved(row.slug, variant);
  // A copy is made only of what the list names now; one already kept shows as kept.
  if (!isSaved && availabilityFor(row.slug, variant) !== "playable") return null;
  return {
    slug: row.slug,
    variant,
    ref,
    name: `${t(chantTitleKey(row.key))} (${variant.label})`,
    saved: isSaved,
    size: megabytes(chantBytes(variant.audio.durationSec), locale),
  };
}

/** The playing chant's saving: Plus first while CHANT_SAVING is "plus", as a book's is. */
function useSaveChant(src: string | null) {
  const upgrade = useUpgradeModal();
  const saving = useChantSaving();
  const opened = useOpen();
  const chant = useOfflineChant(src);
  const job = chant && saving.job?.ref === chant.ref ? saving.job : null;

  async function save() {
    if (!chant) return;
    if (CHANT_SAVING === "plus" && (await plusFeaturesNow()) === false) {
      upgrade.open("offline", { overPlayer: true });
      return;
    }
    setOpen(null);
    await saveChant(chant.slug, chant.variant);
  }

  return {
    chant,
    job,
    failed: chant !== null && saving.failed === chant.ref,
    isOpen: chant !== null && opened === chantKey(chant.ref),
    save,
  };
}

/** The chant's mark: to save, with its size; a ring while it saves; the check once kept. */
function SaveChantMark({ s, className }: { s: ReturnType<typeof useSaveChant>; className?: string }) {
  const { t } = useTranslate();
  const { chant, job, isOpen, save } = s;
  if (!chant) return null;
  if (job) {
    return <SaveOfflineMark look="saving" share={job.share} label={t("player.offline.savingOne", { book: chant.name })} className={className} />;
  }
  if (chant.saved) {
    return (
      <SaveOfflineMark
        look="saved"
        expanded={isOpen}
        onClick={() => setOpen(isOpen ? null : chantKey(chant.ref))}
        label={t("player.offline.saved", { book: chant.name })}
        className={className}
      />
    );
  }
  return (
    <SaveOfflineMark
      look="save"
      size={chant.size}
      onClick={() => void save()}
      label={`${t("player.offline.save", { book: chant.name })}, ${chant.size}`}
      className={className}
    />
  );
}

/** The download mark, at the end of the title's line. */
export function SaveOffline({ src, className }: { src: string | null; className?: string }) {
  const { t } = useTranslate();
  const { offline, job, opened, save } = useSaveBook(src);
  const chant = useSaveChant(src);
  if (chant.chant) return <SaveChantMark s={chant} className={className} />;
  if (!offline) return null;
  const { book, name, saved } = offline;

  if (job) {
    return (
      <SaveOfflineMark
        look={job.waiting ? "waiting" : "saving"}
        share={job.total > 0 ? job.done / job.total : 0}
        label={jobText(t, job)}
        className={className}
      />
    );
  }

  if (saved) {
    const isOpen = opened === book;
    return (
      <SaveOfflineMark
        look="saved"
        expanded={isOpen}
        onClick={() => setOpen(isOpen ? null : book)}
        label={t("player.offline.saved", { book: name })}
        className={className}
      />
    );
  }

  return (
    <SaveOfflineMark
      look="save"
      size={offline.size}
      onClick={() => void save()}
      label={`${t("player.offline.save", { book: name })}, ${offline.size}`}
      className={className}
    />
  );
}

/**
 * The mark's looks: a book to save, its chapters saving (a ring that fills),
 * waiting for Wi-Fi or a signal (1.9: the ring, dimmed, where it stopped),
 * and saved (a check with a soft light). Drawn from what it is given, so the
 * player and the Plus page's preview of Listen offline
 * (components/billing/plusTry/TryOffline.tsx) are the one mark.
 */
export function SaveOfflineMark({
  look,
  share = 0,
  label,
  onClick,
  expanded,
  size,
  className,
}: {
  look: "save" | "saving" | "waiting" | "saved";
  /** While saving or waiting: how far it has come, 0 to 1. */
  share?: number;
  /** What the mark says to a screen reader. */
  label: string;
  onClick?: () => void;
  /** Saved: whether the saved line under the player is open. */
  expanded?: boolean;
  /** To save: what the book will take, said beside the mark, inside the one button (1.9). */
  size?: string;
  className?: string;
}) {
  const box = cn(
    "tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full motion-safe:transition-colors",
    className,
  );

  if (look === "saving" || look === "waiting") {
    return (
      <span role="img" aria-label={label} className={cn(box, look === "waiting" ? "text-paper/50" : "text-paper")}>
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

  if (look === "saved") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        aria-label={label}
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
      onClick={onClick}
      aria-label={label}
      className={cn(
        size
          ? cn("tap-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full ps-3 pe-2.5 motion-safe:transition-colors", className)
          : box,
        "text-paper/80 hover:bg-paper/[0.06] hover:text-paper",
      )}
    >
      {size ? (
        <span data-save-size="" className="font-sans text-caption tabular-nums text-paper/70">
          {size}
        </span>
      ) : null}
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
  const chant = useSaveChant(src);
  if (!offline && !chant.chant) return null;
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

  // A chant (1.9): the same row, for its one recording.
  if (chant.chant) {
    const c = chant.chant;
    if (chant.job) {
      return (
        <div role="status" className={row}>
          {mark}
          <span className="min-w-0 flex-1 truncate">{t("player.offline.savingOne", { book: c.name })}</span>
        </div>
      );
    }
    if (c.saved) {
      return (
        <div className={row}>
          {mark}
          <span className="min-w-0 flex-1 truncate">{t("player.offline.saved", { book: c.name })}</span>
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              void removeChant(c.ref);
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
          void chant.save();
        }}
        className={cn(row, "hover:border-paper/30 hover:bg-paper/10")}
      >
        {mark}
        <span className="min-w-0 truncate">{t("player.offline.save", { book: c.name })}</span>
        <span data-save-size="" className="ms-auto shrink-0 tabular-nums text-paper/60">
          {c.size}
        </span>
      </button>
    );
  }

  if (!offline) return null;
  const { book, name, saved } = offline;

  if (job) {
    return (
      <div role="status" className={row}>
        {mark}
        <span className="min-w-0 flex-1 truncate">{jobText(t, job)}</span>
        {job.waiting === "wifi" ? (
          <button type="button" onClick={() => void saveOverMobileData()} className="tap-press hit-44 shrink-0 font-semibold text-paper hover:underline">
            {t("player.offline.useData")}
          </button>
        ) : null}
      </div>
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
            setOpen(null);
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
      <span data-save-size="" className="ms-auto shrink-0 tabular-nums text-paper/60">
        {offline.size}
      </span>
    </button>
  );
}

/**
 * The one line about saving, over the player's controls: how far the saving
 * has come, what it waits for (Wi-Fi, with Use mobile data and Cancel; a
 * signal, with Cancel), that some chapters could not be saved, or (once the
 * check is tapped) the saved book with Remove. Nothing when there is nothing
 * to say.
 */
export function SaveOfflineNote({ src, className }: { src: string | null; className?: string }) {
  const { t } = useTranslate();
  const saving = useSaving();
  const opened = useOpen();
  const offline = useOfflineBook(src);
  const chant = useSaveChant(src);
  // Once a session, forget saved chapters whose files the phone no longer
  // has. Here, drawn once under both views, rather than on each mark.
  useEffect(() => {
    if (isNativeClient()) void checkSaved();
  }, []);
  const action = "tap-press hit-44 px-1 font-semibold text-paper/85 underline-offset-4 hover:underline";

  // A chant (1.9): saving it, that it could not be saved, or (once its check
  // is tapped) the kept recording with Remove.
  if (chant.chant) {
    const c = chant.chant;
    const says = chant.job
      ? t("player.offline.savingOne", { book: c.name })
      : chant.failed
        ? t("player.offline.failedOne", { book: c.name })
        : c.saved && chant.isOpen
          ? t("player.offline.saved", { book: c.name })
          : null;
    return (
      <p role="status" className={cn("flex min-h-0 flex-wrap items-center justify-center gap-x-2 text-center font-sans text-caption text-paper/60", className)}>
        {says ? <span>{says}</span> : null}
        {says && c.saved && chant.isOpen && !chant.job ? (
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              void removeChant(c.ref);
            }}
            className={action}
          >
            {t("player.offline.remove")}
          </button>
        ) : null}
      </p>
    );
  }

  if (!offline) return null;
  const { book, name, saved } = offline;
  const job = saving.job?.book === book ? saving.job : null;
  const line = job
    ? { text: jobText(t, job), remove: false }
    : saving.failed === book
      ? { text: t("player.offline.failed"), remove: false }
      : saved && opened === book
        ? { text: t("player.offline.saved", { book: name }), remove: true }
        : null;
  return (
    <p role="status" className={cn("flex min-h-0 flex-wrap items-center justify-center gap-x-2 text-center font-sans text-caption text-paper/60", className)}>
      {/* While it waits, the words on their own line and its choices together under them. */}
      {line ? <span className={job?.waiting ? "basis-full" : undefined}>{line.text}</span> : null}
      {job?.waiting === "wifi" ? (
        <button type="button" onClick={() => void saveOverMobileData()} className={action}>
          {t("player.offline.useData")}
        </button>
      ) : null}
      {job?.waiting ? (
        <button type="button" onClick={cancelSaving} className={action}>
          {t("common.cancel")}
        </button>
      ) : null}
      {line?.remove ? (
        <button
          type="button"
          onClick={() => {
            setOpen(null);
            void removeBook(book);
          }}
          className={action}
        >
          {t("player.offline.remove")}
        </button>
      ) : null}
    </p>
  );
}
