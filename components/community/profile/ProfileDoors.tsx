"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode, type SVGProps } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DOOR, DOOR_OFF, DOOR_ON } from "@/components/saints/SaintDoors";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Lampada } from "@/components/ui/icons/Lampada";
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
 */

/** A person, as the sheet's About door draws one: the head lit inside its ring. */
function Person({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="8.5" r="4.7" strokeOpacity="0.55" />
      <circle cx="12" cy="8.5" r="2.7" />
      <path d="M5.4 20.5 C6.6 16.4 17.4 16.4 18.6 20.5" />
    </svg>
  );
}

/** A medal on its ribbon, the Badges door's mark. */
function MedalMark({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="9.2" r="5.6" />
      <circle cx="12" cy="9.2" r="2.9" strokeOpacity="0.55" />
      <path d="M8.9 13.9 L7.6 21 L12 18.7 L16.4 21 L15.1 13.9" />
    </svg>
  );
}

const LABEL: Record<ProfileDoor, string> = {
  about: "profile.tabAbout",
  badges: "profile.tabBadges",
  posts: "profile.tabPosts",
  campaigns: "profile.tabCampaigns",
};

function DoorIcon({ door }: { door: ProfileDoor }) {
  if (door === "about") return <Person size={20} />;
  if (door === "badges") return <MedalMark size={20} />;
  if (door === "posts") return <ChatBubble size={20} />;
  return <Lampada size={20} />;
}

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
            <DoorIcon door={door} />
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
            className={cn("col-start-1 row-start-1 min-w-0", door !== open && "invisible")}
          >
            {panels[door]}
          </div>
        ))}
      </div>
    </div>
  );
}
