import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * What a reader is told when notifications are blocked, on a phone.
 *
 * Both places that turn reminders on (the welcome questions and Account,
 * Notifications) told a phone's reader what a browser's is told: "blocked at
 * the browser level, re-enable them in your site settings and refresh", or
 * "blocked in your browser settings". A phone has no site settings and
 * nothing to refresh, and an iPhone never asks a second time, so its own
 * Settings are the only way back. In the apps both now say the phone's
 * settings (onboard.reminders.blockedPhone), and Account says the device's
 * words rather than "your browser does not support Web Push" when reminders
 * cannot run at all.
 */

const REPO = join(__dirname, "..", "..", "..");
const LANGS = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];
const catalog = (lang: string) =>
  JSON.parse(readFileSync(join(REPO, "lib", "i18n", "messages", `${lang}.json`), "utf8")) as Record<string, string>;
const source = (...parts: string[]) => readFileSync(join(REPO, ...parts), "utf8");

describe("the phone's words for blocked notifications", () => {
  const en = catalog("en");

  it("speak of the phone and not of a browser", () => {
    expect(en["onboard.reminders.blockedPhone"]).toMatch(/phone/);
    expect(en["onboard.reminders.blockedPhone"]).not.toMatch(/browser|site|refresh/i);
  });

  it("are in all 21 languages, each its own and none the browser's", () => {
    for (const lang of LANGS) {
      const m = catalog(lang);
      const phone = m["onboard.reminders.blockedPhone"];
      expect(phone, lang).toBeTruthy();
      expect(phone, lang).not.toBe(m["onboard.reminders.blocked"]);
      if (lang !== "en") expect(phone, lang).not.toBe(en["onboard.reminders.blockedPhone"]);
      expect(phone.includes(String.fromCharCode(0x2014)), lang).toBe(false);
    }
  });

  it("are what the welcome questions say on a phone", () => {
    const flow = source("components", "onboarding", "OnboardingFlow.tsx");
    expect(flow).toMatch(/isNativeClient\(\)\s*\?\s*t\("onboard\.reminders\.blockedPhone"\)\s*:\s*t\("onboard\.reminders\.blocked"\)/);
  });

  it("are what Account, Notifications says on a phone, with the device's words when reminders cannot run", () => {
    const optIn = source("components", "profile", "PushOptIn.tsx");
    expect(optIn).toMatch(/native\s*\?\s*t\("onboard\.reminders\.blockedPhone"\)\s*:\s*t\("ui\.notificationsAreBlockedAtThe"\)/);
    expect(optIn).toMatch(/native\s*\?\s*t\("onboard\.reminders\.unsupported"\)\s*:\s*t\("ui\.yourBrowserDoesNotSupport"\)/);
  });
});
