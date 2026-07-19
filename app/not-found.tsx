import Link from "next/link";
import { getMessages, t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const m = getMessages(await getServerLocale());
  return (
    <main className="min-h-screen bg-night flex items-center justify-center px-5 py-16">
      <div className="mx-auto max-w-[640px] w-full text-center">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-6">
          404
        </p>
        <h1 className="font-serif text-display md:text-display-lg text-paper leading-[1.1]">
          {t(m, "notFound.h1")}
        </h1>
        <p className="mt-5 font-sans text-body text-paper/65 max-w-[480px] mx-auto leading-[1.6]">
          {t(m, "notFound.body")}
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/prayers/today"
            className="rounded-md border border-gold/35 bg-gold/[0.06] hover:border-gold/55 hover:bg-gold/[0.10] transition-colors px-5 py-4 font-sans text-ui font-medium text-paper"
          >
            {t(m, "notFound.todaysPrayer")} →
          </Link>
          <Link
            href="/bible"
            className="rounded-md border border-paper/15 bg-paper/[0.04] hover:border-paper/35 hover:bg-paper/[0.08] transition-colors px-5 py-4 font-sans text-ui font-medium text-paper"
          >
            {t(m, "notFound.bible")} →
          </Link>
          <Link
            href="/saints"
            className="rounded-md border border-paper/15 bg-paper/[0.04] hover:border-paper/35 hover:bg-paper/[0.08] transition-colors px-5 py-4 font-sans text-ui font-medium text-paper"
          >
            {t(m, "notFound.saints")} →
          </Link>
        </div>
        <p className="mt-10 font-sans text-detail text-paper/45">
          {t(m, "notFound.or")}{" "}
          <Link href="/" className="text-paper hover:underline underline-offset-2">
            {t(m, "notFound.returnHome")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
