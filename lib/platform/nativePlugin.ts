/**
 * A plugin of the apps' own shell, by name, for the bridges that hand the
 * phone what the app knows (the lock screen's player, lib/player/
 * lockScreen.ts). Null on the website, in a shell built before the plugin,
 * and when Capacitor's chunk cannot load (offline before it was cached),
 * which is not kept, so the next ask tries again.
 *
 * Handed over in a box, { api }, never bare. Capacitor's plugin object
 * answers every name as a method of the plugin, "then" among them, so a
 * promise that resolves to it never settles: JavaScript takes the plugin for
 * a promise and calls its then(), that call goes to the phone, which has no
 * such method, and the promise waits for ever with nothing said. That is how
 * the lock screen's player never reached the phone from 1.8 to 1.9 (his
 * report of 2026-11-10: on Android the voice went on when he left the app,
 * and no player showed in the shade). A mock of registerPlugin cannot show
 * it, so lib/platform/__tests__/nativePlugin.test.ts runs Capacitor's own
 * code on a stand-in Android bridge.
 */

export type NativePluginBox<T> = {
  /** The plugin. Read it from the box; never return it from an async function or a then(). */
  api: T;
  /** "android" or "ios": the shell the plugin answers in. */
  platform: string;
};

const asked = new Map<string, Promise<NativePluginBox<unknown> | null>>();

export function nativePlugin<T>(name: string): Promise<NativePluginBox<T> | null> {
  let box = asked.get(name);
  if (!box) {
    box = import("@capacitor/core")
      .then(({ Capacitor, registerPlugin }) =>
        Capacitor.isPluginAvailable(name) ? { api: registerPlugin<T>(name) as unknown, platform: Capacitor.getPlatform() } : null,
      )
      .catch(() => {
        asked.delete(name);
        return null;
      });
    asked.set(name, box);
  }
  return box as Promise<NativePluginBox<T> | null>;
}
