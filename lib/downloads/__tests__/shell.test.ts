// Where a download shows (1.9, build 95 note 23): the app's own plugin in
// both shells, named alike, registered as the widgets' bridge is, on a quiet
// channel, with nothing a store must be told of; and the bell's sheet with
// its Downloads part first, the bell lit by an end unseen.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const ANDROID = "android/app/src/main/java/net/purifyapp/purify/downloads/DownloadNoticePlugin.java";
const IOS = "ios/App/App/DownloadNoticePlugin.swift";

describe("the app's own plugin, DownloadNotice", () => {
  it("is named alike in both shells, with the methods lib/downloads/notice.ts calls", () => {
    const java = read(ANDROID);
    const swift = read(IOS);
    expect(java).toContain('@CapacitorPlugin(name = "DownloadNotice")');
    expect(swift).toContain('public let jsName = "DownloadNotice"');
    for (const method of ["post", "clear"]) {
      expect(java).toMatch(new RegExp(`@PluginMethod\\s+public void ${method}\\(PluginCall call\\)`));
      expect(swift).toContain(`CAPPluginMethod(name: "${method}", returnType: CAPPluginReturnPromise)`);
    }
    expect(read("lib/downloads/notice.ts")).toContain('nativePlugin<DownloadNotice>("DownloadNotice")');
  });

  it("is registered before the page loads, as the widgets' bridge is", () => {
    expect(read("android/app/src/main/java/net/purifyapp/purify/MainActivity.java")).toMatch(/registerPlugin\(DownloadNoticePlugin\.class\);[\s\S]*super\.onCreate/);
    expect(read("ios/App/App/PurifyBridgeViewController.swift")).toContain("bridge?.registerPluginInstance(DownloadNoticePlugin())");
    // An app's own Swift file is built only when the project names it in the app's sources.
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    const ref = /([0-9A-F]{24}) \/\* DownloadNoticePlugin\.swift in Sources \*\/ = \{isa = PBXBuildFile/.exec(project)?.[1];
    expect(ref).toBeTruthy();
    const appSources = /\/\* PurifyBridgeViewController\.swift in Sources \*\/,[\s\S]*?\);/.exec(project)?.[0] ?? "";
    expect(project.split(`${ref} /* DownloadNoticePlugin.swift in Sources */,`).length).toBe(2);
    expect(appSources + project).toContain(`${ref} /* DownloadNoticePlugin.swift in Sources */,`);
  });

  it("posts on a quiet channel of its own: low, silent, no badge, apart from the reminders", () => {
    const java = read(ANDROID);
    expect(java).toContain('CHANNEL = "purify-downloads"');
    expect(java).toContain("NotificationManager.IMPORTANCE_LOW");
    expect(java).toContain("channel.setShowBadge(false)");
    expect(java).toContain(".setSilent(true)");
    expect(java).toContain("notify(TAG, id,");
    // Never posted without the reader's leave on Android 13 and later.
    expect(java).toMatch(/POST_NOTIFICATIONS\) != PackageManager\.PERMISSION_GRANTED/);
    // A notice nobody refreshes clears itself, and one left by a closed app goes at the next start.
    expect(java).toContain("setTimeoutAfter(STALE_MS)");
    expect(java).toMatch(/public void load\(\) \{[\s\S]*clearLeftRunning/);
    const strings = read("android/app/src/main/res/values/strings.xml");
    expect(strings).toContain('<string name="download_channel_name">Downloads</string>');
  });

  it("needs nothing a store must be told of: no new permission, no service, no foreground service type", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(permissions).toEqual([
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "android.permission.INTERNET",
      "android.permission.POST_NOTIFICATIONS",
      "com.google.android.gms.permission.AD_ID",
    ]);
    expect(manifest).not.toMatch(/dataSync|FOREGROUND_SERVICE_DATA_SYNC/);
    expect(read(ANDROID)).not.toMatch(/startForeground|extends \w*Service\b|ServiceInfo\.FOREGROUND/);
    // On an iPhone no background mode is declared for it: only the moments iOS gives an app just left.
    expect(read(IOS)).toContain("beginBackgroundTask");
    expect(read("ios/App/App/Info.plist")).not.toMatch(/<string>fetch<\/string>|<string>processing<\/string>/);
  });

  it("on an iPhone, while Purify is open, puts a download's end in Notification Center without a banner over the app", () => {
    const swift = read(IOS);
    expect(swift).toContain("bridge?.notificationRouter.localNotificationHandler = self");
    expect(swift).toMatch(/func willPresent\(notification: UNNotification\) -> UNNotificationPresentationOptions \{[\s\S]*?return \[\.list\]/);
  });
});

describe("the bell's sheet", () => {
  it("shows the downloads first, only when there is one, from the phone's own record", () => {
    const sheet = read("components/nav/NotificationsSheet.tsx");
    expect(sheet.indexOf("<DownloadsSection")).toBeGreaterThan(-1);
    expect(sheet.indexOf("<DownloadsSection")).toBeLessThan(sheet.indexOf('t("community.notifications")'));
    const section = read("components/nav/DownloadsSection.tsx");
    expect(section).toContain("useDownloads()");
    expect(section).toMatch(/if \(downloads\.length === 0\) return null;/);
    // Its marks are the house's: the player's ring, the check a chosen translation wears.
    expect(section).toContain("<SaveOfflineMark");
    expect(section).toContain("<Check ");
  });

  it("is lit by a download's end not yet seen, and opening it is seeing it", () => {
    const bell = read("components/nav/NotificationsButton.tsx");
    expect(bell).toContain("hasUnseenEnd(downloads)");
    expect(bell.match(/markDownloadsSeen\(\)/g)?.length).toBe(2);
  });

  it("is told by a bridge every screen of the apps carries, inside the provider of the reader's words", () => {
    // Outside the provider every line it told the phone, and its ask, was its key ("downloads.saving"):
    // note 23's walk on the export found it (scripts/gate/downloads.mjs).
    const frame = read("components/layout/RootFrame.tsx");
    const bridge = frame.indexOf("<DownloadsBridge />");
    expect(bridge).toBeGreaterThan(frame.indexOf("<MessagesProvider"));
    expect(bridge).toBeLessThan(frame.indexOf("</MessagesProvider>"));
    expect(frame.match(/<DownloadsBridge \/>/g)?.length).toBe(1);
  });
});
