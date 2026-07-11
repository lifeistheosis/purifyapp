"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RequestIconForm } from "@/components/shop/RequestIconForm";
import { createClient } from "@/lib/supabase/client";

/**
 * Client island for the Request an Icon form: resolves the signed-in state and
 * the ?subject / ?notify prefill at runtime so the page works in the native
 * local-first export (no server session or query at build time).
 */
export function RequestFormIsland() {
  const params = useSearchParams();
  const subject = params.get("subject") ?? "";
  const notify = params.get("notify") === "1";
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.user));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RequestIconForm
      signedIn={signedIn}
      defaultSubject={subject}
      defaultNotify={notify}
    />
  );
}
