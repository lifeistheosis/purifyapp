import { isNativeClient } from "@/lib/platform/native";

/**
 * The app's end of the widget bridge: hands the home screen widgets what only
 * the app knows (docs/WIDGETS.md, section 2).
 *
 * Both phones carry a native plugin named "WidgetBridge" with one method,
 * update({ entries }). It keeps the six keys below, drops anything else, and
 * asks every placed widget to draw again. Android keeps them in its
 * SharedPreferences `PurifyWidget`, the iPhone in the App Group's
 * UserDefaults.
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

/** The six keys the plugin keeps. Anything else is dropped on the phone. */
export const WIDGET_KEYS = ["calendarStyle", "labels", "streak", "prayed", "patron", "update"] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

/**
 * What a push hands over: a string to keep (JSON already stringified), or
 * null to forget one the app no longer has, such as a patron saint cleared.
 * A key left out, or undefined, is left as the phone has it.
 */
export type WidgetEntries = Partial<Record<WidgetKey, string | null | undefined>>;

type WidgetBridgePlugin = {
  update(options: { entries: Record<string, string | null> }): Promise<unknown>;
};

/** The plugin, once asked for. Null in a shell that has none. */
let plugin: Promise<WidgetBridgePlugin | null> | null = null;

/** What the plugin has taken, key by key, in this app session. */
const sent = new Map<WidgetKey, string | null>();

/** The pushes still to send, one after another. */
let queue: Promise<void> = Promise.resolve();

function loadPlugin(): Promise<WidgetBridgePlugin | null> {
  plugin ??= import("@capacitor/core")
    .then(({ Capacitor, registerPlugin }) =>
      Capacitor.isPluginAvailable("WidgetBridge") ? registerPlugin<WidgetBridgePlugin>("WidgetBridge") : null,
    )
    .catch(() => {
      // The chunk did not load (offline before it was cached): asked again next time.
      plugin = null;
      return null;
    });
  return plugin;
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
  await bridge.update({ entries: changed });
  for (const key of WIDGET_KEYS) if (key in changed) sent.set(key, changed[key]);
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
