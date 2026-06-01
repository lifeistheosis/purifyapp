"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          Something went wrong
        </p>
        <h1 className="font-serif text-display-sm md:text-display text-paper leading-[1.1]">
          We hit a wall.
        </h1>
        <p className="mt-5 font-sans text-body text-paper/65 max-w-[480px] mx-auto leading-[1.6]">
          The page failed to load. Try again; if it keeps happening, let us
          know and we will dig in.
        </p>
        {error.digest && (
          <p className="mt-4 font-sans text-eyebrow text-paper/35 tabular-nums">
            ref {error.digest}
          </p>
        )}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-pill border border-gold/55 bg-gold/15 hover:bg-gold/25 px-5 h-[44px] font-sans text-ui font-semibold text-paper transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-pill border border-paper/15 bg-paper/[0.04] hover:bg-paper/10 px-5 h-[44px] inline-flex items-center font-sans text-ui font-medium text-paper/85 transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
