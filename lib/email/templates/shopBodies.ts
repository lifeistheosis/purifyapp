import { numberToWords } from "@/lib/i18n/numberWords";

import { siteUrl } from "./build";
import type { MarketingBody } from "./marketingBodies";

/**
 * Phase 1 of the funnel: the shop list ("New in the shop"), and the one
 * personal send that meets it, the name day.
 *
 * What is NOT here, on the board's instruction: browse abandonment, urgency
 * countdowns, fake scarcity. "They convert and they would read as cheap next to
 * the devotional goods." lib/email/doctrine.ts refuses their vocabulary anyway.
 */

export type ShopPiece = { title: string; slug: string; priceCents: number };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const productUrl = (slug: string) => siteUrl(`/shop/icons/${slug}`);

function pieceLines(pieces: readonly ShopPiece[]): string[] {
  return pieces.slice(0, 6).map((p) => `${p.title}, ${money(p.priceCents)}`);
}

/** New pieces, batched: one email for a group, never one per item. */
export function shopNewBody(pieces: readonly ShopPiece[]): MarketingBody {
  const n = pieces.length;
  const count = numberToWords(n, "en");
  return {
    subject:
      n === 1
        ? `New in the Purify shop: ${pieces[0].title}`
        : `${count.charAt(0).toUpperCase()}${count.slice(1)} new pieces in the Purify shop`,
    heading: "New in the shop",
    paragraphs: [
      n === 1 ? "A new piece has arrived in the shop." : `${count.charAt(0).toUpperCase()}${count.slice(1)} new pieces have arrived in the shop.`,
      ...pieceLines(pieces),
      ...(n > 6 ? ["And more in the shop."] : []),
    ],
    action: { label: "See the new pieces", href: siteUrl("/shop") },
  };
}

export type FeastWindow = "nativity" | "pascha";

/**
 * The two moments Orthodox households buy: before the Nativity Fast, which
 * begins on November 15, and before Pascha. Two planned sends a year, not
 * monthly promotions. The date is the calendar's, never a deadline.
 */
export function shopFeastBody(opts: { feast: FeastWindow; begins: string; pieces: readonly ShopPiece[] }): MarketingBody {
  const nativity = opts.feast === "nativity";
  return {
    subject: nativity ? "For the Nativity Fast" : "For Pascha",
    heading: nativity ? "For the Nativity Fast" : "For Pascha",
    paragraphs: [
      nativity
        ? `The Nativity Fast begins on ${opts.begins}. For a prayer corner, or for someone you will give a gift to at the Nativity, these are in the shop.`
        : `Pascha is on ${opts.begins} this year. For a prayer corner, or as a gift, these are in the shop.`,
      ...pieceLines(opts.pieces),
    ],
    action: { label: "Visit the shop", href: siteUrl("/shop") },
  };
}

/**
 * The name day, the one email a generic store could not send: the morning of
 * the reader's patron saint's feast. Personal, so it rides the library list's
 * consent. When the shop carries that saint's icon it says so, once, plainly.
 */
export function nameDayBody(opts: {
  saintName: string;
  saintSlug: string;
  piece: ShopPiece | null;
}): MarketingBody {
  return {
    subject: `Today is the feast of ${opts.saintName}`,
    heading: "Your patron saint's feast",
    paragraphs: [
      `Today the Church remembers ${opts.saintName}, whom you chose as your patron saint.`,
      ...(opts.piece ? [`The shop carries an icon of ${opts.saintName}: ${opts.piece.title}, ${money(opts.piece.priceCents)}.`] : []),
    ],
    action: { label: `Read about ${opts.saintName}`, href: siteUrl(`/saints/${opts.saintSlug}`) },
  };
}
