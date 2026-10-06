// Shared between the client half (native.ts, "use client") and the
// server half (nativeRequest.ts) of native-shell detection. Lives in its
// own directive-free module because importing a value out of a
// "use client" file from server code yields a client-reference proxy,
// not the value — string comparisons against it silently fail.
//
// Must match ios.appendUserAgent / android.appendUserAgent in
// capacitor.config.ts.
export const NATIVE_UA_TOKEN = "PurifyNative";

// The Windows app loads the live site in the system's own browser engine and
// its user agent says nothing about it (desktop/src-tauri/src/lib.rs builds
// the window with none of its own). So this is NOT in any user agent a
// request carries. The page knows it is inside the app (lib/desktop/bridge.ts)
// and says so with its first page view, and /api/track writes this word
// after the user agent it stores, so the one reading of that column
// (lib/analytics/platform.ts) can tell the app from the website.
export const DESKTOP_UA_TOKEN = "PurifyDesktop";
