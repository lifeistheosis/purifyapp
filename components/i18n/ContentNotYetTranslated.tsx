import { getMessages, t } from "@/lib/i18n";
import type { LocaleCode } from "@/lib/i18n/locales";

type Kind =
  | "bio"
  | "work"
  | "prayer"
  | "council"
  | "history"
  | "theology"
  | "topic"
  | "apologetics"
  | "calendar"
  | "offline";

/**
 * Per-page banner shown on long-prose surfaces when the requested locale
 * variant is missing and the page is falling back to the English source
 * (or, on native, when the translation cannot be fetched offline).
 *
 * Copy lives in the message catalogs under content.notYetTranslated.*,
 * so every locale gets the banner in its own language as catalogs fill;
 * missing keys fall back to the English copy via getMessages' merge.
 * The "offline" kind is reserved for the native content layer.
 */
export function ContentNotYetTranslated({
  locale,
  kind,
}: {
  locale: LocaleCode;
  kind: Kind;
}) {
  if (locale === "en") return null;
  const m = getMessages(locale);
  const titleKey = `content.notYetTranslated.${kind}.title`;
  const bodyKey = `content.notYetTranslated.${kind}.body`;
  const title = t(m, titleKey);
  const body = t(m, bodyKey);
  // t() returns the key itself when even English lacks it: hide rather
  // than leak a raw dot-key into the page.
  if (body === bodyKey) return null;
  return (
    <div
      role="status"
      className="my-6 rounded-md border border-gold/30 bg-gold/[0.04] px-4 py-3"
    >
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/85 mb-1">
        {title === titleKey ? "" : title}
      </p>
      <p className="font-serif text-ui text-paper/80 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
