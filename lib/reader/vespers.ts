// Candlelight at Vespers (1.9, s2-02 of docs/1.9-build/ideas.json): "on by
// itself at sunset, when the Church's day begins, and off in the morning.
// One switch."
//
// While it is on, from sunset to sunrise the app reads in Candlelight, and by
// day in the palette the reader chose. Sunset is reckoned for the city of the
// phone's time zone (data/calendar/zone-coords.json, from the tz database),
// never from where the phone is: no permission is asked, and nothing about
// where a reader is leaves the phone. lib/calendar/sun.ts does the sums.
//
// components/theme/AppThemeController.tsx applies it, and keeps the night's
// two moments on the device, so the pre-paint script (lib/reader/prepaint.ts)
// can open the app already in Candlelight after dark, before React runs.
// Candlelight is Plus: for a reader without it the switch does nothing, as
// the palette itself does nothing.

import { nightAround, type Night } from "@/lib/calendar/sun";

import type { ReadingTheme } from "./readingModes";

/** "1" while the switch is on. */
export const VESPERS_KEY = "purify.reader.vespers";
/** The night's sunset and sunrise, "start,end" in milliseconds, for the pre-paint script. */
export const VESPERS_WINDOW_KEY = "purify.reader.vespers.window";

type Coords = [number, number];

/** Is the switch on? */
export function vespersOn(): boolean {
  try {
    return window.localStorage.getItem(VESPERS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Where the time zone's city is; the zone's offset and a middle latitude when the zone is not known. */
export function placeOf(zone: string | undefined, zones: Record<string, Coords>, offsetMinutes: number): Coords {
  const known = zone ? zones[zone] : undefined;
  if (known) return known;
  // A zone the table does not have (Etc/GMT+3, UTC): its offset's meridian,
  // at the latitude of most of the Church's readers.
  return [45, -offsetMinutes / 4];
}

let zones: Promise<Record<string, Coords>> | null = null;

/** The table of zones, read once, and only when the switch is on. */
function loadZones(): Promise<Record<string, Coords>> {
  // JSON reads its pairs as number[]; the script writes each as [latitude, longitude].
  zones ??= import("@/data/calendar/zone-coords.json").then((m) => m.default.zones as Record<string, number[]> as Record<string, Coords>);
  return zones;
}

/** The night around now, or the next one, for this phone. */
export async function nightNow(now: Date = new Date()): Promise<Night> {
  let zone: string | undefined;
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    zone = undefined;
  }
  const offset = now.getTimezoneOffset();
  const [lat, lng] = placeOf(zone, await loadZones(), offset);
  return nightAround(now.getTime(), { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }, lat, lng, offset);
}

/** The palette to read in: Candlelight through the night while the switch is on, else the reader's own. */
export function vespersTheme(stored: ReadingTheme, on: boolean, night: Night | null): ReadingTheme {
  return on && night?.now ? "candlelight" : stored;
}

/** Keep the night for the pre-paint script, or let it go when the switch is off. */
export function keepWindow(night: Night | null): void {
  try {
    if (night) window.localStorage.setItem(VESPERS_WINDOW_KEY, `${Math.round(night.start)},${Math.round(night.end)}`);
    else window.localStorage.removeItem(VESPERS_WINDOW_KEY);
  } catch {
    /* storage blocked: the palette comes a frame after the page */
  }
}

/** The night kept on the device, if `now` is inside it or before it; null when there is none or it has passed. */
export function readWindow(now: number = Date.now()): Night | null {
  try {
    const [start, end] = (window.localStorage.getItem(VESPERS_WINDOW_KEY) ?? "").split(",").map(Number);
    if (!Number.isFinite(start) || !Number.isFinite(end) || now >= end) return null;
    return { start, end, now: now >= start };
  } catch {
    return null;
  }
}

/** Whether a night still answers for `now`: not past, and night or day as it said. */
export function nightHolds(night: Night | null, now: number): night is Night {
  return night !== null && now < night.end && night.now === now >= night.start;
}

// ── The reader's own pick, for one night ────────────────────────────────
//
// With the switch on, after sunset the app wore Candlelight whatever a reader
// picked: a tap on a palette moved the check and changed nothing until
// morning. The arbiter's word, 2026-11-11, by the bar of build 93 note 3 (a
// tap always visibly does something): "the reader's tap wins for that night
// and Candlelight returns at the next sunset."
//
// So a pick made after sunset is given the rest of that night. What is kept
// is the night's own sunrise: until then the reader's palette is worn, and
// the next sunset is past it, so Candlelight comes back by itself with the
// switch never touched. Only a tap gives it (components/reader/
// ReaderPrefs.tsx, where a palette is picked); a palette arriving from the
// reader's account does not. Turning the switch off takes it away, so the
// switch turned on again that night means Candlelight now.

/** The sunrise a reader's own pick is worn until, in milliseconds. */
export const VESPERS_PASS_KEY = "purify.reader.vespers.pass";

/** A reader has picked a palette: if the switch is on and it is night, the rest of this night is theirs. */
export function passTonight(now: number = Date.now()): void {
  try {
    if (!vespersOn()) return;
    const night = readWindow(now);
    if (!night?.now) return;
    window.localStorage.setItem(VESPERS_PASS_KEY, String(Math.round(night.end)));
  } catch {
    /* storage blocked: Candlelight holds the night, as it did */
  }
}

/** Is this night the reader's own? True until the sunrise it was given for. */
export function passHolds(now: number = Date.now()): boolean {
  try {
    const until = Number(window.localStorage.getItem(VESPERS_PASS_KEY));
    return Number.isFinite(until) && now < until;
  } catch {
    return false;
  }
}

/** Take the night back: the switch has been turned off, or the night it was given for is over. */
export function clearPass(): void {
  try {
    window.localStorage.removeItem(VESPERS_PASS_KEY);
  } catch {
    /* storage blocked: nothing was kept */
  }
}

