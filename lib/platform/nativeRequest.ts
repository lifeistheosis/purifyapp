// Server half of native-shell detection (see lib/platform/native.ts for
// the client half and the rationale). Reads the "PurifyNative" UA token
// the Capacitor shell appends to every request.
//
// Calling this opts the route into dynamic rendering (it reads request
// headers). Use it only on pages that must differ in the store builds,
// e.g. /support, never in shared layout chrome.

import { headers } from "next/headers";

import { NATIVE_UA_TOKEN } from "./token";

export async function isNativeRequest(): Promise<boolean> {
  // Android static export has no request headers; reading them would force the
  // page dynamic and break output:export. The exported HTML is the (web) shell
  // and the client flips to the native shell after hydration via useIsNative()
  // — exactly as on the production server today. The website is unaffected.
  if (process.env.BUILD_TARGET === "android") return false;
  const h = await headers();
  return (h.get("user-agent") ?? "").includes(NATIVE_UA_TOKEN);
}
