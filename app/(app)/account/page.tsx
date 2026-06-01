import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnsignedAccount } from "@/components/profile/UnsignedAccount";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { YouMobile } from "@/components/mobile/YouMobile";

export const metadata = {
  title: "Your account",
  description:
    "Sign in to sync your highlights, notes, bookmarks, and prayer streaks across devices. Or keep everything local on this device. Your choice.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

/**
 * Leaf `/account`. Signed-in users redirect into the tabbed dashboard.
 * Signed-out (or local-only) users see the dual chooser (local profile
 * vs public account).
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account/profile");
  }

  const locale = await getServerLocale();
  const m = getMessages(locale);

  return (
    <>
    <YouMobile />
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)] hidden md:block`}>
      <article className="mx-auto max-w-[1080px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t(m, "account.eyebrow")}
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {t(m, "account.h1")}
        </h1>
        <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7] max-w-[640px]">
          Two real ways to use Purify, both free and both private. Keep
          everything on this device, or sync across devices with email
          and password (or Google / Apple). Either choice is reversible.
        </p>

        <div className="min-h-[520px]">
          <UnsignedAccount />
        </div>

        <p className="mt-10 font-sans text-ui text-paper/55 leading-[1.65] max-w-[640px]">
          The full data-handling rules, with every field stored and every
          third party named, are on the{" "}
          <Link
            href="/privacy"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            privacy page
          </Link>
          .
        </p>
      </article>
    </section>
    </>
  );
}
