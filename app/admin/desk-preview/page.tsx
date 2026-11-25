import { notFound } from "next/navigation";

import { OwnerDeskPreview } from "@/components/admin/planner/OwnerDeskPreview";
import { getAdminUser } from "@/lib/admin/access";

// The owner's desk on sample settings, openable on a dev machine: the
// drawing he says yes or no to. The posture of app/admin/goals-preview: always
// fresh, never indexed, a 404 to anyone but an admin in production, reads
// nothing. scripts/native-build.mjs stashes the whole app/admin tree.
//
//   ?theme=dark | light

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Desk preview",
  robots: { index: false, follow: false },
};

export default async function DeskPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();
  if (!isDev && !admin) notFound();
  const q = await searchParams;
  return <OwnerDeskPreview theme={q.theme === "light" ? "light" : "dark"} />;
}
