import { ShopHomeClient } from "@/components/shop/ShopHomeClient";

// Server shell (metadata comes from the shop layout). The marketplace home
// renders client-side and fetches live from /api/shop/catalog/home, so it
// works in the native local-first export where there is no server session or
// database at build time.
export default function ShopHomePage() {
  return <ShopHomeClient />;
}
