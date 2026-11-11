// The end of a rule as build 93 note 14 proposes it, where it comes to rest,
// drawn on the native export: Evening Prayers prayed to the end (its Amen),
// and the one change proposed laid on the page's own end: the lampada from
// components/ui/icons (taken as Your rule's Evening switch draws it) above
// the closing line, in a soft pool of the palette's own light, as the page's
// light behind the prayers already is (no rays, a pool or nothing: nothing on
// Light, the light looks or a look). The moment that leads to it is motion,
// told in the plan (docs/1.9-build/notes/build-93.md, note 14); this is the
// page at rest after it. Held to checkMock on all five palettes, and one
// still (scale 2) for the owner.
//
//   npm run build:android && node scripts/mock-rule-complete.mjs [out.png]
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

// A still of its own name: never written over one in docs (the arbiter, 2026-11-10).
const shot = process.argv[2] ?? "rule-complete.png";

// The rules the build would add to app/globals.css, at rest.
const PROPOSED_CSS = `
.rule-complete-lamp {
 position: relative;
 display: grid;
 place-items: center;
 width: 88px;
 height: 64px;
 color: color-mix(in srgb, var(--color-paper) 90%, transparent);
}
.rule-complete-lamp > svg {
 position: relative;
}
.rule-complete-pool {
 position: absolute;
 inset: -26px -84px;
 border-radius: 9999px;
 background: radial-gradient(closest-side, color-mix(in srgb, var(--color-paper) 11%, transparent), transparent);
 pointer-events: none;
}
html[data-reading-mode="parchment"] .rule-complete-pool,
html[data-look] .rule-complete-pool {
 display: none;
}
`;

const { browser, page } = await openPhone({ scale: 2, set: { "purify.motion": "on" } });
let ok = false;
try {
  // The lampada as the app draws it: Your rule's Evening switch.
  await go(page, "/prayers/personal/#evening");
  await page.waitForSelector("#mine-tab-evening svg", { timeout: 20000 });
  const lampada = await page.locator("#mine-tab-evening svg").evaluate((svg) => svg.outerHTML);

  // Evening Prayers, prayed to its end.
  await go(page, "/prayers/evening/");
  const amen = page.locator("[data-rule-end] [data-amen]");
  await amen.waitFor({ timeout: 20000 });
  await amen.scrollIntoViewIfNeeded();
  await amen.tap();
  await page.waitForSelector('[data-rule-end] [role="status"]', { timeout: 10000 });

  // The one change: the lampada and its pool, above the closing line, at rest.
  await page.evaluate(
    ({ svg, css }) => {
      const style = document.createElement("style");
      style.setAttribute("data-mock-proposed", "");
      style.textContent = css;
      document.head.append(style);
      const end = document.querySelector("[data-rule-end]");
      const lamp = document.createElement("div");
      lamp.setAttribute("aria-hidden", "true");
      lamp.setAttribute("data-mock-proposed", "rule-complete");
      lamp.className = "rule-complete-lamp";
      lamp.innerHTML = `<div class="rule-complete-pool"></div>${svg}`;
      const icon = lamp.querySelector("svg");
      icon.setAttribute("width", "32");
      icon.setAttribute("height", "32");
      icon.removeAttribute("class");
      end.insertBefore(lamp, end.querySelector('[role="status"]'));
    },
    { svg: lampada, css: PROPOSED_CSS },
  );
  await page.waitForTimeout(400);

  ok = printMockCheck(await checkMock(page, "[data-rule-end]"), "the end of a rule, at rest (build 93 note 14)");

  // The end in the middle of the screen, as a reader who has just finished sees it.
  await page.evaluate(() => {
    const box = document.querySelector("[data-rule-end]").getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top + box.height / 2 - window.innerHeight * 0.45, behavior: "instant" });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: shot });
  console.log(`\nStill: ${shot}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
