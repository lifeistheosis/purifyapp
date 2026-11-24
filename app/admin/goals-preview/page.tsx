import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { GoalsPreview, type PreviewState } from "@/components/admin/goals/GoalsPreview";

// The Goals page on made-up numbers, openable on a dev machine: the drawing
// the owner says yes or no to, rendered from the page's own component
// (components/admin/goals/GoalsView.tsx), never drawn by hand.
//
// Same posture as app/admin/charts-preview/page.tsx: always fresh, never
// indexed, and a 404 to anyone who is not an admin in production. It reads
// nothing: every figure is a sample in GoalsPreview.tsx, none of them his.
// scripts/native-build.mjs stashes the whole app/admin tree, so it never
// reaches the native export.
//
//   ?state=full | first-weeks | reached    ?theme=dark | light
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Goals preview",
  robots: { index: false, follow: false },
};

const STATES: PreviewState[] = ["full", "first-weeks", "reached"];

export default async function GoalsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();
  if (!isDev && !admin) notFound();
  const q = await searchParams;
  const state = STATES.find((s) => s === q.state) ?? "full";
  return <GoalsPreview state={state} theme={q.theme === "light" ? "light" : "dark"} />;
}
