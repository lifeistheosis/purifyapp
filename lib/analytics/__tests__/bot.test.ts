import { describe, expect, it } from "vitest";
import { isAutomatedAgent } from "../bot";

// Real user agents from analytics_sessions, 2026-09-10 to 2026-09-30.
const PEOPLE = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 PurifyNative",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 5 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

const BOTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/148.0.7778.96 Safari/537.36",
  "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0",
  "AdsBot-Google (+http://www.google.com/adsbot.html)",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (Stripebot/1.0; +https://docs.stripe.com/stripebot-crawler)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0; 360Spider",
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  "python-requests/2.32.3",
  "curl/8.7.1",
];

describe("isAutomatedAgent", () => {
  it.each(PEOPLE)("lets a person through: %s", (ua) => {
    expect(isAutomatedAgent(ua)).toBe(false);
  });

  it.each(BOTS)("stops self-named automation: %s", (ua) => {
    expect(isAutomatedAgent(ua)).toBe(true);
  });

  it("treats a missing user agent as automation", () => {
    expect(isAutomatedAgent(null)).toBe(true);
    expect(isAutomatedAgent("   ")).toBe(true);
  });

  it("catches headless Chrome behind a borrowed user agent through its brands", () => {
    const borrowed =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    expect(isAutomatedAgent(borrowed)).toBe(false);
    expect(isAutomatedAgent(borrowed, '"Chromium";v="151", "HeadlessChrome";v="151", "Not.A/Brand";v="99"')).toBe(true);
    expect(isAutomatedAgent(borrowed, '"Chromium";v="151", "Google Chrome";v="151", "Not.A/Brand";v="99"')).toBe(false);
  });
});
