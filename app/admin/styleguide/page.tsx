import { notFound } from "next/navigation";

import { Styleguide } from "@/components/admin/ledger/Styleguide";
import { getAdminUser } from "@/lib/admin/access";

// Every ledger component in every state, on one page, so a change to a
// token or a primitive can be checked against all of them at once. Same
// gate as app/admin/page.tsx: a non-admin gets a 404. The stylesheet and
// the token root come from app/admin/layout.tsx.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin styleguide", robots: { index: false, follow: false } };

export default async function AdminStyleguidePage() {
  const admin = await getAdminUser();
  if (!admin) notFound();
  return <Styleguide />;
}
