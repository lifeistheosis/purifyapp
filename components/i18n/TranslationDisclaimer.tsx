"use client";

import { useTranslate } from "./MessagesProvider";

/**
 * Small banner shown on pages whose body prose is still in English
 * while UI chrome has been translated. Hides itself when the active
 * locale is English (nothing to disclaim).
 */
export function TranslationDisclaimer() {
  const { locale, t } = useTranslate();
  if (locale === "en") return null;
  return (
    <aside
      className="mb-8 rounded-md border border-paper/12 bg-paper/[0.04] px-4 py-3"
      role="note"
    >
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold/85 mb-1">
        {t("translationDisclaimer.title")}
      </p>
      <p className="font-serif text-ui text-paper/70 leading-[1.6]">
        {t("translationDisclaimer.body")}
      </p>
    </aside>
  );
}
