"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nativeGoogleAvailable, nativeGoogleIdToken } from "@/lib/auth/nativeGoogle";
import { nativeAppleAvailable, nativeAppleIdToken } from "@/lib/auth/nativeApple";
import { recordNativeSignInAcceptance } from "@/lib/legal/recordAcceptance";
import { useIsNative, nativePlatform } from "@/lib/platform/native";

/**
 * Continue-with-Google and Sign-in-with-Apple buttons. Used by both
 * SignInForm and SignUpForm (the OAuth flow doesn't distinguish).
 *
 * Both providers take one of two routes depending on where they are running.
 * Inside the app, the native sheet returns an ID token that goes straight to
 * signInWithIdToken; on the web, the ordinary same-origin PKCE redirect. The
 * native route exists because a redirect opens in a cookie jar that is not the
 * WebView's, so the PKCE verifier is never found (see lib/auth/nativeGoogle).
 *
 * Apple is offered on iOS and on the web, and HIDDEN in the Android app. Apple
 * has no native sheet on Android, and the web fallback there hits exactly the
 * cross-jar PKCE failure above, so the only honest options were "hide it" or
 * "ship a button that cannot work". It is offered at all because App Store
 * guideline 4.8 requires an equivalent private login wherever a third-party
 * social login is offered, and Purify offers Google.
 *
 * It replaces a permanently disabled "Apple · Coming soon" button that had been
 * visible since launch, which was its own submission risk: a dead control in a
 * shipped binary is a routine 2.1 "app is incomplete" flag.
 *
 * APPLE IS GATED ON AN ENV FLAG, and defaults OFF. The button working depends
 * on a Supabase provider that this repo cannot see or configure, and shipping it
 * ungated on 2026-08-06 put a control on the live sign-in page that answered
 * every tap with "Unsupported provider": the provider was disabled and its
 * Client IDs field held an Apple ID email rather than a Services ID. Replacing
 * a button labelled "coming soon" with one that simply fails is not an
 * improvement, so the flag stays off until the provider is genuinely live.
 *
 * Turning it on is two steps and they must happen in this order:
 *   1. Supabase > Auth > Providers > Apple: Client IDs = the Services ID AND
 *      the bundle id net.purifyapp.purify, a valid secret key, enabled.
 *   2. NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=1 on Render (then REDEPLOY, since
 *      NEXT_PUBLIC_* is inlined at build time) and as a GitHub secret.
 *
 * The iOS release workflow REQUIRES the flag and fails without it, because an
 * iOS build that offers Google without Apple is a guideline 4.8 rejection. So
 * the gate cannot quietly ship a non-compliant binary; it can only delay one.
 */
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED === "1";
export function OAuthButtons({
  disabled = false,
  disabledHint,
  redirectTo = "/account/profile",
  showTermsNotice = true,
}: {
  /** Gate the providers behind a prior action, e.g. clickwrap consent on
   *  sign-up. Sign-in leaves this off. */
  disabled?: boolean;
  disabledHint?: string;
  /** Where to land after auth completes. Onboarding passes "/" so the user
   *  stays on Today instead of being bounced to the profile page. */
  redirectTo?: string;
  /**
   * Show the "by continuing you agree" line above the providers. Defaults ON
   * and lives HERE rather than at the call sites, because a notice that each
   * caller has to remember is a notice that gets forgotten: onboarding
   * rendered this component with no consent surface of any kind, so a reader
   * could create an account through Google having never been shown the Terms.
   *
   * Only pass false where a clickwrap checkbox already governs the button
   * (SignUpForm), so the same agreement is not asked for twice.
   */
  showTermsNotice?: boolean;
} = {}) {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isNative = useIsNative();
  const router = useRouter();

  // Apple has no native sheet on Android and no working web fallback inside the
  // app, so it is offered everywhere except the Android shell, and only once the
  // Supabase provider behind it is actually live.
  const showApple = APPLE_ENABLED && !(isNative && nativePlatform() === "android");

  async function go(provider: "google" | "apple") {
    if (disabled) return;
    setPending(provider);
    setError(null);
    try {
      const supabase = createClient();

      // Native app: skip the browser redirect entirely. The native sheet
      // returns an ID token we exchange in-place, so there's no Custom Tab and
      // no cross-jar PKCE failure (see lib/auth/nativeGoogle).
      const nativeAvailable =
        provider === "google" ? nativeGoogleAvailable() : nativeAppleAvailable();
      if (nativeAvailable) {
        const token =
          provider === "google"
            ? await nativeGoogleIdToken()
            : await nativeAppleIdToken();
        const { data, error: err } = await supabase.auth.signInWithIdToken({
          provider,
          token,
        });
        if (err) throw err;
        // The web records this in /api/auth/callback, which the native path
        // never reaches. Without this line every account created in the app
        // agrees to the Terms it was shown and leaves no trace of having done
        // so, which is the 572-account hole from P0-5b, still open on Android.
        // Best-effort and never throws: the account already exists by now, so
        // failing here must not strand someone who is signed in.
        //
        // NOT awaited before navigating, and that ordering is deliberate.
        // recordNativeSignInAcceptance goes through apiFetch, which mints a
        // bearer via getSession() behind the cross-tab lock and carries no
        // deadline. Awaiting it put an unbounded network call between a
        // completed sign-in and the navigation, so a slow radio left the
        // button on "Connecting..." forever for someone who was already
        // signed in. That is F-13's signature. It never throws, so nothing
        // downstream depends on its result.
        void recordNativeSignInAcceptance(data.user?.email ?? null);
        // router.push, NOT window.location.assign. Capacitor's iOS router
        // (Router.swift) returns `basePath + "/index.html"` for ANY path with
        // no file extension, discarding the path, so a hard navigation to
        // /account/profile served the ROOT index.html: the Today page. The
        // reader signed in successfully and was returned to Today, and the
        // reload discarded the session with it. Half of Apple's 2.1(a)
        // rejection of 1.0 build 12. A soft push keeps the in-memory session
        // and routes correctly, which is what SignInForm has always done.
        router.push(redirectTo);
        router.refresh();
        return;
      }

      // Inside the shell there is no second branch to fall to. The redirect
      // path below needs app/api/auth/callback, and scripts/native-build.mjs
      // stashes all of app/api out of the export, so on native it resolves to
      // a route that is not in the bundle. Before this guard, a missing
      // NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID at build time made
      // nativeGoogleAvailable() false and dropped the reader straight into
      // that dead redirect with no error shown. lib/auth/nativeGoogle.ts
      // claims the button is hidden in that case; it is not, only Apple is
      // gated. Fail loudly instead: a message beats a silent nowhere.
      if (isNative) {
        throw new Error(
          provider === "google"
            ? "Google sign-in is unavailable in this build. Use email and password."
            : "Apple sign-in is unavailable in this build. Use email and password.",
        );
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
        provider,
        options: {
          redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (err) throw err;
      // On success Supabase redirects the page; no state cleanup needed.
    } catch (e) {
      const label = provider === "google" ? "Google" : "Apple";
      setError(
        e instanceof Error ? e.message : `Couldn't start ${label} sign-in.`,
      );
      setPending(null);
    }
  }

  return (
    <div>
      {/* Directly above the button, not below it and not on another screen.
          Conspicuous notice adjacent to the action is what makes continuing
          count as agreeing; the same words placed underneath would not. */}
      {showTermsNotice ? (
        <p className="mb-3 font-sans text-caption leading-[1.5] text-paper/55">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="text-paper/80 underline decoration-paper/30 underline-offset-2 hover:decoration-paper/60"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-paper/80 underline decoration-paper/30 underline-offset-2 hover:decoration-paper/60"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}
      <div
        className={`grid grid-cols-1 gap-2 ${showApple ? "sm:grid-cols-2" : ""}`}
      >
        <button
          type="button"
          disabled={pending !== null || disabled}
          onClick={() => go("google")}
          title={disabled ? disabledHint : undefined}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-pill border border-paper/20 bg-paper/[0.04] hover:bg-paper/10 hover:border-paper/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans text-ui font-medium text-paper"
        >
          <GoogleGlyph />
          {pending === "google" ? "Connecting…" : "Continue with Google"}
        </button>
        {showApple ? (
          <button
            type="button"
            disabled={pending !== null || disabled}
            onClick={() => go("apple")}
            title={disabled ? disabledHint : undefined}
            className="inline-flex items-center justify-center gap-2 h-11 rounded-pill border border-paper/20 bg-paper/[0.04] hover:bg-paper/10 hover:border-paper/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans text-ui font-medium text-paper"
          >
            <AppleGlyph />
            {pending === "apple" ? "Connecting…" : "Continue with Apple"}
          </button>
        ) : null}
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
