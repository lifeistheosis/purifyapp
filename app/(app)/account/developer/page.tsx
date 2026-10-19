import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDeveloperEmail } from "@/lib/dev/developer";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { DeveloperOptions } from "@/components/dev/DeveloperOptions";
import { DeveloperGate } from "@/components/dev/DeveloperGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Developer",
  robots: { index: false, follow: false },
};

// Gated to allowlisted developer accounts: everyone else gets a 404, so the
// panel is undiscoverable to normal users.
//
// On the website the server gates it, from the session cookie. The apps have
// no server and no cookie (AGENTS.md, the native rule): asked at build time,
// this check found nobody and baked the 404 into the bundle, so Settings'
// Developer row opened "not found" for the one account it is shown to. In the
// apps the device's own session decides instead (DeveloperGate), and the
// panel's switches only ever touch this device: the test-premium override is
// checked against the allowlist again wherever it is honored.
export default async function DeveloperPage() {
  if (!IS_STATIC_EXPORT) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!isDeveloperEmail(user?.email)) notFound();
  }
  return (
    <>
      <MobileTopBar titleKey="ui.developer" back backFallback="/settings" revealTitleOn="developer-title" />
      <DeveloperGate>
        <DeveloperOptions />
      </DeveloperGate>
    </>
  );
}
