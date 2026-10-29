// Open almost at once, on the horizon: the intro the apps paint before their
// code runs.
//
// What a reader would notice if this broke: the logo for a second again on
// every open, which is only slow. Or English words under the logo on a Greek
// phone. Or the cross jumping in size as the logo goes. Or, worst, a cover
// that never goes away, with the app alive underneath it and no way to reach
// it. And since 2026-10-28: the slow intro on every open of the day, or the
// quick one on the first, or an intro that starts on one pace and jumps to
// the other.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LaunchFrame } from "@/components/native/LaunchFrame";

import {
  INTRO_BUILD_MS,
  INTRO_DAY_KEY,
  INTRO_PACE_AT_FIRST_PAINT,
  INTRO_QUICK_BUILD_MS,
  LAUNCH_CROSS_PX,
  LAUNCH_FRAME_MAX_MS,
  LIFT_ANYWAY_MS,
  LIFT_AT_FIRST_PAINT,
  OPEN_AT_FIRST_PAINT,
} from "../launchFrame";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = renderToStaticMarkup(createElement(LaunchFrame));
// The cover alone: after the lines that choose its pace, before the lines
// that lift the logo screen.
const cover = html.slice(html.indexOf("<div data-launch-frame"), html.lastIndexOf("<script"));
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

  it("sits between its two scripts: the pace before it, the lift after it", () => {
    // The pace is on <html> before the cover is in the page, so no frame of
    // it is ever on the wrong one. The lift needs the cover in the page.
    const pace = html.indexOf(INTRO_PACE_AT_FIRST_PAINT);
    const frame = html.indexOf("<div data-launch-frame");
    const lift = html.indexOf(LIFT_AT_FIRST_PAINT);
    expect(html.startsWith("<script")).toBe(true);
    expect(pace).toBeGreaterThan(0);
    expect(frame).toBeGreaterThan(pace);
    expect(lift).toBeGreaterThan(frame);
    expect(html.split("<script").length - 1).toBe(2);
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
  const run = (shell: Shell, { frames: hasFrames = true, pace }: { frames?: boolean; pace?: string } = {}) => {
    const calls: unknown[][] = [];
    // The mark the lines before the cover left, if any.
    const attrs: Record<string, string> = pace === undefined ? {} : { "data-intro-pace": pace };
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
    const { attrs, frames, timers } = run("bridge", { pace: "slow" });
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

  it("waits the quick build when the pace is quick, and the slow one otherwise", () => {
    // The build the mark asks for, and no other.
    const built = (pace?: string) => {
      const { frames, timers } = run("bridge", { pace });
      frames[0]();
      frames[1]();
      return timers.map((t) => t.ms).filter((ms) => ms !== LIFT_ANYWAY_MS && ms !== LAUNCH_FRAME_MAX_MS);
    };
    expect(built("quick")).toEqual([INTRO_QUICK_BUILD_MS]);
    expect(built("slow")).toEqual([INTRO_BUILD_MS]);
    // No mark at all (the lines before the cover never ran): the slow one,
    // which the stylesheet also plays with no mark.
    expect(built()).toEqual([INTRO_BUILD_MS]);
    expect(built("anything else")).toEqual([INTRO_BUILD_MS]);
    expect(INTRO_QUICK_BUILD_MS).toBe(900);
    expect(INTRO_BUILD_MS).toBe(2400);
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

  it("is plain enough for an old web view, as are the lines that choose the pace", () => {
    for (const lines of [LIFT_AT_FIRST_PAINT, INTRO_PACE_AT_FIRST_PAINT]) {
      expect(lines).not.toMatch(/=>|\?\.|\blet\b|\bconst\b|`|padStart/);
      // And it closes no tag early: it is written into the document as it is.
      expect(lines).not.toMatch(/<\/|<!--/);
    }
  });
});

describe("the pace, by the reader's day", () => {
  // The owner, 2026-10-28: "a slow intro on their first use of the day and
  // then a fast one for the rest of the day". The lines before the cover,
  // run as the document runs them, against a phone's storage and clock.
  type Storage = "works" | "refuses" | "absent" | "full";
  const open = ({ stored, today, storage = "works" }: { stored?: string; today: [number, number, number]; storage?: Storage }) => {
    const attrs: Record<string, string> = {};
    const kept = new Map<string, string>(stored === undefined ? [] : [[INTRO_DAY_KEY, stored]]);
    const writes: [string, string][] = [];
    // The phone's clock, in the reader's own time.
    class PhoneDate {
      getFullYear() {
        return today[0];
      }
      getMonth() {
        return today[1] - 1;
      }
      getDate() {
        return today[2];
      }
    }
    const sandbox: Record<string, unknown> = {
      Date: PhoneDate,
      document: {
        documentElement: {
          getAttribute: (k: string) => attrs[k] ?? null,
          setAttribute: (k: string, v: string) => {
            attrs[k] = v;
          },
        },
      },
    };
    if (storage === "refuses") {
      Object.defineProperty(sandbox, "localStorage", {
        get() {
          throw new Error("SecurityError");
        },
      });
    } else if (storage === "absent") {
      sandbox.localStorage = null;
    } else {
      sandbox.localStorage = {
        getItem: (k: string) => kept.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (storage === "full") throw new Error("QuotaExceededError");
          writes.push([k, v]);
          kept.set(k, v);
        },
      };
    }
    sandbox.window = sandbox;
    expect(() => vm.runInNewContext(INTRO_PACE_AT_FIRST_PAINT, sandbox)).not.toThrow();
    return { pace: attrs["data-intro-pace"], writes, kept: kept.get(INTRO_DAY_KEY) };
  };

  it("plays slow on the first open ever, and writes the day down", () => {
    expect(open({ today: [2026, 10, 28] })).toEqual({ pace: "slow", writes: [[INTRO_DAY_KEY, "2026-10-28"]], kept: "2026-10-28" });
  });

  it("plays quick on every later open the same day, and writes nothing", () => {
    expect(open({ stored: "2026-10-28", today: [2026, 10, 28] })).toEqual({ pace: "quick", writes: [], kept: "2026-10-28" });
  });

  it("plays slow again on the first open of the next day, and of any later one", () => {
    expect(open({ stored: "2026-10-28", today: [2026, 10, 29] })).toEqual({ pace: "slow", writes: [[INTRO_DAY_KEY, "2026-10-29"]], kept: "2026-10-29" });
    expect(open({ stored: "2026-10-28", today: [2027, 1, 3] })).toMatchObject({ pace: "slow", kept: "2027-01-03" });
    // A clock set back is a different day too, and never a quick open.
    expect(open({ stored: "2026-10-28", today: [2026, 10, 27] })).toMatchObject({ pace: "slow", kept: "2026-10-27" });
  });

  it("goes by the reader's own calendar day, written the same way every time", () => {
    // Month and day with their leading zero, so one day is one string.
    expect(open({ today: [2026, 1, 5] }).kept).toBe("2026-01-05");
    expect(open({ stored: "2026-01-05", today: [2026, 1, 5] }).pace).toBe("quick");
    expect(open({ stored: "2026-1-5", today: [2026, 1, 5] }).pace).toBe("slow");
    expect(open({ stored: "2026-12-31", today: [2027, 1, 1] }).pace).toBe("slow");
  });

  it("plays slow, and never throws, on a phone whose storage cannot be read or written", () => {
    for (const storage of ["refuses", "absent", "full"] as const) {
      expect(open({ stored: "2026-10-28", today: [2026, 10, 29], storage }).pace, storage).toBe("slow");
    }
    // Storage that reads but will not write still knows a later open.
    expect(open({ stored: "2026-10-28", today: [2026, 10, 28], storage: "full" }).pace).toBe("quick");
  });

  it("keeps its day on the device, outside what a reader's export carries", () => {
    // The export, the import and Clear local data all take the "purify:" keys
    // (components/profile/ProfileData.tsx, ProfileDanger.tsx).
    expect(INTRO_DAY_KEY).toBe("purify.intro.day");
    expect(INTRO_DAY_KEY.startsWith("purify:")).toBe(false);
    expect(INTRO_PACE_AT_FIRST_PAINT).toContain(`'${INTRO_DAY_KEY}'`);
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

  // A rule's body, by its selector as the stylesheet writes it at a line's start.
  const body = (selector: string) => {
    const at = css.indexOf(`\n${selector} {`);
    return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
  };
  // The intro's four moving parts, and the latest moment any star comes out.
  const PARTS = [".launch-stars > i", ".launch-horizon", ".launch-level", ".launch-cross"];
  const latestStar = Math.max(...[...cover.matchAll(/--star-at:(\d+)ms/g)].map((m) => Number(m[1])));
  /** A part's [length, delay] in ms at a pace, as the stylesheet times it. */
  const timing = (part: string, pace: "slow" | "quick"): [number, number] => {
    const slow = /animation: launch-[a-z]+ (\d+)ms [^;]*?(?:(\d+)ms )?both;/.exec(body(part));
    let length = Number(slow?.[1]);
    let delay = part === ".launch-stars > i" ? latestStar : Number(slow?.[2] ?? 0);
    if (pace === "quick") {
      const quick = body(`html[data-intro-pace="quick"] ${part}`);
      length = Number(/animation-duration: (\d+)ms;/.exec(quick)?.[1] ?? length);
      const at = /animation-delay: ([^;]+);/.exec(quick)?.[1];
      if (at === "calc(var(--star-at) / 2)") delay = latestStar / 2;
      else if (at !== undefined) delay = Number(/^(\d+)ms$/.exec(at)?.[1] ?? NaN);
    }
    return [length, delay];
  };
  const built = (pace: "slow" | "quick") => Math.max(...PARTS.map((part) => timing(part, pace)).map(([length, delay]) => length + delay));

  it("builds inside its pace's build, so the cover never leaves on a half-risen horizon", () => {
    // Each star's moment is its own, written on it, and the stylesheet uses it.
    expect(body(".launch-stars > i")).toContain("animation-delay: var(--star-at);");
    expect(cover).not.toContain("animation-delay");
    expect(latestStar).toBeGreaterThan(0);
    // The first open of the day: done by 1800 ms, then held still to 2400.
    expect(built("slow")).toBeLessThanOrEqual(INTRO_BUILD_MS);
    expect(built("slow")).toBe(1800);
    // Every later one: done by 900 ms, and held for nothing.
    expect(built("quick")).toBeLessThanOrEqual(INTRO_QUICK_BUILD_MS);
    expect(built("quick")).toBe(900);
  });

  it("plays the first pace on every later open: each part at half its slow time", () => {
    // The pace the owner first saw (built in 0.9 s), and asked to be slower
    // for the day's first open only.
    for (const part of PARTS) {
      const [length, delay] = timing(part, "slow");
      expect(timing(part, "quick"), part).toEqual([length / 2, delay / 2]);
    }
  });

  it("goes in 600 ms on the first open of the day, and in 360 ms on every later one", () => {
    expect(body("[data-launch-frame]")).toMatch(/transition: opacity 580ms [^;]* 20ms, visibility 0s linear 600ms;/);
    expect(body("[data-launch-stage]").match(/ 600ms /g)).toHaveLength(3);
    expect(body('html[data-intro-pace="quick"] [data-launch-frame]')).toMatch(/transition-duration: 340ms, 0s;\s*transition-delay: 20ms, 360ms;/);
    expect(body('html[data-intro-pace="quick"] [data-launch-stage]')).toMatch(/transition-duration: 360ms;/);
  });

  it("with motion off it is the finished picture, and goes at once, on either pace", () => {
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-launch-frame\],\s*:where\(\[data-motion="reduce"\]\) \[data-launch-stage\] \{\s*transition: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \[data-launch-frame\] \*,\s*:where\(\[data-motion="reduce"\]\) \.launch-stars > i \{\s*animation: none;/);
    // The motion-off line comes after every part's, at the weight of one
    // class. A part whose line weighs more (more than one class, or an
    // element as well) would outweigh it and still move, as the stars did
    // until 2026-10-28, so the line names that part too.
    expect(css.indexOf(':where([data-motion="reduce"]) [data-launch-frame] *')).toBeGreaterThan(css.indexOf("\n.launch-cross {"));
    for (const part of PARTS) {
      if (!/^\.[a-z-]+$/.test(part)) expect(css, part).toContain(`:where([data-motion="reduce"]) ${part}`);
    }
    // The quick lines set lengths and delays only, never which animation
    // runs nor what moves, so they cannot bring back what motion off takes
    // away, though they weigh more.
    const quick = [...css.matchAll(/\nhtml\[data-intro-pace="quick"\][^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(quick).toHaveLength(6);
    for (const rule of quick) {
      for (const [, property] of rule.matchAll(/([a-z-]+):/g)) {
        expect(["animation-duration", "animation-delay", "transition-duration", "transition-delay"]).toContain(property);
      }
    }
  });

  it("is still lifted by the app itself, with its own limit, as before", () => {
    // The early call may do nothing on some phone. This is what opened the
    // apps before it, and it is untouched.
    expect(bridge).toContain('document.documentElement.dataset.launch = "ready"');
    expect(bridge).toContain("SplashScreen.hide()");
    expect(bridge).toMatch(/setTimeout\(\(\) => void hideSplash\(\), 4000\)/);
  });

  it("and the app marks the intro played too, a full intro after ready, in case the document's lines never ran", () => {
    // On the pace the document chose.
    expect(bridge).toContain('const build = document.documentElement.dataset.introPace === "quick" ? INTRO_QUICK_BUILD_MS : INTRO_BUILD_MS;');
    expect(bridge).toMatch(/playedNet \?\?= setTimeout\(\(\) => \{\s*document\.documentElement\.dataset\.intro = "played";\s*\}, build\);/);
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
