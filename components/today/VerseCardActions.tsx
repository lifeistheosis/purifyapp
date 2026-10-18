"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { shareLink } from "@/lib/site";
import { copyText as putOnClipboard } from "@/lib/ui/copyText";
import { softTick } from "@/lib/ui/softTick";
import { keepText, verseKey } from "@/lib/remember/schedule";
import { machineCopyText, type MachineShown } from "@/lib/today/machineVerse";
import { getBook } from "@/lib/bible/books";

/**
 * Client island for the quiet footer row inside the Verse of Day card.
 *
 * - Save: toggles a localStorage bookmark for this verse reference. Heart
 *   fills rubric-red when active; label reads Save / Saved.
 * - More (overflow): opens a bottom sheet with Open chapter, Share as a
 *   picture, Copy verse text, Copy link.
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
  translated,
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
  /**
   * TEMPORARY (lib/today/machineVerse.ts): the machine translation the card
   * is showing, when it is. Then the copy and the picture are of the
   * translation, and each carries its label. Save keeps the English
   * (shareText): what is kept for later is the Bible's own words.
   */
  translated?: Pick<MachineShown, "language" | "text" | "reference" | "note">;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  // The edition the verse is in (1.8): Brenton's Septuagint for the Old
  // Testament, the King James for the rest. A copy and a picture name it, as
  // the card does under the reference.
  const edition = book ? t(getBook(book)?.source === "brenton-lxx-pd" ? "reading.collection.brenton" : "reading.collection.kjv") : null;
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
    // If the locator isn't available, silently do nothing. Favourite
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
      // Its words, kept for Remember a verse, so its card works offline.
      keepText(verseKey(book, chapter, verse), shareText);
      setFav(true);
      setToast(t("today.verse.savedToBookmarks"));
      // Saving the verse is felt in the phone apps. Removing it is not.
      softTick();
    }
    setTimeout(() => setToast(null), 1500);
  }

  async function share() {
    // Copy the deep link to the clipboard. We deliberately bypass
    // navigator.share so taps on this button always do the same thing
    // (the system share sheet was a sometimes-yes / sometimes-no
    // surprise depending on platform support).
    void shareText;
    // shareLink(), not window.location.origin: inside the Capacitor shell the
    // origin is https://localhost and the copied link is dead everywhere.
    const url = shareLink(shareUrl);
    try {
      if (!(await putOnClipboard(url))) throw new Error("the clipboard refused");
      setToast(t("common.linkCopied"));
    } catch {
      setToast(t("today.verse.couldNotCopy"));
    }
    setTimeout(() => setToast(null), 1500);
  }

  /**
   * The verse as a picture, handed to the phone's share sheet (lib/share).
   * People send each other pictures, not links. The drawing code is loaded
   * here, on the tap, so Today does not carry a canvas for a reader who
   * never shares.
   */
  async function sharePicture() {
    setMore(false);
    const say = (key: string) => {
      setToast(t(key));
      setTimeout(() => setToast(null), 1800);
    };
    try {
      const [{ renderVerseCard }, { shareImage }, { cardFileName }] = await Promise.all([
        import("@/lib/share/drawVerseCard"),
        import("@/lib/share/shareImage"),
        import("@/lib/share/verseCard"),
      ]);
      const picture = await renderVerseCard(
        translated
          ? { text: translated.text, reference: translated.reference, note: translated.note, lang: translated.language }
          : { text: shareText, reference: refLabel, ...(edition ? { note: edition } : {}) },
      );
      if (!picture) return say("today.verse.couldNotMakePicture");
      const caption = translated ? `${translated.reference}\n${translated.note}` : edition ? `${refLabel}\n${edition}` : refLabel;
      const outcome = await shareImage(picture, cardFileName(refLabel), caption);
      if (outcome === "saved") say("today.verse.pictureSaved");
      if (outcome === "failed") say("today.verse.couldNotMakePicture");
    } catch {
      say("today.verse.couldNotMakePicture");
    }
  }

  async function copyText() {
    try {
      const words = translated ? machineCopyText(translated) : `${shareText}\n${refLabel}${edition ? `, ${edition}` : ""}`;
      if (!(await putOnClipboard(words))) throw new Error("the clipboard refused");
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
        {/* Both controls carry padding pulled back by an equal negative
            margin, so the touch box clears 44px while the row keeps the
            height it had. Save had no padding at all and stood 61x22, its
            height coming from the 22px heart alone. */}
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          className="flex items-center gap-2 -my-3 py-3 text-paper/75 hover:text-paper transition-colors"
        >
          <HeartIcon filled={fav} />
          <span className="font-sans text-ui">{fav ? t("common.saved") : t("common.save")}</span>
        </button>
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label={t("today.verse.moreActions")}
          className="flex h-11 w-11 -my-1 items-center justify-center rounded-full text-paper/55 hover:text-paper hover:bg-paper/[0.06] transition-colors"
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

      {/* This was a hand-rolled `fixed inset-0 z-50` sheet with no animation
          in either direction, no overlay flag, and no portal. Three faults in
          one, and the last two are not cosmetic: at z-50 it tied with the
          root-level tab bar, and rendered inline it was scoped to whatever
          stacking context Today's tree created, so the bar stayed lit AND
          tappable over an open modal. That is the shape of 5ee95ed3.

          Sheet portals to <body>, holds the overlay flag across the whole
          exit so the tab bar steps aside, and carries the reduced-motion
          escape. `desktop` because this card is on /prayers/today, which is
          the web's only Today and is viewed on a laptop.

          The old explicit Cancel row is gone: Sheet's title bar has a close
          button, and the backdrop, Escape and Android back all dismiss. */}
      <Sheet
        open={more}
        onClose={() => setMore(false)}
        title={translated?.reference ?? refLabel}
        desktop
        bodyClassName="space-y-1 pb-2"
      >
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
        <SheetItem label={t("today.verse.shareAsPicture")} onClick={() => void sharePicture()} />
        <SheetItem label={t("today.verse.copyVerseText")} onClick={copyText} />
        <SheetItem
          label={t("today.verse.copyLink")}
          onClick={() => {
            void share();
            setMore(false);
          }}
        />
      </Sheet>
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
