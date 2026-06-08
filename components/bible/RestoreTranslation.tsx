"use client";

// Restores the reader's saved translation when a chapter is opened without an
// explicit ?v= (a fresh visit, or a navigation path that didn't carry it).
// Licensed translations are New Testament only, so this no-ops on the OT.
// Renders nothing.

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readTranslationPref } from "@/lib/bible/translationPref";

export function RestoreTranslation({ testament }: { testament: "OT" | "NT" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (testament !== "NT") return;
    if (searchParams.get("v")) return; // already explicit
    const pref = readTranslationPref();
    if (!pref) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", pref);
    router.replace(`${pathname}?${params.toString()}`);
  }, [testament, searchParams, pathname, router]);

  return null;
}
