import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { ChartGallery } from "@/components/admin/ChartGallery";

// Every chart on one screen, on sample data, openable on a dev machine.
//
// Same posture as app/admin/shell-preview/page.tsx: always fresh, never
// indexed, and a 404 to anyone who is not an admin in production. The dev
// bypass exists because /admin cannot be opened locally at all — the Supabase
// anon key in .env.local is revoked and ADMIN_EMAILS is still the example
// placeholder — and every /api/admin route answers 403, so no chart ever
// draws a line on this machine without a harness like this one.
//
// It reads nothing and renders deterministic sample data, so nothing is
// exposed by rendering it. On Render NODE_ENV is "production" and the admin
// gate is the only path in. scripts/native-build.mjs stashes the whole
// app/admin tree, so it never reaches the native export either.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Chart gallery",
  robots: { index: false, follow: false },
};

export default async function ChartsPreviewPage() {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();
  if (!isDev && !admin) notFound();
  return <ChartGallery />;
}
