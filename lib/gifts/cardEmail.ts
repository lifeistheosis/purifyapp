// The email the one a gift is for receives on its day (2.0, the Christmas
// gift; lib/gifts/card.ts). Plain, in the house's letter: who it is from,
// their line in their own words, what the year holds, and one button. Every
// word the giver typed is escaped by the builder (lib/email/templates/build.ts
// and lib/email/layout.ts), and a name is one line (lib/gifts/card.ts), so
// nothing typed can reach the headers or the markup.

import { buildEmail, siteUrl, type EmailContent } from "@/lib/email/templates/build";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

export type GiftCardLetter = { from_name: string; to_name: string; message: string | null; code: string };

export function giftCardEmail(card: GiftCardLetter): EmailContent {
  return buildEmail({
    eyebrow: "A gift",
    subject: `${card.from_name} gave you a year of Purify Plus`,
    heading: `A gift from ${card.from_name}`,
    deck: card.message ? `“${card.message}”` : undefined,
    paragraphs: [
      `${card.to_name}, ${card.from_name} has given you a year of Purify Plus.`,
      "Purify is a library of the Orthodox faith: the Scriptures with the Fathers beside them, the saints, the prayers and the Church's calendar. Plus opens its reading and study tools.",
      "Open it on any phone or on the web, and sign in or make a free account. It is yours for a year, then it simply ends: nothing renews and there is nothing to cancel.",
    ],
    action: { label: "Open your gift", href: siteUrl(`/gift/card?code=${card.code}`) },
    footer: `You are receiving this because someone gave you a gift on Purify. Questions: ${SUPPORT_EMAIL}.`,
  });
}
