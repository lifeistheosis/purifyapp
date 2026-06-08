"use client";

// Keeps the calendar's "today" on the reader's LOCAL date. The page renders
// server-side from the server's UTC clock, which can be a day ahead/behind the
// visitor. On mount this reads the browser's local date and, if it differs from
// what the server rendered, replaces the URL with ?today=YYYY-MM-DD so the page
// re-renders with the correct day highlighted and panelled. No-ops when they
// already match (most visitors), so there's no redirect loop or flash.

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function localDateIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LocalTodaySync({ serverToday }: { serverToday: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const local = localDateIso();
    if (local === serverToday) return; // already correct
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("today") === local) return; // already requested
    params.set("today", local);
    router.replace(`${pathname}?${params.toString()}`);
  }, [serverToday, searchParams, pathname, router]);

  return null;
}
