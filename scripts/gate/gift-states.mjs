// The gift's claim screens, which no walk reaches (they need a signed-in reader with an order): each
// state the page draws from /api/gifts/order and /api/gifts/order/claim, answered by the route, on the
// final run's export at phone size with touch. Each is held to checkMock with the pixels pass, and every
// control on it is tapped once and must change something (the page, the address, or a request).
import fs from "node:fs";
import { chromium } from "playwright";
import { checkMock } from "../mock-check.mjs";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { asAndroidShell } from "../lib/sells-plus.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const SHOTS = process.argv[2];
const order = (o) => ({ id: "11111111-2222-3333-4444-555555555555", number: "EIK-72D8D24B", paidAt: "2026-11-01T10:00:00Z", months: 1, delivered: true, claimed: false, mine: false, ...o });
const until = "2026-12-11T00:00:00Z";
// An older second order, so a reader's list has more than one.
const second = (o) => ({ id: "66666666-7777-8888-9999-000000000000", number: "EIK-1A2B3C4D", paidAt: "2026-10-02T10:00:00Z", months: 1, delivered: true, claimed: false, mine: false, ...o });
const STATES = [
  ["signed out", { signedIn: false }, null],
  ["ready, claimed on arrival", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({})] }, { result: "ok", plusUntil: until }],
  ["on its way", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({ delivered: false })] }, { result: "not_delivered" }],
  ["Plus running, the gift waits", { signedIn: true, plus: { running: true, pro: false, until }, orders: [order({})] }, { result: "has_plus", plusUntil: until }],
  ["Pro, EIKON Box member", { signedIn: true, plus: { running: true, pro: true, until }, orders: [order({})] }, { result: "has_plus", plusUntil: until }],
  ["claimed before, by this reader", { signedIn: true, plus: { running: true, pro: false, until }, orders: [order({ claimed: true, mine: true })] }, { result: "already" }],
  ["claimed by someone else", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({ claimed: true, mine: false })] }, { result: "already" }],
  ["no orders", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [] }, { result: "no_order" }],
  // The confirm run's four with orders (the arbiter, 2026-11-12 05:37), each with the present's form below the orders.
  ["with orders: on its way", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({ delivered: false })] }, { result: "not_delivered" }],
  ["with orders: on its way, one claimed by its recipient", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({ delivered: false }), second({ claimed: true, mine: false })] }, { result: "not_delivered" }],
  ["with orders: every gift claimed", { signedIn: true, plus: { running: true, pro: false, until }, orders: [order({ claimed: true, mine: false }), second({ claimed: true, mine: true })] }, { result: "already" }],
  ["with orders: one claimed", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({}), second({ claimed: true, mine: false })] }, { result: "ok", plusUntil: until }],
  // Every gift claimed by its recipient and no plan running: the form must stand below the orders.
  ["with orders: every gift claimed, no plan running", { signedIn: true, plus: { running: false, pro: false, until: null }, orders: [order({ claimed: true, mine: false }), second({ claimed: true, mine: false })] }, { result: "already" }],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split("|") : null;
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let fails = 0;
try {
  for (const [name, state, claim] of STATES) {
    if (ONLY && !ONLY.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
    await pinMotion(ctx, "on");
    await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
    await asAndroidShell(ctx);
    await serveLikeTheShell(ctx, OUT, {});
    const asked = [];
    await ctx.route(/\/api\/gifts\/order(\/claim)?(\?|$)/, async (route) => {
      const u = new URL(route.request().url());
      asked.push(`${route.request().method()} ${u.pathname}`);
      if (u.pathname.endsWith("/claim")) return route.fulfill({ status: claim ? 200 : 401, json: claim ?? {} });
      return route.fulfill({ status: 200, json: state });
    });
    const page = await ctx.newPage();
    try {
      await go(page, "/gift/", { timeout: 30000 });
      await page.waitForTimeout(4500);
      await page.screenshot({ path: `${SHOTS}/gift-${name.replace(/[^a-z]+/gi, "-")}.png` });
      const r = await checkMock(page, "body", { pixels: true });
      const said = r.failures.map((f) => `${f.check}${f.palette ? ` [${f.palette}]` : ""}: ${f.what}: ${f.detail}`);
      // Final run 1's fail 11: an order on the account must never be called not found.
      const words = await page.evaluate(() => document.body.innerText);
      if (state.signedIn && state.orders.length && /could not find an EIKON order/i.test(words)) said.push("words: says no order was found while it lists the account's order");
      // The present's form (a parcel someone sent you) stands for every signed-in reader, below the orders
      // when there are others; not while a plan runs, nor once a claim has lit the page and a plan runs
      // (a8610c746: a claim then writes nothing, claim_order_gift "has_plus").
      if (state.signedIn) {
        const place = await page.evaluate(() => {
          const form = document.querySelector("main form");
          const heads = [...document.querySelectorAll("main .set-h")];
          const list = heads.find((h) => /orders/i.test(h.textContent || ""));
          const top = (el) => el.getBoundingClientRect().top + window.scrollY;
          const look = document.querySelector("section.gift-page")?.getAttribute("data-gift") || "";
          return { form: !!form, list: !!list, below: form && list ? top(form) > top(list) : null, listed: list ? list.textContent.trim() : null, look };
        });
        const planRuns = state.plus?.running || place.look === "lit" || place.look === "reveal";
        if (!planRuns && !place.form) said.push("form: the present's form is missing for a signed-in reader with no plan running");
        else if (planRuns && place.form) said.push("form: the present's form stands while a plan runs, where a claim writes nothing");
        else if (place.form && place.list && !place.below) said.push(`form: the present's form stands above "${place.listed}"`);
        console.log(`    form ${place.form ? "present" : "absent"}${planRuns ? ` (a plan runs${place.look ? `, page ${place.look}` : ""}: absent by design)` : ""}${place.form ? (place.list ? `, ${place.below ? "below" : "ABOVE"} "${place.listed}"` : ", no other orders listed") : ""}`);
      }
      // Every control once: a tap must change the page, the address, or ask something.
      // Found afresh by place each time: a tap that leaves the page and comes back draws new elements.
      const SEL = "main button:visible, main a[href]:visible, main [role=button]:visible";
      const count = await page.locator(SEL).count();
      const controls = { length: count };
      const dead = [];
      for (let i = 0; i < Math.min(count, 20); i++) {
        const c = page.locator(SEL).nth(i);
        const label = (await c.evaluate((el) => el.getAttribute("aria-label") || el.innerText || "", null, { timeout: 3000 }).catch(() => "")).trim().slice(0, 40);
        if (!label && !(await c.count())) continue;
        const before = { url: page.url(), html: await page.evaluate(() => document.body.innerHTML.length), asked: asked.length };
        await c.tap({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(900);
        const after = { url: page.url(), html: await page.evaluate(() => document.body.innerHTML.length), asked: asked.length };
        if (before.url === after.url && before.html === after.html && before.asked === after.asked) dead.push(label);
        if (page.url() !== before.url) {
          console.log(`    went to ${new URL(page.url()).pathname} from "${label}"`);
          await page.goBack().catch(() => {});
          await page.waitForTimeout(3000);
        }
      }
      const verdict = said.length || dead.length ? "FAIL" : "pass";
      if (verdict === "FAIL") fails += 1;
      console.log(`${verdict}  ${name}: ${controls.length} controls; asked ${[...new Set(asked)].join(", ") || "nothing"}`);
      for (const s of said) console.log(`    ${s.slice(0, 220)}`);
      for (const d of dead) console.log(`    nothing: a tap on "${d}" changed nothing`);
      for (const u of r.unmeasured) console.log(`    look: ${u.slice(0, 160)}`);
    } catch (e) {
      fails += 1;
      console.log(`FAIL  ${name}: ${String(e).split("\n")[0].slice(0, 160)}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${STATES.length} gift states, ${fails} failed`);
