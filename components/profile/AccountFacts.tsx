"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { dateLocale, deviceDateLocale } from "@/lib/i18n/deviceDates";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

/**
 * The account's facts: the address a reader signs in with, since when, when
 * they last signed in, and the plan.
 *
 * They stood on the face of Profile until 1.9, the address large under the
 * reader's name, on a screen people photograph and share (build 98 note 11;
 * the owner, 2026-11-15, with his own address in the photo). Profile is who
 * the reader is now; these are the account's, and are listed with the
 * account: at the top of Security, the screen Profile's last row opens, over
 * the cards that change the password and the address.
 *
 * Read from the session the device holds (lib/supabase/localSession.ts): no
 * request, so it cannot hang, and it is there with the screen.
 */

/** "2 hours ago", "yesterday", or the date, in the reader's own language. */
function relativeTime(iso: string, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  try {
    const rtf = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto" });
    if (minutes < 1) return rtf.format(0, "minute");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    if (days < 7) return rtf.format(-days, "day");
  } catch {
    /* the date, below */
  }
  // A date, as the profile writes dates: the device's own way (lib/i18n/deviceDates).
  return new Date(iso).toLocaleDateString(deviceDateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountFacts({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  const tier = usePremiumTier();
  const [who, setWho] = useState<{ email: string; joinedAt: string; lastSignedInAt: string } | null>(null);

  useEffect(() => {
    const user = readLocalSessionUser();
    if (!user) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
       session lives in the device's own storage, read after mount. */
    setWho({ email: user.email ?? "", joinedAt: user.created_at ?? "", lastSignedInAt: user.last_sign_in_at ?? "" });
  }, []);

  if (!who) return null;

  const memberSince = who.joinedAt
    ? new Date(who.joinedAt).toLocaleDateString(deviceDateLocale(), {
        month: "long",
        year: "numeric",
      })
    : "";
  const lastSeen = who.lastSignedInAt ? relativeTime(who.lastSignedInAt, locale) : "";
  // A plan is named only when there is one: the free reader's screen does
  // not say "Free" at them. Product names, as the Premium pill says them.
  const plan = tier === "plus" ? t("profile.badge.plus") : tier === "pro" ? t("profile.badge.pro") : "";
  const facts: [label: string, value: string, whole?: boolean][] = [
    // The whole address, wrapped and never cut: a reader checking WHICH
    // account they are signed into needs all of it.
    ...(who.email ? ([[t("common.email"), who.email, true]] as [string, string, boolean][]) : []),
    ...(memberSince ? ([[t("profile.memberSince"), memberSince]] as [string, string][]) : []),
    ...(lastSeen ? ([[t("ui.lastSignedIn"), lastSeen]] as [string, string][]) : []),
    ...(plan ? ([[t("ui.plan"), plan]] as [string, string][]) : []),
  ];
  if (facts.length === 0) return null;

  return (
    <dl data-account-facts="" className={`${INDEX_LIST_LOOK}${className ? ` ${className}` : ""}`}>
      {facts.map(([label, value, whole], i) => (
        <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3.5${i ? " border-t border-paper/[0.06]" : ""}`}>
          <dt className="shrink-0 font-sans text-ui text-paper/70">{label}</dt>
          <dd className={`min-w-0 text-end font-sans text-ui text-paper${whole ? " break-all" : ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
