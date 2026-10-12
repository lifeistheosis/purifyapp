// The language the app opens in, and the mark the first screen waits on.
//
// What a reader would notice if these broke: a phone set to Greek opening in
// English, a language they chose being overruled by the phone's, or, worst,
// an app that never opens because the mark was never set.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LAUNCH_LANGUAGE_WAIT_MS,
  armLanguageDeadline,
  forgetLaunchLanguageForTests,
  languageSettled,
  launchLanguage,
  markLanguageSettled,
  subscribeLanguageSettled,
  whenLanguageSettled,
} from "../launchLanguage";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("launchLanguage", () => {
  it("opens in the phone's language when nothing is remembered", () => {
    expect(launchLanguage(null, ["el-GR", "en-US"], "en")).toBe("el");
    expect(launchLanguage(null, ["ro"], "en")).toBe("ro");
    expect(launchLanguage(undefined, ["ru-RU"], "en")).toBe("ru");
  });

  it("takes the first of the phone's languages it can be switched to", () => {
    // Japanese is not carried; Romanian is the reader's second language.
    expect(launchLanguage(null, ["ja-JP", "ro-RO", "en"], "en")).toBe("ro");
  });

  it("knows a language by the older spelling a phone may still use", () => {
    expect(launchLanguage(null, ["tl-PH"], "en")).toBe("fil");
  });

  it("stays as it was built when the phone names nothing it carries", () => {
    expect(launchLanguage(null, ["ja-JP", "zh-CN"], "en")).toBe("en");
    expect(launchLanguage(null, [], "en")).toBe("en");
    expect(launchLanguage(null, [null, undefined, ""], "en")).toBe("en");
  });

  it("keeps the reader's own choice over the phone's language", () => {
    // Chosen English on a Greek phone: it stays English.
    expect(launchLanguage("en", ["el-GR"], "en")).toBe("en");
    // Chosen Romanian on an English phone.
    expect(launchLanguage("ro", ["en-US"], "en")).toBe("ro");
  });

  it("does not trust a remembered value it cannot be switched to", () => {
    expect(launchLanguage("xx", ["el-GR"], "en")).toBe("el");
    expect(launchLanguage("", ["el-GR"], "en")).toBe("el");
  });
});

describe("the settled mark", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", new EventTarget());
    forgetLaunchLanguageForTests();
  });

  afterEach(() => {
    forgetLaunchLanguageForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts unset, is set once, and tells whoever is listening", () => {
    const told = vi.fn();
    subscribeLanguageSettled(told);
    expect(languageSettled()).toBe(false);
    markLanguageSettled();
    expect(languageSettled()).toBe(true);
    expect(told).toHaveBeenCalledTimes(1);
    markLanguageSettled();
    expect(told).toHaveBeenCalledTimes(1);
  });

  it("does not tell a listener that has left", () => {
    const told = vi.fn();
    const leave = subscribeLanguageSettled(told);
    leave();
    markLanguageSettled();
    expect(told).not.toHaveBeenCalled();
  });

  it("resolves a wait when the language is settled", async () => {
    let done = false;
    void whenLanguageSettled().then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);
    markLanguageSettled();
    await Promise.resolve();
    await Promise.resolve();
    expect(done).toBe(true);
    // And one asked for afterwards does not wait at all.
    await expect(whenLanguageSettled()).resolves.toBeUndefined();
  });

  it("sets itself when the deadline passes, so nothing can hold the app shut", async () => {
    let done = false;
    void whenLanguageSettled().then(() => {
      done = true;
    });
    vi.advanceTimersByTime(LAUNCH_LANGUAGE_WAIT_MS - 1);
    await Promise.resolve();
    expect(languageSettled()).toBe(false);
    expect(done).toBe(false);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(languageSettled()).toBe(true);
    expect(done).toBe(true);
  });

  it("runs one clock however many wait, and stops it once settled", () => {
    armLanguageDeadline();
    armLanguageDeadline();
    void whenLanguageSettled();
    expect(vi.getTimerCount()).toBe(1);
    markLanguageSettled();
    expect(vi.getTimerCount()).toBe(0);
    armLanguageDeadline();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("arms no clock on the server", () => {
    vi.unstubAllGlobals();
    armLanguageDeadline();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("what waits on the mark", () => {
  // The three places are read as source: there is no browser here, and a
  // refactor that drops one of them fails silently on every phone that is
  // not set to English.

  it("the first screen is behind the gate, and the gate arms the deadline itself", () => {
    const page = read("app/page.tsx");
    const gate = page.indexOf("<LaunchLanguageGate>");
    const close = page.indexOf("</LaunchLanguageGate>");
    expect(gate).toBeGreaterThan(-1);
    expect(page.indexOf("<TodayMobileV3 />")).toBeGreaterThan(gate);
    expect(page.indexOf("<TodayMobileV3 />")).toBeLessThan(close);
    expect(page.indexOf("<MobileTabBar />")).toBeGreaterThan(gate);
    expect(page.indexOf("<MobileTabBar />")).toBeLessThan(close);
    const source = read("components/i18n/LaunchLanguageGate.tsx");
    expect(source).toContain("armLanguageDeadline()");
  });

  it("the splash is lifted after the language is settled, with its own fallback kept", () => {
    const bridge = read("components/native/NativeBridge.tsx");
    const wait = bridge.indexOf("whenLanguageSettled().then(");
    expect(wait).toBeGreaterThan(-1);
    // The two frames and the lift are inside that wait, not beside it.
    const after = bridge.slice(wait, wait + 400);
    expect(after).toContain("requestAnimationFrame");
    expect(after).toContain("hideSplash()");
    // The four-second fallback does not go through the wait.
    expect(bridge).toMatch(/setTimeout\(\(\) => void hideSplash\(\), 4000\)/);
  });

  it("the bootstrap settles on every path, the failing one included", () => {
    const boot = read("components/i18n/LocaleBootstrap.tsx");
    // Not the app, the language already right, the language now on screen,
    // and whatever went wrong.
    expect(boot.split("markLanguageSettled()").length - 1).toBeGreaterThanOrEqual(4);
    const tried = boot.indexOf("try {");
    const caught = boot.indexOf("} catch {");
    expect(tried).toBeGreaterThan(-1);
    expect(boot.slice(caught, caught + 200)).toContain("markLanguageSettled()");
    // The account's language is asked for after the opening one is applied.
    expect(boot.indexOf("readProfileLocale()")).toBeGreaterThan(caught);
  });
});
