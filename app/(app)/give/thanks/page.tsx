import type { Metadata } from "next";

import { GiveThanks } from "@/components/gifts/GiveThanks";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

// The website alone, with /give (scripts/native-build.mjs). Stripe returns the
// giver here with the day it goes out, if any (app/api/gifts/card/checkout).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function GiveThanksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const on = (await searchParams).on;
  const day = typeof on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : null;
  return (
    <>
      <MobileTopBar titleKey="giveGift.barTitle" back backFallback="/" revealTitleOn="gift-title" solidFrom="gift-first" overlay />
      <GiveThanks on={day} />
    </>
  );
}
