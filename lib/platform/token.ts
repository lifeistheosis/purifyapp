// Shared between the client half (native.ts, "use client") and the
// server half (nativeRequest.ts) of native-shell detection. Lives in its
// own directive-free module because importing a value out of a
// "use client" file from server code yields a client-reference proxy,
// not the value — string comparisons against it silently fail.
//
// Must match ios.appendUserAgent / android.appendUserAgent in
// capacitor.config.ts.
export const NATIVE_UA_TOKEN = "PurifyNative";
