import { PrivacyText } from "@/components/legal/PrivacyText";

/**
 * The Privacy Policy in German (1.9, the reader's language in the apps): the
 * German of components/legal/PrivacyText.tsx, the same text the sheet shows a
 * German reader, loaded on the device (./PrivacyInReadersLanguage.tsx) and
 * never written into the page, which writes the English. The page's name
 * stands in its frame (components/legal/LegalPage.tsx), in the reader's
 * language, over either text.
 */
export function PrivacyDe() {
  return <PrivacyText lang="de" />;
}
