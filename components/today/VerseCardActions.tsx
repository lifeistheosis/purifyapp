"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client island for the quiet footer row inside the Verse of Day card.
 *
 * - Save: toggles a localStorage bookmark for this verse reference. Heart
 *   fills rubric-red when active; label reads Save / Saved.
 * - More (overflow): opens a bottom sheet — Open chapter, Copy verse text,
 *   Copy link.
 *
 * The verse text + reference are server-rendered; only the interactive
 * footer lives on the client.
 */
export function VerseCardActions({
  refLabel,
  href,
  shareText,
  shareUrl,
  book,
  bookName,
  chapter,
  verse,
}: {
  refLabel: string;
  href: string;
  shareText: string;
  shareUrl: string;
  /** Optional verse locator so Favourite writes to the global bookmarks list. */
  book?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const [fav, setFav] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const STORAGE_KEY = "purify:bookmarks";
  const EVENT = "purify:bookmark";

  type AnyBookmark = { id: string; kind: string; [k: string]: unknown };

  function readAll(): AnyBookmark[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AnyBookmark[]) : [];
    } catch {
      return [];
    }
  }
  function writeAll(items: AnyBookmark[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
    } catch {
      /* ignore */
    }
  }
  function matchesThisVerse(b: AnyBookmark): boolean {
    if (b.kind !== "bible-verse") return false;
    return b.book === book && b.chapter === chapter && b.verse === verse;
  }

  useEffect(() => {
    if (!book || !chapter || !verse) return;
    try {
      const present = readAll().some(matchesThisVerse);
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- seed the
         flag from localStorage after mount; later updates arrive through the
         events subscribed below. */
      setFav(present);
    } catch {
      /* ignore */
    }
    function onSync() {
      try {
        setFav(readAll().some(matchesThisVerse));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener(EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter, verse]);

  function toggleFav() {
    // If the locator isn't available, silently do nothing — Favourite
    // requires a verse locator so /saved can resolve it.
    if (!book || !chapter || !verse) {
      setToast(t("today.verse.cannotFavourite"));
      setTimeout(() => setToast(null), 1500);
      return;
    }
    const all = readAll();
    const existing = all.find(matchesThisVerse);
    if (existing) {
      writeAll(all.filter((b) => b.id !== existing.id));
      setFav(false);
      setToast(t("today.verse.removedFromSaved"));
    } else {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const entry: AnyBookmark = {
        id,
        kind: "bible-verse",
        addedAt: Date.now(),
        label: refLabel,
        book,
        bookName: bookName ?? book,
        chapter,
        verse,
      };
      writeAll([entry, ...all]);
      setFav(true);
      setToast(t("today.verse.savedToBookmarks"));
    }
    setTimeout(() => setToast(null), 1500);
  }

  async function share() {
    // Copy the deep link to the clipboard. We deliberately bypass
    // navigator.share so taps on this button always do the same thing
    // (the system share sheet was a sometimes-yes / sometimes-no
    // surprise depending on platform support).
    void shareText;
    let url = shareUrl;
    if (typeof window !== "undefined") {
      try {
        url = new URL(shareUrl, window.location.origin).toString();
      } catch {
        /* ignore — fall back to the raw shareUrl */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t("common.linkCopied"));
    } catch {
      setToast(t("today.verse.couldNotCopy"));
    }
    setTimeout(() => setToast(null), 1500);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${refLabel}`);
      setToast(t("today.verse.verseCopied"));
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast(t("today.verse.couldNotCopy"));
      setTimeout(() => setToast(null), 1500);
    }
    setMore(false);
  }

  return (
    <>
      <div className="relative flex items-center justify-between pt-4 mt-4 border-t border-paper/8">
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          className="flex items-center gap-2 text-paper/75 hover:text-paper transition-colors"
        >
          <HeartIcon filled={fav} />
          <span className="font-sans text-ui">{fav ? t("common.saved") : t("common.save")}</span>
        </button>
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label={t("today.verse.moreActions")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-paper/55 hover:text-paper hover:bg-paper/[0.06] transition-colors"
        >
          <MoreIcon />
        </button>
        {toast && (
          <div
            role="status"
            className="absolute left-1/2 -translate-x-1/2 -top-9 rounded-full bg-paper text-night px-3 py-1 font-sans text-caption font-semibold shadow-lg"
          >
            {toast}
          </div>
        )}
      </div>

      {more && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("today.verse.moreActions")}
          className="fixed inset-0 z-50 flex items-end"
        >
          <button
            aria-label={t("common.close")}
            type="button"
            onClick={() => setMore(false)}
            className="absolute inset-0 bg-night/60 backdrop-blur-sm"
          />
          <div className="relative w-full rounded-t-2xl border-t border-paper/10 bg-night px-5 pt-3 pb-7 safe-pb">
            <div
              aria-hidden
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper/20"
            />
            <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/45 mb-3">
              {refLabel}
            </p>
            <SheetItem
              label={t("today.verse.openChapter")}
              onClick={() => {
                setMore(false);
                // Router push, not `window.location.href`: a raw string nav
                // does not resolve against the trailingSlash export bundled
                // in the Android shell, which falls back to Today.
                router.push(href);
              }}
            />
            <SheetItem label={t("today.verse.copyVerseText")} onClick={copyText} />
            <SheetItem
              label={t("today.verse.copyLink")}
              onClick={() => {
                void share();
                setMore(false);
              }}
            />
            <button
              type="button"
              onClick={() => setMore(false)}
              className="mt-2 w-full rounded-md border border-paper/15 bg-paper/[0.04] py-3 font-sans text-ui font-semibold text-paper/80"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SheetItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-3 py-3 text-left font-sans text-ui text-paper hover:bg-paper/[0.05] transition-colors"
    >
      {label}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill={filled ? "#c1272d" : "none"}
      stroke={filled ? "#c1272d" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
