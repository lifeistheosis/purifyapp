import { OrderGiftClient } from "@/components/gifts/OrderGiftClient";

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
 */
export default function GiftPage() {
  return <OrderGiftClient />;
}
