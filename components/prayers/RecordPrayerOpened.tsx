"use client";

// Logs a prayer-rule open into the "Continue Praying" recents store on mount.
// Renders nothing. Mounted by the [planId] reader and the dedicated
// morning/evening reader pages so any opened rule resumes on the hub.

import { useEffect } from "react";
import { recordPrayerOpened } from "@/lib/prayers/storage";

export function RecordPrayerOpened({
  id,
  title,
  href,
}: {
  id: string;
  title: string;
  href: string;
}) {
  useEffect(() => {
    recordPrayerOpened({ id, title, href });
  }, [id, title, href]);
  return null;
}
