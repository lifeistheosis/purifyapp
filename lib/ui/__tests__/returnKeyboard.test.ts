// Coming back to the app while another app's keyboard is up (build 95 note 14,
// his word, 2026-11-13 about 07:46 UTC: "whenever I ran out of purify and tab
// back in there's always a UI moving issue. for example. when my keyboard is
// open on another app and I switch into purify the UI shows up weird then it
// fixes itself").
//
// On Android the app's window is drawn edge to edge, and the safe-area plugin
// (@capacitor-community/safe-area) makes room for the keyboard by padding the
// window at its foot, so the web view is as tall as what the keyboard leaves.
// It did that for any keyboard Android reported to the window. Coming back
// while another app's keyboard is still going away, Android reports that
// keyboard to Purify's window too, until it has put it away: every screen was
// drawn short by the keyboard's height (the bars halfway up, a sheet cut in
// two, the window's dark ground below), then tall again. Stood in for on the
// export (scripts/return-walk.mjs, foreign), every main screen came back
// 336px short and was not as it was left on 14 to 17 of the 89 frames after
// the first; without the padding, on none.
//
// The mend is a patch to the plugin: room is made only for a keyboard that a
// field in the page asked for. The web view answers that itself: it is a text
// editor only while one of the page's fields has the focus.
//
// What a reader would notice if this broke: the screen jumping as they come
// back from typing in another app, or, the other way, Purify's own keyboard
// covering the field it was opened for.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const PATCH = "patches/@capacitor-community+safe-area+8.0.1.patch";
const PLUGIN = "node_modules/@capacitor-community/safe-area";
const JAVA = `${PLUGIN}/android/src/main/java/com/getcapacitor/community/safearea/SafeAreaPlugin.java`;

/** The window insets listener the plugin sets on the window, as installed. */
function listener(): string {
  const java = read(JAVA);
  const at = java.indexOf("private void setupSafeAreaInsets()");
  expect(at, "setupSafeAreaInsets").toBeGreaterThan(-1);
  return java.slice(at, java.indexOf("private int getBottomInset", at));
}

describe("another app's keyboard, as the reader comes back", () => {
  it("is a patch to the plugin, applied on every install, for the version installed", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies: Record<string, string> };
    expect(pkg.scripts.postinstall).toBe("patch-package");
    // The patch is for the version installed: a newer plugin means the patch is made again.
    expect((JSON.parse(read(`${PLUGIN}/package.json`)) as { version: string }).version).toBe("8.0.1");
    const patch = read(PATCH);
    expect(patch).toContain("+    private boolean keyboardIsTheApps() {");
    expect(patch).toContain("-            boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());");
  });

  it("gets no room: the window is padded only for a keyboard a field in the page asked for", () => {
    const java = read(JAVA);
    // What is installed here is the patched plugin: the install step ran.
    expect(java).toContain("import android.webkit.WebView;");
    expect(java).toMatch(
      /private boolean keyboardIsTheApps\(\) \{\s*WebView webView = getBridge\(\) == null \? null : getBridge\(\)\.getWebView\(\);\s*return webView != null && webView\.hasFocus\(\) && webView\.onCheckIsTextEditor\(\);\s*\}/,
    );
    const body = listener();
    // One reading of the keyboard, and it is the app's own or none.
    expect(body).toContain("boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime()) && keyboardIsTheApps();");
    expect(body.match(/isVisible\(WindowInsetsCompat\.Type\.ime\(\)\)/g)).toHaveLength(1);
    // Every use of the keyboard in the listener goes through that reading:
    // the padding on both branches and the bottom inset handed to the page.
    expect(body).toContain("v.setPadding(0, 0, 0, keyboardVisible ? imeInsets.bottom : 0);");
    expect(body).toContain("keyboardVisible ? imeInsets.bottom : systemBarsInsets.bottom");
    expect(body).toContain("getBottomInset(systemBarsInsets, keyboardVisible)");
    expect(body.match(/imeInsets\.bottom/g)).toHaveLength(2);
  });

  it("leaves Purify's own keyboard as it was: the room is made while a field has the focus", () => {
    // The padding itself is the plugin's, unchanged: the keyboard's own height,
    // under a page whose field asked for it.
    const patch = read(PATCH);
    const removed = patch.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
    expect(removed).toEqual(["-            boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());"]);
    // The plugin is the only part of the app that pads the window for a
    // keyboard: Capacitor's own SystemBars inset handling is off (capacitor.config.ts),
    // and the activity sets no listener of its own (MainActivity.java).
    expect(read("capacitor.config.ts")).toMatch(/SystemBars: \{\s*insetsHandling: "disable",\s*\}/);
    const activity = read("android/app/src/main/java/net/purifyapp/purify/MainActivity.java");
    expect(activity).not.toContain("setOnApplyWindowInsetsListener");
    expect(activity).not.toContain("Type.ime()");
    // And no Keyboard plugin resizes the web view behind the patch's back.
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).not.toContain("@capacitor/keyboard");
  });
});
