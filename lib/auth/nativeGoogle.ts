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
// signInWithIdToken: no browser redirect, no PKCE, session lands in the same
// WebView.
//
// THE AUDIENCE DIFFERS BY PLATFORM, and this is the trap. On Android the plugin
// mints a token whose `aud` is the WEB client id. On iOS GoogleSignIn builds its
// GIDConfiguration from the iOS client id, so `aud` is the IOS client id.
// Supabase verifies `aud` against the client ids configured on its Google
// provider, so the iOS client id must be added to that provider's authorised
// list or every iPhone sign-in fails with "Unacceptable audience in id_token".
// That is a dashboard setting, not something this file can assert.
//
// Every @capgo import is dynamic so the native plugin never enters the web
// bundle (same guard pattern as NativeBridge / lib/push/native).

import { isNativeClient, nativePlatform } from "@/lib/platform/native";

const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
// Required on iOS by the plugin itself, and separately by Info.plist, which
// registers the reversed form of this id as the callback URL scheme.
const IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let initialized = false;

/** True only inside the native shell with the ids this platform needs.
 *
 * iOS needs both: the web id is still what Supabase is told about, and the iOS
 * id is what the native picker runs with. Without the iOS id the picker fails
 * at the plugin boundary, so the button is hidden rather than shown broken. */
export function nativeGoogleAvailable(): boolean {
  if (!isNativeClient() || !WEB_CLIENT_ID) return false;
  if (nativePlatform() === "ios") return !!IOS_CLIENT_ID;
  return true;
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  await SocialLogin.initialize({
    google: {
      webClientId: WEB_CLIENT_ID!,
      // Ignored on Android; required on iOS.
      ...(IOS_CLIENT_ID ? { iOSClientId: IOS_CLIENT_ID } : {}),
      mode: "online",
    },
  });
  initialized = true;
}

/**
 * Run the native Google account picker and return the Google ID token (a JWT)
 * for `supabase.auth.signInWithIdToken({ provider: "google", token })`.
 * Throws if no ID token comes back (e.g. the user cancelled).
 *
 * Errors are mapped so a configuration failure never masquerades as a user
 * cancel: Credential Manager surfaces a missing/mismatched Android OAuth
 * client (DEVELOPER_ERROR, error code 10 — the signing cert's SHA has no
 * OAuth client in the Google Cloud project) with cancel-like wording, which
 * is exactly the failure we shipped once. The raw plugin error is always
 * logged for adb/chrome-inspect diagnosis.
 */
export async function nativeGoogleIdToken(): Promise<{
  idToken: string;
  nonce: string;
}> {
  await ensureInit();
  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  // NONCE. Two forms of one value, and they are not interchangeable.
  //
  // Google is sent the SHA-256 HASH and embeds it in the id_token verbatim
  // (GoogleProvider.swift passes payload["nonce"] straight through, no
  // hashing). Supabase is sent the RAW value and hashes it itself before
  // comparing against the claim, which is Apple's convention applied to every
  // provider. So the hash goes out and the raw comes back, and both sides see
  // the same digest.
  //
  // Both wrong ways round were shipped and both were reported from a device:
  //   options: {}   -> the iOS SDK minted its own nonce, the token carried a
  //                    claim we could not know, and Supabase refused the pair:
  //                    "Passed nonce in id_token should either both exists or
  //                    not". (1.1 build 20)
  //   raw to both   -> Supabase hashed ours and compared it against Google's
  //                    unhashed claim: "Nonces mismatch".
  //
  // lib/auth/nativeApple.ts stays the opposite way round and sends no nonce at
  // all, because that flow assigns request.nonce verbatim and accepts absence.
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);

  let res: Awaited<ReturnType<typeof SocialLogin.login>>;
  try {
    res = await SocialLogin.login({
      provider: "google",
      options: { nonce: hashedNonce },
    });
  } catch (e) {
    const raw =
      e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
    console.error("[nativeGoogle] plugin login failed:", raw, e);
    // Android only. DEVELOPER_ERROR / code 10 is Credential Manager's way of
    // saying the signing cert's SHA has no OAuth client in the Cloud project.
    // iOS has no signing-certificate registration and no Credential Manager, so
    // matching this there would explain an iOS failure with an Android cause.
    if (
      nativePlatform() === "android" &&
      /(developer.?error|error.?code[^0-9]*10\b|api.?exception.*10)/i.test(raw)
    ) {
      throw new Error(
        "Google sign-in is misconfigured for this build (the app's signing certificate is not registered). Please report this; it is our fault, not yours.",
      );
    }
    if (/cancel/i.test(raw)) {
      throw new Error("Google sign-in was closed before finishing.");
    }
    throw new Error(`Google sign-in failed: ${raw}`);
  }
  const idToken = (res.result as { idToken?: string | null }).idToken;
  if (!idToken) {
    console.error("[nativeGoogle] login returned no idToken:", JSON.stringify(res));
    throw new Error("Google did not return an ID token. Please try again.");
  }
  return { idToken, nonce: rawNonce };
}

/**
 * Hex SHA-256, the form Google embeds and Supabase recomputes.
 *
 * `crypto.subtle` needs a secure context. The shells qualify (Capacitor marks
 * its scheme secure, and `crypto.randomUUID` above already works there, which
 * is the same gate), but a build that lost that would otherwise fail with an
 * unreadable TypeError deep in sign-in, so say what happened instead.
 */
async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Google sign-in needs WebCrypto, which this shell did not expose. Please report this; it is our fault, not yours.",
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
