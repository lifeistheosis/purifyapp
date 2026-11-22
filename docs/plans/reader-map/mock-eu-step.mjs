#!/usr/bin/env node
// Mock-up 1 of the mock-up phase (the owner's word, 2026-11-22: "eu users get it in their specific
// onboarding"): the one step where a reader in the EU chooses where their answers are kept.
//
//   node docs/plans/reader-map/mock-eu-step.mjs <export> <still.png>
//
// Drawn from the app's own question screen on the native export, never by hand: the walk taps
// Begin, Catholic and Continue as a reader would, and stands on "Have you been to an Orthodox
// church?", which is a Step with two ChoiceCards (components/onboarding/OnboardingFlow.tsx).
// Then only what is proposed is changed: the title's words, a line under it exactly as Step draws
// its `body`, the two cards' words, and their two icons, which are User and Lock from
// components/ui/icons as that file draws them. Neither card is chosen, as the app's own cards
// stand before a tap. The eyebrow keeps its own words (onboard.level.eyebrow).
// Held to checkMock before the still is kept.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const STILL = path.resolve(process.argv[3] ?? path.join(HERE, "mock-eu-step.png"));
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));

/** The proposed words. New, in the house voice, and his and a lawyer's to pass. */
export const WORDS = {
  title: "Where should your answers be kept?",
  body: "They say something of your faith, so the choice is yours. You can change it later in Settings.",
  cards: [
    { title: "With my account", sub: "Purify fits you on every device you sign in on" },
    { title: "On this phone only", sub: "Nothing about your faith leaves this phone" },
  ],
};
/** User and Lock, as components/ui/icons draws them at the cards' size. */
const ICONS = [
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"></circle><path d="M4.5 20.2c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"></path></svg>',
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.4"></rect><path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8"></path><path d="M12 14.6v2"></path></svg>',
];

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date("2026-12-06T09:30:00+02:00") });
  await go(page, "/");
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: "visible", timeout: 30000 });
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    await b.waitFor({ state: "visible", timeout: 15000 });
    await b.click();
    await page.waitForTimeout(1300);
  };
  await tap(/^Begin/);
  await tap(/^Catholic/);
  await tap(/^Continue/);
  await d.getByText("Have you been to an Orthodox church?").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(900);

  const drawn = await page.evaluate(({ words, icons }) => {
    const d = document.querySelector('[role="dialog"]');
    const h2 = d.querySelector("h2");
    const cards = [...d.querySelectorAll("button.ob-choice")];
    if (!h2 || cards.length !== 2) return `the screen is not the one expected: ${cards.length} cards`;
    h2.textContent = words.title;
    // The line under the title, exactly as Step draws its `body`.
    const body = document.createElement("p");
    body.className = "onboard-step-in mt-3 font-sans text-ui leading-[1.6] text-paper/70";
    body.textContent = words.body;
    h2.after(body);
    for (const [i, card] of cards.entries()) {
      const [title, sub] = card.querySelectorAll("span.min-w-0 > span");
      title.textContent = words.cards[i].title;
      sub.textContent = words.cards[i].sub;
      card.querySelector("span.size-10 svg").outerHTML = icons[i];
      if (card.getAttribute("aria-pressed") !== "false") return "a card is chosen before any tap";
    }
    return "ok";
  }, { words: WORDS, icons: ICONS });
  if (drawn !== "ok") throw new Error(drawn);
  await page.waitForTimeout(900);

  ok = printMockCheck(await checkMock(page, '[role="dialog"]'), "mock-up 1: where a reader's answers are kept (EU)");
  await page.screenshot({ path: STILL, type: "png" });
  console.log(`\nStill: ${STILL}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
