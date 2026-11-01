import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ANDROID_CHANNEL_ID } from "../providers/fcm";

/**
 * The Android notification channel, held together across the three places
 * that name it: the server's messages (lib/push/providers/fcm.ts), the
 * channel the app makes (MainActivity.java), and Firebase's default in the
 * manifest, which is what a push uses while the app is closed, and what a
 * push naming a channel the app does not have falls back to.
 *
 * And the channel never badges the app icon. Android puts a dot, or on some
 * launchers a number, on the icon of an app with an unread notification.
 * CONTRIBUTING's fourth clause on reminders forbids exactly that ("no badge,
 * no unread count, no red dot"), and the bell in the app was drawn without
 * one for the same reason (components/nav/NotificationsButton.tsx).
 *
 * Android reads a channel's badge setting only when the channel is first
 * made, so the phones that already had "purify" could not lose the badge on
 * it. From 1.8 the app makes "purify-notifications" without one, from the
 * reader's own choices for "purify" (a silenced channel stays silent, a
 * blocked one blocked), and then deletes "purify". The owner's word on the
 * notifications findings (2026-11-01): existing installs lose the badge too.
 */

const REPO = join(__dirname, "..", "..", "..");
const MAIN = readFileSync(
  join(REPO, "android", "app", "src", "main", "java", "net", "purifyapp", "purify", "MainActivity.java"),
  "utf8",
);
const MANIFEST = readFileSync(join(REPO, "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");

/** The body of a method of MainActivity, up to its closing brace. */
function method(signature: string): string {
  const start = MAIN.indexOf(signature);
  expect(start, `MainActivity no longer has ${signature}`).toBeGreaterThan(-1);
  return MAIN.slice(start, MAIN.indexOf("\n    }", start));
}

const constant = (name: string) => new RegExp(`static final String ${name} = "([^"]+)";`).exec(MAIN)?.[1];

describe("the Android push channel", () => {
  it("is made by the app under the id the server sends to", () => {
    expect(constant("PUSH_CHANNEL")).toBe(ANDROID_CHANNEL_ID);
    expect(method("private void createPushChannel()")).toMatch(/new NotificationChannel\(\s*PUSH_CHANNEL/);
  });

  it("is Firebase's default, so a push while the app is closed, or for the old id, lands in it", () => {
    const m = /default_notification_channel_id"\s+android:value="([^"]+)"/.exec(MANIFEST);
    expect(m?.[1]).toBe(ANDROID_CHANNEL_ID);
  });

  it("is made every launch, so it exists before the first push can arrive", () => {
    const onCreate = MAIN.slice(MAIN.indexOf("public void onCreate("), MAIN.indexOf("public void onConfigurationChanged("));
    expect(onCreate).toContain("createPushChannel();");
  });

  it("never puts a badge or a count on the app icon", () => {
    const code = method("private void createPushChannel()");
    expect(code).toContain("channel.setShowBadge(false);");
    // Before the channel is handed over: Android ignores it afterwards.
    expect(code.indexOf("setShowBadge(false)")).toBeLessThan(code.indexOf("createNotificationChannel("));
  });

  it("is a new channel, so phones that had the old one lose the badge as well", () => {
    expect(constant("OLD_PUSH_CHANNEL")).toBe("purify");
    expect(ANDROID_CHANNEL_ID).not.toBe("purify");
  });

  it("carries the reader's choices for the old channel over before the old one goes, once", () => {
    const code = method("private void createPushChannel()");
    // Copied only into a channel not made yet: Android takes them only then.
    expect(code).toMatch(/old != null && manager\.getNotificationChannel\(PUSH_CHANNEL\) == null[^}]*copyReadersChoices\(old, channel\)/);
    // The old channel is deleted after the new one is made, never before.
    expect(code.indexOf("deleteNotificationChannel(OLD_PUSH_CHANNEL)")).toBeGreaterThan(code.indexOf("createNotificationChannel(channel)"));
    const copy = method("private static void copyReadersChoices(");
    for (const carried of [
      "setImportance(from.getImportance())",
      "setSound(from.getSound(), from.getAudioAttributes())",
      "enableVibration(from.shouldVibrate())",
      "setVibrationPattern(pattern)",
      "enableLights(from.shouldShowLights())",
      "setLockscreenVisibility(from.getLockscreenVisibility())",
      "setBypassDnd(from.canBypassDnd())",
    ]) {
      expect(copy, carried).toContain(carried);
    }
    // Setting a pattern also sets whether it vibrates: the pattern goes first.
    expect(copy.indexOf("setVibrationPattern(pattern)")).toBeLessThan(copy.indexOf("enableVibration(from.shouldVibrate())"));
  });

  it("asks for the permission Android 13 needs to show it at all", () => {
    expect(MANIFEST).toContain('<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
  });
});
