"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * One quiet line under a part of a chant's page that is still English, for a
 * reader in another language (1.7). Just the words: no box, no stripe, no
 * colour (components/i18n/ContentNotYetTranslated draws a tinted box and
 * stays off phones, so it cannot serve here). Nothing for an English reader.
 */
export function EnglishForNow({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  if (locale === "en") return null;
  return <p className={cn("font-sans text-caption text-paper/45", className)}>{t("chants.englishForNow")}</p>;
}
