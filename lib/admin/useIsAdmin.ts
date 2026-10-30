"use client";

// Whether the reader signed in here is an admin, as the server says
// (app/api/admin/whoami). Asked once per mount, and only when asked to: a
// signed-out reader is never an admin, so Settings asks only for a reader
// with an account. False until the server has said yes, and on any failure,
// so nothing an admin alone may see is ever drawn on a guess. The list of
// admins never leaves the server.

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";

export function useIsAdmin(ask: boolean): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!ask) return;
    let alive = true;
    apiFetch("/api/admin/whoami", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ admin?: unknown }>) : null))
      .then((body) => {
        if (alive && body?.admin === true) setAdmin(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ask]);
  return ask && admin;
}
