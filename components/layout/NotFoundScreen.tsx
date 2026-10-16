"use client";

// The "page not found" screen, as one client component.
//
// It is drawn by app/not-found.tsx, which Next writes into EVERY page's
// payload as that page's fallback. While it was markup in a server component,
// each of the export's 1,916 pages carried the whole of it three times over,
// about 1.8 KB a time: some 10 MB of the app was this screen, repeated, for a
// screen almost nobody sees. As one client component a page carries a single
// reference to it instead.
//
// It also had the server's words in it, which in the apps are English for
// good (lib/i18n/__tests__/serverWords.test.ts). Here they are looked up on
// the device.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

// Three doors, drawn alike. The first was washed in the old gold until 1.7,
// when the Kitchen came down and every old /kitchen link began to land here
// (the owner's word of 2026-10-16: no redirect, the usual not-found page),
// and gold had left the app's UI. The arrows are drawn, not typed.
const DOOR =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-paper/15 bg-paper/[0.04] hover:border-paper/35 hover:bg-paper/[0.08] motion-safe:transition-colors px-5 py-4 font-sans text-ui font-medium text-paper";

export function NotFoundScreen() {
  const { t } = useTranslate();
  return (
    <main className="min-h-screen bg-night flex items-center justify-center px-5 py-16">
      <div className="mx-auto max-w-[640px] w-full text-center">
        <p className="font-sans text-caption font-semibold text-paper/55 mb-6">
          {404}
        </p>
        <h1 className="font-serif text-display md:text-display-lg text-paper leading-[1.1]">
          {t("notFound.h1")}
        </h1>
        <p className="mt-5 font-sans text-body text-paper/65 max-w-[480px] mx-auto leading-[1.6]">
          {t("notFound.body")}
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/prayers/today" className={DOOR}>
            {t("notFound.todaysPrayer")}
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </Link>
          <Link href="/bible" className={DOOR}>
            {t("notFound.bible")}
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </Link>
          <Link href="/saints" className={DOOR}>
            {t("notFound.saints")}
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </Link>
        </div>
        <p className="mt-10 font-sans text-detail text-paper/45">
          {t("notFound.or")}{" "}
          <Link href="/" className="text-paper hover:underline underline-offset-2">
            {t("notFound.returnHome")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
