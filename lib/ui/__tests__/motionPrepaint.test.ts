import { describe, expect, it } from "vitest";
import vm from "node:vm";

import { NATIVE_UA_TOKEN } from "@/lib/platform/token";
import { DEVICE_SPEED_KEY, slowFrom, type DeviceSpeed } from "../deviceSpeed";
import { MOTION_KEY, resolveReducedMotion, surfaceForPath, type MotionPreference } from "../motionPreference";
import { MOTION_PREPAINT } from "../motionPrepaint";

type Case = {
  pref: MotionPreference | null;
  path: string;
  osReduce: boolean;
  platform: "native" | "desktop" | "web";
  device: DeviceSpeed | null;
  deviceMemory?: number;
};

/** Run the pre-paint string the way the browser does, and read the attribute it set. */
function runPrepaint(c: Case): string | null {
  const store = new Map<string, string>();
  if (c.pref) store.set(MOTION_KEY, c.pref);
  if (c.device) store.set(DEVICE_SPEED_KEY, c.device);
  let attr: string | null = null;
  const sandbox: Record<string, unknown> = {
    localStorage: { getItem: (k: string) => store.get(k) ?? null },
    navigator: {
      userAgent: c.platform === "native" ? `Mozilla/5.0 Mobile ${NATIVE_UA_TOKEN}` : "Mozilla/5.0",
      deviceMemory: c.deviceMemory,
      hardwareConcurrency: 8,
    },
    location: { pathname: c.path },
    matchMedia: (q: string) => ({ matches: q === "(prefers-reduced-motion: reduce)" && c.osReduce }),
    document: { documentElement: { setAttribute: (k: string, v: string) => k === "data-motion" && (attr = v) } },
    __TAURI__: c.platform === "desktop" ? { core: { invoke: () => null } } : undefined,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(MOTION_PREPAINT, sandbox);
  return attr;
}

function expected(c: Case): string {
  const reduce = resolveReducedMotion({
    preference: c.pref ?? "os",
    surface: surfaceForPath(c.path),
    osReduce: c.osReduce,
    platform: c.platform,
    slowDevice: slowFrom(c.device, { deviceMemory: c.deviceMemory, hardwareConcurrency: 8 }),
  });
  return reduce ? "reduce" : "full";
}

describe("the motion pre-paint script", () => {
  it("names the same keys and token as the modules it restates", () => {
    expect(MOTION_PREPAINT).toContain(`'${MOTION_KEY}'`);
    expect(MOTION_PREPAINT).toContain(`'${DEVICE_SPEED_KEY}'`);
    expect(MOTION_PREPAINT).toContain(`'${NATIVE_UA_TOKEN}'`);
    expect(MOTION_PREPAINT).toContain("'(prefers-reduced-motion: reduce)'");
  });

  it("agrees with the resolver on every input", () => {
    const cases: Case[] = [];
    for (const pref of [null, "os", "on", "off"] as const)
      for (const path of ["/", "/bible/john/1", "/admin", "/admin/support"])
        for (const osReduce of [false, true])
          for (const platform of ["native", "desktop", "web"] as const)
            for (const device of [null, "ok", "slow"] as const)
              for (const deviceMemory of [undefined, 1, 8])
                cases.push({ pref, path, osReduce, platform, device, deviceMemory });

    const wrong = cases.filter((c) => runPrepaint(c) !== expected(c));
    expect(wrong.slice(0, 5)).toEqual([]);
    expect(cases.length).toBe(864);
  });

  it("keeps a phone set to reduce motion moving, and stills a slow one", () => {
    const base = { pref: null, path: "/", osReduce: true, platform: "native", device: null } as const;
    expect(runPrepaint({ ...base })).toBe("full");
    expect(runPrepaint({ ...base, device: "slow" })).toBe("reduce");
  });

  it("survives storage that throws", () => {
    let attr: string | null = null;
    const sandbox: Record<string, unknown> = {
      navigator: { userAgent: "Mozilla/5.0" },
      location: { pathname: "/" },
      matchMedia: () => ({ matches: true }),
      document: { documentElement: { setAttribute: (_k: string, v: string) => (attr = v) } },
    };
    Object.defineProperty(sandbox, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
    sandbox.window = sandbox;
    expect(() => vm.runInNewContext(MOTION_PREPAINT, sandbox)).not.toThrow();
    expect(attr).toBe("reduce");
  });
});
