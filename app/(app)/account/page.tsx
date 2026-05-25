import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnsignedAccount } from "@/components/profile/UnsignedAccount";

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

  return (
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
      <article className="mx-auto max-w-[1080px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Your account
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Pick up where you left off.
        </h1>
        <p className="mt-6 font-serif text-[17px] text-paper/85 leading-[1.7] max-w-[640px]">
          Two real ways to use Purify, both free and both private. Keep
          everything on this device, or sync across devices with email
          and password (or Google / Apple). Either choice is reversible.
        </p>

        <div className="min-h-[520px]">
          <UnsignedAccount />
        </div>

        <p className="mt-10 font-sans text-[14px] text-paper/55 leading-[1.65] max-w-[640px]">
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
  );
}
