import { numberToWords } from "@/lib/i18n/numberWords";

import { siteUrl } from "./build";
import type { MarketingBody } from "./marketingBodies";

/**
 * The two cart notes (lib/shop/cartReminders.ts). Plain, in Purify's voice,
 * and held to lib/email/doctrine.ts like every other email: no exclamation,
 * no "hurry", "last chance" or "expires", no count of other shoppers. The
 * deal note says when the deal ends because that is a fact the reader needs
 * to use it, said as a date, not a countdown.
 */

export type CartNoteLine = { title: string; quantity: number };

function lineText(l: CartNoteLine): string {
  return l.quantity > 1 ? `${l.title}, ${numberToWords(l.quantity, "en")}` : l.title;
}

export function cartReminderBody(lines: readonly CartNoteLine[]): MarketingBody {
  const shown = lines.slice(0, 6);
  return {
    subject: lines.length === 1 ? `Still in your cart: ${lines[0].title}` : "Your cart in the Purify shop",
    heading: "Your cart is saved",
    paragraphs: [
      lines.length === 1
        ? "You left a piece in your cart in the Purify shop. It is still there when you want it."
        : "You left these in your cart in the Purify shop. They are still there when you want them.",
      ...shown.map(lineText),
      ...(lines.length > shown.length ? ["And more in your cart."] : []),
    ],
    action: { label: "Open your cart", href: siteUrl("/shop/cart") },
  };
}

export function cartDealBody(opts: { title: string; percent: number; price: string; until: string }): MarketingBody {
  return {
    subject: `${opts.percent}% off ${opts.title} in your cart`,
    heading: "A deal on something in your cart",
    paragraphs: [
      `${opts.title} has been in your cart for a while, so it is ${opts.percent}% off for you: ${opts.price}.`,
      `The price holds in your cart until ${opts.until}, and checkout honours it until then.`,
    ],
    action: { label: "Open your cart", href: siteUrl("/shop/cart") },
  };
}
