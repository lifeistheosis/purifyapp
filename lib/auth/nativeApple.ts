// Native Sign in with Apple for the iOS shell.
//
// Mirrors lib/auth/nativeGoogle.ts and exists for the same reason: the web
// redirect flow stores its PKCE verifier in a cookie on the initiating origin,
// and in the app the provider opens in a separate cookie jar, so the verifier is
// never found. The native sheet returns an Apple ID token we hand straight to
// `supabase.auth.signInWithIdToken`, so no redirect happens at all.
//
// Purify offers this because App Store review guideline 4.8 requires an
// equivalent private login wherever a third-party social login is offered, and
// Purify offers Google. It also retires the permanently disabled
// "Apple · Coming soon" button, which is its own 2.1 "app is incomplete" risk.
//
// iOS ONLY, deliberately. Apple's native sheet exists only on Apple platforms,
// and the web fallback on Android would hit exactly the cross-jar PKCE failure
// described above. OAuthButtons therefore offers Apple on iOS and on the web,
// and hides it in the Android app rather than shipping a button that cannot work.
//
// AUDIENCE. A native Apple ID token carries `aud` = the app's BUNDLE ID, while
// the web flow carries `aud` = the Services ID. Supabase verifies against the
// client ids on its Apple provider, so BOTH must be listed there or one of the
// two surfaces fails. That is a dashboard setting this file cannot assert.
//
// NONCE. Deliberately not sent. The plugin assigns `request.nonce` verbatim and
// Apple copies it into the token unhashed, whereas Supabase expects the SHA-256
// digest to go to Apple and the raw value to come here. Getting that pair the
// wrong way round produces a nonce mismatch that looks like a token error, and
// omitting the nonce entirely is accepted: the token simply carries no nonce
// claim. Hashed-nonce hardening is worth doing, but not in the release that
// first has to prove the flow works at all.

import { isNativeClient, nativePlatform } from "@/lib/platform/native";

let initialized = false;

/** True only inside the iOS shell, where Apple's native sheet exists. */
export function nativeAppleAvailable(): boolean {
  return isNativeClient() && nativePlatform() === "ios";
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  // redirectUrl is for the web/Android half of the plugin's Apple support,
  // which we never use; the native sheet needs no callback URL.
  await SocialLogin.initialize({ apple: {} });
  initialized = true;
}

/**
 * Present Apple's native sign-in sheet and return the Apple ID token (a JWT)
 * for `supabase.auth.signInWithIdToken({ provider: "apple", token })`.
 * Throws if no token comes back, including when the reader cancels.
 *
 * Note on what Apple returns: the reader's name arrives ONLY on the very first
 * authorisation for this app, and never again, even after a reinstall. Purify
 * does not depend on it (the profile is named in-app), which is the only reason
 * that is survivable. Do not add a dependency on it later without storing it on
 * that first pass.
 */
export async function nativeAppleIdToken(): Promise<string> {
  await ensureInit();
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  let res: Awaited<ReturnType<typeof SocialLogin.login>>;
  try {
    res = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["name", "email"] },
    });
  } catch (e) {
    const raw =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : JSON.stringify(e);
    console.error("[nativeApple] plugin login failed:", raw, e);
    // 1001 is ASAuthorizationError.canceled, which is a normal user action and
    // must not be reported as a fault.
    if (/cancel|1001/i.test(raw)) {
      throw new Error("Sign in with Apple was closed before finishing.");
    }
    throw new Error(`Sign in with Apple failed: ${raw}`);
  }
  const idToken = (res.result as { idToken?: string | null }).idToken;
  if (!idToken) {
    console.error("[nativeApple] login returned no idToken:", JSON.stringify(res));
    throw new Error("Apple did not return an ID token. Please try again.");
  }
  return idToken;
}
