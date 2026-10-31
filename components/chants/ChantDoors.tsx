"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { CHANT_DOORS, CHANT_DOOR_EVENT, chantDoorFromHash, keepChantDoor, type ChantDoor } from "@/lib/chants/doors";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * A chant's three doors (1.8, sheet r3-18 B, the owner's pick of 2026-10-31):
 * Words, About and Versions under the icon, a carved track with the open
 * door raised and lit (app/globals.css, .chant-doors), switching what is
 * below them in place. A tablist: the arrows move between the doors in the
 * reading direction, Home and End go to the ends, and only the open door is
 * in the tab order.
 *
 * The open door is kept in the address (lib/chants/doors.ts), as a saint's
 * page keeps its doors (components/saints/SaintDoors.tsx): read in the first
 * render on the device, written with replaceState so Back leaves the page.
 * Each tab is `chant-tab-<door>` and controls `chant-panel-<door>`: no
 * element is named as a door is, or the browser would scroll to it.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(CHANT_DOOR_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(CHANT_DOOR_EVENT, onChange);
  };
}

/** The door open now, from the address; Words on the server and before the device has read it. */
export function useChantDoor(): ChantDoor {
  return useSyncExternalStore(
    subscribe,
    () => chantDoorFromHash(window.location.hash),
    () => CHANT_DOORS[0],
  );
}

/** Open a door: kept in the address, and every reader of it hears. */
export function openChantDoor(door: ChantDoor): void {
  keepChantDoor(door, window);
}

const LABEL: Record<ChantDoor, string> = {
  words: "chants.tab.words",
  about: "chants.tab.about",
  versions: "chants.tab.versions",
};

export function ChantDoors({
  open,
  onOpen,
  label,
  className,
}: {
  open: ChantDoor;
  onOpen: (door: ChantDoor) => void;
  /** What the doors open onto, for assistive technology: the chant's name. */
  label: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const listRef = useRef<HTMLDivElement>(null);

  // On each door, not on the track: the track itself never takes focus.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, CHANT_DOORS.indexOf(open)), CHANT_DOORS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    const door = CHANT_DOORS[next];
    onOpen(door);
    listRef.current?.querySelector<HTMLButtonElement>(`#chant-tab-${door}`)?.focus();
  }

  return (
    <div ref={listRef} role="tablist" aria-label={label} data-chant-control="doors" className={cn("chant-doors", className)}>
      {CHANT_DOORS.map((door) => (
        <button
          key={door}
          id={`chant-tab-${door}`}
          type="button"
          role="tab"
          aria-selected={door === open}
          aria-controls={`chant-panel-${door}`}
          tabIndex={door === open ? 0 : -1}
          onClick={() => onOpen(door)}
          onKeyDown={onKeyDown}
          className="tap-press hit-44"
        >
          <span className="block truncate">{t(LABEL[door])}</span>
        </button>
      ))}
    </div>
  );
}
