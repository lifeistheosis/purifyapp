"use client";

import { useTranslate } from "./MessagesProvider";
import { usePageLanguageComing } from "./PageInReadersLanguage";

/**
 * Small banner shown on pages whose body prose is still in English
 * while UI chrome has been translated. Hides itself when the active
 * locale is English (nothing to disclaim).
 */
export function TranslationDisclaimer() {
  const { locale, t } = useTranslate();
  // While the page's own words in the reader's language are on their way, a
  // moment, it says nothing rather than say so and take it back (1.9).
  const coming = usePageLanguageComing();
  if (locale === "en" || coming) return null;
  return (
    <aside
      className="mb-8 rounded-md border border-paper/12 bg-paper/[0.04] px-4 py-3"
      role="note"
    >
      <p className="font-sans text-caption font-semibold text-gold/85 mb-1">
        {t("translationDisclaimer.title")}
      </p>
      <p className="font-serif text-ui text-paper/70 leading-[1.6]">
        {t("translationDisclaimer.body")}
      </p>
    </aside>
  );
}
