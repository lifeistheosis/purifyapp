import type { Metadata } from "next";

import { GiveClient } from "@/components/gifts/GiveClient";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { whenChoices } from "@/lib/gifts/card";

// The website alone (scripts/native-build.mjs stashes it): a gift is paid on
// the web, which the app stores do not allow inside the apps. Rendered per
// request, so the Christmas choices are today's (lib/gifts/card.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Give a year of Purify Plus",
  description: "Give someone a year of Purify Plus, to open on Christmas Day or on the Nativity, 7 January.",
};

export default function GivePage() {
  return (
    <>
      <MobileTopBar titleKey="giveGift.barTitle" back backFallback="/" revealTitleOn="gift-title" solidFrom="gift-first" overlay />
      <GiveClient choices={whenChoices(new Date())} />
    </>
  );
}
