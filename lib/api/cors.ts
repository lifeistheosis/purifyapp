// CORS for the live API routes the native shell calls cross-origin.
//
// The Android local-first app runs at https://localhost and the iOS Capacitor
// shell at capacitor://localhost; both call the deployed API at purifyapp.net.
// Browsers (and WebViews) enforce CORS on those cross-origin requests, so the
// routes must echo an allow-listed Origin back. Authentication rides on a
// Bearer token, never cookies, so we deliberately do NOT allow credentials and
// never widen Allow-Origin to "*".
//
// Web (same-origin) calls send no Origin we recognise here and get only a
// `Vary: Origin`, which is correct: they never needed CORS in the first place.

import { NextResponse } from "next/server";

// The only origins permitted to call the API from another origin: the native
// shells. Keep this tight; every entry is a WebView we ship, not a website.
const ALLOWED_ORIGINS = new Set([
  "https://localhost", // Android local-first (capacitor androidScheme: "https")
  "capacitor://localhost", // iOS Capacitor default scheme
  "ionic://localhost", // older iOS shells
]);

/**
 * True when the request comes from one of the WebViews we ship. Routes that
 * apply their own cross-origin defences (e.g. the Sec-Fetch-Site bot guard on
 * /api/track) use this to make an exception for the native shells without
 * widening the guard for the open web.
 */
export function isAllowedNativeOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

function headersFor(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}

/**
 * Copy the appropriate CORS headers onto a response and return it.
 *
 * `Vary` is merged rather than overwritten. It used to be `set`, which
 * silently discarded whatever the handler had already declared: a route that
 * varies its body by `Authorization` (any personalised feed) had that
 * stripped and was left claiming it varied only by `Origin`. A shared cache
 * is then free to serve one reader's view to the next, which is how a block
 * or a private group thread starts looking broken.
 */
export function withCors<T extends NextResponse>(
  res: T,
  req: Request,
): T {
  const headers = headersFor(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) {
    if (k !== "Vary") {
      res.headers.set(k, v);
      continue;
    }
    res.headers.set("Vary", mergeVary(res.headers.get("Vary"), v));
  }
  return res;
}

/** Union of two Vary header values, order-stable and case-insensitive. */
function mergeVary(existing: string | null, incoming: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of `${existing ?? ""},${incoming}`.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out.join(", ");
}

/**
 * Preflight answer for authenticated routes. A JSON body + Authorization header
 * makes writes "non-simple", so browsers send an OPTIONS preflight first; export
 * an `OPTIONS = corsPreflight` from each such route.
 */
export function corsPreflight(req: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: headersFor(req.headers.get("origin")),
  });
}

/**
 * Wrap a route handler so its response always carries the CORS headers. Use for
 * the authenticated write routes the native shell calls: rename the existing
 * handler to a plain function and `export const POST = corsRoute(handler)`.
 */
export function corsRoute(
  handler: (req: Request) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req) => withCors(await handler(req), req);
}
