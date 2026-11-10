"use client";

// A Bible a reader downloads, as a row of the translations (1.9; the owner's
// word of 2026-11-07: "make it so that the user picks to download the
// selected Bible they pick ... instead of the app including all of them
// downloaded already"; lib/bible/downloads/).
//
// In the apps a Bible is read once it is on the phone. Its row says what it
// is and how big it is, and a tap on it (or on the download mark at its end)
// downloads it: the mark becomes a ring that fills, which a tap stops, and
// the line under the title says how far it has come. Once every book is on
// the phone the Bible is the one read, if the list is still open: the reader
// asked for it to read it. A Bible on the phone is chosen with a tap, and its
// ••• opens one line under it, its size on the phone and Remove.
//
// On the website nothing is downloaded: the row is chosen as an English one
// is, and each book is read from the website as it is opened.
//
// The marks are the offline mark of the player (SaveOfflineMark): the owner's
// pick for a download, so the app has one.

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaveOfflineMark } from "@/components/player/SaveOffline";
import { Check } from "@/components/ui/icons/Check";
import { hasBook, megabytes, type DownloadableBible } from "@/lib/bible/downloads/catalog";
import { cancelBibleDownload, downloadBible, removeBible, useBibles } from "@/lib/bible/downloads/store";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { textDir } from "@/lib/i18n/textDir";

export function BibleRow({
  bible,
  book,
  current,
  onChoose,
}: {
  bible: DownloadableBible;
  /** The chapter's book: a Bible without it says so. */
  book: string;
  /** The chapter is shown in this Bible. */
  current: boolean;
  onChoose: () => void;
}) {
  const { t, locale } = useTranslate();
  const native = useIsNative();
  const { saved, downloads } = useBibles();
  const onPhone = Boolean(saved[bible.id]);
  const progress = downloads[bible.id] ?? null;
  const downloading = progress?.state === "downloading";
  const [managing, setManaging] = useState(false);
  // The reader is still here, waiting for the Bible they asked for.
  const waiting = useRef(false);
  useEffect(
    () => () => {
      waiting.current = false;
    },
    [],
  );

  const size = megabytes(onPhone ? saved[bible.id].bytes : bible.bytes, locale);
  const ready = !native || onPhone;

  function download() {
    if (downloading) return;
    waiting.current = true;
    void downloadBible(bible.id).then((result) => {
      if (result === "saved" && waiting.current) onChoose();
      waiting.current = false;
    });
  }

  const note = !hasBook(bible, book)
    ? t("bible.downloads.notThisBook", { book: t(`bible.books.${book}`) })
    : downloading
      ? t("bible.downloads.downloading", { percent: Math.floor((progress.done / Math.max(progress.total, 1)) * 100) })
      : progress?.state === "failed"
        ? t(progress.reason === "space" ? "bible.downloads.failedSpace" : progress.reason === "save" ? "bible.downloads.failedSave" : "bible.downloads.failedOffline")
        : ready
          ? t(`bible.translationNote.${bible.id}`)
          : `${t(`bible.translationNote.${bible.id}`)} · ${size}`;

  return (
    <li className={cn("rounded-md border", current ? "border-gold/45 bg-gold/15" : "border-transparent")}>
      <div className="flex items-center">
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          aria-label={ready ? undefined : t("bible.downloads.downloadAria", { name: bible.title, size })}
          onClick={ready ? onChoose : download}
          className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-3 text-start", !current && "hover:bg-paper/[0.04]")}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-ui font-semibold text-paper">
              {/* Its own direction inside, the row's alignment outside: the Arabic name reads right to left and starts where the others do. */}
              <span lang={bible.textLang} dir={textDir(bible.textLang)}>
                {bible.title}
              </span>
            </span>
            <span lang={locale} dir={textDir(locale)} aria-live={downloading ? "polite" : undefined} className="mt-0.5 block font-sans text-caption text-paper/50">
              {note}
            </span>
          </span>
          {current ? <Check size={18} className="shrink-0 text-paper" /> : null}
        </button>
        {!native ? null : downloading ? (
          <button type="button" onClick={() => cancelBibleDownload(bible.id)} aria-label={t("bible.downloads.stop")} className="me-1 shrink-0">
            <SaveOfflineMark look="saving" share={progress.done / Math.max(progress.total, 1)} label={t("bible.downloads.stop")} />
          </button>
        ) : onPhone ? (
          <button
            type="button"
            aria-expanded={managing}
            aria-label={t("bible.downloads.manageAria", { name: bible.title })}
            onClick={() => setManaging((m) => !m)}
            className="tap-press me-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-paper/[0.06] hover:text-paper"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        ) : (
          <SaveOfflineMark look="save" onClick={download} label={t("bible.downloads.downloadAria", { name: bible.title, size })} className="me-1" />
        )}
      </div>
      {native && onPhone && managing ? (
        <div className="flex items-center justify-between gap-3 border-t border-paper/[0.08] px-3 py-2">
          <span className="font-sans text-caption text-paper/60">{t("bible.downloads.onPhone", { size })}</span>
          <button
            type="button"
            onClick={() => {
              setManaging(false);
              void removeBible(bible.id);
            }}
            className="tap-press min-h-11 rounded-pill px-3 font-sans text-detail font-semibold text-paper/85 hover:bg-paper/[0.06]"
          >
            {t("common.remove")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
