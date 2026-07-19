"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { ChangePasswordCard } from "@/components/account/security/ChangePasswordCard";
import { ChangeEmailCard } from "@/components/account/security/ChangeEmailCard";
import { OAuthConnectionsCard } from "@/components/account/security/OAuthConnectionsCard";
import { SignOutEverywhereCard } from "@/components/account/security/SignOutEverywhereCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client-side security tab. Page shell stays server (metadata); the user +
 * has_password + identities read runs client-side here so it works in the
 * native local-first export. AccountAuthGate guarantees a signed-in user.
 */
export function SecurityTabClient() {
  const { t } = useTranslate();
  const [data, setData] = useState<{
    email: string;
    hasPassword: boolean;
    // Loose shape to match OAuthConnectionsCard's structural Identity type;
    // JSON-cloned so we pass the full UserIdentity fields unlinkIdentity needs.
    identities: Record<string, unknown>[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Render from the persisted cookie session IMMEDIATELY (sync, no
    // network/refresh/lock) so the tab is never stranded on its loading state
    // (F-13). The has_password flag comes from a DB row and enhances the view
    // when it arrives; until then we assume a password exists (the middleware
    // already forces password-less accounts to /set-password, so a signed-in
    // user on this tab has one or is OAuth).
    const sessionUser = readLocalSessionUser();
    if (sessionUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData({
        email: sessionUser.email ?? "",
        hasPassword: true,
        identities: JSON.parse(
          JSON.stringify(sessionUser.identities ?? []),
        ) as Record<string, unknown>[],
      });
    }
    (async () => {
      const supabase = createClient();
      const user =
        sessionUser ??
        (await supabase.auth.getSession()).data.session?.user ??
        null;
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
        {t("ui.loadingYourSecuritySettings")}
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
