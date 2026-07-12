"use client";

import type { User } from "@supabase/supabase-js";

/**
 * Read the signed-in user straight from the persisted Supabase session —
 * synchronously, with NO network request, NO token refresh, and NO auth lock.
 *
 * Why this exists (F-13): supabase-js's getUser() network-validates the token
 * and getSession() refreshes an expired one; both go through the cross-tab
 * auth lock. In the field those calls hang on a re-navigation / refresh and
 * strand pages on their loading state forever ("infinite loading on Profile /
 * Security after refresh"). But the session we need is already sitting in the
 * cookie: the server proxy (proxy.ts -> updateSession) validates and REFRESHES
 * that cookie on every request, so by the time a page renders the cookie holds
 * a current session. Reading it directly can never hang.
 *
 * Storage format (@supabase/ssr): the session lives under a cookie named
 * `sb-<ref>-auth-token`, possibly split into `…-auth-token.0`, `.1`, … chunks,
 * each value optionally prefixed `base64-` then base64url-encoded JSON. The
 * native shell may use localStorage under the same key. We scan both, so we
 * don't depend on the exact project ref.
 *
 * Best-effort: any parse failure returns null and the caller falls back to the
 * SDK. It is a fast, hang-proof PATH, not a replacement for auth security —
 * every data read stays RLS-enforced server-side.
 */
export function readLocalSessionUser(): User | null {
  if (typeof document === "undefined") return null;
  const raw = readRawSessionValue();
  if (!raw) return null;
  const session = parseSession(raw);
  const user = session?.user as { id?: unknown } | undefined;
  // A shape check: a real session carries a user with an id.
  return user && typeof user.id === "string" ? (user as unknown as User) : null;
}

/** Collect the (possibly chunked) auth-token value from cookies or localStorage. */
function readRawSessionValue(): string | null {
  // key -> { base: string | undefined, chunks: Map<index, value> }
  type Bucket = { base?: string; chunks: Map<number, string> };
  const buckets = new Map<string, Bucket>();

  const consider = (name: string, value: string) => {
    // Match sb-<ref>-auth-token with an optional .<n> chunk suffix.
    const m = name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
    if (!m) return;
    const key = m[1];
    const bucket = buckets.get(key) ?? { chunks: new Map<number, string>() };
    if (m[2] === undefined) bucket.base = value;
    else bucket.chunks.set(Number(m[2]), value);
    buckets.set(key, bucket);
  };

  // Cookies (web).
  for (const part of document.cookie ? document.cookie.split("; ") : []) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    const value = decodeURIComponent(part.slice(eq + 1));
    consider(name, value);
  }
  // localStorage (native shell / older web).
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (!name) continue;
      const value = localStorage.getItem(name);
      if (value != null) consider(name, value);
    }
  } catch {
    /* storage may be unavailable */
  }

  if (buckets.size === 0) return null;
  // Prefer the first bucket that yields a value; join chunks in index order.
  for (const bucket of buckets.values()) {
    if (bucket.chunks.size > 0) {
      const joined = [...bucket.chunks.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
        .join("");
      if (joined) return joined;
    }
    if (bucket.base) return bucket.base;
  }
  return null;
}

type StoredSession = { user?: unknown } | null;

function parseSession(raw: string): StoredSession {
  let json = raw;
  if (json.startsWith("base64-")) {
    const decoded = base64UrlDecode(json.slice("base64-".length));
    if (decoded == null) return null;
    json = decoded;
  }
  try {
    return JSON.parse(json) as StoredSession;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    // The JSON is UTF-8; decode bytes properly (session data is ASCII-safe in
    // practice, but display names can be multibyte).
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
