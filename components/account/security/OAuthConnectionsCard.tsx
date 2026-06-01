"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Mirrors Supabase's UserIdentity loosely. We accept any shape that
// carries identity_id and provider; the full server-side object is
// forwarded as-is to unlinkIdentity which needs all of it.
type Identity = {
  id?: string;
  identity_id?: string;
  user_id?: string;
  provider?: string;
  identity_data?: Record<string, unknown> | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Allow any other fields the SDK adds in newer versions.
  [key: string]: unknown;
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
 * SDK throws "Manual linking is disabled", we translate that to a
 * concrete next-step message instead of relaying the raw text.
 */
export function OAuthConnectionsCard({
  initialIdentities,
  hasPassword = true,
}: {
  initialIdentities?: Identity[];
  /**
   * Whether the user has a password set on their auth.users row. When
   * false, unlinking the only OAuth identity would leave them with
   * no way to sign in, so Supabase's server-side check would reject
   * the request. We pre-empt that with a clearer "set a password
   * first" affordance instead of letting them hit the raw error.
   */
  hasPassword?: boolean;
}) {
  const router = useRouter();
  const [identities, setIdentities] = useState<Identity[]>(
    initialIdentities ?? [],
  );
  const [pending, setPending] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

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
        // Refresh failures are benign, fall through to getUserIdentities
        // which will fail noisily if the session is genuinely dead.
      }
    }
    // Prefer getUserIdentities(), it's a direct read against the
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
    // figure out which case we're in by checking what's actually on
    // the user. Supabase throws "identity_already_exists" for BOTH
    // "already on this user" and "already on a different user" ,
    // the URL error alone can't tell us which.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        // Strip the error from the URL so a refresh doesn't re-fire it.
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", clean);
        if (/identity is already linked/i.test(err) || /identity_already_exists/i.test(err)) {
          // Defer the verdict until we know what's on this user.
          // The initialIdentities prop is the server-side truth at
          // page load; if Google is already there, this error means
          // "you tried to link the account you already have," not
          // "linked to someone else."
          const alreadyOnThisUser = (initialIdentities ?? []).some(
            (i) => i.provider === "google",
          );
          if (!alreadyOnThisUser) {
            setError(
              "That Google account is already linked to a different Purify account. Sign out and click \"Continue with Google\" on /signin to sign in with it, or try a different Google account here.",
            );
          }
          // If it IS on this user, fall through: no error, and the
          // initial-identities render already shows Connected.
        } else {
          setError(err);
        }
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
        // the server and clear the error, if the link is on this
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
    // Watchdog so a hanging SDK call can never leave the button stuck
    // on "Working…". 15s is generous for a single DELETE; any longer
    // and something is genuinely wrong and the user deserves to know.
    const watchdog = setTimeout(() => {
      setPending((p) => (p === "google" ? null : p));
      setError(
        "Unlink request didn't finish in time. Refresh the page; if Google still shows as Connected, try again.",
      );
    }, 15000);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.unlinkIdentity(
        googleIdentity as Parameters<
          typeof supabase.auth.unlinkIdentity
        >[0],
      );
      if (err) throw err;
      // Re-run the security page server-side: the SSR re-reads the
      // user's identities and re-passes them as initialIdentities,
      // which the card consumes as its source of truth. No client
      // SDK refresh is in the critical path.
      router.refresh();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (/at least 1 identity|last identity|at_least_one_identity/i.test(raw)) {
        // Supabase refuses to remove the only sign-in path. Mark the
        // error so the UI can render a friendlier callout with a link
        // to the password card right above.
        setError("needs-password");
      } else {
        setError(raw || "Couldn't disconnect Google.");
      }
    } finally {
      clearTimeout(watchdog);
      setPending(null);
    }
  }

  function focusPasswordCard() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("change-password");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Brief gold attention pulse so the eye knows what just moved.
    el.animate(
      [
        { boxShadow: "0 0 0 0 rgba(212,175,55,0)" },
        { boxShadow: "0 0 0 6px rgba(212,175,55,0.28)" },
        { boxShadow: "0 0 0 0 rgba(212,175,55,0)" },
      ],
      { duration: 1100, easing: "ease-out" },
    );
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-body font-semibold text-paper mb-1">
        Connected accounts
      </h2>
      <p className="font-sans text-detail text-paper/60 mb-5 leading-[1.55]">
        Sign in faster by linking Google to your account. You can still
        sign in with email + password at any time.
      </p>
      <ul className="flex flex-col gap-3 max-w-[480px]">
        {/* Google, live */}
        <li className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3">
          <div className="min-w-0">
            <p className="font-sans text-detail font-medium text-paper">
              Google
            </p>
            <p className="font-sans text-caption text-paper/55">
              {googleIdentity ? "Connected" : "Not connected"}
            </p>
          </div>
          {googleIdentity ? (
            hasPassword ? (
              <button
                type="button"
                onClick={() => setConfirmingUnlink(true)}
                disabled={pending !== null}
                className="font-sans text-caption font-semibold rounded-pill border border-crimson/55 text-crimson-soft bg-crimson/[0.06] hover:bg-crimson/[0.15] hover:border-crimson/75 px-4 py-1.5 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {pending === "google" ? "Working…" : "Unlink"}
              </button>
            ) : (
              <button
                type="button"
                onClick={focusPasswordCard}
                className="font-sans text-caption font-medium rounded-pill border border-gold/45 text-gold bg-gold/[0.06] hover:bg-gold/[0.12] hover:border-gold/70 px-4 py-1.5 transition-colors"
              >
                Set a password first →
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={pending !== null}
              className="font-sans text-caption font-semibold rounded-pill bg-paper text-night px-4 py-1.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {pending === "google" ? "Opening…" : "Connect"}
            </button>
          )}
        </li>

        {/* Apple, coming soon */}
        <li className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3 opacity-70">
          <div className="min-w-0">
            <p className="font-sans text-detail font-medium text-paper">
              Apple
            </p>
            <p className="font-sans text-caption text-paper/55">
              {appleIdentity ? "Connected" : "Coming soon"}
            </p>
          </div>
          <span
            aria-disabled="true"
            title="Sign in with Apple is coming soon"
            className="font-sans text-caption font-medium text-paper/40 cursor-not-allowed"
          >
            Coming soon
          </span>
        </li>
      </ul>
      {/* Always-on explainer when the user has no password set, so a
          newcomer understands the disabled state BEFORE clicking. */}
      {googleIdentity && !hasPassword ? (
        <div className="mt-4 rounded-md border border-gold/30 bg-gold/[0.05] p-4">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold/85 mb-1.5">
            Why can&rsquo;t I unlink Google?
          </p>
          <p className="font-sans text-detail text-paper/80 leading-[1.6]">
            Google is the only way you can sign in to this account right
            now. If you unlinked it, you&rsquo;d be locked out the next
            time you sign out.
          </p>
          <p className="mt-2 font-sans text-detail text-paper/80 leading-[1.6]">
            Set a password in the{" "}
            <button
              type="button"
              onClick={focusPasswordCard}
              className="text-gold underline underline-offset-2 hover:text-gold/80 transition-colors"
            >
              Change password
            </button>{" "}
            card above first. Once you have email + password as a backup,
            you&rsquo;ll be able to unlink Google any time.
          </p>
        </div>
      ) : null}

      {error === "needs-password" ? (
        <div className="mt-4 rounded-md border border-gold/45 bg-gold/[0.08] p-4">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold/90 mb-1.5">
            One step before you can do that
          </p>
          <p className="font-sans text-ui text-paper/85 leading-[1.6]">
            We can&rsquo;t unlink Google yet. Right now, Google is the
            only way you can sign in to this account, removing
            it would lock you out.
          </p>
          <p className="mt-2 font-sans text-ui text-paper/85 leading-[1.6]">
            Set a password first so you have email + password as a
            backup. Then come back here and Unlink will work.
          </p>
          <button
            type="button"
            onClick={focusPasswordCard}
            className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-gold/55 bg-gold/15 text-gold font-sans text-detail font-semibold px-4 py-2 hover:bg-gold/25 hover:border-gold/80 transition-colors"
          >
            Set a password
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : error ? (
        <p className="mt-3 font-sans text-detail text-crimson-soft leading-[1.55]">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmingUnlink}
        title="Unlink Google?"
        description="You'll still be able to sign in with your email and password. You can reconnect Google at any time from this page."
        confirmLabel="Unlink Google"
        cancelLabel="Keep linked"
        destructive
        pending={pending === "google"}
        onCancel={() => setConfirmingUnlink(false)}
        onConfirm={() => {
          setConfirmingUnlink(false);
          disconnectGoogle();
        }}
      />
    </section>
  );
}
