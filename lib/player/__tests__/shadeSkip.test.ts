// Back 15 and forward 15 in Android's shade (1.9; set for 1.9.1 on the
// arbiter's word of 2026-11-10, built for 1.9 on his of 2026-11-11, "No, not
// 1.9.1"). From Android 13 the shade's player is drawn from the media
// session's playback state, where rewind and fast-forward, all the plugin
// offered, have no button; custom actions do. What a reader would notice if
// this broke: only play or pause in the shade on a newer phone, a button that
// does nothing, or the plugin's "30" on a button that moves 15.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const PATCH = "patches/@capgo+capacitor-media-session+8.1.0.patch";
const PLUGIN = "node_modules/@capgo/capacitor-media-session";
const JAVA = `${PLUGIN}/android/src/main/java/com/capgo/mediasession`;
const DRAWABLE = `${PLUGIN}/android/src/main/res/drawable`;

describe("the shade's back 15 and forward 15", () => {
  it("are a patch to the plugin, applied on every install", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; devDependencies: Record<string, string> };
    expect(pkg.scripts.postinstall).toBe("patch-package");
    expect(pkg.devDependencies["patch-package"]).toBe("8.0.0");
    // The patch is for the version installed: a newer plugin means the patch is made again.
    expect((JSON.parse(read(`${PLUGIN}/package.json`)) as { version: string }).version).toBe("8.1.0");
    const patch = read(PATCH);
    for (const piece of ["addCustomAction", "onCustomAction", "ic_purify_back_15.xml", "ic_purify_forward_15.xml"]) expect(patch, piece).toContain(piece);
  });

  it("stand in the session's playback state beside each seek handler, and come back to the page as that handler", () => {
    // What is installed here is the patched plugin: the install step ran.
    const service = read(`${JAVA}/MediaSessionService.java`);
    expect(service).toContain('static final String CUSTOM_SEEK_BACKWARD = "purify.seekbackward";');
    expect(service).toContain('static final String CUSTOM_SEEK_FORWARD = "purify.seekforward";');
    expect(service).toMatch(/plugin\.hasActionHandler\("seekbackward"\)\) \{\s*playbackStateBuilder\.addCustomAction\(/);
    expect(service).toMatch(/plugin\.hasActionHandler\("seekforward"\)\) \{\s*playbackStateBuilder\.addCustomAction\(/);
    // A fresh builder each time, so an action whose handler has gone goes with it.
    expect(service).toContain("playbackStateBuilder = new PlaybackStateCompat.Builder().setActions(activePlaybackStateActions);");
    const callback = read(`${JAVA}/MediaSessionCallback.java`);
    expect(callback).toMatch(/CUSTOM_SEEK_BACKWARD\.equals\(action\)\) \{\s*plugin\.actionCallback\("seekbackward"\);/);
    expect(callback).toMatch(/CUSTOM_SEEK_FORWARD\.equals\(action\)\) \{\s*plugin\.actionCallback\("seekforward"\);/);
    // And the page answers those handlers 15 seconds at a time (lib/player/lockScreen.ts).
    const bridge = read("lib/player/lockScreen.ts");
    expect(bridge).toMatch(/"seekbackward",\s*\(\) => \{\s*if \(!soundsOnly\(\)\) skipBy\(-15\);/);
    expect(bridge).toMatch(/"seekforward",\s*\(\) => \{\s*if \(!soundsOnly\(\)\) skipBy\(15\);/);
  });

  it("wear the player's own glyph, its 15 and not the plugin's 30, on every Android", () => {
    for (const name of ["back", "forward"]) {
      const xml = read(`${DRAWABLE}/ic_purify_${name}_15.xml`);
      expect(xml).toContain('android:viewportWidth="24"');
      expect(xml).toContain('android:strokeWidth="1.7"');
    }
    // The round arrows are the in-app player's (components/player/Transport.tsx, SkipGlyph).
    const glyph = read("components/player/Transport.tsx");
    expect(read(`${DRAWABLE}/ic_purify_back_15.xml`)).toContain("M4.5 12a7.5 7.5 0 1 0 2.4-5.5");
    expect(glyph).toContain('<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />');
    expect(read(`${DRAWABLE}/ic_purify_forward_15.xml`)).toContain("M19.5 12a7.5 7.5 0 1 1-2.4-5.5");
    expect(glyph).toContain('<path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />');
    const service = read(`${JAVA}/MediaSessionService.java`);
    expect(service).not.toContain("ic_baseline_replay_30_24");
    expect(service).not.toContain("ic_baseline_forward_30_24");
  });
});
