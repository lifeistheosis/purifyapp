import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDeveloperEmail } from "@/lib/dev/developer";
import { DeveloperOptions } from "@/components/dev/DeveloperOptions";

export const metadata = {
  title: "Developer",
  robots: { index: false, follow: false },
};

// Server-gated: only allowlisted developer accounts can reach this route;
// everyone else gets a 404, so the panel is undiscoverable to normal users.
export default async function DeveloperPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isDeveloperEmail(user?.email)) notFound();
  return <DeveloperOptions />;
}
