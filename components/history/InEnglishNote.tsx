"use client";

// One quiet line on an event's page for a reader whose language is not
// English (1.7): the accounts are written in English first, and say so.
// Decided on the device, so the apps (whose pages were written once, in
// English) say it too; the prayer pages do the same
// (components/prayers/service/ServiceHeader.tsx). It replaces the gold-tinted
// box of content.notYetTranslated on these pages.

import { useTranslate } from "@/components/i18n/MessagesProvider";

export function InEnglishNote({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  if (locale === "en") return null;
  return <p className={className ?? "mt-3 font-sans text-caption text-paper/50"}>{t("study.history.inEnglish")}</p>;
}
