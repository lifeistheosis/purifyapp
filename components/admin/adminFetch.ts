"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Reading and writing from an admin tab.
 *
 * Extracted from MarketplaceTab rather than copied into the next tab. Every
 * admin surface having its own private fetch helper is exactly how this
 * codebase ended up with seven panels that stored a `{ error: "Forbidden" }`
 * body as if it were data and then threw on the first nested read, which is
 * what lib/admin/__tests__/fetchGuards.test.ts now exists to prevent. One
 * implementation cannot drift from itself.
 *
 * THE RESPONSE IS CHECKED BEFORE THE BODY IS READ, in both functions. Every
 * route under /api/admin answers a failure with JSON, so an expired session
 * parses perfectly cleanly and looks like a payload.
 */

export function useAdminFetch<T>(url: string): {
  data: T | null;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          setError("Couldn't load (are the migrations applied?).");
          return;
        }
        setData((await r.json()) as T);
        setError(null);
      } catch {
        if (alive) setError("Couldn't load.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [url, version]);

  return { data, error, reload };
}

/** Returns null on success, or the server's message. */
export async function patchJson(
  url: string,
  body: unknown,
  method: "PATCH" | "POST" = "PATCH",
): Promise<string | null> {
  try {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) return null;
    const data = (await r.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? "Update failed.";
  } catch {
    return "Update failed.";
  }
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
