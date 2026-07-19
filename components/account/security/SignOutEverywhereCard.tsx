"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Sign-out-everywhere control. Uses Supabase's `signOut({ scope:
 * 'global' })` to invalidate every session for this user, then bounces
 * to /signin.
 */
export function SignOutEverywhereCard() {
  const { t } = useTranslate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signOut({ scope: "global" });
      if (err) throw err;
      router.push("/signin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign out everywhere.");
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-crimson/35 bg-crimson/[0.04] p-6">
      <h2 className="font-sans text-body font-semibold text-paper mb-1">
        {t("account.signOutEverywhere")}
      </h2>
      <p className="font-sans text-detail text-paper/65 mb-5 leading-[1.55]">
        {t("ui.usefulIfYouSignedIn")}
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="rounded-pill border border-crimson/60 text-crimson-soft font-sans text-detail font-semibold px-5 py-2.5 hover:bg-crimson/15 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Signing out…" : "Sign out everywhere"}
      </button>
      {error ? (
        <p className="mt-3 font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t("ui.signOutOfEveryDevice")}
        description="Every browser and device currently signed in to this account will be signed out. You'll be sent back to the sign-in page on this device."
        confirmLabel={t("account.signOutEverywhere")}
        cancelLabel={t("ui.staySignedIn")}
        destructive
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          go();
        }}
      />
    </section>
  );
}
