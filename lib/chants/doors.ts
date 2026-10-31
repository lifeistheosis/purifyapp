import { hashFor, tabFromHash } from "@/lib/ui/sectionTabs";

/**
 * A chant's page has three doors (1.8, sheet r3-18, the owner's pick of
 * 2026-10-31: B's page with A's player, "I want the player to be at the
 * bottom, like how A has it. But I want the options. Actually, how B has
 * it."): Words, About and Versions, under the icon, switching what is shown
 * below them in place. Words opens first.
 *
 * The open door is kept in the address's # (#about, #versions; none for
 * Words), as a saint's page keeps its doors (components/saints/SaintDoors.tsx,
 * lib/ui/sectionTabs.ts): read in the page's first render on the device, so a
 * reader back from the Bible's psalm finds About open where they left it. It
 * is written with replaceState, never pushed, so Back leaves the page and
 * never walks the doors.
 */
export const CHANT_DOORS = ["words", "about", "versions"] as const;
export type ChantDoor = (typeof CHANT_DOORS)[number];

/** The door a # opens, or Words. */
export function chantDoorFromHash(hash: string): ChantDoor {
  return tabFromHash(hash, CHANT_DOORS);
}

/** The page's address with a door open: its own path, with the door's # (none for Words). */
export function chantDoorAddress(door: ChantDoor, at: { pathname: string; search: string }): string {
  return at.pathname + at.search + hashFor(door, CHANT_DOORS);
}

/** What a page tells its doors when one is opened: the address's own event does not fire for replaceState. */
export const CHANT_DOOR_EVENT = "purify:chant-door";

/**
 * Open a door: the address takes its # in place (replaceState, so Back still
 * leaves the page), and the page hears of it.
 */
export function keepChantDoor(
  door: ChantDoor,
  win: Pick<Window, "location" | "history" | "dispatchEvent">,
): void {
  win.history.replaceState(null, "", chantDoorAddress(door, win.location));
  win.dispatchEvent(new Event(CHANT_DOOR_EVENT));
}
