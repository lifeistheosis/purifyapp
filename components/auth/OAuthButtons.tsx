"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";
import { nativeGoogleAvailable, nativeGoogleIdToken } from "@/lib/auth/nativeGoogle";

/**
 * Continue-with-Google and Continue-with-Apple buttons. Used by both
 * SignInForm and SignUpForm (the OAuth flow doesn't distinguish).
 *
 * Google is wired and live (configured in Supabase Dashboard).
 * Apple is intentionally disabled with a "Coming soon" label, the
 * provider config (Apple Developer account, Services ID, key) hasn't
 * been set up yet. The button is left visible so the layout
 * stays right and so anyone curious knows it's planned.
 */
export function OAuthButtons() {
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPendingGoogle(true);
    setError(null);
    try {
      const supabase = createClient();

      // Native app: skip the browser redirect entirely. The native account
      // picker returns a Google ID token we exchange in-place, so there's no
      // Custom Tab and no cross-jar PKCE failure (see lib/auth/nativeGoogle).
      if (nativeGoogleAvailable()) {
        const token = await nativeGoogleIdToken();
        const { error: err } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token,
        });
        if (err) throw err;
        window.location.assign("/account/profile");
        return;
      }

      const origin = authOrigin();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?next=/account/profile`,
        },
      });
      if (err) throw err;
      // On success Supabase redirects the page; no state cleanup needed.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't start Google sign-in.",
      );
      setPendingGoogle(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pendingGoogle}
          onClick={go}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-pill border border-paper/20 bg-paper/[0.04] hover:bg-paper/10 hover:border-paper/35 disabled:opacity-50 disabled:cursor-wait transition-colors font-sans text-ui font-medium text-paper"
        >
          <GoogleGlyph />
          {pendingGoogle ? "Connecting…" : "Continue with Google"}
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Sign in with Apple is coming soon"
          className="inline-flex items-center justify-center gap-2 h-11 rounded-pill border border-paper/15 bg-paper/[0.02] cursor-not-allowed font-sans text-ui font-medium text-paper/45"
        >
          <AppleGlyph />
          Apple · Coming soon
        </button>
      </div>
      {error ? (
        <p className="mt-3 font-sans text-caption text-crimson-soft leading-[1.5]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8H6.4l-6.6 5C3.3 39.6 13 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      aria-hidden
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M9.5 0c.1.9-.3 1.8-.9 2.5-.6.7-1.6 1.2-2.4 1.1-.1-.9.4-1.8.9-2.4C7.7.6 8.7.1 9.5 0zM12.5 11.7c-.4 1-.6 1.4-1.1 2.3-.7 1.2-1.7 2.6-2.9 2.6-1.1 0-1.4-.7-2.9-.7-1.5 0-1.8.7-2.9.7-1.2 0-2.2-1.3-2.9-2.5C-.6 11.5-.8 7.5 1.1 5.4c.9-1 2.2-1.6 3.4-1.6 1.2 0 2 .7 3 .7s1.7-.7 3.1-.7c1 0 2.1.6 2.9 1.6-2.5 1.4-2 4.9-.9 6.3z" />
    </svg>
  );
}
