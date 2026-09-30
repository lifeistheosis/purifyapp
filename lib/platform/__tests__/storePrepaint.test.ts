import { describe, expect, it } from "vitest";
import vm from "node:vm";

import { storeForDevice } from "../mobileWeb";
import { STORE_PREPAINT } from "../storePrepaint";
import { NATIVE_UA_TOKEN } from "../token";

/** Run the pre-paint string the way the browser does, and read what it set. */
function runPrepaint(userAgent: string, maxTouchPoints: number, capacitor = false): string | null {
  let attr: string | null = null;
  const sandbox: Record<string, unknown> = {
    navigator: { userAgent, maxTouchPoints },
    document: { documentElement: { setAttribute: (k: string, v: string) => k === "data-store" && (attr = v) } },
    Capacitor: capacitor ? { isNativePlatform: () => true } : undefined,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(STORE_PREPAINT, sandbox);
  return attr;
}

const AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "",
];

describe("the store pre-paint", () => {
  it("names the token it looks for exactly as the store apps send it", () => {
    expect(STORE_PREPAINT).toContain(`'${NATIVE_UA_TOKEN}'`);
  });

  it("agrees with storeForDevice on every browser, with and without touch", () => {
    for (const ua of AGENTS) {
      for (const touch of [0, 5]) {
        expect(runPrepaint(ua, touch), `${ua || "(empty)"} / ${touch}`).toBe(storeForDevice(ua, touch));
      }
    }
  });

  it("sets nothing inside the store apps", () => {
    expect(runPrepaint(`${AGENTS[0]} ${NATIVE_UA_TOKEN}`, 5)).toBeNull();
    expect(runPrepaint(AGENTS[2], 5, true)).toBeNull();
  });
});
