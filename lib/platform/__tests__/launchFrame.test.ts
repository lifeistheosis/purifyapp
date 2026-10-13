// Open almost at once: the outline the apps paint before their code runs.
//
// What a reader would notice if this broke: the logo for a second again on
// every open, which is only slow. Or English words under the logo on a Greek
// phone. Or, worst, an outline that never goes away, with the app alive
// underneath it and no way to reach it.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LaunchFrame } from "@/components/native/LaunchFrame";

import { LAUNCH_FRAME_MAX_MS, LIFT_ANYWAY_MS, LIFT_AT_FIRST_PAINT, OPEN_AT_FIRST_PAINT } from "../launchFrame";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = renderToStaticMarkup(createElement(LaunchFrame));
const outline = html.slice(0, html.indexOf("<script"));

describe("the outline", () => {
  it("is on, until the owner has felt it on a phone and says otherwise", () => {
    expect(OPEN_AT_FIRST_PAINT).toBe(true);
  });

  it("has no words in it, in any language", () => {
    // The apps are built in English. A word here is English on every phone
    // for as long as the outline is up.
    expect(outline.replace(/<[^>]+>/g, "").trim()).toBe("");
    expect(outline).not.toMatch(/aria-label|title=|alt=|placeholder=/);
  });

  it("is hidden from a screen reader and covers the page", () => {
    expect(outline).toContain('data-launch-frame=""');
    expect(outline).toContain('aria-hidden="true"');
    expect(outline).toMatch(/class="[^"]*\bfixed\b[^"]*\binset-0\b/);
  });

  it("sits over everything, as the logo screen did", () => {
    // A first run mounts the onboarding flow, and a slow phone the motion
    // notice, before the app says it is ready. Under the logo neither was
    // seen. The highest layer in the app when this was written was 140.
    const layer = Number(/\bz-\[(\d+)\]/.exec(outline)?.[1]);
    expect(layer).toBe(200);
    for (const file of ["components/onboarding/OnboardingFlow.tsx", "components/ui/MotionNotice.tsx", "components/native/PressToCopy.tsx"]) {
      for (const [, z] of read(file).matchAll(/\bz-\[(\d+)\]/g)) expect(Number(z), file).toBeLessThan(layer);
    }
  });

  it("takes no colour of its own: every shade is the page's", () => {
    // The palettes change what night and paper are. A colour written out
    // here would be wrong on Light, and no yellow or gold is allowed at all.
    expect(outline).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    expect(outline).not.toMatch(/gold|yellow|amber|festal/);
    const shades = new Set([...outline.matchAll(/\b(?:bg|border)-([a-z]+(?:-[a-z]+)?)(?=[/" ])/g)].map((m) => m[1]));
    shades.delete("b"); // border-b is a side, not a shade
    expect([...shades].sort()).toEqual(["night", "night-soft", "paper"]);
  });

  it("clears the status bar and the home indicator without the app's help", () => {
    // safe-pt and safe-pb only work once the app has marked the page.
    expect(outline).toContain("env(safe-area-inset-top");
    expect(outline).toContain("env(safe-area-inset-bottom");
    expect(outline).not.toMatch(/\bsafe-p[tb]\b/);
  });

  it("is followed by its script, in the document, after it", () => {
    expect(html.indexOf("<script")).toBeGreaterThan(html.indexOf("data-launch-frame"));
    expect(html).toContain("nativePromise");
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

  it("waits two frames, so the outline has been painted, then asks once", () => {
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

  it("never leaves the outline up: after the limit it says ready itself", () => {
    const { attrs, timers } = run("bridge");
    expect(timers.map((t) => t.ms).sort((a, b) => a - b)).toEqual([LIFT_ANYWAY_MS, LAUNCH_FRAME_MAX_MS]);
    // Longer than the app's own limit for lifting the logo screen, so this is
    // the net under that one and never the first to act.
    expect(LAUNCH_FRAME_MAX_MS).toBeGreaterThan(4000);
    timer(timers, LAUNCH_FRAME_MAX_MS).fn();
    expect(attrs["data-launch"]).toBe("ready");
  });

  it("survives a shell that throws, and one whose answer is a refusal", () => {
    const thrown = run("throws");
    thrown.frames[0]();
    expect(() => thrown.frames[1]()).not.toThrow();
    expect(thrown.attrs["data-launch"]).toBe("frame");

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

  it("fades when the app says it is ready, and lets the taps through at once", () => {
    const rule = /html\[data-launch="ready"\]\s+\[data-launch-frame\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/opacity:\s*0;/);
    expect(rule).toMatch(/visibility:\s*hidden;/);
    expect(rule).toMatch(/pointer-events:\s*none;/);
    // No motion where the reader has asked for none.
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\)\s+\[data-launch-frame\]\s*\{\s*transition:\s*none;/);
  });

  it("is still lifted by the app itself, with its own limit, as before", () => {
    // The early call may do nothing on some phone. This is what opened the
    // apps before it, and it is untouched.
    expect(bridge).toContain('document.documentElement.dataset.launch = "ready"');
    expect(bridge).toContain("SplashScreen.hide()");
    expect(bridge).toMatch(/setTimeout\(\(\) => void hideSplash\(\), 4000\)/);
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
