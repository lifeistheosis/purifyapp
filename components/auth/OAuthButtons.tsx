"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
export function OAuthButtons({
  disabled = false,
  disabledHint,
  redirectTo = "/account/profile",
}: {
  /** Gate the providers behind a prior action, e.g. clickwrap consent on
   *  sign-up. Sign-in leaves this off. */
  disabled?: boolean;
  disabledHint?: string;
  /** Where to land after auth completes. Onboarding passes "/" so the user
   *  stays on Today instead of being bounced to the profile page. */
  redirectTo?: string;
} = {}) {
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (disabled) return;
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
        window.location.assign(redirectTo);
        return;
      }

      // PKCE stores a one-time code verifier in a cookie on the origin that
      // STARTS the flow, and the callback must run on that same origin to read
      // it back. So the redirect target is the current origin, not the
      // canonical authOrigin()/SITE_URL: a reader on purifyapp.net whose flow
      // came back to purifyapp.onrender.com would land in a different cookie
      // jar with no verifier ("PKCE code verifier not found in storage"). Both
      // origins are allow-listed in the Supabase redirect URLs. (Localhost dev
      // is already the current origin too, so this stays self-contained there.)
      const origin = window.location.origin;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
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
          disabled={pendingGoogle || disabled}
          onClick={go}
          title={disabled ? disabledHint : undefined}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-pill border border-paper/20 bg-paper/[0.04] hover:bg-paper/10 hover:border-paper/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans text-ui font-medium text-paper"
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
      {disabled && disabledHint ? (
        <p className="mt-2 font-sans text-caption leading-[1.5] text-paper/50">
          {disabledHint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 font-sans text-caption text-crimson-soft leading-[1.5]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The official Google "G" (the geometry Google's own sign-in buttons use;
 *  required branding for a Google sign-in control). Crisp at 18px. */
function GoogleGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

/** Apple mark for the sign-in control (glyph from Bootstrap Icons, MIT). */
function AppleGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
      fill="currentColor"
      className="shrink-0 -mt-0.5"
    >
      <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z" />
    </svg>
  );
}
