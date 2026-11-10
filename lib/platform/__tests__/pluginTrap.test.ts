// No Capacitor plugin object is ever handed through a promise (1.9, his
// report of 2026-11-10). What a reader would notice if this came back: a part
// of the app that should reach the phone saying nothing and doing nothing, as
// the player in the shade, the widgets and the check on the phone's
// notifications did until 1.9, because each bridge handed its plugin back
// from a promise, which never settles. The why is in ../nativePlugin.ts.
//
// The rule's reason is checked on Capacitor's own code, never a stand-in for
// it: every plugin package the app carries (a package.json with a
// "capacitor" field, as Capacitor's own command line finds them) is loaded
// on a stand-in Android bridge, and its exports that answer "then" are the
// names the scan looks for. The scan itself is in ./pluginTrap.ts.

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { findPluginTraps, HELPER_FILE, type PluginExports } from "./pluginTrap";

vi.hoisted(() => {
  // What the Android shell injects before any page script.
  const g = globalThis as Record<string, unknown>;
  g.androidBridge = { postMessage: () => {} };
  g.Capacitor = { PluginHeaders: [] };
});

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** The plugin packages the app carries, as Capacitor's command line finds them. */
function pluginPackages(): string[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return Object.keys(pkg.dependencies ?? {}).filter((name) => {
    try {
      return !!JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf8")).capacitor;
    } catch {
      return false;
    }
  });
}

const plugins = new Map<string, Set<string>>();

beforeAll(async () => {
  const { Capacitor } = await import("@capacitor/core");
  expect(Capacitor.getPlatform()).toBe("android");
  for (const name of pluginPackages()) {
    const mod = (await import(/* @vite-ignore */ name)) as Record<string, unknown>;
    const names = Object.keys(mod).filter((k) => {
      const v = mod[k];
      return (typeof v === "object" || typeof v === "function") && v !== null && typeof (v as { then?: unknown }).then === "function";
    });
    plugins.set(name, new Set(names));
  }
});

const scan = (source: string, file = "lib/example.ts") => findPluginTraps(source, file, plugins as PluginExports);

describe("Capacitor's plugin objects, as the app loads them", () => {
  it("are things JavaScript takes for a promise, in every plugin package the app carries", () => {
    expect(plugins.size).toBeGreaterThanOrEqual(10);
    // The ones the app reaches for by name.
    const all = new Set([...plugins.values()].flatMap((s) => [...s]));
    for (const n of ["App", "Browser", "Filesystem", "Haptics", "Network", "Preferences", "PushNotifications", "Share", "SplashScreen", "StatusBar", "MediaSession", "Purchases"]) {
      expect(all.has(n), n).toBe(true);
    }
    // Two packages wrap their plugin in an object of their own, which is safe
    // to hand on: the social login client (its raw plugin is not) and
    // RevenueCat's paywall.
    expect(plugins.get("@capgo/capacitor-social-login")).toEqual(new Set(["SocialLoginBase"]));
    expect(plugins.get("@revenuecat/purchases-capacitor-ui")).toEqual(new Set());
  });

  it("are safe in a box", async () => {
    const { App } = await import("@capacitor/app");
    expect(typeof (App as unknown as { then?: unknown }).then).toBe("function");
    expect(typeof ({ api: App } as { then?: unknown }).then).toBe("undefined");
  });
});

describe("the scan", () => {
  const BAD: [string, string][] = [
    ["the lock screen's bridge before 1.9", `function loadPlugin() { return import("@capacitor/core").then(({ Capacitor, registerPlugin }) => Capacitor.isPluginAvailable("MediaSession") ? registerPlugin("MediaSession") : null); }`],
    ["returned from an async function", `async function f() { const { Haptics } = await import("@capacitor/haptics"); return Haptics; }`],
    ["returned from then(), destructured", `const p = import("@capacitor/app").then(({ App }) => App);`],
    ["returned from then(), off the module", `const p = import("@capacitor/app").then((m) => m.App);`],
    ["returned from catch()", `import { Share } from "@capacitor/share"; const p = Promise.reject(1).catch(() => Share);`],
    ["a static import returned from an async function", `import { Share } from "@capacitor/share"; async function g() { return Share; }`],
    ["awaited", `import { Network } from "@capacitor/network"; async function h() { await Network; }`],
    ["Promise.resolve()", `import { Browser } from "@capacitor/browser"; const p = Promise.resolve(Browser);`],
    ["a new Promise's resolve()", `import { Filesystem } from "@capacitor/filesystem"; const p = new Promise((resolve) => { resolve(Filesystem); });`],
    ["a namespace import", `import * as P from "@capacitor/preferences"; async function q() { return P.Preferences; }`],
    ["Promise.all() of modules", `async function r() { const [fs] = await Promise.all([import("@capacitor/filesystem")]); return fs.Filesystem; }`],
    ["in Promise.all()'s list", `import { App } from "@capacitor/app"; const all = Promise.all([App]);`],
    ["one side of a choice", `async function s(on: boolean) { const { StatusBar } = await import("@capacitor/status-bar"); return on ? StatusBar : null; }`],
    ["off a module kept elsewhere", `let m: any = null; async function k() { m ??= await import("@capacitor/haptics"); return m?.Haptics; }`],
    ["a fallback import", `let plugin: any; async function t() { const { Filesystem } = plugin ?? (await import("@capacitor/filesystem")); return Filesystem; }`],
    ["billing's plugin", `async function u() { const { Purchases } = await import("@revenuecat/purchases-capacitor"); return Purchases; }`],
  ];

  it.each(BAD)("finds a plugin handed through a promise: %s", (_why, source) => {
    expect(scan(source).length).toBeGreaterThan(0);
  });

  const GOOD: [string, string, string?][] = [
    ["a call on the plugin, in then()", `import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));`],
    ["a call on the plugin, awaited", `async function f() { const { App } = await import("@capacitor/app"); await App.addListener("resume", () => {}); }`],
    ["the module kept, not the plugin", `let plugin = import("@capacitor/haptics").catch(() => null);`],
    ["the plugin in a box", `async function f() { const { Haptics } = await import("@capacitor/haptics"); return { api: Haptics }; }`],
    ["a plugin returned where nothing waits on it", `import { Haptics } from "@capacitor/haptics"; function now() { return Haptics; }`],
    ["the same name from a web package", `import { Purchases } from "@revenuecat/purchases-js"; async function f() { return Purchases; }`],
    ["a fallback import, used", `let plugin: any; async function t() { const { Filesystem } = plugin ?? (await import("@capacitor/filesystem")); return Filesystem.readdir({ path: "" }); }`],
    ["the social login client, which is no plugin object", `async function f() { const { SocialLogin } = await import("@capgo/capacitor-social-login"); return SocialLogin; }`],
    [
      "the helper itself",
      `export function nativePlugin(name: string) { return import("@capacitor/core").then(({ Capacitor, registerPlugin }) => Capacitor.isPluginAvailable(name) ? { api: registerPlugin(name), platform: Capacitor.getPlatform() } : null); }`,
      HELPER_FILE,
    ],
  ];

  it.each(GOOD)("leaves alone what settles nothing with a plugin: %s", (_why, source, file) => {
    expect(scan(source, file)).toEqual([]);
  });
});

describe("the app", () => {
  it("hands no plugin through a promise, and registers plugins only in the helper", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__" && entry.name !== "node_modules") walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
          for (const t of findPluginTraps(fs.readFileSync(path.join(ROOT, rel), "utf8"), rel, plugins as PluginExports)) {
            found.push(`${t.file}:${t.line} ${t.what}: ${t.text}`);
          }
        }
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(dir);
    expect(found).toEqual([]);
  });
});
