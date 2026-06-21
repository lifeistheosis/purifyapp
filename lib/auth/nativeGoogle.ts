// Native Google sign-in for the Capacitor shell.
//
// On the web, Supabase OAuth works by redirecting the browser to Google and
// back to /api/auth/callback, where the PKCE verifier (a cookie on the
// initiating origin) is exchanged for a session. That breaks in the native
// app: Google opens in a separate Custom Tab whose cookie jar isn't the app
// WebView's, so the verifier is never found ("PKCE code verifier not found
// in storage").
//
// Instead we use the native account picker (@capgo/capacitor-social-login) to
// obtain a Google ID token directly, then hand it to Supabase via
// signInWithIdToken — no browser redirect, no PKCE, session lands in the same
// WebView. The Web client ID is the audience Supabase verifies against, so it
// must match the client ID configured on the Supabase Google provider.
//
// Every @capgo import is dynamic so the native plugin never enters the web
// bundle (same guard pattern as NativeBridge / lib/push/native).

import { isNativeClient } from "@/lib/platform/native";

const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let initialized = false;

/** True only inside the native shell with a Web client ID configured. */
export function nativeGoogleAvailable(): boolean {
  return isNativeClient() && !!WEB_CLIENT_ID;
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  await SocialLogin.initialize({
    google: { webClientId: WEB_CLIENT_ID!, mode: "online" },
  });
  initialized = true;
}

/**
 * Run the native Google account picker and return the Google ID token (a JWT)
 * for `supabase.auth.signInWithIdToken({ provider: "google", token })`.
 * Throws if no ID token comes back (e.g. the user cancelled).
 */
export async function nativeGoogleIdToken(): Promise<string> {
  await ensureInit();
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  const res = await SocialLogin.login({ provider: "google", options: {} });
  const idToken = (res.result as { idToken?: string | null }).idToken;
  if (!idToken) throw new Error("Google did not return an ID token.");
  return idToken;
}
