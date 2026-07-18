import type { Metadata } from "next";

import { ShopSupportClient } from "@/components/shop/ShopSupportClient";

export const metadata: Metadata = { title: "Contact EIKON support" };

// Server shell; the support chat starter reads auth and posts client-side so it
// works in the native local-first export (like the rest of the shop tree).
export default function ShopSupportPage() {
  return <ShopSupportClient />;
}
