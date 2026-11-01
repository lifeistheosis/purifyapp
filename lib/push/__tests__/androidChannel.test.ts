import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ANDROID_CHANNEL_ID } from "../providers/fcm";

/**
 * The Android notification channel, held together across the three places
 * that name it: the server's messages (lib/push/providers/fcm.ts), the
 * channel the app makes (MainActivity.java), and Firebase's default in the
 * manifest, which is what a push uses while the app is closed.
 *
 * And the channel never badges the app icon. Android puts a dot, or on some
 * launchers a number, on the icon of an app with an unread notification.
 * CONTRIBUTING's fourth clause on reminders forbids exactly that ("no badge,
 * no unread count, no red dot"), and the bell in the app was drawn without
 * one for the same reason (components/nav/NotificationsButton.tsx).
 *
 * WHY THE CHANNEL KEPT ITS ID. Android reads a channel's badge setting only
 * when the channel is first made, so phones that already had "purify" keep
 * their badge after this change. A new id would have reached them too, but
 * the only way to retire the old channel is to delete it, and deleting it
 * throws away what the reader chose for it: a reader who had silenced or
 * blocked Purify's notifications would have heard them again. A reader's
 * own choice outranks the dot. New installs, which 1.8's launch brings in
 * numbers, get no badge from the start.
 */

const REPO = join(__dirname, "..", "..", "..");
const MAIN = readFileSync(
  join(REPO, "android", "app", "src", "main", "java", "net", "purifyapp", "purify", "MainActivity.java"),
  "utf8",
);
const MANIFEST = readFileSync(join(REPO, "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");

/** The body of MainActivity.createPushChannel, where the channel is made. */
function channelCode(): string {
  const start = MAIN.indexOf("private void createPushChannel()");
  expect(start, "MainActivity no longer makes the push channel").toBeGreaterThan(-1);
  return MAIN.slice(start, MAIN.indexOf("\n    }", start));
}

describe("the Android push channel", () => {
  it("is made by the app under the id the server sends to", () => {
    expect(channelCode()).toMatch(new RegExp(`new NotificationChannel\\(\\s*"${ANDROID_CHANNEL_ID}"`));
  });

  it("is Firebase's default, so a push while the app is closed lands in it", () => {
    const m = /default_notification_channel_id"\s+android:value="([^"]+)"/.exec(MANIFEST);
    expect(m?.[1]).toBe(ANDROID_CHANNEL_ID);
  });

  it("is made every launch, so it exists before the first push can arrive", () => {
    const onCreate = MAIN.slice(MAIN.indexOf("public void onCreate("), MAIN.indexOf("public void onConfigurationChanged("));
    expect(onCreate).toContain("createPushChannel();");
  });

  it("never puts a badge or a count on the app icon", () => {
    const code = channelCode();
    expect(code).toContain("channel.setShowBadge(false);");
    // Before the channel is handed over: Android ignores it afterwards.
    expect(code.indexOf("setShowBadge(false)")).toBeLessThan(code.indexOf("createNotificationChannel("));
  });

  it("asks for the permission Android 13 needs to show it at all", () => {
    expect(MANIFEST).toContain('<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
  });
});
