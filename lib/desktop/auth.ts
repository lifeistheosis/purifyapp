// Where a Google or Apple sign-in started in the desktop app comes back to.
//
// The sign-in runs in the reader's own browser, because Google refuses
// embedded app windows; the browser then hands this purify:// link to the
// desktop app, which loads the site's /api/auth/callback in its window with
// the code. The PKCE verifier never leaves the window's cookies. The app
// accepts `next` only as a plain site path (desktop/src-tauri/src/auth.rs),
// so this sends nothing else.

export const DESKTOP_AUTH_CALLBACK = "purify://auth-callback";

export function desktopAuthRedirect(next: string): string {
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return `${DESKTOP_AUTH_CALLBACK}?next=${encodeURIComponent(safe)}`;
}
