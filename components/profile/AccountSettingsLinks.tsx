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
  const { t, tn } = useTranslate();
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
      hint: t("ui.crossDeviceSyncNotesHighlights"),
      icon: <Glyph kind="sparkle" />,
    },
    // Mirrors the mobile "You" list: the Pro perk sits directly under the
    // tier it belongs to, and is hidden entirely for everyone else.
    ...(eikonBoxEnabled() && tier === "pro"
      ? [
          {
            label: t("ui.claimYourEikonBox"),
            href: "/account/eikon-box",
            hint: t("ui.thisMonthsBoxAndWhere"),
            icon: <Glyph kind="box" />,
          } satisfies SettingsItem,
        ]
      : []),
    {
      label: t("prayers.personal"),
      href: "/prayers/personal",
      hint:
        intentions === 0
          ? t("ui.theNamesYouCarryLiving")
          : tn("prayers.intentionCount", intentions),
      icon: <Glyph kind="halo" />,
    },
    ...(campaignsEnabled()
      ? [
          {
            label: t("shop.myPrayers"),
            href: "/campaigns/mine",
            hint: t("ui.campaignsYouPrayWithThe"),
            icon: <Glyph kind="halo" />,
          } satisfies SettingsItem,
        ]
      : []),
    {
      label: t("settings.export"),
      href: "/account/export",
      hint: t("settings.exportHint"),
      icon: <Glyph kind="bolt" />,
    },
    {
      label: t("settings.title"),
      href: "/settings",
      hint: t("ui.readingTheCalendarLanguage"),
      icon: <Glyph kind="bolt" />,
    },
    {
      label: t("footer.privacy"),
      href: "/privacy",
      hint: t("ui.whatWeRecordAndWhat"),
      icon: <Glyph kind="lock" />,
    },
    {
      label: t("nav.support"),
      href: "/support",
      hint: t("ui.helpKeepTheWorkGoing"),
      icon: <Glyph kind="heart" />,
    },
    {
      label: t("nav.whatsNew"),
      href: "/whats-new",
      hint: t("whatsnew.releaseNotes"),
      icon: <Glyph kind="bolt" />,
    },
    {
      label: t("nav.about"),
      href: "/about",
      hint: t("ui.whatPurifyIsAndWhy"),
      icon: <Glyph kind="cross" />,
    },
    {
      label: t("common.signOut"),
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
