"use client";

// What is kept on this phone (1.9, the owner's yes to Listening 3 of
// docs/1.9-build/BRAINSTORM.md: "a storage view: what is saved, its size,
// remove a book"). In the apps only: on the website nothing is kept.
//
// Two lists, each with its size and Remove: the Bibles downloaded from the
// reader's translations (lib/bible/downloads/store.ts) and the books saved
// to listen offline from the player (lib/readAloud/offline.ts). Removing a
// Bible a reader reads in takes them back to the English, as its own Remove
// does. The sizes are what each took on the phone when it was saved.

import { useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DOWNLOADABLE_BIBLES, megabytes } from "@/lib/bible/downloads/catalog";
import { removeBible, useBibles } from "@/lib/bible/downloads/store";
import { useIsNative } from "@/lib/platform/native";
import { onSavedChange, removeBook, savedChapters, type Saved } from "@/lib/readAloud/offline";

import { Row, Section } from "./LitPanel";

const NONE: Record<string, Saved> = {};
let savedRaw = "";
let savedSnapshot: Record<string, Saved> = NONE;

/** The chapters saved to listen offline, as one object until they change. */
function readSaved(): Record<string, Saved> {
  const all = savedChapters();
  const raw = JSON.stringify(all);
  if (raw !== savedRaw) {
    savedRaw = raw;
    savedSnapshot = all;
  }
  return savedSnapshot;
}

/** Saved chapters by book: how many, and the bytes they take. */
export function savedByBook(saved: Record<string, Saved>): { book: string; chapters: number; bytes: number }[] {
  const books = new Map<string, { chapters: number; bytes: number }>();
  for (const [key, s] of Object.entries(saved)) {
    const book = key.split("/")[0];
    const b = books.get(book) ?? { chapters: 0, bytes: 0 };
    b.chapters += 1;
    b.bytes += s.bytes || 0;
    books.set(book, b);
  }
  return [...books].map(([book, b]) => ({ book, ...b }));
}

export function StorageSection() {
  const { t, tn, locale } = useTranslate();
  const native = useIsNative();
  const { saved: bibles } = useBibles();
  const listening = useSyncExternalStore(onSavedChange, readSaved, () => NONE);
  if (!native) return null;

  const downloaded = DOWNLOADABLE_BIBLES.filter((b) => bibles[b.id]);
  const books = savedByBook(listening);
  const total = downloaded.reduce((n, b) => n + bibles[b.id].bytes, 0) + books.reduce((n, b) => n + b.bytes, 0);
  const remove = (onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-press min-h-11 shrink-0 rounded-pill px-3 font-sans text-detail font-semibold text-paper/80 hover:bg-paper/[0.06]"
    >
      {t("common.remove")}
    </button>
  );

  return (
    <Section id="storage" title={t("settings.storage")} hint={total ? t("settings.storageTotal", { size: megabytes(total, locale) }) : t("settings.storageHint")}>
      {downloaded.length === 0 && books.length === 0 ? <Row label={t("settings.storageEmpty")} /> : null}
      {downloaded.map((b) => (
        <Row
          key={b.id}
          label={<span lang={b.textLang}>{b.title}</span>}
          description={`${t("settings.storageBible")} · ${megabytes(bibles[b.id].bytes, locale)}`}
          control={remove(() => void removeBible(b.id), t("bible.downloads.removeAria", { name: b.title }))}
        />
      ))}
      {books.map((b) => {
        const name = t(`bible.books.${b.book}`);
        return (
          <Row
            key={b.book}
            label={name}
            description={`${t("settings.storageListening")} · ${tn("bible.chapterCount", b.chapters)} · ${megabytes(b.bytes, locale)}`}
            control={remove(() => void removeBook(b.book), t("settings.storageRemoveBook", { book: name }))}
          />
        );
      })}
    </Section>
  );
}
