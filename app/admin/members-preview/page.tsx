import { notFound } from "next/navigation";

import { MemberCountsPreview } from "@/components/admin/subscriptions/MemberCountsPreview";
import { getAdminUser } from "@/lib/admin/access";

// Subscriptions' counts on made-up numbers, openable on a dev machine: the
// drawing he says yes or no to. The posture of app/admin/goals-preview: always
// fresh, never indexed, a 404 to anyone but an admin in production, reads
// nothing. scripts/native-build.mjs stashes the whole app/admin tree.
//
//   ?theme=dark | light   ?open=1

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Members preview",
  robots: { index: false, follow: false },
};

export default async function MemberCountsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();
  if (!isDev && !admin) notFound();
  const q = await searchParams;
  return <MemberCountsPreview theme={q.theme === "light" ? "light" : "dark"} open={q.open === "1"} />;
}
