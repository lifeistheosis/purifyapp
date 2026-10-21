"use client";

import { usePathname } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";

/**
 * The phone's bar over each account screen: the screen's own name, and a way
 * back to the row that opened it.
 *
 * Until 1.6 every one of these screens wore the same bar, the word "You" and
 * no way back, over a strip that said "Your account" and a row of four tabs.
 * A reader two taps into Security was told they were on You, then on Your
 * account, then on Security. From 1.6 each screen is a row of the one
 * Settings (components/settings/SettingsClient.tsx), so on a phone it is
 * named for what it holds and goes back to Settings. The tabs stay on the
 * desktop dashboard, which has no Settings row to come from.
 *
 * Profile has two ways in from 1.8: its row in Settings, and the reader's own
 * name at the top of the You tab. So its way back is the way the reader came
 * (lib/nav/goBack.ts), with Settings, its row, as the floor for a reader who
 * came from neither. The rest are reached from one row each and go back to it.
 *
 * Longest path first: /account/profile/edit is a screen of its own under
 * /account/profile, and Sessions is reached from Security.
 */
const SCREENS: readonly { path: string; titleKey?: string; title?: string; back: string; came?: true }[] = [
  { path: "/account/profile/edit", titleKey: "profile.accountLinkTitle", back: "/account/profile" },
  { path: "/account/profile", titleKey: "account.tabs.profile", back: "/settings", came: true },
  { path: "/account/security", titleKey: "account.tabs.security", back: "/settings" },
  { path: "/account/notifications", titleKey: "settings.notifications", back: "/settings" },
  { path: "/account/data", titleKey: "account.tabs.data", back: "/settings" },
  { path: "/account/sessions", titleKey: "account.tabs.sessions", back: "/account/security" },
  // A product name, untranslated, as the tab was. Its row is on the You tab.
  { path: "/account/eikon-box", title: "EIKON Box", back: "/account" },
];

export function accountScreenFor(pathname: string) {
  const at = pathname.replace(/\/+$/, "");
  return SCREENS.find((s) => at === s.path || at.startsWith(`${s.path}/`)) ?? null;
}

export function AccountTopBar() {
  const screen = accountScreenFor(usePathname() ?? "");
  if (!screen) return <MobileTopBar titleKey="settings.account" back backFallback="/settings" />;
  if (screen.came) return <MobileTopBar title={screen.title} titleKey={screen.titleKey} back backFallback={screen.back} />;
  return <MobileTopBar title={screen.title} titleKey={screen.titleKey} back={screen.back} />;
}
