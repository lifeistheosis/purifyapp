import { OrderGiftClient } from "@/components/gifts/OrderGiftClient";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "A gift with your order",
  description: "Every EIKON order comes with Purify Plus. Claim yours here.",
};

/**
 * purifyapp.net/gift, where the QR on the EIKON thank-you card opens.
 *
 * Server shell only. This page SHIPS INTO THE NATIVE BUNDLE, so it must not
 * read auth or data on the server: no force-dynamic, no cookies(), no
 * getUser(). The client child fetches at runtime through apiFetch.
 *
 * The address is printed on 200 cards (the QR encodes exactly
 * https://purifyapp.net/gift), so this route must never move. A plain static
 * route with no dynamic segment, so the app's export resolves it too.
 *
 * 1.8 (the owner's pick C of r3-39, "the card in your hand"): the card lies in
 * the light at the top, so the bar starts clear over it and turns solid with
 * the page's name once the ticket's heading has gone up under it, as on Your
 * rule (lib/nav/backBar.ts lists the route as one with its own bar).
 */
export default function GiftPage() {
  return (
    <>
      <MobileTopBar titleKey="orderGift.barTitle" back backFallback="/" revealTitleOn="gift-title" overlay />
      <OrderGiftClient />
    </>
  );
}
