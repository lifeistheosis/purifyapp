"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";

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

  async function load(opts?: { forceRefresh?: boolean }) {
    const supabase = createClient();
    // Force a fresh JWT from the server on mount and after any link /
    // unlink event. Without this, the SDK serves a cached user object
    // whose `identities` array doesn't reflect the link that just
    // completed on the server during the OAuth round-trip.
    if (opts?.forceRefresh) {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // Refresh failures are benign — fall through to getUserIdentities
        // which will fail noisily if the session is genuinely dead.
      }
    }
    // Prefer getUserIdentities() — it's a direct read against the
    // /auth/v1/user/identities endpoint, no cached-user-object layer
    // in the middle. Some SDK versions return a stale .identities
    // array on getUser() after a recent link, even with a fresh
    // session; this avoids that path entirely.
    try {
      const { data } = await supabase.auth.getUserIdentities();
      if (data?.identities) {
        setIdentities(data.identities as Identity[]);
        return;
      }
    } catch {
      // Fall through to the legacy path below.
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIdentities((user?.identities ?? []) as Identity[]);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createClient();
    // First paint: pull fresh from server so a just-completed link
    // shows up in the UI without requiring a manual reload.
    load({ forceRefresh: true });
    // If the OAuth callback bounced us back here with ?error=...,
    // surface it. Translate the common cases the same way the
    // synchronous catch block does.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        if (/identity is already linked/i.test(err) || /identity_already_exists/i.test(err)) {
          // Linked to a different account. Couldn't have been linked
          // to this one or the OAuth flow would have succeeded
          // silently — Supabase only throws this when the identity
          // exists on a user other than auth.uid().
          setError(
            "That Google account is already linked to a different Purify account. Sign out and click \"Continue with Google\" on /signin to sign in with it, or try a different Google account here.",
          );
        } else {
          setError(err);
        }
        // Strip the error from the URL so a refresh doesn't re-fire it.
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", clean);
      }
    }
    // Stay subscribed so any later auth event (link, unlink, refresh,
    // sign-out from another tab) repaints the card.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // USER_UPDATED fires after a successful linkIdentity / unlinkIdentity.
      // SIGNED_IN and TOKEN_REFRESHED fire after the OAuth callback returns.
      if (
        event === "USER_UPDATED" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        load();
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
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
      const origin = authOrigin();
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
        // Most common reason this fires: the link DID succeed on a
        // previous click but the local state was stale. Refresh from
        // the server and clear the error — if the link is on this
        // user, the card will repaint as "Connected / Unlink." If
        // it's on a *different* Purify account, the identity won't
        // appear and we surface the deeper-link explanation.
        await load({ forceRefresh: true });
        // Re-read identities directly from the response we just set,
        // not from the closed-over `identities` state above which is
        // still the pre-refresh value.
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const fresh = (user?.identities ?? []) as Identity[];
        const linkedHere = fresh.find((i) => i.provider === "google");
        if (linkedHere) {
          setError(null);
        } else {
          setError(
            "That Google account is already linked to a different Purify account. Sign out and click \"Continue with Google\" on /signin to use it, or pick another Google account.",
          );
        }
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
      await load({ forceRefresh: true });
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
