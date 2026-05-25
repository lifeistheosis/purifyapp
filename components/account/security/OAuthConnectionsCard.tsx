"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Identity = {
  id?: string;
  identity_id?: string;
  provider?: string;
};

/**
 * Lists which OAuth identities are linked to the current user and
 * lets them connect / disconnect Google. Apple is shown but marked
 * "Coming soon" until the provider config is in place (Apple
 * Developer account required).
 *
 * Linking a new identity hits `supabase.auth.linkIdentity()`, which
 * requires the project's "Manual Linking" setting to be enabled in
 * Supabase Dashboard → Authentication → Settings. If it's off, the
 * SDK throws "Manual linking is disabled" — we translate that to a
 * concrete next-step message instead of relaying the raw text.
 */
export function OAuthConnectionsCard() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [pending, setPending] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIdentities((user?.identities ?? []) as Identity[]);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const googleIdentity =
    identities.find((i) => i.provider === "google") ?? null;
  const appleIdentity =
    identities.find((i) => i.provider === "apple") ?? null;

  async function connectGoogle() {
    setPending("google");
    setError(null);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?next=/account/security`,
        },
      });
      if (err) throw err;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      // Supabase's stock messages are too cryptic to act on; translate
      // the two we expect to see in production into next-steps.
      if (/manual linking is disabled/i.test(raw)) {
        setError(
          "Linking new providers from inside the app is currently off. The site maintainer needs to enable Manual Linking in Supabase Dashboard → Authentication → Settings. In the meantime you can sign out and sign in with Google directly.",
        );
      } else if (
        /identity is already linked/i.test(raw) ||
        /identity_already_exists/i.test(raw)
      ) {
        setError(
          "That Google account is already linked to a Purify account. If you'd like to use it to sign in, sign out and click \"Continue with Google\" on /signin — Supabase will recognize the existing link and let you in.",
        );
      } else {
        setError(raw || "Couldn't connect Google.");
      }
      setPending(null);
    }
  }

  async function disconnectGoogle() {
    if (!googleIdentity) return;
    setPending("google");
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.unlinkIdentity(
        googleIdentity as Parameters<
          typeof supabase.auth.unlinkIdentity
        >[0],
      );
      if (err) throw err;
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't disconnect Google.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
        Connected accounts
      </h2>
      <p className="font-sans text-[13px] text-paper/60 mb-5 leading-[1.55]">
        Sign in faster by linking Google to your account. You can still
        sign in with email + password at any time.
      </p>
      <ul className="flex flex-col gap-3 max-w-[480px]">
        {/* Google — live */}
        <li className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3">
          <div className="min-w-0">
            <p className="font-sans text-[13.5px] font-medium text-paper">
              Google
            </p>
            <p className="font-sans text-[12px] text-paper/55">
              {googleIdentity ? "Connected" : "Not connected"}
            </p>
          </div>
          {googleIdentity ? (
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    "Unlink Google from your account? You'll still be able to sign in with email + password.",
                  )
                ) {
                  return;
                }
                disconnectGoogle();
              }}
              disabled={pending !== null}
              className="font-sans text-[12.5px] font-semibold rounded-pill border border-[#c1272d]/55 text-[#f8cac7] bg-[#c1272d]/[0.06] hover:bg-[#c1272d]/[0.15] hover:border-[#c1272d]/75 px-4 py-1.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {pending === "google" ? "Working…" : "Unlink"}
            </button>
          ) : (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={pending !== null}
              className="font-sans text-[12.5px] font-semibold rounded-pill bg-paper text-night px-4 py-1.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {pending === "google" ? "Opening…" : "Connect"}
            </button>
          )}
        </li>

        {/* Apple — coming soon */}
        <li className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3 opacity-70">
          <div className="min-w-0">
            <p className="font-sans text-[13.5px] font-medium text-paper">
              Apple
            </p>
            <p className="font-sans text-[12px] text-paper/55">
              {appleIdentity ? "Connected" : "Coming soon"}
            </p>
          </div>
          <span
            aria-disabled="true"
            title="Sign in with Apple is coming soon"
            className="font-sans text-[12.5px] font-medium text-paper/40 cursor-not-allowed"
          >
            Coming soon
          </span>
        </li>
      </ul>
      {error ? (
        <p className="mt-3 font-sans text-[13px] text-[#f8cac7] leading-[1.55]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
