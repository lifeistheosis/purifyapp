import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { TermsText } from "@/components/legal/TermsText";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms under which Purify and the EIKON shop are offered: what the service is, how purchases work, what we promise, what we do not, and how disputes are handled.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function TermsPage() {
  return (
    <>
      {/* Without a bar these pages had nothing holding the status-bar strip on
          native: the sheet scrolled under the clock, wifi and battery. The bar
          carries `topbar-safe`, which pads by the inset and cancels <main>'s
          safe-pt at its own position, and that rule is already what fixed the
          same collision on Android. It also gives the page a way back, which
          it did not have. */}
      <MobileTopBar titleKey="terms.eyebrow" back />
      <section className={`${SECTION} bg-night`}>
        <article className="mx-auto w-full max-w-[760px]">
        <p className="mb-4 font-sans text-detail font-semibold text-paper/55">
          Terms of Service
        </p>
        <TermsText />
        </article>
      </section>
    </>
  );
}
