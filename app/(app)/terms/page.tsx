import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_PAGE_NAME } from "@/components/legal/legalStyle";
import { TermsText } from "@/components/legal/TermsText";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms under which Purify and the EIKON shop are offered: what the service is, how purchases work, what we promise, what we do not, and how disputes are handled.",
};

/**
 * The Terms of Service: the text (components/legal/TermsText.tsx, which the
 * sheet draws too) in the frame the three legal pages share
 * (components/legal/LegalPage.tsx; 1.9, his "can you revamp the TOS design?").
 */
export default function TermsPage() {
  return (
    <>
      {/* Without a bar this page had nothing holding the status-bar strip on
          native: it scrolled under the clock, wifi and battery. The bar
          carries `topbar-safe`, which pads by the inset and cancels <main>'s
          safe-pt at its own position, and that rule is already what fixed the
          same collision on Android. It also gives the page its way back. It
          takes the page's name once the name at the page's head has gone up
          under it. */}
      <MobileTopBar titleKey="terms.eyebrow" back revealTitleOn={LEGAL_PAGE_NAME} />
      <LegalPage doc="terms">
        <TermsText />
      </LegalPage>
    </>
  );
}
