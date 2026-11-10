"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { LocaleCode } from "@/lib/i18n/locales";

/**
 * One quiet line over a long text a reader is shown in English though their
 * language is another (1.9, the reader's language in the apps): a life of a
 * saint, a work of the Fathers, a council's document, the Creed. Just the
 * words, the catalog's own in all 21 languages: no box, no stripe, no colour.
 *
 * Decided on the device, so the apps say it too. The tinted box before it,
 * components/i18n/ContentNotYetTranslated.tsx, was decided on the server,
 * which in the apps is the build and knows no reader (lib/i18n/server.ts),
 * so no reader of the apps ever saw it. The prayers and the chants have said
 * it this way since 1.7 (components/chants/EnglishForNow.tsx).
 *
 * `shown` is the language of the text on the page (from
 * components/i18n/useInReadersLanguage.ts where a text has other languages):
 * no line when it is the reader's own, and none while the reader's own is on
 * its way (`coming`), so the page does not say it and then take it back.
 */
export function StillInEnglish({
  kind,
  shown = "en",
  coming = false,
  className,
}: {
  kind: "work" | "bio";
  shown?: LocaleCode;
  coming?: boolean;
  className?: string;
}) {
  const { t, locale } = useTranslate();
  if (locale === "en" || coming || shown === locale) return null;
  return (
    <p data-still-in-english="" className={cn("max-w-[60ch] font-sans text-caption leading-[1.6] text-paper/55", className)}>
      {t(`content.notYetTranslated.${kind}.body`)}
    </p>
  );
}
