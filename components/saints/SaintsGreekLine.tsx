"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";

// Deliberate Greek verbatim in every language, but not to a Greek reader,
// whose heading already says it (1.9: chosen on the device, since in the apps
// the server knows no reader; until 1.9 every reader had it).
const GREEK_HOI_HAGIOI = "Οι Άγιοι";

/** "The Saints" in Greek under the saints' heading, for every reader but a Greek one. */
export function SaintsGreekLine() {
  const { locale } = useTranslate();
  if (locale === "el") return null;
  return (
    <p lang="grc" dir="ltr" className="mt-3 font-serif text-caption text-gold/65 leading-none" style={{ fontFamily: "var(--font-greek), serif" }}>
      {GREEK_HOI_HAGIOI}
    </p>
  );
}
