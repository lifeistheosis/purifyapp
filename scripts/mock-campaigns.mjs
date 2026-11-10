// Prayer campaigns, phase 1 (1.9), on the native export: a still of each
// screen, held to checkMock on all five palettes, and a walk of each flow as
// a reader does it, with what it sends checked.
//
// The export has no server, so the campaign routes are answered here, in the
// browser, with made-up campaigns. Nothing leaves the machine: the shell
// server aborts every other origin, and Playwright answers the preflights.
//
// THE EXPORT THIS READS IS THE COMMITTED ONE. The switch has said "testers"
// on the branch since 2026-11-10 (lib/campaigns/flags.ts), so a plain
// `npm run build:android` has the campaign pages, and they show for whoever
// the website says yes to: here, this script's own answers. (While the
// switch was committed closed, a scratch build with it set to "open" was
// needed, and a closed export has none of these screens.) Two quiet places
// read the constant itself and stay hidden in a testers build, the Discover
// menu's row on a wide screen and the free plan's line; no still or flow
// here draws them. Then:
//
//   node scripts/mock-campaigns.mjs [scale] [only] [folder]   the stills
//   WALK=1 node scripts/mock-campaigns.mjs                    the walk
//   WALK=1 FLOWS="starting one" node scripts/mock-campaigns.mjs   only the flows whose names hold those words
//   EYE=parchment,black node scripts/mock-campaigns.mjs 1     and by eye, on other palettes
//   ALL_LOOKS=1 node scripts/mock-campaigns.mjs 1             held on the eighteen looks as well as the five palettes
//   LOCALE=ro WIDTH=360 node scripts/mock-campaigns.mjs 2 19   a still in another language, on a narrower phone
//
// `scale` 2 for pictures a person will see (1 to check); `only` is "all" or
// the stills' numbers ("01,08"); `folder` is where they are written, a
// folder of its own name and never one in docs.
//
// PICTURES NEED AN EXPORT CUT WITH THEM. A store build has campaign pictures
// only when it was cut with them (lib/campaigns/flags.ts,
// PICTURES_IN_STORE_BUILDS), and this harness wears the apps' own user
// agent, so to the app it is a store build. The committed export has none:
// on it the walk holds that nothing of pictures is drawn or asked for even
// while the server says they are on. The pictures' own stills (20 to 24) and
// flows are for a scratch build with that constant set true, and are run
// only when told so:
//
//   PICTURES_BUILD=1 node scripts/mock-campaigns.mjs 2 20,21,22,23,24
//   PICTURES_BUILD=1 WALK=1 FLOWS="pictures" node scripts/mock-campaigns.mjs
//
// THE PLACE THAT WEARS THE PLUS MARK (still 21, and one flow of the walk) is
// drawn only where Plus can be bought, which a build knows from its purchase
// keys. This harness wears the apps' own user agent with no Capacitor behind
// it, so to the app it is a phone whose store is not known yet, and Plus is
// held to be sold there only when both stores sell it
// (lib/entitlements/entitlements.ts, "native-unknown"). So that scratch
// build is also given made-up keys for both:
//
//   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=placeholder
//   NEXT_PUBLIC_REVENUECAT_IOS_KEY=placeholder
//   NEXT_PUBLIC_PLUS_ENFORCED_IOS=true
//
// Without them the still shows the pictures with no such place, which is
// what an iPhone shows today, and the flow says so.
import fs from "node:fs";
import path from "node:path";

import { LOOKS, PALETTES, checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const SCALE = Number(process.argv[2] ?? 1);
const ONLY = process.argv[3] && process.argv[3] !== "all" ? new Set(process.argv[3].split(",")) : null;
const OUT = path.resolve(process.argv[4] ?? "campaign-stills");
const EYE = (process.env.EYE ?? "").split(",").filter(Boolean);
const WALK = process.env.WALK === "1";
/** Only the flows whose names hold one of these (comma separated). All of them when unset. */
const FLOWS = (process.env.FLOWS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
/** Another language for the stills, as the app keeps a reader's choice on the phone. The walk reads English and is not run in one. */
const LOCALE = process.env.LOCALE ?? null;
/** The export was cut with pictures (see the header): their own stills and flows are run. Without it they are named and left. */
const PICTURES_BUILD = process.env.PICTURES_BUILD === "1";
/** The phone's width, for a still on a narrower one. */
const WIDTH = Number(process.env.WIDTH ?? 390);
/** The eighteen looks as well as the five palettes (scripts/mock-check.mjs, LOOKS). */
const WORN = process.env.ALL_LOOKS === "1" ? { palettes: [...PALETTES, ...LOOKS] } : {};
if (!WALK) fs.mkdirSync(OUT, { recursive: true });
const tag = SCALE === 2 ? "" : "x1-";

const DAY = 86_400_000;
const day = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
const TODAY = day(0);
const ends = (lastDay) => `${new Date(Date.parse(`${lastDay}T12:00:00Z`) + DAY).toISOString().slice(0, 10)}T12:00:00.000Z`;

const NICHOLAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const MARIA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const PETER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const SOPHIA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const HELD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5";
const ENDED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6";

function campaign(id, over) {
  const days = over.days ?? 7;
  const last = day(days - 1);
  return {
    id,
    title: "",
    intention: "healing",
    for_whom: "living",
    subject_name: null,
    details: null,
    days,
    starts_on: TODAY,
    ends_on: last,
    ends_at: ends(last),
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date().toISOString(),
    mine: false,
    ...over,
  };
}

const CAMPAIGNS = {
  [NICHOLAS]: campaign(NICHOLAS, {
    title: "Forty days for Nicholas",
    intention: "departed",
    for_whom: "departed",
    subject_name: "Nicholas",
    details: "Our father fell asleep in the Lord on Sunday. Please remember him with us for his forty days.",
    days: 40,
  }),
  [MARIA]: campaign(MARIA, {
    title: "For Maria before her operation",
    intention: "healing",
    subject_name: "Maria",
    details: "She goes into hospital on Thursday. Please remember her this week.",
    days: 7,
    prayer_rule: "protection",
    prayer_id: "psalm-90",
    creator_name: "John",
    creator_handle: "john",
  }),
  [PETER]: campaign(PETER, { title: "For Peter's exams", intention: "study", subject_name: "Peter", details: "His finals begin on Monday.", days: 12, creator_name: "Helen", creator_handle: "helen" }),
  [SOPHIA]: campaign(SOPHIA, { title: "Thanksgiving for Sophia", intention: "thanksgiving", subject_name: "Sophia", details: "She came home safely.", days: 1, creator_name: "Mark", creator_handle: "mark" }),
  [HELD]: campaign(HELD, {
    title: "For Elias on his journey",
    intention: "travel",
    subject_name: "Elias",
    details: "He travels home on Friday.",
    days: 7,
    status: "held",
    creator_name: "Anna",
    mine: true,
  }),
  [ENDED]: campaign(ENDED, { title: "For Irene's recovery", intention: "healing", subject_name: "Irene", details: null, days: 7, status: "answered", mine: true }),
};
const BOARD = [MARIA, PETER, SOPHIA, NICHOLAS].map((id) => CAMPAIGNS[id]);

const now = new Date().toISOString();
const carried = (id, places, until) => {
  const c = CAMPAIGNS[id];
  return {
    id,
    name: c.subject_name,
    title: c.title,
    forWhom: c.for_whom,
    prayer: c.prayer_rule ? { rule: c.prayer_rule, id: c.prayer_id } : null,
    places,
    lastDay: c.ends_on,
    until: until ?? c.ends_on,
    addedAt: now,
    leftAt: null,
    left: null,
    asked: false,
    changedAt: now,
  };
};
const CARRIED = [carried(NICHOLAS, ["morning", "evening"]), carried(MARIA, ["evening"])];
// One that has run its course and waits for its one answer on Your rule.
const OVER = { ...carried(ENDED, ["evening"], day(-1)), lastDay: day(-1), leftAt: now, left: "over" };

const SESSION = {
  access_token: "stills.stills.stills",
  refresh_token: "stills",
  token_type: "bearer",
  expires_in: 31_536_000,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000,
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "anna@example.com",
    app_metadata: {},
    user_metadata: { display_name: "Anna" },
    created_at: "2026-01-01T00:00:00Z",
  },
};

const MOD_QUEUE = {
  holds: [],
  reports: [],
  log: [],
  live: { holds: true, log: true },
  me: { name: "Anna", admin: true },
  campaigns: {
    live: true,
    waiting: [
      {
        id: HELD,
        title: "For Elias on his journey",
        intention: "travel",
        for_whom: "living",
        subject_name: "Elias",
        details: "He travels home on Friday.",
        days: 7,
        ends_on: day(6),
        creator_name: "Anna",
        creator_handle: "anna",
        held_reason: "new",
        created_at: new Date(Date.now() - 40 * 60_000).toISOString(),
      },
    ],
    reports: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        reason: null,
        reason_code: "money",
        created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        campaign: { id: PETER, title: "For Peter's exams", status: "active", intention: "study", subject_name: "Peter", details: "His finals begin on Monday.", creator_name: "Helen" },
      },
    ],
  },
};

// A campaign's updates and comments (phase 2), as its thread route hands them on.
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const note = (n, over) => ({
  id: `cccccccc-cccc-4ccc-8ccc-ccccccccccc${n}`,
  update: false,
  body: "",
  author_name: "Reader",
  author_handle: null,
  author_avatar: null,
  author_clergy: null,
  created_at: ago(60),
  mine: false,
  muted: false,
  ...over,
});
const THREADS = {
  [NICHOLAS]: {
    updates: [
      note(1, { update: true, body: "The forty days end on the feast. Thank you for carrying him with us.", author_name: "Anna", created_at: ago(90) }),
      note(2, { update: true, body: "The funeral was this morning. Memory eternal.", author_name: "Anna", created_at: ago(2 * 1440) }),
    ],
    comments: [note(3, { body: "Memory eternal.", author_name: "Thomas", created_at: ago(300) })],
  },
  [MARIA]: {
    updates: [note(4, { update: true, body: "The operation is on Thursday at nine.", author_name: "John", created_at: ago(1440) })],
    comments: [
      note(5, { body: "Praying for Maria this week.", author_name: "Thomas", author_handle: "thomas", created_at: ago(600) }),
      note(6, { body: "Lord, have mercy.", author_name: "Father Andrew", author_handle: "frandrew", author_clergy: "priest", created_at: ago(240) }),
      note(7, { body: "She is in our prayers at home.", author_name: "Anna", created_at: ago(30), mine: true }),
    ],
  },
};
/** The thread a page is handed: what this reader may do follows who they are, as the route decides it. */
function threadFor(id, { mine = false, signedIn = true, commentsOpen = true } = {}) {
  const t = THREADS[id] ?? { updates: [], comments: [] };
  const running = CAMPAIGNS[id]?.status === "active";
  // Its creator's updates are their own words, as the route says of them.
  const updates = mine ? t.updates.map((u) => ({ ...u, mine: true })) : t.updates;
  return { ...t, updates, commentsOpen, signedIn, canUpdate: running && mine, canComment: running && signedIn && commentsOpen };
}

// "Prayed by many" (switched off on the server): an order for each span, and never a figure.
const MANY = {
  day: [],
  week: [CAMPAIGNS[NICHOLAS], CAMPAIGNS[MARIA]],
  month: [CAMPAIGNS[NICHOLAS], CAMPAIGNS[MARIA], CAMPAIGNS[PETER]],
  year: [CAMPAIGNS[NICHOLAS], CAMPAIGNS[MARIA], CAMPAIGNS[PETER]],
};

// A campaign's pictures (his item 121), as the pictures route hands them on.
// The sample pictures are the app's own artwork, already in the export: an
// icon is what a reader might well attach, and no photograph of anyone is
// made up for a drawing.
const pic = (n, src, over = {}) => ({ id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${n}`, url: src, width: 1200, height: 1600, alt: null, held: false, ...over });
const PICTURES = {
  [MARIA]: [
    pic(1, "/icons/prayer/theotokos-of-vladimir.jpg", { alt: "The icon in her room" }),
    pic(2, "/icons/prayer/christ-pantocrator.v2.jpg"),
    pic(3, "/icons/prayer/anastasis.jpg", { alt: "From the parish, at Pascha" }),
  ],
};
/** What the route answers: every reader the ones cleared; its creator also their own that wait, their limit, and whether a place is free. */
function picturesFor(id, { mine = false, waiting = 0, limit = 3 } = {}) {
  const all = PICTURES[id] ?? [];
  if (!mine) return { pictures: all, limit: null, canAdd: false };
  const pictures = all.map((p, i) => (i >= all.length - waiting ? { ...p, held: true } : p));
  return { pictures, limit, canAdd: pictures.length < limit };
}
/** The team's queue with pictures on: one new, covered until it is tapped, and one a reader reported. */
const MOD_PICTURES = [
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd7",
    url: "/icons/prayer/theotokos-of-vladimir.jpg",
    shown: false,
    alt: "The icon in her room",
    check_result: "nothing found",
    created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    reports: [],
    campaign: { id: MARIA, title: "For Maria before her operation", creator_name: "John" },
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd8",
    url: "/icons/prayer/anastasis.jpg",
    shown: true,
    alt: null,
    check_result: "nothing found",
    created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    reports: [{ reason_code: "picture", reason: "Is this theirs to share?" }],
    campaign: { id: PETER, title: "For Peter's exams", creator_name: "Helen" },
  },
];

const seen = new Set();
/** Every request a screen made of the server, for the walk to hold. */
let calls = [];
/** And each one's address with its query, in order. */
let asked = [];
async function answer(ctx, opts = {}) {
  await ctx.route("https://purifyapp.net/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const cors = { "Access-Control-Allow-Origin": "https://localhost", "Access-Control-Allow-Credentials": "true", Vary: "Origin" };
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
    seen.add(`${req.method()} ${p}`);
    let sent = null;
    try {
      sent = JSON.parse(req.postData() ?? "null");
    } catch {
      sent = null;
    }
    calls.push({ method: req.method(), path: p, body: sent });
    asked.push(`${p}${url.search}`);
    // The parts that ship switched off are off unless a picture asks for one, as the server says them.
    const parts = { many: false, pictures: false, ...(opts.parts ?? {}) };
    if (p === "/api/campaigns/open") return opts.closed ? json({ error: "Not found." }, 404) : json({ open: true, parts });
    if (p === "/api/campaigns/many") {
      if (opts.closed || !parts.many) return json({ error: "Not found." }, 404);
      return json({ campaigns: MANY[url.searchParams.get("span") ?? "week"] ?? [] });
    }
    if (opts.closed && p.startsWith("/api/campaigns")) return json({ error: "Not found." }, 404);
    const pictures = /^\/api\/campaigns\/([0-9a-f-]{36})\/pictures$/.exec(p);
    if (pictures) {
      // Switched off on the server, it is not there for anyone.
      if (!parts.pictures) return json({ error: "Not found." }, 404);
      if (req.method() === "GET") return json(picturesFor(pictures[1], { mine: Boolean(opts.mine?.includes(pictures[1])), ...(opts.pictures ?? {}) }));
      if (req.method() === "POST") return json({ ok: true, id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd9" });
      return json({ ok: true });
    }
    if (p === "/api/campaigns" && req.method() === "POST") return json({ ok: true, id: HELD, status: "held" });
    if (/^\/api\/campaigns\/[0-9a-f-]{36}\/(join|report)$/.test(p)) return json({ ok: true });
    const thread = /^\/api\/campaigns\/([0-9a-f-]{36})\/thread$/.exec(p);
    if (thread && req.method() === "GET") return json(threadFor(thread[1], { mine: Boolean(opts.mine?.includes(thread[1])), signedIn: opts.signedIn !== false, commentsOpen: opts.commentsOpen !== false }));
    if (thread && req.method() === "POST") return json({ ok: true, id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc9", held: opts.held === true });
    if (thread && req.method() === "DELETE") return json({ ok: true });
    if (p === "/api/community/report" && req.method() === "POST") return json({ ok: true });
    if (/^\/api\/campaigns\/[0-9a-f-]{36}$/.test(p) && (req.method() === "PATCH" || req.method() === "DELETE")) return json({ ok: true });
    if (p === "/api/community/moderation" && req.method() === "POST") return json({ ok: true });
    if (p === "/api/campaigns" && req.method() === "GET") return json({ campaigns: opts.board ?? BOARD });
    if (p === "/api/campaigns/mine") return json({ signedIn: true, started: [CAMPAIGNS[HELD], { ...CAMPAIGNS[NICHOLAS], mine: true }, CAMPAIGNS[ENDED]], carried: [] });
    if (p === "/api/campaigns/state") {
      const ids = JSON.parse(req.postData() ?? "{}").ids ?? [];
      return json({ states: Object.fromEntries(ids.map((id) => [id, "running"])) });
    }
    const one = /^\/api\/campaigns\/([0-9a-f-]{36})$/.exec(p);
    if (one && req.method() === "GET") {
      const c = CAMPAIGNS[one[1]];
      return c ? json({ campaign: { ...c, ...(opts.mine?.includes(c.id) ? { mine: true, keep_after_end: false, listed: true } : {}) } }) : json({ error: "Not found." }, 404);
    }
    // The prayer wall went in 1.9: the server answers an app of 1.8 with nobody on it, and this app never asks.
    if (p === "/api/community/prayer-wall") return json({ requests: [], intentions: false });
    if (p === "/api/community/moderation") {
      if (url.searchParams.get("summary")) return json({ waiting: 2 });
      // The team's queue carries pictures only while the server has them on, and never for a build that says it has none.
      const sendsPictures = parts.pictures && url.searchParams.get("pictures") !== "0";
      return json(sendsPictures ? { ...MOD_QUEUE, campaigns: { ...MOD_QUEUE.campaigns, waiting: [], reports: [], pictures: MOD_PICTURES } } : MOD_QUEUE);
    }
    return json({ error: "Not found." }, 404);
  });
}

const results = [];
const settle = (page, ms = 2200) => page.waitForTimeout(ms);

/** The whole page in one picture: the viewport grown to the page's own height. */
async function whole(page, min = 844) {
  const h = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  await page.setViewportSize({ width: WIDTH, height: Math.max(min, h) });
}

async function shot(name, label, where, selector, { set = {}, prepare, signedIn = true, mine, board, parts, pictures, check = true } = {}) {
  if (WALK) return;
  if (ONLY && !ONLY.has(name.slice(0, 2))) return;
  const seed = {
    "purify.prayers.campaigns": JSON.stringify(CARRIED),
    ...(signedIn ? { "purify.supabase.auth": JSON.stringify([{ name: "sb-placeholder-auth-token", value: JSON.stringify(SESSION) }]) } : {}),
    ...(LOCALE ? { "CapacitorStorage.purify_locale": LOCALE } : {}),
    ...set,
  };
  const { browser, page, ctx } = await openPhone({ scale: SCALE, set: seed });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    if (WIDTH !== 390) await page.setViewportSize({ width: WIDTH, height: 844 });
    await answer(ctx, { mine, board, signedIn, parts, pictures });
    await go(page, where);
    await settle(page);
    if (prepare) await prepare(page);
    await settle(page, 900);
    let ok = true;
    if (check) {
      ok = printMockCheck(await checkMock(page, selector, WORN), label);
    }
    results.push([label, ok]);
    await settle(page, 400);
    await page.screenshot({ path: path.join(OUT, `${tag}${name}.png`) });
    // What the checker could not measure (words on a lit panel's gradient) is looked at by eye on the other palettes.
    for (const mode of EYE) {
      await page.evaluate((m) => document.documentElement.setAttribute("data-reading-mode", m), mode);
      await settle(page, 500);
      await page.screenshot({ path: path.join(OUT, `eye-${mode}-${name}.png`) });
    }
    if (EYE.length) await page.evaluate(() => document.documentElement.removeAttribute("data-reading-mode"));
    if (errors.length) console.log(`  page errors on ${name}:`, errors.slice(0, 3));
  } finally {
    await browser.close();
  }
}

/** A still of the pictures themselves: drawn only on an export cut with them, and otherwise named and left. */
async function pictureShot(name, ...rest) {
  if (PICTURES_BUILD) return shot(name, ...rest);
  if (!WALK && (!ONLY || ONLY.has(name.slice(0, 2)))) console.log(`left: ${name} needs an export cut with pictures (PICTURES_BUILD=1; see the header)`);
}

// 01 Pray together: the carried card, the others carried, Newly asked. The whole half: the prayer wall
// stood under it until 1.9 and went at his word (2026-11-10).
await shot("01-pray-together", "Pray together: prayer campaigns, and nothing else", "/community#pray", "[role=tabpanel]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaigns]", { timeout: 15000 });
    await whole(page);
  },
});

// 02 The board.
await shot("02-board", "the board: every campaign running", "/campaigns", "[data-campaign-board]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-row]", { timeout: 15000 });
    await whole(page);
  },
});

// 03 A campaign's page, for the reposed.
await shot("03-campaign-reposed", "a campaign's page, for the reposed", `/campaigns/detail?id=${NICHOLAS}`, "[data-campaign-page]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await whole(page);
  },
});

// 04 A campaign's page, for the living, with its psalm.
await shot("04-campaign-living", "a campaign's page, for the living, with a psalm", `/campaigns/detail?id=${MARIA}`, "[data-campaign-page]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll("[data-campaign-page] h3").length > 0, null, { timeout: 15000 });
    await whole(page);
  },
});

// 05 Its creator's page while it waits for a moderator.
await shot("05-campaign-waiting", "a campaign waiting for a moderator, as its creator sees it", `/campaigns/detail?id=${HELD}`, "[data-campaign-page]", {
  mine: [HELD],
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await whole(page);
  },
});

// 06 The creator's menu.
await shot("06-creator-menu", "the creator's menu", `/campaigns/detail?id=${NICHOLAS}`, "[role=dialog]", {
  mine: [NICHOLAS],
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    await page.waitForSelector("[role=dialog]", { timeout: 8000 });
  },
});

// 07 Reporting.
await shot("07-report", "reporting a campaign", `/campaigns/detail?id=${MARIA}`, "[role=dialog]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    await page.waitForSelector("[role=dialog]", { timeout: 8000 });
    await settle(page, 600);
    await page.locator("[role=dialog] button", { hasText: "Report" }).first().click();
    await settle(page, 900);
    await page.setViewportSize({ width: 390, height: 980 });
  },
});

// 08 Joining: Add to my prayers, on one not yet carried.
await shot("08-add-to-my-prayers", "joining: add to my prayers", `/campaigns/detail?id=${PETER}`, "[role=dialog]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.locator("[data-campaign-page] button[aria-haspopup=dialog]", { hasText: "Add to my prayers" }).first().click();
    await page.waitForSelector("[data-campaign-join]", { timeout: 8000 });
    await page.setViewportSize({ width: 390, height: 980 });
  },
});

// 09 Starting one, for the living.
await shot("09-start-living", "starting a campaign, for the living", "/campaigns/new", "[data-campaign-new]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.fill("#campaign-title-field", "For Maria before her operation");
    await page.fill("#campaign-name-field", "Maria");
    await page.fill("#campaign-words-field", "She goes into hospital on Thursday. Please remember her this week.");
    await page.evaluate(() => document.activeElement?.blur());
    const h = await page.evaluate(() => {
      const root = document.querySelector("[data-campaign-new]");
      const scroller = root.querySelector(".overflow-y-auto");
      const foot = root.querySelector(".compose-foot");
      return Math.ceil(scroller.scrollHeight + foot.getBoundingClientRect().height);
    });
    await page.setViewportSize({ width: 390, height: Math.max(844, h) });
  },
});

// 10 Starting one, for the reposed.
await shot("10-start-reposed", "starting a campaign, for the reposed", "/campaigns/new", "[data-campaign-new]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.locator("[data-campaign-new] button[aria-pressed]").nth(1).click();
    await page.fill("#campaign-title-field", "Forty days for Nicholas");
    await page.fill("#campaign-name-field", "Nicholas");
    for (const box of await page.locator("[data-campaign-new] [role=checkbox]").all()) await box.click();
    await page.evaluate(() => document.activeElement?.blur());
    const h = await page.evaluate(() => {
      const root = document.querySelector("[data-campaign-new]");
      const scroller = root.querySelector(".overflow-y-auto");
      const foot = root.querySelector(".compose-foot");
      return Math.ceil(scroller.scrollHeight + foot.getBoundingClientRect().height);
    });
    await page.setViewportSize({ width: 390, height: Math.max(844, h) });
  },
});

// 11 How long: the sheet of lines to tick.
await shot("11-how-long", "starting one: how long", "/campaigns/new", "[role=dialog]:not([data-campaign-new])", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.locator("[data-campaign-new] .set-panel button").nth(1).click();
    await page.waitForSelector("[role=radiogroup]", { timeout: 8000 });
    await page.locator("[role=radio]").last().click();
    await settle(page, 500);
  },
});

// 12 In the prayers: Evening prayers at Those I pray for, with both names and the psalm.
await shot("12-in-the-prayers", "the campaigns inside the prayers", "/prayers/evening", "#commemoration", {
  set: {
    "purify.intentions.living": JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222", name: "Catherine", addedAt: now }]),
    // Easy Scroll (build 89 note 7) settles the page on a prayer's first line,
    // which pulls a still set at the names back to the prayer before them.
    // Off for this one picture, as a reader who has turned it off sees it.
    "purify.easyScroll": "off",
  },
  prepare: async (page) => {
    await page.waitForSelector("#commemoration", { timeout: 15000 });
    await page.waitForSelector("#campaign-psalm-90", { timeout: 15000 });
    await page.setViewportSize({ width: 390, height: 1500 });
    await page.evaluate(() => {
      const el = document.getElementById("commemoration");
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "instant" });
    });
  },
});

// 13 Your rule: the names, with the campaigns and the one question.
await shot("13-your-rule-names", "Your rule: the campaigns among those you pray for", "/prayers/personal", "[data-names=campaigns]", {
  set: { "purify.prayers.campaigns": JSON.stringify([...CARRIED, OVER]) },
  prepare: async (page) => {
    await page.waitForSelector("[data-names=campaigns]", { timeout: 15000 });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => {
      const el = document.querySelector("[data-names=campaigns]");
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 360, behavior: "instant" });
    });
  },
});

// 14 My campaigns.
await shot("14-my-campaigns", "my campaigns", "/campaigns/mine", "[data-my-campaigns]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-my-campaigns] [data-campaign-row]", { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll("[data-my-campaigns] [data-campaign-row]").length >= 4, null, { timeout: 15000 });
    await whole(page);
  },
});

// 15 The rules.
await shot("15-rules", "the rules of praying together", "/campaigns/rules", "[data-campaign-rules]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-rules]", { timeout: 15000 });
    await whole(page);
  },
});

// 16 The moderators' page.
await shot("16-moderation", "the moderators' queue, with campaigns", "/community/moderate", "[data-mod-campaigns]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-mod-campaigns]", { timeout: 15000 });
    await whole(page);
  },
});


// ── The walk: each flow done as a reader does it, and what it sent ──────────
const walked = [];
// 17 Updates: the creator's own word to those who pray, with the field at its head.
await shot("17-updates", "a campaign's updates, as its creator sees them", `/campaigns/detail?id=${NICHOLAS}#updates`, "[data-campaign-page]", {
  mine: [NICHOLAS],
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-updates] [data-note=update]", { timeout: 15000 });
    await whole(page);
  },
});

// 18 Comments: drawn as the replies under a post are, with the field at the foot.
await shot("18-comments", "a campaign's comments", `/campaigns/detail?id=${MARIA}#comments`, "[data-campaign-page]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-comments] [data-note=comment]", { timeout: 15000 });
    await whole(page);
  },
});

// 19 The board with "Prayed by many", as it would be once the server switches it on.
await shot("19-prayed-by-many", "the board with Prayed by many, switched on", "/campaigns", "[data-campaign-board]", {
  parts: { many: true },
  prepare: async (page) => {
    await page.waitForSelector("[data-campaigns-many] [data-campaign-row]", { timeout: 15000 });
    await whole(page);
  },
});

// 20 to 24 Pictures (his item 121), as they would be once the server switches
// them on. They ship switched off, and the walk holds that off draws nothing.

// 20 A reader's view: the first picture is the page's head, the rest stand in a row under About.
await pictureShot("20-pictures", "a campaign with pictures, switched on", `/campaigns/detail?id=${MARIA}`, "[data-campaign-page]", {
  parts: { pictures: true },
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    await whole(page);
  },
});

// 21 Its creator's view at three: one still waits, and the next place wears the Plus mark.
await pictureShot("21-pictures-creator", "its creator's pictures: one waiting, and where Plus is met", `/campaigns/detail?id=${MARIA}`, "[data-campaign-page]", {
  mine: [MARIA],
  parts: { pictures: true },
  pictures: { waiting: 1 },
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    await whole(page);
  },
});

// 22 Adding one: the picture, what it shows, and the two lines to tick.
await pictureShot("22-picture-add", "adding a picture: the two lines to tick", `/campaigns/detail?id=${NICHOLAS}`, "[role=dialog]", {
  mine: [NICHOLAS],
  parts: { pictures: true },
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-pictures]", { timeout: 15000 });
    await page.locator('[data-campaign-pictures] button[aria-label="Add a picture"]').click();
    await page.waitForSelector("[role=dialog] [role=checkbox]", { timeout: 8000 });
    await page.locator("[role=dialog] [role=checkbox]").first().click();
  },
});

// 23 One picture, opened: what it shows, and Report.
await pictureShot("23-picture-open", "a picture opened, with Report", `/campaigns/detail?id=${MARIA}`, "[role=dialog]", {
  parts: { pictures: true },
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    await page.locator("[data-campaign-pictures] button").first().click();
    await page.waitForSelector("[role=dialog] img", { timeout: 8000 });
  },
});

// 24 The team's queue: a picture is covered until it is tapped.
await pictureShot("24-pictures-team", "the team's queue: pictures to look at", "/community/moderate", "[data-mod-campaigns]", {
  parts: { pictures: true },
  prepare: async (page) => {
    await page.waitForSelector("[data-mod-campaign-picture]", { timeout: 15000 });
    await whole(page);
  },
});

// The two photos his decision on the prayer wall was made from
// (docs/1.9-build/notes/decisions/wall-1-today.png and wall-2-after.png) were stills 30 and 31 of this
// script as it stood at commit 35205d89c, drawn while the wall was still in the app. It is not any more,
// so they cannot be drawn again from here; still 01 is what "after" became.

/** A flow of the pictures themselves: walked only on an export cut with them, and otherwise named and left. */
async function pictureWalk(label, ...rest) {
  if (PICTURES_BUILD) return walk(label, ...rest);
  if (!FLOWS.length || FLOWS.some((f) => label.toLowerCase().includes(f))) console.log(`left  ${label}: needs an export cut with pictures (PICTURES_BUILD=1; see the header)`);
}

async function walk(label, where, run, { set = {}, signedIn = true, mine, closed = false, parts, pictures } = {}) {
  if (FLOWS.length && !FLOWS.some((f) => label.toLowerCase().includes(f))) return;
  const seed = {
    "purify.prayers.campaigns": JSON.stringify(CARRIED),
    ...(signedIn ? { "purify.supabase.auth": JSON.stringify([{ name: "sb-placeholder-auth-token", value: JSON.stringify(SESSION) }]) } : {}),
    ...set,
  };
  const { browser, page, ctx } = await openPhone({ scale: 1, set: seed });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  calls = [];
  asked = [];
  let ok = true;
  let why = "";
  try {
    await answer(ctx, { mine, closed, parts, pictures });
    await go(page, where);
    await settle(page, 1800);
    await run(page);
    if (errors.length) throw new Error(`page errors: ${errors.slice(0, 2).join(" | ")}`);
  } catch (e) {
    ok = false;
    why = e.message.split("\n")[0];
  } finally {
    await browser.close();
  }
  walked.push([label, ok, why]);
  console.log(`${ok ? "ok  " : "NO  "} ${label}${why ? `: ${why}` : ""}`);
}
const expectThat = (cond, what) => {
  if (!cond) throw new Error(what);
};
const sentTo = (method, re) => calls.filter((c) => c.method === method && re.test(c.path));
const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);

if (WALK) {
  console.log("\nThe walk:");

  await walk("starting one: the page sends what the route asks, then opens the campaign waiting", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    const create = page.locator("[data-campaign-new] .compose-foot button");
    expectThat(await create.isDisabled(), "Create is lit before anything is written");
    await page.fill("#campaign-title-field", "For Elias on his journey");
    await page.fill("#campaign-name-field", "Elias");
    await page.fill("#campaign-words-field", "He travels home on Friday.");
    // What for: a journey.
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "A journey" }).click();
    await settle(page, 700);
    // A psalm: Psalm 90.
    await page.locator("[data-campaign-new] .set-panel button").nth(2).click();
    await page.locator("[role=radio]", { hasText: "Psalm 90" }).click();
    await settle(page, 700);
    expectThat(await create.isDisabled(), "Create is lit with no blessing ticked");
    await page.locator("[role=radio]", { hasText: "Someone else" }).click();
    // Two lines to tick: the rules, and the Terms of Service.
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    expectThat((await boxes.count()) === 2, `there are ${await boxes.count()} lines to tick, not the rules and the Terms`);
    await boxes.nth(0).click();
    expectThat(await create.isDisabled(), "Create is lit with the Terms of Service not accepted");
    // The Terms open in their sheet over the page; the link ticks nothing, and what was written stays.
    const terms = page.locator("[data-campaign-terms]");
    await terms.locator("a[data-legal-link=terms]").click();
    await page.waitForSelector("[data-legal-sheet]", { timeout: 15000 });
    expectThat((await terms.locator("[role=checkbox]").getAttribute("aria-checked")) === "false", "opening the Terms ticked the line");
    await page.keyboard.press("Escape");
    await page.waitForSelector("[data-legal-sheet]", { state: "detached", timeout: 15000 });
    expectThat((await page.inputValue("#campaign-title-field")) === "For Elias on his journey", "what was written was lost behind the Terms");
    // A tap on the line's words ticks it, as a tap on its tick does.
    await terms.locator("label").click({ position: { x: 6, y: 8 } });
    expectThat((await terms.locator("[role=checkbox]").getAttribute("aria-checked")) === "true", "a tap on the line's words did not tick it");
    expectThat(!(await create.isDisabled()), "Create stays dim when everything is said");
    await create.click();
    await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/campaigns/detail", null, { timeout: 15000 });
    await page.waitForSelector("[data-campaign-standing]", { timeout: 15000 });
    const [post] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(post, "nothing was sent");
    const b = post.body;
    expectThat(b.forWhom === "living" && b.kind === "travel" && b.title === "For Elias on his journey" && b.name === "Elias", `sent ${JSON.stringify(b)}`);
    expectThat(b.words === "He travels home on Friday." && b.days === 7 && b.startsOn === TODAY, `sent ${JSON.stringify(b)}`);
    expectThat(b.prayer?.rule === "protection" && b.prayer?.id === "psalm-90" && b.consent === "blessing" && b.blessing === true && b.rules === true, `sent ${JSON.stringify(b)}`);
    expectThat(b.termsAccepted === true, `the acceptance of the Terms was not sent: ${JSON.stringify(b)}`);
    expectThat((await page.locator("[data-campaign-standing]").innerText()).includes("Waiting for a moderator"), "the campaign does not say it waits");
  }, { mine: [HELD] });

  await walk("Pray together: campaigns alone, behind its own door, and nothing is asked of the prayer wall", "/community#pray", async (page) => {
    await page.waitForSelector("[data-campaigns]", { timeout: 15000 });
    await settle(page, 1200);
    expectThat((await page.locator("[role=tablist] [role=tab]").count()) === 2, "the switch between the two halves is not drawn");
    expectThat((await page.locator("[data-prayer-wall]").count()) === 0, "the prayer wall is drawn");
    const said = await page.locator("[role=tabpanel]").innerText();
    expectThat(!/prayer wall|Ask for prayers|I prayed/i.test(said), `the wall's words are on the page: ${said.slice(0, 120)}`);
    expectThat(!calls.some((c) => c.path === "/api/community/prayer-wall"), "the prayer wall was asked for");
  });

  await walk("joining: the name goes into the device's list and the choice to the account; taking it out lets go", `/campaigns/detail?id=${PETER}`, async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.locator("[data-campaign-page] button[aria-haspopup=dialog]", { hasText: "Add to my prayers" }).first().click();
    await page.waitForSelector("[data-campaign-join]", { timeout: 8000 });
    await page.locator("[data-campaign-join] [role=radio]", { hasText: "A week" }).click();
    await page.locator("[data-campaign-join] button", { hasText: "Add to my prayers" }).last().click();
    await settle(page, 900);
    const list = await stored(page, "purify.prayers.campaigns");
    const mine = list.find((c) => c.id === PETER);
    expectThat(mine && mine.name === "Peter" && mine.leftAt === null, "Peter is not in the device's list");
    expectThat(mine.until === day(6) && mine.lastDay === CAMPAIGNS[PETER].ends_on, `kept until ${mine.until}`);
    expectThat(mine.places.join() === "morning,evening,mine", `in ${mine.places}`);
    const [join] = sentTo("POST", /\/join$/);
    expectThat(join && join.body.until === day(6) && join.body.places.length === 3, `the account was sent ${JSON.stringify(join?.body)}`);
    expectThat(await page.locator("[data-campaign-page] button", { hasText: "In my prayers" }).count(), "the page does not say it is in my prayers");
    // And out again.
    await page.locator("[data-campaign-page] button", { hasText: "In my prayers" }).first().click();
    await page.waitForSelector("[data-campaign-join]", { timeout: 8000 });
    await page.locator("[data-campaign-join] button", { hasText: "Take out of my prayers" }).click();
    await settle(page, 900);
    const after = (await stored(page, "purify.prayers.campaigns")).find((c) => c.id === PETER);
    expectThat(after.leftAt && after.left === "out" && after.asked === true, "taking it out did not let go");
    expectThat(sentTo("DELETE", /\/join$/).length === 1, "the account was not told");
  });

  await walk("reporting: a reason ticked and sent, and said", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    await page.locator("[role=dialog] button", { hasText: "Report" }).first().click();
    await settle(page, 800);
    await page.locator("[role=radio]", { hasText: "It asks for money" }).click();
    await page.locator("[role=dialog] button", { hasText: "Send" }).click();
    await settle(page, 900);
    const [report] = sentTo("POST", /\/report$/);
    expectThat(report && report.body.reason === "money", `sent ${JSON.stringify(report?.body)}`);
    expectThat((await page.locator("[data-campaign-page] [role=status]").innerText()).includes("A moderator will look at it"), "nothing was said");
  });

  await walk("its creator: keeps it, and ends it early with its closing", `/campaigns/detail?id=${NICHOLAS}`, async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    // Two switches for the reposed: keep it, then comments.
    await page.locator("[role=dialog] [role=switch]").first().click();
    await settle(page, 700);
    expectThat(sentTo("PATCH", /^\/api\/campaigns\/[0-9a-f-]{36}$/).some((c) => c.body.keepAfterEnd === true), "keeping it was not sent");
    expectThat((await page.locator("[role=dialog] [role=switch]").first().getAttribute("aria-checked")) === "true", "the switch did not turn");
    await page.locator("[role=dialog] button", { hasText: "End it early" }).click();
    await settle(page, 800);
    await page.locator("[role=dialog] button", { hasText: "End it early" }).last().click();
    await settle(page, 900);
    expectThat(sentTo("PATCH", /^\/api\/campaigns\/[0-9a-f-]{36}$/).some((c) => c.body.status === "memory_eternal"), "its closing was not sent");
    expectThat((await page.locator("[data-campaign-standing]").innerText()).includes("Memory eternal"), "the page does not say how it closed");
  }, { mine: [NICHOLAS] });

  await walk("Your rule: Keep puts the name in the reader's own list, once", "/prayers/personal", async (page) => {
    await page.waitForSelector("[data-campaign-keep]", { timeout: 15000 });
    await page.locator("[data-campaign-keep] button", { hasText: "Keep" }).click();
    await settle(page, 700);
    const living = await stored(page, "purify.intentions.living");
    expectThat(Array.isArray(living) && living.some((n) => n.name === "Irene"), "Irene is not among the living");
    expectThat((await page.locator("[data-campaign-keep]").count()) === 0, "the question is still asked");
    expectThat((await stored(page, "purify.prayers.campaigns")).find((c) => c.id === ENDED).asked === true, "the answer was not kept");
  }, { set: { "purify.prayers.campaigns": JSON.stringify([...CARRIED, OVER]) } });

  await walk("the moderators' page: Approve is sent as the campaign's own action", "/community/moderate", async (page) => {
    await page.waitForSelector("[data-mod-campaign]", { timeout: 15000 });
    await page.locator("[data-mod-campaign] button", { hasText: "Approve" }).click();
    await settle(page, 900);
    const [sent] = sentTo("POST", /^\/api\/community\/moderation$/);
    expectThat(sent && sent.body.action === "approve_campaign" && sent.body.id === HELD, `sent ${JSON.stringify(sent?.body)}`);
  });

  await walk("an update: its creator writes one behind the Updates door, and it is sent as an update", `/campaigns/detail?id=${NICHOLAS}`, async (page) => {
    await page.waitForSelector("[data-campaign-doors]", { timeout: 15000 });
    await page.locator("#campaign-tab-updates").click();
    expectThat(new URL(page.url()).hash === "#updates", `the address says ${new URL(page.url()).hash}`);
    await page.waitForSelector("[data-note-field=update] textarea", { timeout: 8000 });
    const post = page.locator("[data-note-field=update] button");
    expectThat(await post.isDisabled(), "Post is lit before anything is written");
    await page.fill("[data-note-field=update] textarea", "He was buried beside his wife.");
    await post.click();
    await settle(page, 900);
    const [sent] = sentTo("POST", /\/thread$/);
    expectThat(sent && sent.body.kind === "update" && sent.body.body === "He was buried beside his wife.", `sent ${JSON.stringify(sent?.body)}`);
    expectThat((await page.inputValue("[data-note-field=update] textarea")) === "", "the field kept the words");
    expectThat(sentTo("GET", /\/thread$/).length >= 2, "the updates were not asked for again");
    // Pray leads back to the prayer, behind About.
    await page.locator("[data-campaign-page] a[href='#campaign-prayer']").click();
    await settle(page, 500);
    expectThat((await page.locator("#campaign-tab-about").getAttribute("aria-selected")) === "true", "Pray did not open About");
    expectThat(await page.locator("#campaign-prayer").isVisible(), "the prayer is not shown");
  }, { mine: [NICHOLAS] });

  await walk("a comment: written at the foot, another's reported, and one's own deleted", `/campaigns/detail?id=${MARIA}#comments`, async (page) => {
    await page.waitForSelector("[data-campaign-comments] [data-note=comment]", { timeout: 15000 });
    expectThat((await page.locator("#campaign-tab-comments").getAttribute("aria-selected")) === "true", "the address did not open Comments");
    await page.fill("[data-note-field=comment] textarea", "Remembering her at the Liturgy on Sunday.");
    await page.locator("[data-note-field=comment] button").click();
    await settle(page, 900);
    const [sent] = sentTo("POST", /\/thread$/);
    expectThat(sent && sent.body.kind === "comment" && sent.body.body === "Remembering her at the Liturgy on Sunday.", `sent ${JSON.stringify(sent?.body)}`);
    // Nothing under a comment to react with, and no number anywhere in the panel.
    expectThat((await page.locator("[data-campaign-comments] button[aria-pressed]").count()) === 0, "a comment has something to react with");
    // Someone else's: Report, from its menu.
    const first = page.locator("[data-campaign-comments] [data-note=comment]").first();
    await first.locator("button[aria-haspopup]").click();
    await page.locator("[role=menu] [role=menuitem]", { hasText: "Report" }).click();
    await settle(page, 700);
    const [report] = sentTo("POST", /^\/api\/community\/report$/);
    expectThat(report && report.body.replyId === THREADS[MARIA].comments[0].id, `reported ${JSON.stringify(report?.body)}`);
    // One's own: Delete, asked first.
    const mine = page.locator("[data-campaign-comments] [data-note=comment]").nth(2);
    await mine.locator("button[aria-haspopup]").click();
    await page.locator("[role=menu] [role=menuitem]", { hasText: "Delete" }).click();
    await page.locator("[role=alertdialog] button, [role=dialog] button", { hasText: "Delete" }).last().click();
    await settle(page, 900);
    const [gone] = sentTo("DELETE", /\/thread$/);
    expectThat(gone, "nothing was deleted");
  });

  await walk("its creator: takes a comment off, and closes comments from the menu", `/campaigns/detail?id=${NICHOLAS}#comments`, async (page) => {
    await page.waitForSelector("[data-campaign-comments] [data-note=comment]", { timeout: 15000 });
    await page.locator("[data-campaign-comments] [data-note=comment]").first().locator("button[aria-haspopup]").click();
    await page.locator("[role=menu] [role=menuitem]", { hasText: "Take off" }).click();
    await page.locator("[role=alertdialog] button, [role=dialog] button", { hasText: "Take off" }).last().click();
    await settle(page, 900);
    expectThat(sentTo("DELETE", /\/thread$/).length === 1, "taking it off was not sent");
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    await page.waitForSelector("[role=dialog] [role=switch]", { timeout: 8000 });
    // For the reposed the menu has two switches: keep it, then comments.
    await page.locator("[role=dialog] [role=switch]").nth(1).click();
    await settle(page, 700);
    expectThat(sentTo("PATCH", /^\/api\/campaigns\/[0-9a-f-]{36}$/).some((c) => c.body.commentsOpen === false), "closing comments was not sent");
  }, { mine: [NICHOLAS] });

  await walk("Prayed by many, off: the board draws no second list and asks for none", "/campaigns", async (page) => {
    await page.waitForSelector("[data-campaign-row]", { timeout: 15000 });
    await settle(page, 900);
    expectThat((await page.locator("[data-campaigns-many]").count()) === 0, "the second list is drawn while its part is off");
    expectThat(sentTo("GET", /^\/api\/campaigns\/many$/).length === 0, "the list was asked for while its part is off");
  });

  await walk("Prayed by many, on: a second list under the newest, by the time chosen, with no number in it", "/campaigns", async (page) => {
    await page.waitForSelector("[data-campaigns-many] [data-campaign-row]", { timeout: 15000 });
    // Under "Newly asked", never over it.
    const order = await page.evaluate(() => {
      const asked = document.getElementById("board-asked").getBoundingClientRect().top;
      const many = document.getElementById("board-many").getBoundingClientRect().top;
      return many > asked;
    });
    expectThat(order, "Prayed by many stands over the newest");
    expectThat((await page.locator("[data-campaigns-many] [data-campaign-row]").count()) === 2, "this week's list is not two rows");
    await page.locator("#many-tab-month").click();
    await settle(page, 800);
    expectThat((await page.locator("[data-campaigns-many] [data-campaign-row]").count()) === 3, "this month's list is not three rows");
    await page.locator("#many-tab-day").click();
    await settle(page, 800);
    expectThat((await page.locator("[data-campaigns-many] [data-campaign-row]").count()) === 0, "today's list is not empty");
    expectThat((await page.locator("[data-campaigns-many]").innerText()).includes("Nothing here for this time"), "an empty time is not said plainly");
    // No figure anywhere in it: the only digits are a date's.
    await page.locator("#many-tab-month").click();
    await settle(page, 500);
    const text = await page.locator("[data-campaigns-many]").innerText();
    const digits = text.match(/\d+/g) ?? [];
    expectThat(digits.every((d) => Number(d) >= 1 && Number(d) <= 31), `a number stands in the list: ${text.replace(/\s+/g, " ")}`);
  }, { parts: { many: true } });

  await walk("Prayed by many, on: its creator keeps a campaign out of it from the menu", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await page.evaluate(() => window.dispatchEvent(new Event("purify:campaign-menu-open")));
    await page.waitForSelector("[role=dialog] [role=switch]", { timeout: 8000 });
    // For the living the menu has two switches now: comments, then Prayed by many.
    const sw = page.locator("[role=dialog] [role=switch]").nth(1);
    expectThat((await sw.getAttribute("aria-checked")) === "true", "a campaign does not start in the list");
    await sw.click();
    await settle(page, 700);
    expectThat(sentTo("PATCH", /^\/api\/campaigns\/[0-9a-f-]{36}$/).some((c) => c.body.listed === false), "staying out was not sent");
    expectThat((await sw.getAttribute("aria-checked")) === "false", "the switch did not turn");
  }, { mine: [MARIA], parts: { many: true } });

  await walk("pictures, switched off as they ship: the page draws none and asks for none", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("#campaign-title", { timeout: 15000 });
    await settle(page, 1200);
    expectThat((await page.locator("[data-campaign-pictures]").count()) === 0, "pictures are drawn");
    expectThat(!calls.some((c) => c.path.endsWith("/pictures")), "the pictures were asked for");
    // Its creator's menu and page offer no place to add one either.
    expectThat((await page.locator('button[aria-label="Add a picture"]').count()) === 0, "a place to add one is offered");
  }, { mine: [MARIA] });

  if (!PICTURES_BUILD) {
    await walk("pictures, on at the server, in a build cut without them: the page draws none and asks for none, and its creator is offered no place to add one", `/campaigns/detail?id=${MARIA}`, async (page) => {
      await page.waitForSelector("#campaign-title", { timeout: 15000 });
      await settle(page, 1500);
      expectThat(calls.some((c) => c.path === "/api/campaigns/open"), "the app never asked whether campaigns are open");
      expectThat((await page.locator("[data-campaign-pictures]").count()) === 0, "pictures are drawn in a build cut without them");
      expectThat(!calls.some((c) => c.path.endsWith("/pictures")), "the pictures were asked for");
      expectThat((await page.locator('button[aria-label="Add a picture"]').count()) === 0, "a place to add one is offered");
    }, { mine: [MARIA], parts: { pictures: true }, pictures: { waiting: 1 } });

    await walk("pictures, on at the server, in a build cut without them: the team's queue shows none, and says so when it asks", "/community/moderate", async (page) => {
      await page.waitForSelector("[data-mod-campaigns]", { timeout: 15000 });
      await settle(page, 900);
      expectThat((await page.locator("[data-mod-campaign-picture]").count()) === 0, "the team's queue draws a picture in a build cut without them");
      expectThat(asked.some((a) => a === "/api/community/moderation?pictures=0"), `the queue was asked without saying the build has no pictures (${asked.filter((a) => a.startsWith("/api/community/moderation")).join(", ")})`);
    }, { parts: { pictures: true } });
  }

  await pictureWalk("pictures, on: its creator adds one only with both lines ticked, and it is sent with both", `/campaigns/detail?id=${NICHOLAS}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures]", { timeout: 15000 });
    await page.locator('[data-campaign-pictures] button[aria-label="Add a picture"]').click();
    await page.waitForSelector("[role=dialog] [role=checkbox]", { timeout: 8000 });
    const add = page.locator("[role=dialog] button", { hasText: "Add a picture" }).last();
    expectThat(await add.isDisabled(), "Add is lit before a picture is chosen");
    // A small real picture, made here.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAEklEQVR4nGNgYGD4z4AJBhQQAHJLAf8D3q3TAAAAAElFTkSuQmCC", "base64");
    await page.locator("[role=dialog] input[type=file]").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: png });
    await settle(page, 500);
    expectThat(await add.isDisabled(), "Add is lit before either line is ticked");
    const ticks = page.locator("[role=dialog] [role=checkbox]");
    expectThat((await ticks.count()) === 2, "there are not two lines to tick");
    await ticks.nth(0).click();
    expectThat(await add.isDisabled(), "Add is lit with one line ticked");
    await ticks.nth(1).click();
    expectThat(!(await add.isDisabled()), "Add is not lit with both ticked");
    await page.fill("#campaign-picture-alt", "The icon in his room");
    const sent = page.waitForRequest((r) => r.method() === "POST" && /\/api\/campaigns\/[0-9a-f-]{36}\/pictures$/.test(new URL(r.url()).pathname));
    await add.click();
    const body = (await sent).postData() ?? "";
    for (const field of ['name="adult"', 'name="consent"', 'name="alt"', 'name="file"']) expectThat(body.includes(field), `the upload carries no ${field}`);
    expectThat(/name="adult"\r\n\r\nyes/.test(body) && /name="consent"\r\n\r\nyes/.test(body), "the two lines were not sent as yes");
    await settle(page, 900);
    expectThat((await page.getByText("Your picture is waiting for a moderator.").count()) > 0, "its creator is not told it waits");
  }, { mine: [NICHOLAS], parts: { pictures: true } });

  await pictureWalk("pictures, on: a reader opens one and reports it, by the picture and with a picture's own reason", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    expectThat((await page.locator("[data-campaign-pictures] button").count()) === 3, "a reader is offered more than the three pictures");
    await page.locator("[data-campaign-pictures] button").first().click();
    await page.waitForSelector("[role=dialog] img", { timeout: 8000 });
    expectThat((await page.locator("[role=dialog]").innerText()).includes("The icon in her room"), "what it shows is not said");
    await page.locator("[role=dialog] button", { hasText: "Report this picture" }).click();
    await page.waitForSelector("[role=dialog] [role=radio]", { timeout: 8000 });
    expectThat((await page.locator("[role=dialog] [role=radio]").count()) === 3, "a picture's reasons are not three");
    await page.locator("[role=dialog] [role=radio]", { hasText: "It shows me or someone in my care" }).click();
    await page.locator("[role=dialog] button", { hasText: "Send" }).click();
    await settle(page, 900);
    const report = sentTo("POST", /\/report$/)[0];
    expectThat(report && report.body.picture === PICTURES[MARIA][0].id && report.body.reason === "about_me", `reported ${JSON.stringify(report?.body)}`);
  }, { parts: { pictures: true } });

  await pictureWalk("pictures, on: its creator removes one, after being asked", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    await page.locator("[data-campaign-pictures] button").nth(1).click();
    await page.locator("[role=dialog] button", { hasText: "Remove" }).click();
    await page.waitForSelector("[role=alertdialog], [role=dialog] >> text=Remove this picture?", { timeout: 8000 });
    expectThat(sentTo("DELETE", /\/pictures$/).length === 0, "it was removed before the question was answered");
    await page.getByRole("button", { name: "Remove", exact: true }).last().click();
    await settle(page, 900);
    const gone = calls.find((c) => c.method === "DELETE" && c.path.endsWith("/pictures"));
    expectThat(Boolean(gone), "the removal was not sent");
  }, { mine: [MARIA], parts: { pictures: true }, pictures: { waiting: 1 } });

  await pictureWalk("pictures, on: at three its creator meets the Plus mark, which opens the upgrade sheet; a reader never sees it", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    const place = page.getByRole("button", { name: "Up to twenty pictures with Purify Plus" });
    expectThat((await place.count()) === 1, "the place with the Plus mark is not drawn (was this export built with a purchase key? see the head of this file)");
    expectThat((await place.innerText()).includes("Purify Plus"), "the place does not wear the mark");
    expectThat((await page.locator('[data-campaign-pictures] button[aria-label="Add a picture"]').count()) === 0, "a fourth picture is offered without Plus");
    await place.click();
    await settle(page, 900);
    expectThat((await page.locator("[role=dialog]").count()) > 0, "the upgrade sheet did not open");
    expectThat(!calls.some((c) => c.method === "POST" && c.path.endsWith("/pictures")), "something was uploaded");
  }, { mine: [MARIA], parts: { pictures: true }, pictures: { waiting: 1 } });

  await pictureWalk("pictures, on: a reader who did not start the campaign is shown no Plus mark and no place to add", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    expectThat((await page.getByRole("button", { name: "Up to twenty pictures with Purify Plus" }).count()) === 0, "a reader is shown the Plus mark");
    expectThat((await page.locator("[data-campaign-pictures]").innerText()).includes("Purify Plus") === false, "Plus is named to a reader");
    expectThat((await page.locator('[data-campaign-pictures] button[aria-label="Add a picture"]').count()) === 0, "a reader is offered a place to add");
  }, { parts: { pictures: true } });

  await pictureWalk("pictures, on: the team's queue covers each picture until it is tapped, and clears one", "/community/moderate", async (page) => {
    await page.waitForSelector("[data-mod-campaign-picture]", { timeout: 15000 });
    const card = page.locator("[data-mod-campaign-picture]").first();
    expectThat((await card.locator("img").count()) === 0, "a picture is drawn before it is asked for");
    await card.locator("button", { hasText: "Show the picture" }).click();
    await card.locator("img").waitFor({ timeout: 8000 });
    await card.locator("button", { hasText: "Approve" }).click();
    await settle(page, 900);
    const sent = sentTo("POST", /^\/api\/community\/moderation$/)[0];
    expectThat(sent && sent.body.action === "approve_picture" && sent.body.id === MOD_PICTURES[0].id, `sent ${JSON.stringify(sent?.body)}`);
    // The reported one that is still shown: kept, or removed.
    const reported = page.locator("[data-mod-campaign-picture]").nth(1);
    expectThat((await reported.innerText()).includes("Is this theirs to share?"), "the reader's reason is not shown");
    expectThat((await reported.locator("button", { hasText: "Keep it" }).count()) === 1, "a reported picture cannot be kept");
  }, { parts: { pictures: true } });

  await walk("not open for this reader: the pages are the app's not-found page, and Pray together shows nothing of campaigns", "/campaigns", async (page) => {
    await settle(page, 1500);
    expectThat((await page.locator("[data-campaign-board]").count()) === 0, "the board is drawn");
    expectThat((await page.locator("main h1").first().innerText()).length > 0 && (await page.getByText("404").count()) > 0, "the not-found page is not shown");
    // Pray together holds campaigns and nothing else since the wall went, so for this reader it has no
    // door: an address that asks for it shows the conversations, with no switch and no empty half.
    await go(page, "/community#pray");
    await page.waitForSelector("h1", { timeout: 15000 });
    await settle(page, 1800);
    expectThat((await page.locator("[data-campaigns]").count()) === 0, "Pray together draws campaigns");
    expectThat((await page.locator("[data-prayer-wall]").count()) === 0, "the prayer wall is drawn");
    expectThat((await page.locator("[role=tablist] [role=tab]").count()) === 0, "the switch to Pray together is drawn with nothing behind it");
    const ofCampaigns = calls.filter((c) => c.path.startsWith("/api/campaigns")).map((c) => c.path);
    expectThat(ofCampaigns.every((p) => p === "/api/campaigns/open") && ofCampaigns.length === 1, `asked ${ofCampaigns.join(", ")}`);
    expectThat(!calls.some((c) => c.path === "/api/community/prayer-wall"), "the prayer wall was asked for");
  }, { closed: true });

  console.log("\n" + walked.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
  process.exit(walked.every(([, ok]) => ok) ? 0 : 1);
}

console.log("\nasked of the server:", [...seen].sort().join(", "));
console.log("\n" + results.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
