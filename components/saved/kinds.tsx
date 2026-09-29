// What each kind of saved thing is called and drawn as, in one place, for
// every surface that lists saved things: /saved, the account's Last saved,
// and the You tab's preview. They each used to carry their own copy, and the
// account's copy called a saint, a prayer and an icon from the shop all
// "Writing".

import type { ReactNode } from "react";

import { Book } from "@/components/ui/icons/Book";
import { Cart } from "@/components/ui/icons/Cart";
import { Codex } from "@/components/ui/icons/Codex";
import { Halo } from "@/components/ui/icons/Halo";
import { Hands } from "@/components/ui/icons/Hands";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Quill } from "@/components/ui/icons/Quill";
import { Scroll } from "@/components/ui/icons/Scroll";
import type { Bookmark } from "@/lib/bookmarks";

/** The one-word label for a kind, as a message key. */
export const KIND_LABEL_KEY: Record<Bookmark["kind"], string> = {
  "bible-verse": "ui.savedKindVerse",
  "bible-chapter": "bible.chapterLabel",
  "writing-section": "ui.savedKindWriting",
  prayer: "onboard.focus.prayer",
  "prayer-rule": "ui.savedKindPrayerRule",
  "history-event": "study.saved.history",
  saint: "ui.savedKindSaint",
  product: "ui.savedKindIcon",
  "walkthrough-card": "walk.savedKind",
};

export function KindIcon({ kind, size = 20 }: { kind: Bookmark["kind"]; size?: number }): ReactNode {
  switch (kind) {
    case "bible-verse":
      return <Book size={size} />;
    case "bible-chapter":
      return <Codex size={size} />;
    case "writing-section":
      return <Quill size={size} />;
    case "saint":
      return <Halo size={size} />;
    case "prayer":
      return <Hands size={size} />;
    case "prayer-rule":
      return <Lampada size={size} />;
    case "history-event":
      return <Hourglass size={size} />;
    case "product":
      return <Cart size={size} />;
    case "walkthrough-card":
      return <Scroll size={size} />;
    default:
      return <Book size={size} />;
  }
}

/** The title a saved thing is listed under. A writing's own section title, so
 *  three sections of one epistle stop reading as the same card. */
export function savedTitle(b: Bookmark): string {
  if (b.kind === "writing-section") return b.sectionTitle || b.label;
  return b.label;
}

/** The line under the title, when there is more to say than the kind. */
export function savedSource(b: Bookmark): string | null {
  switch (b.kind) {
    case "writing-section":
      return [b.saintName, b.workTitle].filter(Boolean).join(" · ") || null;
    case "history-event":
      return b.displayDate || null;
    case "product":
      return [b.storeName, b.priceLabel].filter(Boolean).join(" · ") || null;
    case "walkthrough-card":
      return `${b.bookName} ${b.chapter}`;
    default:
      return null;
  }
}

/** A short date in the reader's own language: "Sep 27", "27 sept.". */
export function shortDate(ms: number, locale: string, withYear = false): string {
  if (!Number.isFinite(ms)) return "";
  try {
    return new Date(ms).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  } catch {
    return "";
  }
}
