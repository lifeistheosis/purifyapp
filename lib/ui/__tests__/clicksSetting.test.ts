// Clicks as you scroll (1.9): the switch's own store and its row in Settings.
// On unless turned off, kept on this phone, heard by everything that shows
// it, held for the visit when storage refuses, and offered only where the
// clicks are. The why is in ../clicksSetting.ts; what reads it is held in
// ./scrollTicks.test.ts and lib/prayers/__tests__/ruleEnd.test.ts.

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const KEY = "purify:scroll-clicks";
const EVT = "purify:scroll-clicks:change";

/** Local storage as the phone keeps it, or one that refuses every call. */
function storage(refuses = false) {
  const m = new Map<string, string>();
  const no = () => {
    throw new Error("storage is unavailable");
  };
  return {
    m,
    getItem: refuses ? no : (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: refuses ? no : (k: string, v: string) => void m.set(k, String(v)),
    removeItem: refuses ? no : (k: string) => void m.delete(k),
  };
}

/** A window with that storage, and events that can be heard. */
function stubWindow(store: ReturnType<typeof storage>) {
  const events = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: store,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  return events;
}

async function load() {
  vi.resetModules();
  return import("../clicksSetting");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the clicks switch's store", () => {
  it("is on by default, and on where there is no window at all", async () => {
    const { clicksOn } = await load();
    expect(clicksOn()).toBe(true);
    stubWindow(storage());
    expect(clicksOn()).toBe(true);
  });

  it("turned off is kept as off on this phone; turned on again, nothing is kept", async () => {
    const store = storage();
    stubWindow(store);
    const { clicksOn, setClicks } = await load();
    setClicks(false);
    expect(store.m.get(KEY)).toBe("off");
    expect(clicksOn()).toBe(false);
    setClicks(true);
    expect(store.m.has(KEY)).toBe(false);
    expect(clicksOn()).toBe(true);
  });

  it("tells everything that shows it, at once", async () => {
    const events = stubWindow(storage());
    const { setClicks } = await load();
    let heard = 0;
    events.addEventListener(EVT, () => heard++);
    setClicks(false);
    setClicks(true);
    expect(heard).toBe(2);
  });

  it("holds the choice for the visit when storage refuses", async () => {
    stubWindow(storage(true));
    const { clicksOn, setClicks } = await load();
    expect(clicksOn()).toBe(true);
    expect(() => setClicks(false)).not.toThrow();
    expect(clicksOn()).toBe(false);
  });
});

describe("the row in Settings", () => {
  const src = readFileSync("components/settings/SettingsClient.tsx", "utf8");
  const row = src.slice(src.indexOf("function ClicksRow()"), src.indexOf("function ClicksRow()") + 700);

  it("is a switch with its own name and its line, from the house's icons", () => {
    expect(row).toContain("const [on, setOn] = useClicksSetting();");
    expect(row).toContain('icon={<Vibrate size={18} />}');
    expect(row).toContain('label={t("settings.clicks")}');
    expect(row).toContain('description={t("settings.clicksHint")}');
    expect(row).toContain('control={<Switch on={on} onChange={setOn} label={t("settings.clicks")} />}');
    expect(src).toContain('import { Vibrate } from "@/components/ui/icons/Vibrate";');
  });

  it("stands only in the phone apps, where the clicks are, under Reading", () => {
    expect(row).toMatch(/const native = useIsNative\(\);[\s\S]*if \(!native\) return null;/);
    const reading = src.slice(src.indexOf('id="reading"'), src.indexOf('id="calendar"'));
    expect(reading).toContain("<ClicksRow />");
  });

  it("says what the arbiter said yes to, in English and in every language Purify speaks", () => {
    const en = JSON.parse(readFileSync("lib/i18n/messages/en.json", "utf8"));
    expect(en["settings.clicks"]).toBe("Clicks as you scroll");
    expect(en["settings.clicksHint"]).toBe(
      "A light click in your hand as each prayer, chapter or event passes, and when a rule is complete. Off keeps the phone still.",
    );
    for (const lang of ["ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const m = JSON.parse(readFileSync(`lib/i18n/messages/${lang}.json`, "utf8"));
      for (const key of ["settings.clicks", "settings.clicksHint"]) {
        expect(m[key], `${lang} ${key}`).toBeTruthy();
        expect(m[key], `${lang} ${key}`).not.toBe(en[key]);
        expect(m[key], `${lang} ${key}`).not.toMatch(/—/);
      }
    }
  });
});
