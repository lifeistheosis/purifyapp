// Every step of the welcome questions opens at its top, forward and back
// (the fresh-eyes walk of 2026-11-11: "What are you looking for?" opened
// 114px down, its title and the Back and Skip buttons off the top). Walked
// on the export, on a phone's screen:
//
//   - at each step the reader is first scrolled to the foot, as one who
//     reached for the button at the bottom of a tall step would be;
//   - the step is then left by its own control, tapped where it stands, with
//     no help from the browser scrolling the button into view;
//   - the next step must stand at its top: the scroller at 0, its title on
//     the screen, and Back and Skip on the screen;
//   - then the same all the way back, by Back.
//
// Three readers, so every step is met: a practicing Orthodox reader (the
// calendar and the fast, the tallest step); the same reader as a priest
// (the clergy's own screens, which are long lists); and a reader who is
// back, who begins on "We updated our onboarding".
//
//   npm run build:android, then: node scripts/questions-top-walk.mjs

import { go } from "./lib/shell-server.mjs";
import { openPhone } from "./mock-check.mjs";

const results = [];
const say = (ok, what) => {
  results.push(ok);
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};
let browser;
async function phone(set) {
  const opened = await openPhone({ scale: 1, set, browser });
  browser = opened.browser;
  await opened.page.emulateMedia({ reducedMotion: "reduce" });
  return opened;
}

/** Where the step stands: the scroller, and whether its title and the bar's two buttons are on the screen. */
const stands = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const onScreen = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    };
    const title = d.querySelector("h1, h2");
    const buttons = [...d.querySelectorAll("button")];
    const back = buttons.find((b) => b.getAttribute("aria-label") === "Back");
    const skip = buttons.find((b) => b.textContent.trim() === "Skip");
    const shown = (b) => (b && !b.disabled ? onScreen(b) : true);
    return {
      title: (title?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48),
      scrollTop: Math.round(d.scrollTop),
      room: d.scrollHeight - d.clientHeight,
      titleOn: onScreen(title),
      backOn: shown(back),
      skipOn: shown(skip),
    };
  });

/** Scroll the questions to their foot, then press a control where it stands. True if one was pressed. */
const pressAtFoot = (page, names) =>
  page.evaluate((names) => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    d.scrollTop = d.scrollHeight;
    const buttons = [...d.querySelectorAll("button")].filter((b) => !b.disabled);
    const text = (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").replace(/\s+/g, " ").trim();
    for (const name of names) {
      const re = new RegExp(name);
      const b = buttons.find((x) => re.test(text(x)));
      if (b) {
        b.click();
        return text(b).slice(0, 40);
      }
    }
    return null;
  }, names);

function judge(who, way, from, now) {
  const ok = now && now.scrollTop === 0 && now.titleOn && now.backOn && now.skipOn;
  say(Boolean(ok), `${who}, ${way} from "${from}": "${now?.title}" opens at its top (scroller at ${now?.scrollTop}${now?.room ? ` of ${now.room}` : ""})`);
}

async function walk(who, set, forward) {
  const { ctx, page } = await phone(set);
  await go(page, "/");
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  let here = await stands(page);
  let steps = 0;
  // Forward, to the end of the questions. An answer is given once on a step,
  // then the step's own way on is pressed.
  let tried = [];
  for (let i = 0; i < 40; i++) {
    if (!here || /Setting up your space/.test(here.title)) break;
    const left = forward.filter((n) => !tried.includes(n));
    const pressed = await pressAtFoot(page, left);
    if (!pressed) break;
    tried.push(left.find((n) => new RegExp(n).test(pressed)));
    await page.waitForTimeout(1100);
    const now = await stands(page);
    if (!now) break;
    if (now.title !== here.title) {
      steps += 1;
      tried = [];
      if (!/Setting up your space/.test(now.title)) judge(who, "forward", here.title, now);
      here = now;
    }
  }
  const reached = here?.title ?? "";
  // And back, to the first step. From the last question, since the end has no Back.
  if (/Setting up your space/.test(reached)) {
    await ctx.close();
    return { steps, reached };
  }
  for (let i = 0; i < 24; i++) {
    const pressed = await pressAtFoot(page, ["^Back$"]);
    if (!pressed) break;
    await page.waitForTimeout(1100);
    const now = await stands(page);
    if (!now || now.title === here.title) break;
    judge(who, "back", here.title, now);
    here = now;
  }
  await ctx.close();
  return { steps, reached };
}

// The answers a walk gives, in the order it tries them at each step. "Continue"
// comes after an answer, so a step that needs one is answered first.
const PRACTICING = ["^Begin$", "^Orthodox$", "^Practicing", "^A rule of prayer", "^Continue with", "^Continue$"];
const A_PRIEST = ["^Begin$", "^Orthodox$", "^Practicing", "^I am a priest or deacon$", "^Priest$", "^United States", "^Continue$"];

// 1. A practicing Orthodox reader, to the last question and back.
{
  const { steps, reached } = await walk("practicing", { "purify:onboarded": "0" }, PRACTICING.filter((n) => n !== "^Continue with"));
  say(steps >= 4 && /What are you looking for/.test(reached), `practicing: walked ${steps} steps, as far as "${reached}"`);
}
// 2. The same, through to the end, so the last step forward is measured too.
{
  const { reached } = await walk("practicing, to the end", { "purify:onboarded": "0" }, PRACTICING);
  say(/Setting up your space/.test(reached), `practicing, to the end: the questions end ("${reached}")`);
}
// 3. A priest: the clergy's own screens.
{
  const { steps, reached } = await walk("a priest", { "purify:onboarded": "0" }, A_PRIEST);
  say(steps >= 5, `a priest: walked ${steps} steps, as far as "${reached}"`);
}
// 4. A reader who is back.
{
  const { steps, reached } = await walk(
    "a reader who is back",
    { "purify:onboarded": "3", "purify:background": "orthodox", "purify:level": "practicing", "purify:intent": "prayer", "purify:intents": JSON.stringify(["prayer"]), "purify:fasting-rule": "modified" },
    PRACTICING.filter((n) => n !== "^Continue with"),
  );
  say(steps >= 4, `a reader who is back: walked ${steps} steps, as far as "${reached}"`);
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
