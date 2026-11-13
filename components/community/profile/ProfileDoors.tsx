"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DOOR, DOOR_OFF, DOOR_ON } from "@/components/ui/doors";
import { cn } from "@/lib/cn";
import type { ProfileDoor } from "@/lib/profile/doors";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * A profile's doors (r3-28 A, "fade and doors"), drawn as a saint's page
 * draws its own (components/saints/SaintDoors.tsx, the same squares): About,
 * Badges, Posts, and Campaigns when prayer campaigns ship (lib/profile/
 * doors.ts). The open one is filled. A tablist: the arrows move between the
 * doors in the reading direction, Home and End go to the ends, and only the
 * open door is in the tab order.
 *
 * Every panel sits in the same grid cell and the closed ones keep their room,
 * so the card is as tall as its tallest door whichever is open: a panel that
 * unmounted on a switch changed the card's height, and the card, pinned to
 * the foot of a phone and centred on a computer, jumped with it (the owner,
 * 2026-10-02). With one door there is no row, only its panel.
 *
 * With motion on, a door hands its panel over as the house's pieces do (the
 * mini player's card and pill, app/globals.css): the old panel fades, the new
 * one follows it in the same cell, so nothing moves and nothing cuts (build 95
 * note 13, "make the profile system even smoother": the panels used to swap
 * in one frame). With motion off they change at once.
 */

const LABEL: Record<ProfileDoor, string> = {
  about: "profile.tabAbout",
  badges: "profile.tabBadges",
  posts: "profile.tabPosts",
  campaigns: "profile.tabCampaigns",
};

const COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function ProfileDoors({
  doors,
  panels,
  label,
  initial,
}: {
  /** The doors the profile has, in order (lib/profile/doors.ts, profileDoors). */
  doors: readonly ProfileDoor[];
  panels: Partial<Record<ProfileDoor, ReactNode>>;
  /** What the doors open onto, for assistive technology. */
  label: string;
  /** The door open first: About, or the first the profile has. */
  initial?: ProfileDoor;
}) {
  const { t } = useTranslate();
  const [picked, setPicked] = useState<ProfileDoor | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const shown = doors.filter((d) => panels[d] !== undefined);
  const open = picked && shown.includes(picked) ? picked : initial && shown.includes(initial) ? initial : shown[0];
  if (!open) return null;
  if (shown.length < 2) return <div className="mt-6">{panels[open]}</div>;

  // On each door, not on the row: the row itself never takes focus.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, shown.indexOf(open)), shown.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const door = shown[next];
    setPicked(door);
    rowRef.current?.querySelector<HTMLButtonElement>(`#profile-tab-${door}`)?.focus();
  }

  return (
    <div className="mt-5">
      <div ref={rowRef} role="tablist" aria-label={label} data-profile-doors className={cn("mx-auto grid max-w-[420px] gap-2", COLS[shown.length])}>
        {shown.map((door) => (
          <button
            key={door}
            type="button"
            role="tab"
            id={`profile-tab-${door}`}
            aria-selected={door === open}
            aria-controls={`profile-panel-${door}`}
            tabIndex={door === open ? 0 : -1}
            onClick={() => setPicked(door)}
            onKeyDown={onKeyDown}
            className={cn(DOOR, door === open ? DOOR_ON : DOOR_OFF)}
          >
            <span className="line-clamp-2 max-w-full text-center leading-[1.15] [overflow-wrap:anywhere]">{t(LABEL[door])}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid">
        {shown.map((door) => (
          <div
            key={door}
            role="tabpanel"
            id={`profile-panel-${door}`}
            aria-labelledby={`profile-tab-${door}`}
            aria-hidden={door !== open}
            inert={door !== open}
            className={cn(
              "col-start-1 row-start-1 min-w-0",
              door === open
                ? "visible opacity-100 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house)_120ms,visibility_0s]"
                : "invisible opacity-0 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house),visibility_0s_linear_var(--duration-fast)]",
            )}
          >
            {panels[door]}
          </div>
        ))}
      </div>
    </div>
  );
}
