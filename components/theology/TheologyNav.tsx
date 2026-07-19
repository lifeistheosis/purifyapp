"use client";

// The shared mode switcher for the Theology study system. One compact,
// horizontally-scrollable row of segmented links, Doctrine · Topics ·
// Heresies · Apologetics, present on every index and article so the four
// modes read as one connected surface, not four archives. Active mode is
// derived from the path (doctrine covers both /theology/doctrine and the
// /theology/[topic] articles).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const MODES = [
  { key: "doctrine", label: "Doctrine", href: "/theology/doctrine" },
  { key: "topics", label: "Topics", href: "/topics" },
  { key: "heresies", label: "Heresies", href: "/heresies" },
  { key: "apologetics", label: "Apologetics", href: "/apologetics" },
] as const;

function activeKey(pathname: string): string | null {
  // Doctrine owns the whole /theology/* subtree except the hub itself.
  if (pathname.startsWith("/theology/") && pathname !== "/theology") return "doctrine";
  if (pathname.startsWith("/topics")) return "topics";
  if (pathname.startsWith("/heresies")) return "heresies";
  if (pathname.startsWith("/apologetics")) return "apologetics";
  return null;
}

export function TheologyNav() {
  const { t } = useTranslate();
  const pathname = usePathname();
  const active = activeKey(pathname);

  return (
    <nav
      aria-label={t("study.theology.sectionsAria")}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {MODES.map((m) => {
        const on = m.key === active;
        return (
          <Link
            key={m.key}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={
              "shrink-0 rounded-full px-4 py-1.5 font-sans text-detail font-semibold transition-colors " +
              (on
                ? "bg-paper text-night"
                : "border border-paper/12 text-paper/60 hover:text-paper hover:border-paper/30")
            }
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
