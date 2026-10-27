// Open almost at once, on the horizon: the intro the apps paint before their
// code runs.
//
// What a reader would notice if this broke: the logo for a second again on
// every open, which is only slow. Or English words under the logo on a Greek
// phone. Or the cross jumping in size as the logo goes. Or, worst, a cover
// that never goes away, with the app alive underneath it and no way to reach
// it.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LaunchFrame } from "@/components/native/LaunchFrame";

import { INTRO_BUILD_MS, LAUNCH_CROSS_PX, LAUNCH_FRAME_MAX_MS, LIFT_ANYWAY_MS, LIFT_AT_FIRST_PAINT, OPEN_AT_FIRST_PAINT } from "../launchFrame";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = renderToStaticMarkup(createElement(LaunchFrame));
const cover = html.slice(0, html.indexOf("<script"));
// The cross is written in as the file's own bytes; the checks on words and
// colours read everything else.
const CROSS_URI = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, "public/purify-cross-mark.png")).toString("base64")}`;
const shapes = cover.replace(CROSS_URI, "");
// A PNG's width and height, from its header.
const size = (file: string) => {
  const b = fs.readFileSync(path.join(ROOT, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe("the intro", () => {
  it("is on, until the owner has felt it on a phone and says otherwise", () => {
    expect(OPEN_AT_FIRST_PAINT).toBe(true);
  });

  it("has no words in it, in any language", () => {
    // The apps are built in English. A word here is English on every phone
    // for as long as the cover is up.
    expect(shapes.replace(/<[^>]+>/g, "").trim()).toBe("");
    expect(shapes).not.toMatch(/aria-label|title=|placeholder=|alt="[^"]/);
  });

  it("is hidden from a screen reader and covers the page", () => {
    expect(cover).toContain('data-launch-frame=""');
    expect(cover).toContain('aria-hidden="true"');
    expect(cover).toMatch(/class="[^"]*\bfixed\b[^"]*\binset-0\b/);
  });

  it("sits over everything, as the logo screen did", () => {
    // A first run mounts the onboarding flow, and a slow phone the motion
    // notice, before the app says it is ready. Under the logo neither was
    // seen. The highest layer in the app when this was written was 140.
    const layer = Number(/\bz-\[(\d+)\]/.exec(cover)?.[1]);
    expect(layer).toBe(200);
    for (const file of ["components/onboarding/OnboardingFlow.tsx", "components/ui/MotionNotice.tsx", "components/native/PressToCopy.tsx"]) {
      for (const [, z] of read(file).matchAll(/\bz-\[(\d+)\]/g)) expect(Number(z), file).toBeLessThan(layer);
    }
  });

  it("is always the night, drawn in the page's own night and paper", () => {
    // Dark on every palette, as the phone's logo screen is: on Parchment,
    // where night is the light page, dark-island hands the night back. And
    // no colour written out, so each dark palette draws it in its own, with
    // no yellow or gold at all.
    expect(cover).toMatch(/class="dark-island [^"]*\bbg-night\b/);
    expect(shapes).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    expect(shapes).not.toMatch(/gold|yellow|amber|festal/);
    const classes = [...shapes.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    const shades = new Set(classes.map((c) => /^(?:bg|text|border|fill|stroke)-([a-z]+(?:-[a-z]+)?)(?:\/\d+)?$/.exec(c)?.[1]).filter(Boolean));
    expect([...shades].sort()).toEqual(["night", "paper"]);
    expect(shapes).toContain("fill:var(--color-night)");
  });

  it("draws the real cross, where and as large as the phone's logo screen does", () => {
    // Not a redraw: the file's own bytes. In the middle of the screen,
    // LAUNCH_CROSS_PX tall, in pixels, so the hand-over from the logo screen
    // cannot be seen and a reader's text size cannot move it.
    expect(cover).toContain(`src="${CROSS_URI}"`);
    const img = /<img[^>]*class="launch-cross[^"]*"[^>]*>/.exec(cover)?.[0] ?? "";
    expect(img).toMatch(/\bleft-1\/2\b/);
    expect(img).toMatch(/\btop-1\/2\b/);
    expect(img).toContain(`height:${LAUNCH_CROSS_PX}px`);
    expect(img).toContain(`margin-top:-${LAUNCH_CROSS_PX / 2}px`);
    expect(LAUNCH_CROSS_PX).toBe(80);
  });

  it("keeps its stars above the horizon and clear of the cross", () => {
    // The crest is at 71% of the screen and falls away to the sides.
    expect(cover).toContain("top-[71%]");
    const stars = [...cover.matchAll(/<i [^>]*style="left:([\d.]+)%;top:([\d.]+)%/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(stars.length).toBeGreaterThan(20);
    for (const s of stars) {
      expect(s.y).toBeLessThan(61);
      expect(Math.abs(s.x - 50) >= 11 || Math.abs(s.y - 50) >= 9, `${s.x}% ${s.y}%`).toBe(true);
    }
  });

  it("is followed by its script, in the document, after it", () => {
    expect(html.indexOf("<script")).toBeGreaterThan(html.indexOf("data-launch-frame"));
    expect(html).toContain("nativePromise");
  });
});

describe("the phone's own logo screens, drawn to match", () => {
  it("on the iPhone: the cross alone, LAUNCH_CROSS_PX points tall, drawn at its own size in the middle", () => {
    const set = "ios/App/App/Assets.xcassets/Splash.imageset";
    const { images } = JSON.parse(read(`${set}/Contents.json`)) as { images: { filename: string; scale: string }[] };
    expect(images.map((i) => i.scale)).toEqual(["1x", "2x", "3x"]);
    for (const { filename, scale } of images) {
      expect(size(`${set}/${filename}`).h, filename).toBe(LAUNCH_CROSS_PX * Number.parseInt(scale));
    }
    const board = read("ios/App/App/Base.lproj/LaunchScreen.storyboard");
    expect(board).toMatch(/<imageView key="view"[^>]*contentMode="center"[^>]*image="Splash"/);
    // The night behind it: #101013.
    expect(board).toContain('red="0.062745098039215685" green="0.062745098039215685" blue="0.074509803921568626"');
  });

  it("on Android: the splash icon is the cross on a 288 dp square, at the same proportion, on the night", () => {
    // Android draws a splash icon without a background 288 dp square whatever
    // the image's size, so the cross must be LAUNCH_CROSS_PX of 288 of it.
    expect(size("android/app/src/main/res/drawable-nodpi/splash_cross.png")).toEqual({ w: 288 * 4, h: 288 * 4 });
    expect(read("scripts/launch-assets.mjs")).toContain(`const CROSS_PX = ${LAUNCH_CROSS_PX};`);
    const styles = read("android/app/src/main/res/values/styles.xml");
    const launch = /<style name="AppTheme\.NoActionBarLaunch"[^>]*>([\s\S]*?)<\/style>/.exec(styles)?.[1] ?? "";
    expect(launch).toContain('<item name="windowSplashScreenAnimatedIcon">@drawable/splash_cross</item>');
    expect(launch).toContain('<item name="windowSplashScreenBackground">@color/launch_night</item>');
    expect(read("android/app/src/main/res/values/colors.xml")).toContain('<color name="launch_night">#101013</color>');
  });

  it("and Capacitor's stock blue X is gone from every folder", () => {
    const res = "android/app/src/main/res";
    const left = fs.readdirSync(path.join(ROOT, res)).filter((dir) => fs.existsSync(path.join(ROOT, res, dir, "splash.png")));
    expect(left).toEqual([]);
    expect(read(`${res}/drawable/splash.xml`)).toContain('android:drawable="@drawable/splash_cross"');
  });
});

describe("the script that lifts the logo screen", () => {
  type Shell = "bridge" | "throws" | "rejects" | "none" | "empty";
  const run = (shell: Shell, { frames: hasFrames = true } = {}) => {
    const calls: unknown[][] = [];
    const attrs: Record<string, string> = {};
    const frames: (() => void)[] = [];
    const timers: { fn: () => void; ms: number }[] = [];
    const caught: unknown[] = [];
    const capacitor =
      shell === "none"
        ? undefined
        : shell === "empty"
          ? {}
          : {
              nativePromise: (...a: unknown[]) => {
                calls.push(a);
                if (shell === "throws") throw new Error("no such plugin");
                if (shell === "rejects") return { catch: (fn: unknown) => caught.push(fn) };
                return undefined;
              },
            };
    const sandbox: Record<string, unknown> = {
      Capacitor: capacitor,
      requestAnimationFrame: hasFrames ? (f: () => void) => frames.push(f) : undefined,
      setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
      document: {
        documentElement: {
          getAttribute: (k: string) => attrs[k] ?? null,
          setAttribute: (k: string, v: string) => {
            attrs[k] = v;
          },
        },
      },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(LIFT_AT_FIRST_PAINT, sandbox);
    return { calls, attrs, frames, timers, caught };
  };

  const timer = (timers: { fn: () => void; ms: number }[], ms: number) => timers.find((t) => t.ms === ms)!;

  it("waits two frames, so the cover has been painted, then asks once", () => {
    const { calls, attrs, frames, timers } = run("bridge");
    expect(calls).toEqual([]);
    expect(attrs["data-launch"]).toBeUndefined();
    expect(frames).toHaveLength(1);
    frames[0]();
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(2);
    frames[1]();
    expect(calls).toEqual([["SplashScreen", "hide", { fadeOutDuration: 200 }]]);
    expect(attrs["data-launch"]).toBe("frame");
    // The net under the frames finds the job done and does not ask again.
    timer(timers, LIFT_ANYWAY_MS).fn();
    expect(calls).toHaveLength(1);
  });

  it("marks the intro played a full build after it asks, and only once", () => {
    const { attrs, frames, timers } = run("bridge");
    frames[0]();
    frames[1]();
    timer(timers, LIFT_ANYWAY_MS).fn();
    expect(timers.filter((t) => t.ms === INTRO_BUILD_MS)).toHaveLength(1);
    expect(attrs["data-intro"]).toBeUndefined();
    timer(timers, INTRO_BUILD_MS).fn();
    expect(attrs["data-intro"]).toBe("played");
    // Played is not ready: the app still says that.
    expect(attrs["data-launch"]).toBe("frame");
  });

  it("does not wait for frames that never come", () => {
    // A web view that holds its frames back while the phone's own logo screen
    // is up would otherwise keep the logo until the app's limit.
    const { calls, attrs, frames, timers } = run("bridge");
    expect(LIFT_ANYWAY_MS).toBeGreaterThan(2 * 16);
    expect(LIFT_ANYWAY_MS).toBeLessThan(500);
    timer(timers, LIFT_ANYWAY_MS).fn();
    expect(calls).toEqual([["SplashScreen", "hide", { fadeOutDuration: 200 }]]);
    expect(attrs["data-launch"]).toBe("frame");
    // And when the frames come after all, it has already asked.
    frames[0]();
    frames[1]();
    expect(calls).toHaveLength(1);
  });

  it("does nothing but mark the page where there is no shell", () => {
    for (const shell of ["none", "empty"] as const) {
      const { attrs, frames, calls } = run(shell);
      frames[0]();
      frames[1]();
      expect(attrs["data-launch"], shell).toBe("frame");
      expect(calls).toEqual([]);
    }
  });

  it("does not take the page back from an app that is already up", () => {
    const { attrs, frames } = run("bridge");
    attrs["data-launch"] = "ready";
    frames[0]();
    frames[1]();
    expect(attrs["data-launch"]).toBe("ready");
  });

  it("never leaves the cover up: after the limit it says ready, and played, itself", () => {
    const { attrs, timers } = run("bridge");
    expect(timers.map((t) => t.ms).sort((a, b) => a - b)).toEqual([LIFT_ANYWAY_MS, LAUNCH_FRAME_MAX_MS]);
    // Longer than the app's own limit for lifting the logo screen, so this is
    // the net under that one and never the first to act.
    expect(LAUNCH_FRAME_MAX_MS).toBeGreaterThan(4000);
    timer(timers, LAUNCH_FRAME_MAX_MS).fn();
    expect(attrs["data-launch"]).toBe("ready");
    expect(attrs["data-intro"]).toBe("played");
  });

  it("survives a shell that throws, and one whose answer is a refusal", () => {
    const thrown = run("throws");
    thrown.frames[0]();
    expect(() => thrown.frames[1]()).not.toThrow();
    expect(thrown.attrs["data-launch"]).toBe("frame");
    // And the intro is still marked played: the timer is set before the call.
    expect(thrown.timers.filter((t) => t.ms === INTRO_BUILD_MS)).toHaveLength(1);

    // A refused promise nobody listens to is reported as an error by the web
    // view. The script listens, and does nothing with it.
    const refused = run("rejects");
    refused.frames[0]();
    refused.frames[1]();
    expect(refused.caught).toHaveLength(1);
    expect(typeof refused.caught[0]).toBe("function");
  });

  it("still runs where there are no animation frames", () => {
    const { attrs, timers, calls } = run("bridge", { frames: false });
    // The first of the two waits, the net under them, and the limit.
    expect(timers.map((t) => t.ms).sort((a, b) => a - b)).toEqual([16, LIFT_ANYWAY_MS, LAUNCH_FRAME_MAX_MS]);
    timers.find((t) => t.ms === 16)!.fn();
    timers.filter((t) => t.ms === 16)[1].fn();
    expect(calls).toHaveLength(1);
    expect(attrs["data-launch"]).toBe("frame");
  });

  it("is plain enough for an old web view", () => {
    expect(LIFT_AT_FIRST_PAINT).not.toMatch(/=>|\?\.|\blet\b|\bconst\b|`/);
    // And it closes no tag early: it is written into the document as it is.
    expect(LIFT_AT_FIRST_PAINT).not.toMatch(/<\/|<!--/);
  });
});

describe("where it is written, and how it goes", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  const bridge = read("components/native/NativeBridge.tsx");

  it("is in the apps' document only, and only while the switch is on", () => {
    expect(page).toContain("{IS_STATIC_EXPORT && OPEN_AT_FIRST_PAINT ? <LaunchFrame /> : null}");
    expect(page.split("<LaunchFrame").length - 1).toBe(1);
  });

  it("goes when the app is ready and the intro has played, and lets the taps through at once", () => {
    const rule = /html\[data-launch="ready"\]\[data-intro="played"\]\s+\[data-launch-frame\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/opacity:\s*0;/);
    expect(rule).toMatch(/visibility:\s*hidden;/);
    expect(rule).toMatch(/pointer-events:\s*none;/);
    // Not on ready alone, or a fast phone would cut the intro off as it starts.
    expect(css).not.toMatch(/html\[data-launch="ready"\]\s+\[data-launch-frame\]/);
  });

  it("builds inside INTRO_BUILD_MS, so the cover never leaves on a half-risen horizon", () => {
    // Every part's delay and length, from the stylesheet and the stars' own.
    const ends = [...css.matchAll(/^\.launch-[a-z]+(?: > i)? \{[^}]*?animation: launch-[a-z]+ (\d+)ms [^;]*?(?: (\d+)ms)? both;/gm)].map((m) => Number(m[1]) + Number(m[2] ?? 0));
    expect(ends.length).toBe(4);
    const star = Number(/animation: launch-star (\d+)ms/.exec(css)?.[1]);
    const latest = Math.max(...[...cover.matchAll(/animation-delay:(\d+)ms/g)].map((m) => Number(m[1])));
    expect(Math.max(...ends, star + latest)).toBeLessThanOrEqual(INTRO_BUILD_MS);
  });

  it("with motion off it is the finished picture, and goes at once", () => {
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-launch-frame\] \* \{\s*animation: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-launch-frame\],\s*:where\(\[data-motion="reduce"\]\) \[data-launch-stage\] \{\s*transition: none;/);
  });

  it("is still lifted by the app itself, with its own limit, as before", () => {
    // The early call may do nothing on some phone. This is what opened the
    // apps before it, and it is untouched.
    expect(bridge).toContain('document.documentElement.dataset.launch = "ready"');
    expect(bridge).toContain("SplashScreen.hide()");
    expect(bridge).toMatch(/setTimeout\(\(\) => void hideSplash\(\), 4000\)/);
  });

  it("and the app marks the intro played too, a full intro after ready, in case the document's lines never ran", () => {
    expect(bridge).toMatch(/playedNet \?\?= setTimeout\(\(\) => \{\s*document\.documentElement\.dataset\.intro = "played";\s*\}, INTRO_BUILD_MS\);/);
    expect(bridge).toContain("clearTimeout(playedNet)");
  });

  it("and the app's lift does not depend on frames coming either", () => {
    // Two frames after the language is settled, as before. And under them,
    // the same moment the document's own lines wait, then the screen itself
    // is asked for: in the page, the logo goes.
    expect(bridge).toMatch(/requestAnimationFrame\(\(\) =>\s*requestAnimationFrame\(/);
    expect(bridge).toContain("setTimeout(drawn, LIFT_ANYWAY_MS)");
    expect(bridge).toMatch(/if \(cancelled \|\| lifted\) return;\s*if \(document\.querySelector\("\[data-route-content\]"\)\) void hideSplash\(\);/);
    expect(bridge).toContain("clearTimeout(anyway)");
    // The mark it looks for is the one the front door puts on Today.
    expect(page).toContain("<div data-route-content");
  });
});
