import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrivacyInReadersLanguage } from "@/components/privacy/PrivacyInReadersLanguage";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { T } from "@/components/i18n/T";
import { PrivacyText } from "@/components/legal/PrivacyText";

export const metadata = {
 title: "Privacy",
 description:
 "What Purify records, what we don't, where it lives, how long we keep it, and the third parties involved.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

/**
 * The English page, drawn here. A German reader reads the German of the same
 * text, loaded on the device (components/privacy/PrivacyInReadersLanguage.tsx):
 * until 1.9 the page chose it on the server, which in the apps knows no reader.
 */
export default function PrivacyPage() {
 return (
 <>
 {/* Without a bar this page had nothing holding the status-bar strip on
     native: it scrolled under the clock, wifi and battery. The bar carries
     `topbar-safe`, which pads by the inset and cancels <main>'s safe-pt at
     its own position, and that rule is already what fixed the same
     collision on Android. It also gives the page a way back. */}
 <MobileTopBar titleKey="privacy.eyebrow" back />
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <PrivacyInReadersLanguage>
 <TranslationDisclaimer />
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">
 <T k="privacy.eyebrow" />
 </p>
 <PrivacyText lang="en" />
 </PrivacyInReadersLanguage>
 </article>
 </section>
 </>
 );
}
