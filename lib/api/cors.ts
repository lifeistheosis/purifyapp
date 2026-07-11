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

/** Copy the appropriate CORS headers onto a response and return it. */
export function withCors<T extends NextResponse>(
  res: T,
  req: Request,
): T {
  const headers = headersFor(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
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
