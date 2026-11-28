#!/usr/bin/env node
// The Christmas gift of Plus, drawn for his yes (2026-11-28: "yes draw the gift page").
// The goal is $5,000 unspent by the end of February (docs/plans/goal-5k.md): a year of Plus
// given as a gift, sold on the web, opened through the gift page the app already has (/gift).
//
// Drawn on the native export's own /gift page, changing only what is proposed
// (CLAUDE.md, "Mockups are held to the app's guardrails"): its ticket card, its white
// button and its "What Plus opens" stay; the form uses the app's own field (NAME_FIELD,
// components/prayers/NameForm.tsx) and its own choice track (.set-track, Settings).
//
//   give     the giver's page: the ticket, who it is from and for, when it arrives, the button
//   opened   what the one it is given to sees first, before they sign in
//
// The giver's page is for the website alone (the stores' rules keep a web sale out of the
// apps), so the app's tab bar is hidden on it. Every still is held to checkMock.
//
//   node docs/plans/gift/mock-gift.mjs [export]    writes docs/plans/gift/img/*.jpg

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
fs.mkdirSync(IMG, { recursive: true });

// The app's own field and label, word for word (components/prayers/NameForm.tsx).
const NAME_FIELD =
  "min-h-12 w-full rounded-[12px] bg-paper/[0.06] px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/55 transition-colors focus:bg-paper/[0.08]";
const LABEL = "block font-sans text-caption font-semibold text-paper/70";

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;

async function giftPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: NATIVE_UA, colorScheme: "dark", reducedMotion: "reduce", locale: "en-US" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("purify:onboarded", "99");
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await go(page, "/gift");
  await page.locator("#gift-title").waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

async function keep(page, name, label) {
  await page.waitForTimeout(900);
  ok = printMockCheck(await checkMock(page, "body"), label) && ok;
  const file = path.join(IMG, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
  console.log(`  still: ${path.relative(ROOT, file)}\n`);
}

// What both pages change: the parcel's picture goes (it is EIKON's), and the ticket speaks of this gift.
const common = (page, words) =>
  page.evaluate(({ words }) => {
    const title = document.getElementById("gift-title");
    const column = document.getElementById("gift-caption").parentElement;
    const ticket = [...column.children].find((c) => c.contains(title));
    const quote = document.getElementById("gift-caption").className;
    for (const c of [...column.children]) {
      if (c === ticket) break;
      c.remove();
    }
    ticket.querySelector(".gift-eyebrow").textContent = words.eyebrow;
    title.nextElementSibling.textContent = words.meta;
    // The stage held the parcel's two cards; emptied and drawn only as tall as it takes the
    // ticket to clear the top bar, so the ticket, the gift itself, is the first thing seen.
    const stage = document.querySelector(".gift-stage");
    stage.replaceChildren();
    stage.style.height = "0px";
    const back = [...document.querySelectorAll("a, button")].find((b) => /back/i.test(b.getAttribute("aria-label") || ""));
    const clear = (back ? back.getBoundingClientRect().bottom : 64) + 20;
    stage.style.height = `${Math.max(0, clear - ticket.getBoundingClientRect().top)}px`;
    return { quote };
  }, { words });

try {
  // ── The giver's page (the website) ──
  {
    const { ctx, page } = await giftPage();
    await common(page, { eyebrow: "A gift for Christmas", meta: "A year, from you" });
    await page.evaluate(({ NAME_FIELD, LABEL }) => {
      document.querySelector("nav[data-tab-bar]")?.style.setProperty("display", "none");
      const title = document.getElementById("gift-title");
      const column = title.closest(".max-w-md");
      const ticket = [...column.children].find((c) => c.contains(title));
      const foot = ticket.querySelector(".gift-foot-now");
      foot.querySelector("p").textContent = "They open it on the day you choose: Christmas Day, or the Nativity on 7 January.";
      const form = document.createElement("div");
      form.setAttribute("data-gift-form", "");
      form.className = "mt-6 px-1";
      form.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
          <div><label for="g-from" class="${LABEL}">From</label><input id="g-from" dir="auto" class="${NAME_FIELD} mt-1.5" value="Anna"></div>
          <div><label for="g-to" class="${LABEL}">To</label><input id="g-to" dir="auto" class="${NAME_FIELD} mt-1.5" value="Maria"></div>
        </div>
        <label for="g-email" class="mt-5 ${LABEL}">Their email</label>
        <input id="g-email" type="email" dir="auto" class="${NAME_FIELD} mt-1.5" value="maria@example.com">
        <label for="g-line" class="mt-5 ${LABEL}">A line from you, if you like</label>
        <textarea id="g-line" dir="auto" rows="3" class="${NAME_FIELD} mt-1.5 resize-none">Christ is born! Read with me this year.</textarea>
        <p id="g-when" class="mt-5 ${LABEL}">When it arrives</p>
        <div role="radiogroup" aria-labelledby="g-when" class="set-track mt-1.5" style="--set-cols:3">
          <button type="button" role="radio" aria-checked="false" class="hit-44">Now</button>
          <button type="button" role="radio" aria-checked="true" class="hit-44" data-mock-allow="contrast" data-mock-why="the lit choice on its raised plate (::before), 11:1 or more, measured">25 December</button>
          <button type="button" role="radio" aria-checked="false" class="hit-44">7 January</button>
        </div>`;
      ticket.after(form);
      const button = document.querySelector(".gift-after a.rule-pray");
      button.textContent = "Give a year · $59.99";
      button.setAttribute("href", "#");
      const terms = document.createElement("p");
      terms.className = "mt-3 px-1 font-sans text-detail leading-[1.5] text-paper/70";
      terms.textContent = "One year, then it simply ends: no renewal, nothing for them to cancel. Paid by card. They open it on any phone or on the web.";
      button.after(terms);
    }, { NAME_FIELD, LABEL });
    await page.evaluate(() => window.scrollTo(0, 0));
    await keep(page, "give", "The giver's page");
    await ctx.close();
  }

  // ── What the one it is given to sees first ──
  {
    const { ctx, page } = await giftPage();
    const { quote } = await common(page, { eyebrow: "A gift from Anna", meta: "A year, given to you" });
    await page.evaluate((quote) => {
      const foot = document.querySelector(".gift-foot-now");
      const line = document.createElement("p");
      line.className = `${quote} mb-2.5`;
      line.textContent = "“Christ is born! Read with me this year.”";
      foot.prepend(line);
    }, quote);
    await page.evaluate(() => window.scrollTo(0, 0));
    await keep(page, "opened", "What the one it is given to sees first");
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (!ok) {
  console.error("checkMock failed on a still above.");
  process.exit(1);
}
console.log("every still passed checkMock");
