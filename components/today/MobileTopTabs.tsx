"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Bolt } from "@/components/ui/icons/Bolt";

const STREAK_KEY = "purify:prayer-streak";
const STREAK_EVENT = "purify:prayer-streak";

function subscribeStreak(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(STREAK_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STREAK_EVENT, callback);
  };
}

function readStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { both?: number };
    return typeof parsed?.both === "number" ? parsed.both : 0;
  } catch {
    return 0;
  }
}

/**
 * Mobile top bar for the Today shell.
 *
 * Left: two text tabs (Today / Calendar). The active one carries a 2px
 * rubric-red underline (#c1272d). Tapping Calendar routes to /calendar.
 *
 * Right: small lightning glyph + the prayer-rule streak count, a bell
 * button linking to /whats-new, and a circular avatar slot.
 *
 * The streak count reads from the same localStorage key the v5.4
 * ProfileStats reads ("purify:prayer-streak", a JSON blob). Falls back
 * to 0 when missing.
 */
export function MobileTopTabs({
  active,
  labels,
  avatar,
}: {
  active: "today" | "calendar";
  labels: { today: string; calendar: string };
  avatar: React.ReactNode;
}) {
  const streak = useSyncExternalStore(
    subscribeStreak,
    readStreak,
    () => 0,
  );

  return (
    <header className="sticky top-0 z-30 bg-night/95 backdrop-blur-sm border-b border-paper/8">
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        {/* Tab pair */}
        <nav className="flex items-baseline gap-5">
          <Tab href="/" active={active === "today"} label={labels.today} />
          <Tab
            href="/calendar"
            active={active === "calendar"}
            label={labels.calendar}
          />
        </nav>

        {/* Right cluster: streak, bell, avatar */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-[#c1272d]">
            <Bolt size={14} />
            <span className="font-sans text-[14px] font-semibold tabular-nums">
              {streak}
            </span>
          </div>
          <Link
            href="/whats-new"
            aria-label="What's new"
            className="text-paper/75 hover:text-paper transition-colors"
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
          </Link>
          <div className="ml-1">{avatar}</div>
        </div>
      </div>
    </header>
  );
}

function Tab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="relative inline-block py-1 font-sans text-[20px] font-bold tracking-[-0.01em] transition-colors"
    >
      <span className={active ? "text-paper" : "text-paper/45"}>{label}</span>
      {active && (
        <span
          aria-hidden
          className="absolute left-0 right-0 -bottom-[2px] h-[2px] rounded-full bg-[#c1272d]"
        />
      )}
    </Link>
  );
}
