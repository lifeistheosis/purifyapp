import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnsignedAccount } from "@/components/profile/UnsignedAccount";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { YouMobile } from "@/components/mobile/YouMobile";
import { DesktopAccountGate } from "@/components/profile/DesktopAccountGate";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Your account",
  description:
    "Sign in to sync your highlights, notes, and bookmarks across devices. Or keep everything local on this device. Your choice.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

/**
 * Leaf `/account`. On mobile this is the native "You" shell for both
 * signed-in and local-only visitors (YouMobile branches client-side).
 * On desktop, signed-in users are routed to the fuller dashboard at
 * /account/profile (DesktopAccountGate, viewport-aware so mobile is
 * untouched); signed-out visitors see the dual chooser.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale = await getServerLocale();
  const m = getMessages(locale);

  if (user) {
    return (
      <>
        <YouMobile />
        <DesktopAccountGate />
      </>
    );
  }

  return (
    <>
    <YouMobile />
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)] hidden md:block native-md-hidden`}>
      <article className="mx-auto max-w-[1080px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t(m, "account.eyebrow")}
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {t(m, "account.h1")}
        </h1>
        <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7] max-w-[640px]">
          <T k="ui.twoRealWaysToUse" />
        </p>

        <div className="min-h-[520px]">
          <UnsignedAccount />
        </div>

        <p className="mt-10 font-sans text-ui text-paper/55 leading-[1.65] max-w-[640px]">
          <T k="ui.theFullDataHandlingRules" />{" "}
          <Link
            href="/privacy"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            <T k="ui.privacyPage" />
          </Link>
          .
        </p>
      </article>
    </section>
    </>
  );
}
