"use client";

// Save a book to listen offline (1.8, for Plus): under the player's controls,
// in the apps, while a chapter of the Bible is playing. One tap saves every
// chapter of that book that has a reading (lib/readAloud/offline.ts), saying
// how far it has come; a saved book says so and can be taken off again. Shown
// to everyone, as every Plus feature is; a reader without Plus who taps it
// meets the upgrade sheet named for it.

import { useEffect, useState, useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { getBook, localBookNames } from "@/lib/bible/books";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";
import { hasReadAloud, readAloudRecording } from "@/lib/readAloud/chapters";
import { checkSaved, onSavedChange, removeBook, saveChapters, savedChapters } from "@/lib/readAloud/offline";

/** The book a playing chapter belongs to, from its address (streamed or saved). */
export function bookOfSrc(src: string | null): string | null {
  const m = src ? /\/audio\/read\/([a-z0-9-]+)\/\d+\.mp3(?:$|\?)/.exec(src) : null;
  return m ? m[1] : null;
}

function useSavedKeys(): string {
  return useSyncExternalStore(
    onSavedChange,
    () => Object.keys(savedChapters()).sort().join(","),
    () => "",
  );
}

export function SaveOffline({ src }: { src: string | null }) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const saved = useSavedKeys();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const book = bookOfSrc(src);
  // Once a session, forget saved chapters whose files the phone no longer has.
  useEffect(() => {
    if (isNativeClient()) void checkSaved();
  }, []);

  if (!book || !isNativeClient()) return null;
  const meta = getBook(book);
  if (!meta) return null;
  const chapters = Array.from({ length: meta.chapters }, (_, i) => i + 1).filter((c) => hasReadAloud(book, c));
  if (!chapters.length) return null;
  const savedHere = saved.split(",").filter((k) => k.startsWith(`${book}/`)).length;
  const name = localBookNames(t)[book] ?? meta.name;

  async function save() {
    if ((await plusFeaturesNow()) === false) {
      upgrade.open("offline", { overPlayer: true });
      return;
    }
    setFailed(false);
    setBusy({ done: 0, total: chapters.length });
    const { failed: missed } = await saveChapters(
      book!,
      chapters,
      (c) => ({ mp3: readAloudRecording(book!, c), json: streamedUrl(`/audio/read/${book}/${c}.json`, true) }),
      (done, total) => setBusy({ done, total }),
    );
    setBusy(null);
    setFailed(missed > 0);
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-sans text-caption text-paper/60">
      {busy ? (
        <span aria-live="polite">{t("player.offline.saving", { done: busy.done, total: busy.total })}</span>
      ) : savedHere >= chapters.length ? (
        <>
          <span>{t("player.offline.saved", { book: name })}</span>
          <button type="button" onClick={() => void removeBook(book)} className="tap-press min-h-11 px-2 font-semibold text-paper/80 underline-offset-4 hover:underline">
            {t("player.offline.remove")}
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void save()} className="tap-press min-h-11 rounded-pill border border-paper/15 px-4 font-semibold text-paper/85 hover:border-paper/35">
          {t("player.offline.save", { book: name })}
        </button>
      )}
      {failed ? <span className="w-full text-center">{t("player.offline.failed")}</span> : null}
    </div>
  );
}
