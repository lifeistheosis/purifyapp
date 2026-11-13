"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DOOR, DOOR_COLS, DOOR_OFF, DOOR_ON } from "@/components/ui/doors";
import { cn } from "@/lib/cn";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * The doors of a campaign's page (1.9, the rework's phase 2), drawn as a
 * saint's page and a profile draw their own (components/ui/doors.ts, the
 * same squares): About, its creator's Updates, and Comments. The open one is
 * filled.
 *
 * A tablist, as a profile's doors are (components/community/profile/
 * ProfileDoors.tsx): the arrows move between the doors in the reading
 * direction, Home and End go to the ends, and only the open door is in the
 * tab order. The page keeps which is open, since its Pray button leads to
 * About from any door.
 *
 * Nothing on a door counts anything: no number of updates, of comments or of
 * anyone (CONTRIBUTING.md, "On prayer, no figures at all").
 */

export type CampaignDoor = "about" | "updates" | "comments";

/** In the order they are drawn. */
export const CAMPAIGN_DOORS: readonly CampaignDoor[] = ["about", "updates", "comments"];

const LABEL: Record<CampaignDoor, string> = {
  about: "profile.tabAbout",
  updates: "campaigns.updates",
  comments: "campaigns.comments",
};

export function CampaignDoors({
  open,
  onOpen,
  panels,
  label,
}: {
  open: CampaignDoor;
  onOpen: (door: CampaignDoor) => void;
  panels: Record<CampaignDoor, ReactNode>;
  /** What the doors open onto, for assistive technology: the campaign's title. */
  label: string;
}) {
  const { t } = useTranslate();
  const rowRef = useRef<HTMLDivElement>(null);

  // On each door, not on the row: the row itself never takes focus.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, CAMPAIGN_DOORS.indexOf(open), CAMPAIGN_DOORS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const door = CAMPAIGN_DOORS[next];
    onOpen(door);
    rowRef.current?.querySelector<HTMLButtonElement>(`#campaign-tab-${door}`)?.focus();
  }

  return (
    <div>
      <div ref={rowRef} role="tablist" aria-label={label} data-campaign-doors="" className={cn("grid gap-2", DOOR_COLS[CAMPAIGN_DOORS.length])}>
        {CAMPAIGN_DOORS.map((door) => (
          <button
            key={door}
            type="button"
            role="tab"
            id={`campaign-tab-${door}`}
            aria-selected={door === open}
            aria-controls={`campaign-panel-${door}`}
            tabIndex={door === open ? 0 : -1}
            onClick={() => onOpen(door)}
            onKeyDown={onKeyDown}
            className={cn(DOOR, door === open ? DOOR_ON : DOOR_OFF)}
          >
            <span className="line-clamp-2 max-w-full text-center leading-[1.15] [overflow-wrap:anywhere]">{t(LABEL[door])}</span>
          </button>
        ))}
      </div>
      {CAMPAIGN_DOORS.map((door) => (
        <div key={door} role="tabpanel" id={`campaign-panel-${door}`} aria-labelledby={`campaign-tab-${door}`} hidden={door !== open} className="pt-6">
          {panels[door]}
        </div>
      ))}
    </div>
  );
}
