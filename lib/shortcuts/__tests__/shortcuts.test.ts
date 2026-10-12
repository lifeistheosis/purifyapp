// The app icon's shortcuts cannot be exercised without a phone, so these hold
// what can be held from here: which screen each address means, that anything
// else is left alone, and that the two native files and the app agree on the
// list. The why is in ../shortcuts.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  LAUNCH_ASKED_KEY,
  SAME_TAP_MS,
  SHORTCUT_IDS,
  SHORTCUT_PREFIX,
  alreadyThere,
  sameTap,
  shortcutFromUrl,
  shortcutTarget,
  shortcutUrl,
  type ShortcutId,
} from "../shortcuts";

// What the phones show, in English for now. Android keeps its copy in
// strings.xml, the iPhone in Info.plist; both are held to these below.
const LABELS: Record<ShortcutId, string> = {
  "morning-prayers": "Morning prayers",
  "todays-reading": "Today's reading",
  "continue-reading": "Continue reading",
};

/** Every match of a one-group pattern, in the order the file has them. */
const all = (text: string, re: RegExp) => [...text.matchAll(re)].map((m) => m[1]);

describe("which screen a shortcut opens", () => {
  it("opens the Morning Rule", () => {
    expect(shortcutTarget("morning-prayers", null)).toBe("/prayers/morning");
  });

  it("opens the calendar, which begins on today and its readings", () => {
    expect(shortcutTarget("todays-reading", null)).toBe("/calendar");
  });

  it("takes Continue reading to the chapter and the verse the reader was at", () => {
    expect(shortcutTarget("continue-reading", { book: "john", chapter: 3, verse: 16 })).toBe("/bible/john/3#v16");
    expect(shortcutTarget("continue-reading", { book: "1-samuel", chapter: 17, verse: 45 })).toBe(
      "/bible/1-samuel/17#v45",
    );
  });

  it("opens the chapter at its top when the reader had not moved down it", () => {
    expect(shortcutTarget("continue-reading", { book: "psalms", chapter: 50, verse: 1 })).toBe("/bible/psalms/50");
    expect(shortcutTarget("continue-reading", { book: "psalms", chapter: 50, verse: 0 })).toBe("/bible/psalms/50");
    expect(shortcutTarget("continue-reading", { book: "psalms", chapter: 50, verse: Number.NaN })).toBe(
      "/bible/psalms/50",
    );
  });

  it("opens the Bible tab when nothing has been read yet", () => {
    expect(shortcutTarget("continue-reading", null)).toBe("/bible");
  });

  it("opens the Bible tab for a pointer that is not a chapter of a book", () => {
    // The pointer is whatever was in the device's storage. It is never given
    // the chance to name another screen, or another site.
    for (const bad of [
      { book: "", chapter: 3, verse: 1 },
      { book: "../account", chapter: 3, verse: 1 },
      { book: "/example.org", chapter: 3, verse: 1 },
      { book: "John", chapter: 3, verse: 1 },
      { book: "john", chapter: 0, verse: 1 },
      { book: "john", chapter: 2.5, verse: 1 },
      { book: "john", chapter: Number.NaN, verse: 1 },
    ]) {
      expect(shortcutTarget("continue-reading", bad), JSON.stringify(bad)).toBe("/bible");
    }
  });

  it("only ever answers with an address inside the app", () => {
    for (const id of SHORTCUT_IDS) {
      expect(shortcutTarget(id, { book: "john", chapter: 1, verse: 5 })).toMatch(/^\/[a-z]/);
    }
  });
});

describe("Continue reading, tapped in the chapter the reader is still in", () => {
  it("goes nowhere, the reader being at the verse already", () => {
    // The shells' addresses end in a slash; the target never does.
    expect(alreadyThere("continue-reading", "/bible/john/3/", "/bible/john/3#v16")).toBe(true);
    expect(alreadyThere("continue-reading", "/bible/john/3", "/bible/john/3#v16")).toBe(true);
    expect(alreadyThere("continue-reading", "/bible/psalms/50/", "/bible/psalms/50")).toBe(true);
    expect(alreadyThere("continue-reading", "/bible/", "/bible")).toBe(true);
  });

  it("still moves from every other screen, another chapter among them", () => {
    for (const from of ["/", "/saints/", "/bible/", "/bible/john/", "/bible/john/30/", "/bible/1-john/3/"]) {
      expect(alreadyThere("continue-reading", from, "/bible/john/3#v16"), from).toBe(false);
    }
  });

  it("is never said of the other two shortcuts", () => {
    expect(alreadyThere("morning-prayers", "/prayers/morning/", "/prayers/morning")).toBe(false);
    expect(alreadyThere("todays-reading", "/calendar/", "/calendar")).toBe(false);
  });
});

describe("telling a shortcut from every other URL the app is opened with", () => {
  it("knows its own three addresses", () => {
    for (const id of SHORTCUT_IDS) {
      expect(shortcutFromUrl(shortcutUrl(id))).toBe(id);
    }
    expect(shortcutUrl("morning-prayers")).toBe("net.purifyapp.purify://shortcut/morning-prayers");
  });

  it("leaves everything else alone", () => {
    for (const other of [
      // The Google sign-in callback on the iPhone, and what a link would be.
      "com.googleusercontent.apps.1234-abcd:/oauth2redirect?code=x",
      "https://purifyapp.net/prayers/morning",
      "purify://auth-callback?code=abcdefgh1",
      SHORTCUT_PREFIX,
      SHORTCUT_PREFIX + "evening-prayers",
      SHORTCUT_PREFIX + "morning-prayers/",
      SHORTCUT_PREFIX + "morning-prayers?next=//example.org",
      "net.purifyapp.purify://elsewhere/morning-prayers",
      "/prayers/morning",
      "",
      null,
      undefined,
      7,
      {},
    ]) {
      expect(shortcutFromUrl(other), String(other)).toBeNull();
    }
  });
});

describe("a tap that started the app, which is told twice", () => {
  it("is one move", () => {
    const url = shortcutUrl("morning-prayers");
    expect(sameTap(null, url, 1000)).toBe(false);
    expect(sameTap({ url, at: 1000 }, url, 1000)).toBe(true);
    expect(sameTap({ url, at: 1000 }, url, 1000 + SAME_TAP_MS - 1)).toBe(true);
  });

  it("does not swallow another shortcut, or the same one used again later", () => {
    const url = shortcutUrl("morning-prayers");
    expect(sameTap({ url, at: 1000 }, shortcutUrl("continue-reading"), 1001)).toBe(false);
    expect(sameTap({ url, at: 1000 }, url, 1000 + SAME_TAP_MS)).toBe(false);
  });
});

describe("the Android shortcuts", () => {
  const xml = readFileSync("android/app/src/main/res/xml/shortcuts.xml", "utf8");
  const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  const strings = readFileSync("android/app/src/main/res/values/strings.xml", "utf8");
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const java = "android/app/src/main/java/net/purifyapp/purify";
  const trampoline = readFileSync(`${java}/ShortcutActivity.java`, "utf8");
  const main = readFileSync(`${java}/MainActivity.java`, "utf8");

  it("are the app's three, in order, each carrying its own address", () => {
    expect(all(xml, /android:shortcutId="([^"]+)"/g)).toEqual([...SHORTCUT_IDS]);
    expect(all(xml, /android:data="([^"]+)"/g)).toEqual(SHORTCUT_IDS.map(shortcutUrl));
  });

  it("are declared on the launcher activity", () => {
    expect(manifest).toMatch(/android:name="android\.app\.shortcuts"\s+android:resource="@xml\/shortcuts"/);
  });

  it("name the app and the activity that takes a shortcut in", () => {
    // The file cannot read the applicationId, so it is written out and has to
    // follow it. A shortcut that names another package opens nothing.
    const appId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1];
    expect(appId, "applicationId not found in build.gradle").toBeTruthy();
    expect(new Set(all(xml, /android:targetPackage="([^"]+)"/g))).toEqual(new Set([appId]));
    expect(new Set(all(xml, /android:targetClass="([^"]+)"/g))).toEqual(new Set([`${appId}.ShortcutActivity`]));
    expect(SHORTCUT_PREFIX.startsWith(`${appId}://`)).toBe(true);
  });

  it("go through an activity with a task of its own, so the open app is not closed", () => {
    // A static shortcut empties the task of the activity it names. Named at
    // MainActivity it would reload the app on every use.
    const entry = manifest.match(/<activity(?:(?!<activity)[\s\S])*?android:name="\.ShortcutActivity"[\s\S]*?\/>/)?.[0];
    expect(entry, "ShortcutActivity is not in the manifest").toBeTruthy();
    expect(entry).toMatch(/android:taskAffinity=""/);
    expect(entry).toMatch(/android:exported="false"/);
  });

  it("are known to that activity by the address the app knows them by", () => {
    // ShortcutActivity.isShortcut spells the scheme and the host out. Change
    // the address here and not there, and Android passes nothing on: every
    // shortcut opens Today, without a word.
    const [scheme, rest] = SHORTCUT_PREFIX.split("://");
    const host = rest.replace(/\/$/, "");
    expect(trampoline).toContain(`"${scheme}".equals(address.getScheme())`);
    expect(trampoline).toContain(`"${host}".equals(address.getHost())`);
  });

  it("are dropped when Android builds the app again from an old launch", () => {
    // Before super.onCreate, which is where Capacitor reads the intent. Any
    // later and the old shortcut has already been told to the app.
    const guard = main.indexOf("ShortcutActivity.isShortcut(launch.getData())");
    const capacitor = main.indexOf("super.onCreate(savedInstanceState)");
    expect(guard, "MainActivity no longer looks for an old shortcut").toBeGreaterThan(-1);
    expect(capacitor, "the check has to come before super.onCreate").toBeGreaterThan(guard);
    // Both ways back: rebuilt from a saved state, and opened again from the
    // recent apps list after a restart, which leaves no saved state.
    const check = main.slice(guard, capacitor);
    expect(check).toContain("savedInstanceState != null");
    expect(check).toContain("FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY");
    expect(check).toContain("launch.setData(null)");
  });

  it("have a short and a long label each, in the words the reader is shown", () => {
    for (const id of SHORTCUT_IDS) {
      const name = `shortcut_${id.replace(/-/g, "_")}`;
      expect(xml).toContain(`android:shortcutShortLabel="@string/${name}_short"`);
      expect(xml).toContain(`android:shortcutLongLabel="@string/${name}_long"`);
      for (const size of ["short", "long"]) {
        const raw = strings.match(new RegExp(`<string name="${name}_${size}">([^<]*)</string>`))?.[1];
        expect(raw, `${name}_${size} is not in strings.xml`).toBeDefined();
        // An apostrophe has to be escaped in strings.xml, or the build stops.
        expect(raw, `${name}_${size} has a bare apostrophe`).not.toMatch(/(^|[^\\])'/);
        expect(raw!.replace(/\\'/g, "'")).toBe(LABELS[id]);
      }
    }
  });

  it("use the app's own icon, there being no artwork for them", () => {
    expect(new Set(all(xml, /android:icon="([^"]+)"/g))).toEqual(new Set(["@mipmap/ic_launcher"]));
  });
});

describe("the iPhone shortcuts", () => {
  const plist = readFileSync("ios/App/App/Info.plist", "utf8");
  const delegate = readFileSync("ios/App/App/AppDelegate.swift", "utf8");
  const items = plist.match(/<key>UIApplicationShortcutItems<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] ?? "";
  const valueOf = (key: string) => all(items, new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`, "g"));

  it("are the same three, in the same order, with the same addresses", () => {
    expect(valueOf("UIApplicationShortcutItemType")).toEqual(SHORTCUT_IDS.map(shortcutUrl));
  });

  it("carry the same words as Android", () => {
    expect(valueOf("UIApplicationShortcutItemTitle")).toEqual(SHORTCUT_IDS.map((id) => LABELS[id]));
  });

  it("have a system symbol each and no picture file", () => {
    expect(valueOf("UIApplicationShortcutItemIconSymbolName")).toHaveLength(SHORTCUT_IDS.length);
    expect(items).not.toMatch(/UIApplicationShortcutItemIconFile/);
  });

  it("are handed to Capacitor as an opened URL", () => {
    expect(delegate).toMatch(/performActionFor shortcutItem: UIApplicationShortcutItem/);
    expect(delegate).toMatch(/ApplicationDelegateProxy\.shared\.application\(application, open: url/);
  });
});

describe("the listener in the app", () => {
  const listener = readFileSync("components/native/ShortcutListener.tsx", "utf8");
  // The root layout renders one client component around every page, and
  // the listener is mounted in it.
  const layout = readFileSync("app/layout.tsx", "utf8");
  const frame = readFileSync("components/layout/RootFrame.tsx", "utf8");

  it("is mounted on every screen", () => {
    expect(layout).toMatch(/<RootFrame\b/);
    expect(frame).toMatch(/<ShortcutListener \/>/);
  });

  it("hears a tap while the app is open and one that started it", () => {
    expect(listener).toMatch(/addListener\("appUrlOpen"/);
    expect(listener).toMatch(/getLaunchUrl\(\)/);
    expect(listener).toContain("LAUNCH_ASKED_KEY");
    expect(LAUNCH_ASKED_KEY).toMatch(/^purify:/);
  });

  it("leaves the reader be when Continue reading names the chapter they are in", () => {
    const skip = listener.indexOf("alreadyThere(id, window.location.pathname, target)");
    expect(skip, "the listener no longer asks alreadyThere").toBeGreaterThan(-1);
    expect(listener.indexOf("router.push(target)")).toBeGreaterThan(skip);
  });

  it("goes through the router and never navigates by itself", () => {
    expect(listener).toMatch(/router\.push\(/);
    // A CALL or an assignment, not prose. A hard navigation inside the shell
    // is handed the front door (lib/push/open.ts).
    expect(listener).not.toMatch(/window\.location\.assign\s*\(|window\.location\.href\s*=|location\.replace\s*\(/);
  });
});
