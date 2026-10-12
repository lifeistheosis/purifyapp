"use client";

// Logs a prayer-rule open into the "Continue Praying" recents store on mount.
// Renders nothing. Mounted by the [planId] reader and the dedicated
// morning/evening reader pages so any opened rule resumes on the hub.

import { useEffect } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { recordPrayerOpened } from "@/lib/prayers/storage";

export function RecordPrayerOpened({
  id,
  title,
  titleKey,
  href,
}: {
  id: string;
  /** The rule's own title, for a rule that has one in its data. */
  title?: string;
  /**
   * A catalog key, for a title that is one of the app's own words. It is
   * looked up here, on the device, so what is remembered is in the reader's
   * language. A server page that looked it up and handed the string in
   * remembered English in the apps, whatever the phone was set to.
   */
  titleKey?: string;
  href: string;
}) {
  const { t } = useTranslate();
  const name = titleKey ? t(titleKey) : (title ?? "");
  useEffect(() => {
    if (!name) return;
    recordPrayerOpened({ id, title: name, href });
  }, [id, name, href]);
  return null;
}
