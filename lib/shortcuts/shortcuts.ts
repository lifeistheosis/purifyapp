/**
 * The app icon's shortcuts: hold the icon on the home screen and the phone
 * offers Morning prayers, Today's reading and Continue reading.
 *
 * The phones declare them in files of their own, because the list has to be
 * there before the app has ever run:
 *
 *   - Android: android/app/src/main/res/xml/shortcuts.xml
 *   - iPhone:  UIApplicationShortcutItems in ios/App/App/Info.plist
 *
 * A phone knows nothing about the app's screens, so all a shortcut carries is
 * an address, the same one on both phones: SHORTCUT_PREFIX and the shortcut's
 * id. Both shells hand it to Capacitor the way they hand over any opened URL
 * (@capacitor/app: "appUrlOpen", and getLaunchUrl for the one that started
 * the app), and components/native/ShortcutListener.tsx asks this file which
 * screen it means and gives that to the router.
 *
 * The address is never a route. A hard navigation inside the shells is
 * always handed the front door (lib/push/open.ts has the history), and
 * Continue reading has no fixed route to name: where the reader left off is
 * on the device. Keeping the routes here also means a screen can move
 * without a store build.
 *
 * Nothing registers the scheme with the phone, on purpose. The Android
 * shortcut names its activity outright and the iPhone builds the address
 * inside the app, so no link and no web page can send one, and it sits
 * apart from the Google sign-in callback, which is the one URL scheme the
 * iPhone app does register. On the iPhone nothing outside the app can send
 * one at all. On Android another installed app still can, by naming
 * MainActivity outright (it is the launcher activity, so it is exported).
 * That is why an address only ever picks one of these fixed screens, and why
 * a shortcut must never do more than open a screen.
 *
 * Plain functions over what the caller hands in, so they are tested without
 * a phone. lib/shortcuts/__tests__/shortcuts.test.ts also holds the two
 * native files to this list.
 */

import type { LastRead } from "@/lib/bible/lastRead";

/** What every shortcut's address starts with. The scheme is the app's id. */
export const SHORTCUT_PREFIX = "net.purifyapp.purify://shortcut/";

/** In the order the phones list them. */
export const SHORTCUT_IDS = ["morning-prayers", "todays-reading", "continue-reading"] as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[number];

/** The address a phone carries for a shortcut. */
export function shortcutUrl(id: ShortcutId): string {
  return SHORTCUT_PREFIX + id;
}

/**
 * Which shortcut an opened URL is, or null for anything else. Every URL the
 * app is opened with comes past here (the Google sign-in callback among
 * them), so only the three addresses are answered, letter for letter.
 *
 * Compared as text and not with `new URL()`: an older Android WebView reads
 * the host of a scheme it does not know as part of the path.
 */
export function shortcutFromUrl(url: unknown): ShortcutId | null {
  if (typeof url !== "string" || !url.startsWith(SHORTCUT_PREFIX)) return null;
  const id = url.slice(SHORTCUT_PREFIX.length);
  return (SHORTCUT_IDS as readonly string[]).includes(id) ? (id as ShortcutId) : null;
}

/** A book as the Bible's routes spell one: "john", "1-samuel". */
const BOOK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Where Continue reading goes: the chapter the reader was in, at the verse,
 * the same address the Bible tab's own "Continue reading" card builds
 * (components/mobile/BibleMobileContinue.tsx). With nothing read yet, or a
 * pointer that does not look like one, it is the Bible tab, where that card
 * says how to begin.
 */
function continueTarget(last: Pick<LastRead, "book" | "chapter" | "verse"> | null): string {
  if (!last || !BOOK.test(last.book) || !Number.isInteger(last.chapter) || last.chapter < 1) return "/bible";
  const chapter = `/bible/${last.book}/${last.chapter}`;
  return Number.isInteger(last.verse) && last.verse > 1 ? `${chapter}#v${last.verse}` : chapter;
}

/**
 * The screen a shortcut opens. `lastRead` is the device's own pointer
 * (lib/bible/lastRead.ts), read by the caller at the moment of the tap.
 */
export function shortcutTarget(
  id: ShortcutId,
  lastRead: Pick<LastRead, "book" | "chapter" | "verse"> | null,
): string {
  if (id === "morning-prayers") return "/prayers/morning";
  // The calendar opens on today, and the day's readings are its second
  // section, under their own heading.
  if (id === "todays-reading") return "/calendar";
  return continueTarget(lastRead);
}

/**
 * True when Continue reading would only take the reader to the chapter they
 * are in. The pointer is the verse in view there, written as they scroll
 * (components/bible/ReadingProgressBar.tsx), so they are already at it and
 * there is nowhere to go. Moving anyway would change nothing but the # under
 * the same screen: a second entry for it in the history, which the Android
 * back button then seems to do nothing about for one press.
 *
 * Continue reading only. The other two have no # to differ by, and the router
 * adds no entry for a move to the address it is already at.
 *
 * `pathname` is window.location.pathname, which ends in a slash in the
 * shells; `target` is what shortcutTarget answered.
 */
export function alreadyThere(id: ShortcutId, pathname: string, target: string): boolean {
  if (id !== "continue-reading") return false;
  const screen = (path: string) => path.replace(/\/+$/, "") || "/";
  return screen(pathname) === screen(target.split("#")[0]);
}

/** A second telling of the same address within this long is the same tap. */
export const SAME_TAP_MS = 3000;

export type Told = { url: string; at: number };

/**
 * A shortcut that STARTED the app is told twice: once as an opened URL, which
 * Capacitor keeps until someone is listening, and once as the launch URL.
 * Asking both ways is what makes it sure to arrive on both phones; this is
 * what keeps it to one move.
 */
export function sameTap(last: Told | null, url: string, now: number): boolean {
  return last !== null && last.url === url && now - last.at < SAME_TAP_MS;
}

/**
 * Where it is written down that the launch URL was already asked for.
 *
 * The launch URL is not spent by being read: the iPhone answers with the last
 * URL the app was opened with for as long as the app lives, and Android with
 * the one that started it. So a reload inside the shell (after a password
 * change, say) would be handed the morning's shortcut again and carry the
 * reader off to it. Session storage, like lib/nav/entry.ts: it lasts through
 * a reload and a new launch starts clean.
 */
export const LAUNCH_ASKED_KEY = "purify:shortcut.launch-asked";
