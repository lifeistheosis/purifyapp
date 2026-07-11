import type { Metadata } from "next";

import { CartClient } from "@/components/shop/CartClient";

export const metadata: Metadata = { title: "Your cart" };

// Server shell; the cart lives on the device (localStorage) and renders
// client-side, so it works identically on the web and in the native
// local-first export.
export default function CartPage() {
  return <CartClient />;
}
