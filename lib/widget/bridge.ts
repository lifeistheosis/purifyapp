import { isNativeClient } from "@/lib/platform/native";
import { nativePlugin, type NativePluginBox } from "@/lib/platform/nativePlugin";

/**
 * The app's end of the widget bridge: hands the home screen widgets what only
 * the app knows (docs/WIDGETS.md, section 2).
 *
 * Both phones carry a native plugin named "WidgetBridge" with the method
 * update({ entries }). It keeps the seven keys below, drops anything else, and
 * asks every placed widget to draw again. Android keeps them in its
 * SharedPreferences `PurifyWidget`, the iPhone in the App Group's
 * UserDefaults. On Android the same plugin also answers whether the phone
 * shows Purify's notifications at all (phoneNotificationsEnabled), the one
 * other thing the app has to ask its own native code.
 *
 * Three rules, each for a reason:
 *
 *   - Nothing on the website. There are no widgets there, and the plugin is
 *     loaded only inside the apps, the way the other native-only code is, so
 *     it never enters the website's bundle.
 *   - Only what changed since the last push in this app session. Every
 *     update redraws every widget on the phone, and the app pushes on every
 *     open, every finished prayer and every return to the front. A value
 *     is counted as sent only once the plugin has taken it, so one that
 *     failed is tried again next time.
 *   - Never an error. A shell without the plugin (an iPhone build before its
 *     widgets, an Android build before this one) is a shell without widgets,
 *     and the app goes on as it was.
 *
 * Pushes are sent one after another, in the order they were asked for, so
 * an older value can never land after a newer one.
 */

/**
 * The seven keys the plugin keeps. Anything else is dropped on the phone.
 * `remember` came in 1.9: a phone with a build from before it drops it, and
 * its widgets go on as they were.
 */
export const WIDGET_KEYS = ["calendarStyle", "labels", "streak", "prayed", "patron", "update", "remember"] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

/**
 * What a push hands over: a string to keep (JSON already stringified), or
 * null to forget one the app no longer has, such as a patron saint cleared.
 * A key left out, or undefined, is left as the phone has it.
 */
export type WidgetEntries = Partial<Record<WidgetKey, string | null | undefined>>;

type WidgetBridgePlugin = {
  update(options: { entries: Record<string, string | null> }): Promise<unknown>;
  /** Android only (WidgetBridgePlugin.java); an iPhone or an older build has none. */
  notificationsEnabled(): Promise<{ enabled?: unknown }>;
};

/** What the plugin has taken, key by key, in this app session. */
const sent = new Map<WidgetKey, string | null>();

/** The pushes still to send, one after another. */
let queue: Promise<void> = Promise.resolve();

/**
 * The plugin, in its box: null in a shell that has none, and when the chunk
 * did not load (offline before it was cached), asked again next time. Never
 * the bare plugin through a promise, which never settles: until 1.9 no push
 * reached the widgets, and the phone's notifications were never asked
 * (lib/platform/nativePlugin.ts).
 */
function loadPlugin(): Promise<NativePluginBox<WidgetBridgePlugin> | null> {
  return nativePlugin<WidgetBridgePlugin>("WidgetBridge");
}

async function send(entries: WidgetEntries): Promise<void> {
  if (!isNativeClient()) return;
  const changed: Record<string, string | null> = {};
  for (const key of WIDGET_KEYS) {
    const value = entries[key];
    if (value === undefined) continue;
    if (sent.has(key) && sent.get(key) === value) continue;
    changed[key] = value;
  }
  if (Object.keys(changed).length === 0) return;
  const bridge = await loadPlugin();
  if (!bridge) return;
  await bridge.api.update({ entries: changed });
  for (const key of WIDGET_KEYS) if (key in changed) sent.set(key, changed[key]);
}

/**
 * Whether this Android phone shows Purify's notifications: false when they
 * are switched off for the app in the phone's settings, or the push channel
 * is blocked. Null when it cannot say: on the website, on an iPhone (whose
 * own permission already says so), or in a build from before the bridge
 * could answer. Never throws.
 */
export async function phoneNotificationsEnabled(): Promise<boolean | null> {
  if (!isNativeClient()) return null;
  try {
    const bridge = await loadPlugin();
    if (!bridge) return null;
    const { enabled } = await bridge.api.notificationsEnabled();
    return typeof enabled === "boolean" ? enabled : null;
  } catch {
    return null;
  }
}

/**
 * Hand the widgets what changed. Does nothing on the website, sends nothing
 * that has not changed, and never throws: the promise always resolves.
 */
export function pushWidgetState(entries: WidgetEntries): Promise<void> {
  const run = queue.then(() => send(entries)).catch(() => {});
  queue = run;
  return run;
}
