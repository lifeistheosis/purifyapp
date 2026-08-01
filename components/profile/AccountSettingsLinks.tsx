"use client";

// Desktop settings-list for the signed-in account dashboard.
//
// Surfaces the same quick links the mobile "You" surface carries in its
// SettingsList (Diptychs, Notifications, Privacy, Support, What's new,
// About, Sign out), so the desktop dashboard reads as the same family.
// "Account & security" is omitted here because the dashboard this renders
// on *is* that destination; Security / Data / Sessions live in the tab bar.

import { useEffect, useState } from "react";
import { SettingsList, type SettingsItem } from "@/components/mobile/SettingsList";
import { SettingsGlyph as Glyph } from "@/components/mobile/SettingsGlyph";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { readIntentions } from "@/lib/prayers/storage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";

export function AccountSettingsLinks() {
  const { t } = useTranslate();
  const [intentions, setIntentions] = useState(0);
  const tier = usePremiumTier();

  useEffect(() => {
    function recompute() {
      setIntentions(
        readIntentions("living").length + readIntentions("departed").length,
      );
    }
    recompute();
    window.addEventListener("purify:intentions", recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener("purify:intentions", recompute);
      window.removeEventListener("storage", recompute);
    };
  }, []);

  const items: SettingsItem[] = [
    {
      label: "Purify Plus",
      href: "/pricing",
      hint: "Cross-device sync, notes & highlights, collections",
      icon: <Glyph kind="sparkle" />,
    },
    // Mirrors the mobile "You" list: the Pro perk sits directly under the
    // tier it belongs to, and is hidden entirely for everyone else.
    ...(eikonBoxEnabled() && tier === "pro"
      ? [
          {
            label: "Claim your EIKON Box",
            href: "/account/eikon-box",
            hint: "This month's box, and where it ships",
            icon: <Glyph kind="box" />,
          } satisfies SettingsItem,
        ]
      : []),
    {
      label: "Diptychs",
      href: "/prayers/personal",
      hint:
        intentions === 0
          ? "The names you carry, living and reposed"
          : `${intentions} names you carry`,
      icon: <Glyph kind="halo" />,
    },
    ...(campaignsEnabled()
      ? [
          {
            label: "My prayers",
            href: "/campaigns/mine",
            hint: "Campaigns you pray with the community",
            icon: <Glyph kind="halo" />,
          } satisfies SettingsItem,
        ]
      : []),
    {
      label: "Export your library",
      href: "/account/export",
      hint: "Download everything you have gathered",
      icon: <Glyph kind="bolt" />,
    },
    {
      label: "Settings",
      href: "/settings",
      hint: "Reading, the calendar, language, notifications",
      icon: <Glyph kind="bolt" />,
    },
    {
      label: "Privacy",
      href: "/privacy",
      hint: "What we record and what we don't",
      icon: <Glyph kind="lock" />,
    },
    {
      label: "Support",
      href: "/support",
      hint: "Help keep the work going",
      icon: <Glyph kind="heart" />,
    },
    {
      label: "What's new",
      href: "/whats-new",
      hint: "Release notes",
      icon: <Glyph kind="bolt" />,
    },
    {
      label: "About",
      href: "/about",
      hint: "What Purify is, and why",
      icon: <Glyph kind="cross" />,
    },
    {
      label: "Sign out",
      href: "/signout",
      destructive: true,
      icon: <Glyph kind="signout" />,
    },
  ];

  return (
    <section className="mt-8">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        {t("nav.account")}
      </p>
      <SettingsList items={items} />
    </section>
  );
}

// Inline icon set shared in spirit with YouMobile's Glyph, so the desktop
// rows carry the same left-affordance as their mobile counterparts.
