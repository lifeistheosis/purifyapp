// Client-side fetch for Purify's live API routes, aware of the native shell.
//
// The local-first Android app is served from https://localhost and bundles the
// static export with app/api stashed OUT (route handlers can't be exported).
// So a relative `/api/...` fetch inside the app hits localhost, where nothing
// answers. The shop, community/messaging, requests, and checkout are the LIVE
// sections: they must reach the deployed API at SITE_URL (purifyapp.net).
//
// Cross-origin means cookies don't travel, so on native we attach the user's
// Supabase access token as a Bearer header; the route authenticates from it
// (lib/supabase/server → createClientFromRequest). On the web the path stays
// relative and same-origin, so the existing cookie session is used unchanged.

import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

/**
 * fetch() wrapper for calling Purify's own API routes from client code.
 * Pass a root-relative path (e.g. "/api/shop/checkout"); on the web it is used
 * as-is (same-origin cookies), inside the native shell it is rewritten to
 * `${SITE_URL}${path}` and carries an Authorization: Bearer header.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const native = isNativeClient();
  const url = native && path.startsWith("/") ? `${SITE_URL}${path}` : path;

  const headers = new Headers(init.headers);
  if (native) {
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
    } catch {
      // No session (signed out): send the request unauthenticated and let the
      // route answer 401 as it would on the web.
    }
  }

  return fetch(url, { ...init, headers });
}
