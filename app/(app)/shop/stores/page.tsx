import type { Metadata } from "next";

import { StoresClient } from "@/components/shop/StoresClient";

export const metadata: Metadata = { title: "The stores" };

// Server shell only. The directory renders client-side and fetches live from
// /api/shop/catalog/home, so it works in the native local-first export where
// there is no server session or database at build time.
export default function ShopStoresPage() {
  return <StoresClient />;
}
