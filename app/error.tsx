"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // This boundary renders inside the root layout, so the provider is
  // normally present; if the crash took the provider down too, t()
  // degrades to raw keys, which is acceptable on a crash page.
  const { t } = useTranslate();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Surface in dev so the developer can see what blew up without
      // shipping logs to production.

      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-night flex items-center justify-center px-5 py-16">
      <div className="mx-auto max-w-[640px] w-full text-center">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-6">
          {t("error.eyebrow")}
        </p>
        <h1 className="font-serif text-display-sm md:text-display text-paper leading-[1.1]">
          {t("error.h1")}
        </h1>
        <p className="mt-5 font-sans text-body text-paper/65 max-w-[480px] mx-auto leading-[1.6]">
          {t("error.body")}
        </p>
        {error.digest && (
          <p className="mt-4 font-sans text-eyebrow text-paper/35 tabular-nums">
            {t("error.ref", { digest: error.digest })}
          </p>
        )}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-pill border border-gold/55 bg-gold/15 hover:bg-gold/25 px-5 h-[44px] font-sans text-ui font-semibold text-paper transition-colors"
          >
            {t("error.tryAgain")}
          </button>
          <Link
            href="/"
            className="rounded-pill border border-paper/15 bg-paper/[0.04] hover:bg-paper/10 px-5 h-[44px] inline-flex items-center font-sans text-ui font-medium text-paper/85 transition-colors"
          >
            {t("error.returnHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
