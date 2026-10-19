"use client";

import { useLayoutEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { isDeveloperEmail } from "@/lib/dev/developer";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { resolveUser } from "@/lib/supabase/resolveUser";

/**
 * The developer panel's gate on the device (1.8), for the apps, which have
 * no server to gate it (app/(app)/account/developer/page.tsx). On the website
 * the server has already let only a developer through, and this agrees.
 *
 * The device's own session, read with no request; else resolveUser. Anyone
 * who is not an allowlisted developer sees the same line the 404 page says,
 * and nothing of the panel.
 */
export function DeveloperGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslate();
  const [state, setState] = useState<"checking" | "in" | "out">("checking");

  useLayoutEffect(() => {
    const local = readLocalSessionUser();
    if (local) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
         session is on the device, read after mount, before the first paint. */
      setState(isDeveloperEmail(local.email) ? "in" : "out");
      return;
    }
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      setState(auth.state === "signed-in" && isDeveloperEmail(auth.user.email) ? "in" : "out");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "in") return <>{children}</>;
  if (state === "checking") return <div className="min-h-[40vh]" />;
  return <p className="px-5 py-16 text-center font-sans text-ui text-paper/60">{t("notFound.h1")}</p>;
}
