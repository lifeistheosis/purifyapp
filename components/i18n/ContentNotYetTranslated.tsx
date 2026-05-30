import type { LocaleCode } from "@/lib/i18n/locales";

type Kind = "bio" | "work" | "prayer";

/**
 * Per-page banner shown on long-prose surfaces (saint biographies, hosted
 * patristic works, prayer rules) when the requested locale variant is
 * missing and the page is falling back to the English source.
 *
 * Editorial choice: rather than machine-translate the Fathers, we name
 * the gap honestly and route readers to the English text. The cookie
 * locale is preserved so navigation stays in the user's language for
 * everything that IS translated (UI chrome, prayers, biographies as
 * they come online).
 */
// v6.9.1: only English and German shippable. The eleven other locales
// retired pending editorial review; if a stale cookie still carries one,
// getServerLocale() falls back to English before this component is even
// considered.
type Messages = Partial<Record<LocaleCode, Record<Kind, { title: string; body: string }>>>;

const MESSAGES: Messages = {
  en: {
    bio: { title: "", body: "" },
    work: { title: "", body: "" },
    prayer: { title: "", body: "" },
  },
  de: {
    bio: {
      title: "Übersetzung im Werden",
      body: "Diese Heiligenvita ist noch nicht ins Deutsche übertragen. Der englische Text der Redaktion steht unten; eine geprüfte deutsche Fassung wird laufend nachgereicht.",
    },
    work: {
      title: "Übersetzung im Werden",
      body: "Dieses Väterwerk ist noch nicht in der gewählten Sprache verfügbar. Wir zeigen den englischen Text aus gemeinfreien Übersetzungen; eine theologisch geprüfte Übertragung wird vorbereitet.",
    },
    prayer: {
      title: "Übersetzung im Werden",
      body: "Diese Gebete sind noch nicht in der gewählten Sprache verfügbar. Wir zeigen den englischen Text; die deutsche Fassung folgt.",
    },
  },
};

export function ContentNotYetTranslated({
  locale,
  kind,
}: {
  locale: LocaleCode;
  kind: Kind;
}) {
  if (locale === "en") return null;
  const m = MESSAGES[locale]?.[kind] ?? MESSAGES.de?.[kind];
  if (!m || !m.body) return null;
  return (
    <div
      role="status"
      className="my-6 rounded-md border border-gold/30 bg-gold/[0.04] px-4 py-3"
    >
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-1">
        {m.title}
      </p>
      <p className="font-serif text-[14px] text-paper/80 leading-relaxed">
        {m.body}
      </p>
    </div>
  );
}
