"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { feastDaysIn } from "@/lib/saints/feastDay";

/**
 * A saint's feast days, with each date written in the reader's language.
 *
 * A client island for the reason `T` is one: a server component's own string
 * is baked into the apps in English and never changes when the phone's
 * language is applied. This reads the live language instead. The rule for
 * what counts as a date is in lib/saints/feastDay.ts.
 *
 * `brief` abbreviates the month, for the card in the saints' list.
 *
 * suppressHydrationWarning: on the website the server writes the date and
 * the browser writes it again, and the two do not always carry the same
 * languages (a browser with no Georgian writes the English). Both are the
 * same day. The server's words stay, with no complaint.
 */
export function FeastDays({ days, brief = false }: { days: readonly string[]; brief?: boolean }) {
  const { locale } = useTranslate();
  return <span suppressHydrationWarning>{feastDaysIn(days, locale, brief ? "short" : "long")}</span>;
}
