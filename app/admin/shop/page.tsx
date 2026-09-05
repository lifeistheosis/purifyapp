import Link from "next/link";
import { notFound } from "next/navigation";

import { BlessingConfigCard } from "@/components/admin/shop/BlessingConfigCard";
import { AdminSubpage } from "@/components/admin/shop/AdminSubpage";
import { ProductList } from "@/components/admin/shop/ProductList";
import { getAdminUser } from "@/lib/admin/access";

// The plain product list (docs/plans/v1.4/shop-simple.md): thumb, name,
// price, stock, Visible, and the row is the edit link. The blessing config
// card sits folded above it. Same gate as app/admin/page.tsx: a non-admin
// gets a 404, not a hint that the route exists.
export const dynamic = "force-dynamic";
export const metadata = { title: "Shop products", robots: { index: false, follow: false } };

export default async function AdminShopPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <AdminSubpage
      title="Products"
      eyebrow="Shop"
      back={{ href: "/admin#tab=shop", label: "Admin" }}
      action={
        <Link
          href="/admin/shop/new"
          className="adm-control inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] px-5 font-sans text-[14px] font-semibold"
          style={{
            ["--_bg" as string]: "var(--adm-accent)",
            ["--_bg-hover" as string]: "var(--adm-accent-dim)",
            color: "var(--adm-on-accent)",
          }}
        >
          New product
        </Link>
      }
    >
      <div className="space-y-5">
        <BlessingConfigCard />
        <ProductList />
      </div>
    </AdminSubpage>
  );
}
