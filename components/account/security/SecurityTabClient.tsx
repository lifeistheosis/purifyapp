"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChangePasswordCard } from "@/components/account/security/ChangePasswordCard";
import { ChangeEmailCard } from "@/components/account/security/ChangeEmailCard";
import { OAuthConnectionsCard } from "@/components/account/security/OAuthConnectionsCard";
import { SignOutEverywhereCard } from "@/components/account/security/SignOutEverywhereCard";

/**
 * Client-side security tab. Page shell stays server (metadata); the user +
 * has_password + identities read runs client-side here so it works in the
 * native local-first export. AccountAuthGate guarantees a signed-in user.
 */
export function SecurityTabClient() {
  const [data, setData] = useState<{
    email: string;
    hasPassword: boolean;
    // Loose shape to match OAuthConnectionsCard's structural Identity type;
    // JSON-cloned so we pass the full UserIdentity fields unlinkIdentity needs.
    identities: Record<string, unknown>[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Local session, not a network getUser() — see ProfileTabClient (F-13):
      // getUser() can hang on open and strand this on its loading state.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_password")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setData({
        email: user.email ?? "",
        hasPassword: profile?.has_password === true,
        identities: JSON.parse(
          JSON.stringify(user.identities ?? []),
        ) as Record<string, unknown>[],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <p className="py-10 text-center font-sans text-caption text-paper/45">
        Loading your security settings…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ChangePasswordCard email={data.email} hasPassword={data.hasPassword} />
      <ChangeEmailCard currentEmail={data.email} />
      <OAuthConnectionsCard
        initialIdentities={data.identities}
        hasPassword={data.hasPassword}
      />
      <SignOutEverywhereCard />
    </div>
  );
}
