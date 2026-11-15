// A screen opened straight away in the apps waits for the reader's language and
// nothing else (Updates 87, 1.9).
//
// What a reader would notice if these broke: in the apps, a screen opened from a
// notification or a link held under the launch slate for seconds longer than its
// language takes. Measured on the export at 390x844 with the processor slowed four
// times, Saints in Arabic: at the moment the language settled, Today was drawn
// under the slate on the front door, a 0.6s task with its own fetches, only to be
// replaced; and the held screen then waited 2 to 3 s more, until some other update
// started it (docs/handoffs/updates-87.md). And the language itself was asked for
// only once the first screen had been brought to life, though the language
// pre-paint had decided it before the first paint.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const where = vi.hoisted(() => ({ native: true, frontDoor: true }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/saints/",
  useSelectedLayoutSegments: () => ["(app)", "saints"],
}));
vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => where.native }));

import { todayMayDraw } from "@/components/i18n/LaunchLanguageGate";
import { forgetLaunchLanguageForTests, frontDoorAwaitsScreen, markLanguageSettled } from "../launchLanguage";
import { loadClientCatalog, readyLanguageAhead, scriptSample } from "../client";
import ar from "../messages/ar.json";
import en from "../messages/en.json";

const g = globalThis as Record<string, unknown>;
const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

describe("the front door waiting for another screen", () => {
  beforeEach(() => {
    forgetLaunchLanguageForTests();
    where.native = true;
    where.frontDoor = true;
    g.window = globalThis;
    g.document = { querySelector: (sel: string) => (sel === "[data-front-door]" && where.frontDoor ? {} : null) };
  });
  afterEach(() => {
    delete g.window;
    delete g.document;
    forgetLaunchLanguageForTests();
  });

  it("knows a screen is coming when the front door's document came up under another address, in the apps", () => {
    expect(frontDoorAwaitsScreen(true, true, "/saints/")).toBe(true);
    expect(frontDoorAwaitsScreen(true, true, "/community")).toBe(true);
    expect(frontDoorAwaitsScreen(true, true, "/")).toBe(false);
    expect(frontDoorAwaitsScreen(true, true, "")).toBe(false);
    expect(frontDoorAwaitsScreen(true, true, null)).toBe(false);
    // The website, and a screen whose own document was opened, wait for nothing.
    expect(frontDoorAwaitsScreen(false, true, "/saints/")).toBe(false);
    expect(frontDoorAwaitsScreen(true, false, "/saints/")).toBe(false);
  });

  it("does not draw Today when the language settles while that screen is coming", () => {
    markLanguageSettled();
    expect(todayMayDraw("/saints/")).toBe(false);
  });

  it("draws Today once the language is settled at the front door's own address", () => {
    expect(todayMayDraw("/")).toBe(false);
    markLanguageSettled();
    expect(todayMayDraw("/")).toBe(true);
  });

  it("draws Today as it always did off the front door's document and on the website", () => {
    markLanguageSettled();
    where.frontDoor = false;
    expect(todayMayDraw("/saints/")).toBe(true);
    where.frontDoor = true;
    where.native = false;
    expect(todayMayDraw("/saints/")).toBe(true);
  });
});

describe("the reader's language asked for when the app's code runs", () => {
  let asked: string[] = [];
  const page = (lang: string) => {
    asked = [];
    g.document = {
      documentElement: { lang },
      fonts: { load: (_font: string, text: string) => (asked.push(text), Promise.resolve([])) },
    };
    g.getComputedStyle = () => ({ getPropertyValue: (v: string) => (v === "--font-noto-naskh" ? "'Noto Naskh Arabic'" : "") });
  };
  afterEach(() => {
    delete g.document;
    delete g.getComputedStyle;
  });

  it("asks for the pre-painted language's catalog and faces at once, and hands that catalog to LocaleBootstrap's ask", async () => {
    page("ar");
    readyLanguageAhead(() => true);
    await tick();
    // The faces are asked for with every letter the catalog draws, before anyone asked for the language.
    expect(asked).toEqual([scriptSample({ ...en, ...ar } as Record<string, string>)]);
    expect(asked[0]).toMatch(/[\u0600-\u06ff]/);
    const messages = await loadClientCatalog("ar");
    expect(messages["community.signIn"]).toBe((ar as Record<string, string>)["community.signIn"]);
  });

  it("asks for nothing in English, on the website, or for a language it cannot load", async () => {
    for (const [lang, native] of [["en", true], ["ar", false], ["xx", true]] as const) {
      page(lang);
      readyLanguageAhead(() => native);
      await tick();
      expect(asked).toEqual([]);
    }
  });
});
