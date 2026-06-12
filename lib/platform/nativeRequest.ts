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
  const h = await headers();
  return (h.get("user-agent") ?? "").includes(NATIVE_UA_TOKEN);
}
