import { T } from "@/components/i18n/T";
import { PrivacyText } from "@/components/legal/PrivacyText";

/**
 * The Privacy Policy in German (1.9, the reader's language in the apps): the
 * German of components/legal/PrivacyText.tsx, the same text the sheet shows a
 * German reader, loaded on the device (./PrivacyInReadersLanguage.tsx) and
 * never written into the page, which writes the English.
 */
export function PrivacyDe() {
  return (
    <>
      <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
        <T k="privacy.eyebrow" />
      </p>
      <PrivacyText lang="de" />
    </>
  );
}
