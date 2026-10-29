"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Heart } from "@/components/ui/icons/Heart";
import { More } from "@/components/ui/icons/More";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { Share } from "@/components/ui/icons/Share";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { shareLink } from "@/lib/site";
import { copyText as putOnClipboard } from "@/lib/ui/copyText";
import { softTick } from "@/lib/ui/softTick";
import { keepText, verseKey } from "@/lib/remember/schedule";
import { machineCopyText, type MachineShown } from "@/lib/today/machineVerse";
import { useVerseListen } from "@/lib/today/verseListen";
import { getBook } from "@/lib/bible/books";
import type { PictureWords } from "@/lib/share/verseCard";

/**
 * The verse picture's sheet, loaded on the first tap of Share: Today does not
 * carry a canvas for a reader who never shares.
 */
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/** A round action, as the owner's pick B of round 10 draws them: a ring on a breath of white. */
const ROUND =
  "tap-press grid h-11 w-11 place-items-center rounded-full border bg-paper/[0.04] text-paper motion-safe:transition-colors hover:bg-paper/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

/**
 * The Verse of the Day's actions (1.8, the owner's pick B of round 10, "The
 * light"): three round buttons under the verse, in the middle.
 *
 * - Save: keeps the verse among the reader's saved (and its words for
 *   Remember the verse). The heart fills and the ring lights white once it
 *   is saved. Saving is felt in the phone apps.
 * - Listen: the verse alone, read aloud from its chapter's recording by its
 *   own timings (lib/today/verseListen.ts). Drawn only where the chapter has
 *   a recording, the New Testament today.
 * - Share: the verse as a picture, made in one sheet with its look, its
 *   words and its size (components/share/PictureSheet.tsx, his "mix of A and
 *   B" of round 11).
 *
 * What the card's "•••" offered before stays one tap away, on a small "•••"
 * beside the three: open the chapter, copy the verse, copy its link.
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
  listen,
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
  /** What the player shows while the verse is heard: its reference, and what it is. */
  listen?: { title: string; by: string };
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
  const [picture, setPicture] = useState(false);
  // Mounted on the first Share and kept, so it can close as it opened.
  const [pictureMade, setPictureMade] = useState(false);
  const heard = useVerseListen(
    book && chapter && verse ? { book, chapter, verse } : null,
    listen?.title ?? refLabel,
    listen?.by ?? t("today.verseOfDay"),
  );

  // The words the picture is made of: the translation with its label when
  // the card shows one (the label never leaves it), else the verse with its
  // reference and the Bible it is from.
  const words = useMemo<PictureWords>(
    () =>
      translated
        ? { text: translated.text, reference: translated.reference, note: translated.note, keepNote: true, lang: translated.language }
        : { text: shareText, reference: refLabel, ...(edition ? { note: edition } : {}) },
    [translated, shareText, refLabel, edition],
  );
  const caption = translated ? `${translated.reference}\n${translated.note}` : edition ? `${refLabel}\n${edition}` : refLabel;

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

  function say(key: string) {
    setToast(t(key));
    setTimeout(() => setToast(null), 1500);
  }

  function toggleFav() {
    // Favourite requires a verse locator so /saved can resolve it.
    if (!book || !chapter || !verse) {
      say("today.verse.cannotFavourite");
      return;
    }
    const all = readAll();
    const existing = all.find(matchesThisVerse);
    if (existing) {
      writeAll(all.filter((b) => b.id !== existing.id));
      setFav(false);
      say("today.verse.removedFromSaved");
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
      say("today.verse.savedToBookmarks");
      // Saving the verse is felt in the phone apps. Removing it is not.
      softTick();
    }
  }

  async function copyLink() {
    // shareLink(), not window.location.origin: inside the Capacitor shell the
    // origin is https://localhost and the copied link is dead everywhere.
    const url = shareLink(shareUrl);
    try {
      if (!(await putOnClipboard(url))) throw new Error("the clipboard refused");
      say("common.linkCopied");
    } catch {
      say("today.verse.couldNotCopy");
    }
  }

  async function copyText() {
    try {
      const copied = translated ? machineCopyText(translated) : `${shareText}\n${refLabel}${edition ? `, ${edition}` : ""}`;
      if (!(await putOnClipboard(copied))) throw new Error("the clipboard refused");
      say("today.verse.verseCopied");
    } catch {
      say("today.verse.couldNotCopy");
    }
    setMore(false);
  }

  return (
    <>
      <div className="relative mt-4 flex items-center justify-center gap-3.5">
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          aria-label={t("common.save")}
          className={cn(ROUND, fav ? "reader-lit border-paper/45" : "border-paper/15")}
        >
          <Heart size={19} filled={fav} />
        </button>
        {heard.available ? (
          <button
            type="button"
            onClick={heard.toggle}
            aria-label={heard.playing ? t("readAloud.pause") : t("readAloud.listen")}
            className={cn(ROUND, heard.playing ? "reader-lit border-paper/45" : "border-paper/15")}
          >
            {/* The triangle's weight sits left of its box: a pixel right centres it. */}
            {heard.playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setPictureMade(true);
            setPicture(true);
          }}
          aria-label={t("common.share")}
          className={cn(ROUND, "border-paper/15")}
        >
          <Share size={19} />
        </button>
        {/* The card's other ways, beside the three: the chapter, a copy, a link. */}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label={t("today.verse.moreActions")}
          className="hit-44 absolute end-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-paper/50 motion-safe:transition-colors hover:bg-paper/[0.06] hover:text-paper"
        >
          <More size={18} />
        </button>
        {toast && (
          <div
            role="status"
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-3 py-1 font-sans text-caption font-semibold text-night shadow-lg"
          >
            {toast}
          </div>
        )}
      </div>

      {/* Sheet portals to <body>, holds the overlay flag across the whole
          exit so the tab bar steps aside, and carries the reduced-motion
          escape. `desktop` because this card is on /prayers/today, which is
          the web's only Today and is viewed on a laptop. */}
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
        <SheetItem label={t("today.verse.copyVerseText")} onClick={copyText} />
        <SheetItem
          label={t("today.verse.copyLink")}
          onClick={() => {
            void copyLink();
            setMore(false);
          }}
        />
      </Sheet>

      {pictureMade ? (
        <PictureSheet
          open={picture}
          onClose={() => setPicture(false)}
          words={words}
          title={t("picture.title")}
          name={refLabel}
          caption={caption}
        />
      ) : null}
    </>
  );
}

function SheetItem({ label, onClick }: { label: string; onClick: () => void }): ReactNode {
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
