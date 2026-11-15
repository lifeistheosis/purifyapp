// The keyboard's slide, frame by frame (build 98 notes 4 and 12).
//
// His words, 2026-11-15: "when you click to type it still had a freeze frame
// bug" (the journal, about 21:13 UTC) and "when click the search there's still
// a random screen stutter that makes it not smooth" (Search, about 22:00 UTC).
//
// On Android the app's window is drawn edge to edge, and the safe-area plugin
// makes room for the keyboard by padding the window at its foot
// (returnKeyboard.test.ts). Android calls its insets listener once, at the
// START of the keyboard's slide, with the slide's END: the keyboard's whole
// height. So the web view was made shorter by the whole keyboard in one step
// while the keys were still sliding up: the page held, then jumped, and the
// window's own ground (#101013, MainActivity) showed under its foot until the
// keys covered it. Closing did the same the other way.
//
// The mend is in the same patch to the plugin: while a slide runs, the
// listener leaves the room where it stands, and a WindowInsetsAnimation
// callback sets it to the keys' height on every frame of the slide (onProgress
// runs before that frame is laid out and drawn), so the window follows the
// keys in and out and no frame is drawn at the wrong size. At the slide's end
// the listener is asked again and sets the room as it always has.
//
// What a reader would notice if this broke: the freeze and the jump again when
// a field takes the focus, a dark band under a light page's foot as the keys
// rise, or, the other way, a page left short by the keyboard's height after
// the keyboard has gone.
//
// A browser cannot show these frames; only a phone does. The walk his test
// build needs is written in docs/1.9-build/notes/build-98.md, note 4.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const PATCH = "patches/@capacitor-community+safe-area+8.0.1.patch";
const JAVA = "node_modules/@capacitor-community/safe-area/android/src/main/java/com/getcapacitor/community/safearea/SafeAreaPlugin.java";

/** A part of the installed plugin, from one marker to the next. */
function part(java: string, from: string, to: string): string {
  const at = java.indexOf(from);
  expect(at, from).toBeGreaterThan(-1);
  const end = java.indexOf(to, at + from.length);
  expect(end, to).toBeGreaterThan(at);
  return java.slice(at, end);
}

describe("the keyboard's slide on Android", () => {
  it("is in the patch, installed: a callback for the slide on the window the listener pads", () => {
    const patch = read(PATCH);
    expect(patch).toContain("+    private class KeyboardSlide extends WindowInsetsAnimationCompat.Callback {");
    const java = read(JAVA);
    const setup = part(java, "private void setupSafeAreaInsets()", "private int room(");
    // The same view, the window's decor: the listener's and the slide's.
    expect(setup).toContain("View view = getActivity().getWindow().getDecorView();");
    expect(setup).toContain("ViewCompat.setOnApplyWindowInsetsListener(view, (v, windowInsets) -> {");
    expect(setup).toContain("ViewCompat.setWindowInsetsAnimationCallback(view, new KeyboardSlide(view));");
    // Below it (the web view) everything still hears the slide.
    expect(java).toContain("super(DISPATCH_MODE_CONTINUE_ON_SUBTREE);");
  });

  it("leaves the room where it stands while a slide runs, instead of the keyboard's whole height in one step", () => {
    const java = read(JAVA);
    const setup = part(java, "private void setupSafeAreaInsets()", "private int room(");
    // Both paddings the listener sets go through room(): the end it is handed waits for the slide's end.
    expect(setup).toContain("v.setPadding(0, 0, 0, room(v, keyboardVisible ? imeInsets.bottom : 0));");
    expect(setup).toContain(
      "v.setPadding(systemBarsInsets.left, systemBarsInsets.top, systemBarsInsets.right, room(v, keyboardVisible ? imeInsets.bottom : systemBarsInsets.bottom));",
    );
    expect(setup.match(/v\.setPadding\(/g)).toHaveLength(2);
    expect(java).toMatch(/private int room\(View v, int settled\) \{\s*return keyboardSliding \? v\.getPaddingBottom\(\) : settled;\s*\}/);
    // The room with no keyboard, as the listener reads it: none where the page draws under the bars, else the bar.
    expect(setup).toContain("roomAtRest = shouldPassthroughInsets ? 0 : systemBarsInsets.bottom;");
  });

  it("decides before the listener hears the slide's end: the app's own keyboard coming, or the room made for it going", () => {
    const java = read(JAVA);
    const prepare = part(java, "public void onPrepare(", "public WindowInsetsCompat onProgress(");
    expect(prepare).toContain("if (!isKeyboard(animation)) return;");
    // Another app's keyboard, met coming back to Purify (build 95 note 14), gets no room, as before.
    expect(prepare).toContain("if (!following) following = keyboardIsTheApps() || view.getPaddingBottom() > roomAtRest;");
    expect(prepare).toContain("keyboardSliding = following;");
    expect(java).toMatch(/private static boolean isKeyboard\(WindowInsetsAnimationCompat animation\) \{\s*return \(animation\.getTypeMask\(\) & WindowInsetsCompat\.Type\.ime\(\)\) != 0;\s*\}/);
  });

  it("sets the room to the keys' height on every frame of the slide, never below the room at rest", () => {
    const java = read(JAVA);
    const progress = part(java, "public WindowInsetsCompat onProgress(", "public void onEnd(");
    expect(progress).toContain("if (!following) return insets;");
    expect(progress).toContain("if (!isKeyboard(animation)) continue;");
    expect(progress).toContain("int keys = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;");
    expect(progress).toContain("int room = Math.max(roomAtRest, keys);");
    expect(progress).toContain("view.setPadding(view.getPaddingLeft(), view.getPaddingTop(), view.getPaddingRight(), room);");
    // The insets go on down unchanged: the page's safe area is the listener's, as before.
    expect(progress).toContain("return insets;");
  });

  it("hands back to the listener when the last slide ends, or when a slide has lost its end", () => {
    const java = read(JAVA);
    const end = part(java, "public void onEnd(", "private static boolean isKeyboard(");
    // A slide turned back half way is ended by the next: the room follows on until the last one ends.
    expect(end).toContain("slides = Math.max(0, slides - 1);");
    expect(end).toContain("if (slides == 0 && following) end();");
    expect(end).toMatch(/private void end\(\) \{\s*following = false;\s*keyboardSliding = false;\s*slides = 0;\s*view\.removeCallbacks\(endIfLost\);\s*view\.requestApplyInsets\(\);\s*\}/);
    // Never a page left short: a slide with no frame for two seconds is ended by the listener.
    expect(java).toContain("private static final long QUIET_MS = 2000;");
    expect(part(java, "public void onPrepare(", "public WindowInsetsCompat onProgress(")).toContain("view.postDelayed(endIfLost, QUIET_MS);");
  });

  it("is the only part of the app that moves the window for the keyboard", () => {
    const activity = read("android/app/src/main/java/net/purifyapp/purify/MainActivity.java");
    expect(activity).not.toContain("setWindowInsetsAnimationCallback");
    expect(activity).not.toContain("setOnApplyWindowInsetsListener");
    const java = read(JAVA);
    expect(java.match(/setWindowInsetsAnimationCallback\(/g)).toHaveLength(1);
  });
});
