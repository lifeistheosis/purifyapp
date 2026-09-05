import { notFound } from "next/navigation";

import { AdminSubpage } from "@/components/admin/shop/AdminSubpage";
import { ProductForm } from "@/components/admin/shop/ProductForm";
import type { AdminProductRow, AdminSourcingRow } from "@/components/admin/shop/productRow";
import { getAdminUser } from "@/lib/admin/access";
import { readBlessingConfigWith } from "@/lib/shop/blessing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminShopEditPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = createAdminClient();
  // `*` on both, so thumb_url, blessing_available and deleted_at ride along
  // once 20260905_shop_simple.sql lands and are simply absent before it.
  const [productRes, sourcingRes, blessing] = await Promise.all([
    db
      .from("shop_products")
      .select("*, media:shop_product_media(*), subjects:shop_product_subjects(subject_type, subject_slug)")
      .eq("id", id)
      .maybeSingle(),
    db.from("shop_product_sourcing").select("*").eq("product_id", id).maybeSingle(),
    readBlessingConfigWith(db),
  ]);
  const product = productRes.data as AdminProductRow | null;
  // A deleted product has no edit page. Its row stays for the orders that
  // reference it; the address is not reused.
  if (!product || product.deleted_at) notFound();

  let sourcing = (sourcingRes.data as AdminSourcingRow | null) ?? null;
  if (sourcing?.supplier_id) {
    const { data: supplier } = await db
      .from("shop_suppliers")
      .select("name")
      .eq("id", sourcing.supplier_id)
      .maybeSingle();
    sourcing = { ...sourcing, supplier_name: (supplier?.name as string | undefined) ?? null };
  }

  return (
    <AdminSubpage title={product.title} eyebrow="Shop" back={{ href: "/admin/shop", label: "Products" }}>
      <ProductForm product={product} sourcing={sourcing} blessingEnabled={blessing.enabled} />
    </AdminSubpage>
  );
}
