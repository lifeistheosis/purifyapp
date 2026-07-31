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
      label: "Notifications",
      href: "/account/data",
      hint: "Prayer reminders, off by default",
      icon: <Glyph kind="bell" />,
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
function Glyph({
  kind,
}: {
  kind:
    | "halo"
    | "bell"
    | "lock"
    | "heart"
    | "bolt"
    | "cross"
    | "signout"
    | "sparkle"
    | "box";
}) {
  const props = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "halo":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "box":
      return (
        <svg {...props}>
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v10" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
        </svg>
      );
    case "cross":
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
        </svg>
      );
    case "signout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M12 3c.4 4.5 2.5 6.6 7 7-4.5.4-6.6 2.5-7 7-.4-4.5-2.5-6.6-7-7 4.5-.4 6.6-2.5 7-7z" />
        </svg>
      );
  }
}
