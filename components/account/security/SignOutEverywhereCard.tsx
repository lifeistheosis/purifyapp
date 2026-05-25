"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-out-everywhere control. Uses Supabase's `signOut({ scope:
 * 'global' })` to invalidate every session for this user, then bounces
 * to /signin.
 */
export function SignOutEverywhereCard() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Sign out of every browser and device where you're signed in?",
      )
    ) {
      return;
    }
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
    <section className="rounded-lg border border-[#c1272d]/35 bg-[#c1272d]/[0.04] p-6">
      <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
        Sign out everywhere
      </h2>
      <p className="font-sans text-[13px] text-paper/65 mb-5 leading-[1.55]">
        Useful if you signed in on a device you no longer have. Invalidates
        every active session for this account.
      </p>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="rounded-pill border border-[#c1272d]/60 text-[#f8cac7] font-sans text-[13.5px] font-semibold px-5 py-2.5 hover:bg-[#c1272d]/15 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Signing out…" : "Sign out everywhere"}
      </button>
      {error ? (
        <p className="mt-3 font-sans text-[13px] text-[#f8cac7]">{error}</p>
      ) : null}
    </section>
  );
}
