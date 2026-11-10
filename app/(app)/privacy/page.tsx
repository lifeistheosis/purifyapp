import { PrivacyInReadersLanguage } from "@/components/privacy/PrivacyInReadersLanguage";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_PAGE_NAME } from "@/components/legal/legalStyle";
import { PrivacyText } from "@/components/legal/PrivacyText";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
 title: "Privacy",
 description:
 "What Purify records, what we don't, where it lives, how long we keep it, and the third parties involved.",
};

/**
 * The English page, drawn here. A German reader reads the German of the same
 * text, loaded on the device (components/privacy/PrivacyInReadersLanguage.tsx):
 * until 1.9 the page chose it on the server, which in the apps knows no reader.
 *
 * The frame is the three legal pages' shared one (components/legal/
 * LegalPage.tsx; 1.9), which gives the page its head and its name.
 */
export default function PrivacyPage() {
 return (
 <>
 {/* Without a bar this page had nothing holding the status-bar strip on
     native: it scrolled under the clock, wifi and battery. The bar carries
     `topbar-safe`, which pads by the inset and cancels <main>'s safe-pt at
     its own position, and that rule is already what fixed the same
     collision on Android. It also gives the page a way back. It takes the
     page's name once the name at the page's head has gone up under it. */}
 <MobileTopBar titleKey="privacy.eyebrow" back revealTitleOn={LEGAL_PAGE_NAME} />
 <LegalPage doc="privacy">
 <PrivacyInReadersLanguage>
 <TranslationDisclaimer />
 <PrivacyText lang="en" />
 </PrivacyInReadersLanguage>
 </LegalPage>
 </>
 );
}
