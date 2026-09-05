import { notFound } from "next/navigation";

import { AdminSubpage } from "@/components/admin/shop/AdminSubpage";
import { ProductForm } from "@/components/admin/shop/ProductForm";
import { getAdminUser } from "@/lib/admin/access";
import { readBlessingConfigWith } from "@/lib/shop/blessing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product", robots: { index: false, follow: false } };

export default async function AdminShopNewPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  // Service role, so a config that is switched off still reads as its own
  // row rather than as the anon policy's "nothing here". Absent table reads
  // as disabled and the Blessing field stays off the form.
  const blessing = await readBlessingConfigWith(createAdminClient());

  return (
    <AdminSubpage title="New product" eyebrow="Shop" back={{ href: "/admin/shop", label: "Products" }}>
      <ProductForm product={null} sourcing={null} blessingEnabled={blessing.enabled} />
    </AdminSubpage>
  );
}
