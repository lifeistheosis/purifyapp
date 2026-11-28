import { CardGiftClient } from "@/components/gifts/CardGiftClient";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

// A year of Plus given by email, opened from the link in it (2.0, the
// Christmas gift; lib/gifts/card.ts). In the apps too, so a link that opens
// the app lands here; the code is read on the device.
export const metadata = {
  title: "A gift for you",
  description: "Someone has given you a year of Purify Plus. Open it here.",
  robots: { index: false },
};

export default function CardGiftPage() {
  return (
    <>
      <MobileTopBar titleKey="orderGift.barTitle" back backFallback="/" revealTitleOn="gift-title" solidFrom="gift-first" overlay />
      <CardGiftClient />
    </>
  );
}
