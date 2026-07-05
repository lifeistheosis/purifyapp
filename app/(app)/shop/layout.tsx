import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopSubTabs } from "@/components/shop/ShopSubTabs";
import { shopEnabled } from "@/lib/shop/flags";

export const metadata: Metadata = {
  title: {
    default: "Shop — Curated Orthodox icons",
    template: "%s — Purify Shop",
  },
  description:
    "Curated Orthodox icons from EIKON, a Purify store: printed, mounted, laminated, and wooden icons, selected, inspected, and packaged for the life of prayer.",
  robots: { index: false, follow: false },
};

/**
 * Shop section shell. The whole marketplace sits behind
 * NEXT_PUBLIC_SHOP_ENABLED: until the flag flips, every /shop route is a
 * 404 and nothing in the app links here. robots noindex stays until
 * launch (flip alongside the flag when the store goes public).
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  if (!shopEnabled()) notFound();
  return (
    <div className="bg-night min-h-dvh pb-16 safe-pb">
      <ShopSubTabs />
      {children}
    </div>
  );
}
