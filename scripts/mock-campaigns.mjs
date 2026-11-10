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
//   ALL_LOOKS=1 node scripts/mock-campaigns.mjs 1             held on every look as well as the five palettes
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
// NOTHING HERE NAMES PLUS. Until 2026-11-10 a creator at three pictures was
// shown a place wearing the Plus mark; his word that day made the limit five
// for every reader and not a Plus perk, so that place, its still and its
// flow are gone, and two flows hold that nothing of Plus is drawn.
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
/** Every look as well as the five palettes (scripts/mock-check.mjs, LOOKS: the registry says how many). */
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
// A campaign whose own words may mean its writer is in danger: it waits, a moderator reads it first, and its
// creator is shown the safety line at once (lib/campaigns/safety.ts). A SAMPLE, written here; nobody's words.
const DANGER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8";
// A campaign kept to one circle (the notes, section 27), and the circles of the reader who looks.
const THOMAS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7";
// One of the reader's own that was kept to the parish and is over: what "Run it again" begins from, with its circle.
const PARISH_OVER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9";
const PARISH = { id: "ffffffff-ffff-4fff-8fff-fffffffffff1", name: "St Nicholas parish", kind: "parish" };
const HOUSEHOLD = { id: "ffffffff-ffff-4fff-8fff-fffffffffff2", name: "Our household", kind: "household" };

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
    place_country: null,
    place_name: null,
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
    // An illness starts with the Trisagion prayers (lib/campaigns/model.ts, KIND_PRAYER).
    prayer_rule: "morning",
    prayer_id: "trisagion",
    creator_name: "John",
    creator_handle: "john",
  }),
  // Peter's carries a place: a town its creator typed and a country from the app's list.
  [PETER]: campaign(PETER, { title: "For Peter's exams", intention: "study", subject_name: "Peter", details: "His finals begin on Monday.", days: 12, creator_name: "Helen", creator_handle: "helen", place_country: "GR", place_name: "Thessaloniki" }),
  // Thanksgiving starts with Psalm 102, read from the Bible's own file.
  [SOPHIA]: campaign(SOPHIA, { title: "Thanksgiving for Sophia", intention: "thanksgiving", subject_name: "Sophia", details: "She came home safely.", days: 1, prayer_rule: "psalter", prayer_id: "psalm-102", creator_name: "Mark", creator_handle: "mark" }),
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
  [DANGER]: campaign(DANGER, {
    title: "Pray for me",
    intention: "comfort",
    subject_name: "Anna",
    details: "I do not want to live any more. Please pray for me.",
    days: 7,
    status: "held",
    creator_name: "Anna",
    mine: true,
    // What the route tells its creator alone, while it waits.
    safety: true,
  }),
  // Over, and the reader's own: "Run it again" begins a new one from these parts.
  [ENDED]: campaign(ENDED, {
    title: "For Irene's recovery",
    intention: "healing",
    subject_name: "Irene",
    details: "She is home and mending. Please keep her in your prayers a while longer.",
    days: 7,
    status: "answered",
    prayer_rule: "morning",
    prayer_id: "trisagion",
    place_country: "RO",
    place_name: "Sibiu",
    mine: true,
  }),
  [PARISH_OVER]: campaign(PARISH_OVER, { title: "For Anna's surgery", intention: "healing", subject_name: "Anna", details: "Her surgery is on Tuesday.", days: 7, status: "ended", mine: true, circle: { name: PARISH.name } }),
  // Kept to the parish: on no board, and handed on only to its circle's members, with the circle's name.
  [THOMAS]: campaign(THOMAS, {
    title: "For Thomas after his fall",
    intention: "healing",
    subject_name: "Thomas",
    details: "He is home from hospital and resting. Please remember him with us these two weeks.",
    days: 14,
    creator_name: "Helen",
    creator_handle: "helen",
    circle: { name: PARISH.name },
  }),
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
// Maria's prayer is the Trisagion prayers, which Evening prayers already say: her name is read and no step is added.
// Sophia's is Psalm 102, which they do not: it follows the names as a step of its own.
const CARRIED = [carried(NICHOLAS, ["morning", "evening"]), carried(MARIA, ["evening"]), carried(SOPHIA, ["evening"])];
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
        // Its place, which the moderator reads with the rest.
        place_country: "RS",
        place_name: "Novi Sad",
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
  // Five: every picture a campaign may carry (lib/campaigns/model.ts, PICTURES_MAX).
  [MARIA]: [
    pic(1, "/icons/prayer/theotokos-of-vladimir.jpg", { alt: "The icon in her room" }),
    pic(2, "/icons/prayer/christ-pantocrator.v2.jpg"),
    pic(3, "/icons/prayer/anastasis.jpg", { alt: "From the parish, at Pascha" }),
    pic(4, "/icons/prayer/three-hierarchs.v2.jpg"),
    pic(5, "/icons/prayer/pentecost.jpg"),
  ],
};
/** What the route answers: every reader the ones cleared; its creator also their own that wait, the limit, and whether a place is free. `count` is how many of the samples the campaign has so far. */
function picturesFor(id, { mine = false, waiting = 0, limit = 5, count } = {}) {
  const all = (PICTURES[id] ?? []).slice(0, count ?? limit);
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
    // The check's own words, as the server keeps them (lib/campaigns/pictureCheckRekognition.ts).
    check_result: "Rekognition 7.0: nothing found",
    created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    reports: [],
    campaign: { id: MARIA, title: "For Maria before her operation", creator_name: "John" },
  },
  // One the check passed to a person, with a note of what it noticed: a soldier someone is praying for. The
  // picture behind the cover is one of the app's own icons, as every sample is; the note is what this shows.
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd9",
    url: "/icons/prayer/three-hierarchs.v2.jpg",
    shown: false,
    alt: "In uniform, the day he left",
    check_result: "Rekognition 7.0 noticed: Weapons 91",
    created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    reports: [],
    campaign: { id: HELD, title: "For Elias on his journey", creator_name: "Anna" },
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd8",
    url: "/icons/prayer/anastasis.jpg",
    shown: true,
    alt: null,
    check_result: "Rekognition 7.0: nothing found",
    created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    reports: [{ reason_code: "picture", reason: "Is this theirs to share?" }],
    campaign: { id: PETER, title: "For Peter's exams", creator_name: "Helen" },
  },
];

// Two comments under a campaign that wait for a moderator, as the queue hands them on: a new account's first
// words, and, written after it, words that may mean their writer is in danger. SAMPLES, nobody's words.
const heldReply = (n, body, name, handle) => ({ id: `99999999-9999-4999-8999-99999999990${n}`, post_id: "99999999-9999-4999-8999-999999999900", body, author_name: name, author_handle: handle, status: "held" });
const MOD_HOLDS = [
  { id: "88888888-8888-4888-8888-888888888801", post_id: null, reply_id: heldReply(1).id, reason: "new_account", detail: "first words from a new account", original_title: null, original_body: null, hits: 1, created_at: new Date(Date.now() - 50 * 60_000).toISOString(), post: null, reply: heldReply(1, "Praying for Maria tonight.", "Luke", "luke") },
  { id: "88888888-8888-4888-8888-888888888802", post_id: null, reply_id: heldReply(2).id, reason: "spam", detail: "crisis: the writer may be in danger", original_title: null, original_body: null, hits: 1, created_at: new Date(Date.now() - 5 * 60_000).toISOString(), post: null, reply: heldReply(2, "Some days I do not want to live any more myself.", "Ben", "ben") },
];

// A reader's profile, as the profile's route hands one on. A SAMPLE reader, no
// one real and nothing from production (the same one the export walk's
// section 50 opens). Asking for prayers went from a profile in 1.9: the
// server still sends `prayerRequest: null` for an app of 1.8, and this app
// reads none of it.
const SAMPLE_READER = {
  handle: "john.sample",
  name: "John",
  avatar: null,
  verified: false,
  tier: null,
  private: false,
  postsHidden: false,
  nameDay: null,
  prayerRequest: null,
  nowReading: null,
  clergy: null,
  joinedAt: "2026-09-12T00:00:00Z",
  bio: "Catechumen. Learning the Hours one at a time.",
  status: "Reading the Psalter this month",
  patronSaint: { slug: "john-chrysostom", name: "St. John Chrysostom" },
  favoriteVerse: { ref: "john/1/5", label: "John 1:5", href: "/bible/john/1#v5" },
  cosmetics: { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null, nameColor: null, bannerMotion: null },
  badges: [
    { id: "psalter", since: "2026-10-01T00:00:00Z" },
    { id: "gospels", since: "2026-10-04T00:00:00Z" },
    { id: "early_reader", since: "2026-09-12T00:00:00Z" },
  ],
  posts: [{ id: "sample-post", kind: "discussion", title: "Which psalms are read at the Ninth Hour?", excerpt: "", quoteSource: null, createdAt: "2026-10-30T00:00:00Z", likes: 0, replies: 0 }],
  parish: "St. Nicholas, Dallas",
  links: [],
};
/** How a signed-in reader stands with that profile: a stranger. `prayed` is the 1.8 field, always false. */
const SAMPLE_RELATION = { mine: false, following: false, followsYou: false, mutuals: [], greeted: false, prayed: false, canGift: false, muted: false };

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
    if (p === "/api/campaigns/open") {
      // An answer held back until the walk lets it go, so it can look at Community while the app waits to hear.
      if (opts.heldOpen) await opts.heldOpen.until;
      return opts.closed ? json({ error: "Not found." }, 404) : json({ open: true, parts });
    }
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
    // A reader's circles and the campaigns running in them: none, unless a picture or a flow puts the reader in two.
    if (p === "/api/campaigns/circles") return json(opts.circles ? { circles: [PARISH, HOUSEHOLD], campaigns: [CAMPAIGNS[THOMAS]] } : { circles: [], campaigns: [] });
    if (p === "/api/campaigns" && req.method() === "POST") return json({ ok: true, id: HELD, status: "held" });
    if (/^\/api\/campaigns\/[0-9a-f-]{36}\/(join|report)$/.test(p)) return json({ ok: true });
    const thread = /^\/api\/campaigns\/([0-9a-f-]{36})\/thread$/.exec(p);
    if (thread && req.method() === "GET") return json(threadFor(thread[1], { mine: Boolean(opts.mine?.includes(thread[1])), signedIn: opts.signedIn !== false, commentsOpen: opts.commentsOpen !== false }));
    if (thread && req.method() === "POST") {
      // As the route answers (lib/campaigns/thread.ts): words that may mean danger wait for a moderator, and their writer is told.
      const danger = /want to (?:live|die)|suicid/i.test(String(req.postDataJSON()?.body ?? ""));
      return json({ ok: true, id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc9", held: danger || opts.held === true, safety: danger });
    }
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
      if (c?.circle && !opts.circles) return json({ error: "Not found." }, 404);
      return c ? json({ campaign: { ...c, ...(opts.mine?.includes(c.id) ? { mine: true, keep_after_end: false, listed: true } : {}) } }) : json({ error: "Not found." }, 404);
    }
    // Talk together's feed: nothing said yet, so the conversations draw as they are and not as "opening soon".
    if (p === "/api/community/posts" && req.method() === "GET") return json({ posts: [] });
    // A reader's inbox (lib/community/inbox.ts): empty, or what a still puts in it.
    if (p === "/api/community/notifications") {
      if (req.method() === "POST") return json({ ok: true });
      const inbox = opts.inbox ?? [];
      return json({ notifications: inbox, unread: inbox.filter((n) => !n.read_at).length });
    }
    // The prayer wall went in 1.9: the server answers an app of 1.8 with nobody on it, and this app never asks.
    if (p === "/api/community/prayer-wall") return json({ requests: [], intentions: false });
    // A profile, opened over Community (/community/#@handle).
    if (p === "/api/community/profile") return url.searchParams.get("h") === SAMPLE_READER.handle ? json({ profile: SAMPLE_READER }) : json({ error: "Profile not found." }, 404);
    if (p === "/api/community/relation") return json({ relation: SAMPLE_RELATION });
    if (p === "/api/bible/verse") return json({ name: "", verses: [{ n: 5, text: "And the light shineth in darkness; and the darkness comprehended it not." }] });
    if (p === "/api/community/moderation") {
      if (url.searchParams.get("summary")) return json({ waiting: 2 });
      // The team's queue carries pictures only while the server has them on, and never for a build that says it has none.
      const sendsPictures = parts.pictures && url.searchParams.get("pictures") !== "0";
      return json(sendsPictures ? { ...MOD_QUEUE, campaigns: { ...MOD_QUEUE.campaigns, waiting: [], reports: [], pictures: MOD_PICTURES } } : { ...MOD_QUEUE, holds: opts.holds ?? MOD_QUEUE.holds });
    }
    return json({ error: "Not found." }, 404);
  });
}

const results = [];
const settle = (page, ms = 2200) => page.waitForTimeout(ms);

/** A line as a reader sees it: without the two marks that set a typed town apart from the line's direction. */
const plain = (text) => text.replace(/[\u2068\u2069]/g, "");

/** In the Place sheet: open the list of countries, search it, and choose one by its name. */
async function choosePlace(page, typed, name) {
  await page.locator("[data-campaign-place] [role=combobox]").click();
  const list = page.locator("[role=listbox]");
  await list.waitFor({ timeout: 8000 });
  await page.locator('input[aria-controls]').last().fill(typed);
  await settle(page, 300);
  await list.locator("[role=option]", { hasText: name }).first().click();
  await list.waitFor({ state: "detached", timeout: 8000 });
  await settle(page, 300);
}

/** The whole page in one picture: the viewport grown to the page's own height. */
async function whole(page, min = 844) {
  const h = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  await page.setViewportSize({ width: WIDTH, height: Math.max(min, h) });
}

async function shot(name, label, where, selector, { set = {}, prepare, signedIn = true, mine, board, parts, pictures, check = true, inbox, circles = false } = {}) {
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
    await answer(ctx, { mine, board, signedIn, parts, pictures, inbox, circles });
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

// 04 A campaign's page, for the living, with its prayer.
await shot("04-campaign-living", "a campaign's page, for the living, with its prayer", `/campaigns/detail?id=${MARIA}`, "[data-campaign-page]", {
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
    // What for: an illness, which brings its own prayer to the row under it.
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "An illness" }).click();
    await settle(page, 700);
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

// 12 In the prayers: Evening prayers at Those I pray for, with the names and a campaign's psalm.
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
    await page.waitForSelector("#campaign-psalm-102", { timeout: 15000 });
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

// 21 Its creator's view with a place still free: one still waits, and the place to add stands after the last.
await pictureShot("21-pictures-creator", "its creator's pictures: one waiting, and the place to add one", `/campaigns/detail?id=${MARIA}`, "[data-campaign-page]", {
  mine: [MARIA],
  parts: { pictures: true },
  pictures: { waiting: 1, count: 4 },
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

// 25 A reader's profile, as another reader opens it over Community. Until 1.9 a profile could carry
// "Asking for your prayers" with I prayed beside it; asking for prayers went with the wall (his "wall B",
// 2026-11-10). A SAMPLE reader, no one real.
await shot("25-profile", "a reader's profile: no request for prayers, and no I prayed", `/community/#@${SAMPLE_READER.handle}`, "[data-profile-card]", {
  prepare: async (page) => {
    await page.waitForFunction((h) => document.querySelector("[data-profile-card]")?.innerText.includes(`@${h}`) && !!document.querySelector("[data-profile-card] [data-profile-doors]"), SAMPLE_READER.handle, { timeout: 25000 });
    // The top fades in, and the verse's words arrive after the card.
    await settle(page, 1600);
  },
});

// 26 A moderator's removal tells the campaign's creator why (lib/campaigns/moderation.ts,
// lib/community/removal.ts): the notice as its reader finds it behind the phone's bell. A STUB: the row is
// made up here, and no such row is in any database. It is the picture his call 18 was put to him with
// (docs/1.9-build/notes/decisions/removal-notice.png).
const REMOVAL_NOTICE = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
  kind: "removed",
  post_id: null,
  reply_id: null,
  actor_name: "Purify",
  actor_handle: null,
  excerpt: "For Maria before her operation",
  read_at: null,
  created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
  target_kind: "campaign",
  reason: "consent",
};
await shot("26-removal-notice", "the removal notice in a reader's inbox: a campaign, and why", "/", "[role=dialog]", {
  inbox: [REMOVAL_NOTICE],
  prepare: async (page) => {
    const bell = page.locator('header button[aria-haspopup=dialog][aria-label^="Notifications"]').first();
    await bell.waitFor({ timeout: 20000 });
    await bell.click();
    await page.waitForSelector("[role=dialog]", { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[role=dialog]")?.innerText.includes("We removed your prayer campaign"), null, { timeout: 15000 });
    await settle(page, 900);
  },
});

// 27 to 29 A campaign kept to one circle (the notes, section 27), for a reader who is in two circles.
// 27 The choice, "Who can see it", with the parish chosen: the picture his call 22 was put to him with
// (docs/1.9-build/notes/decisions/circles-choice.png).
await shot("27-circle-choice", "starting one: who can see it, with a circle chosen", "/campaigns/new", "[role=dialog]:has([data-campaign-audience])", {
  circles: true,
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    const row = page.locator("[data-campaign-new] .set-panel button", { hasText: "Who can see it" });
    await row.waitFor({ timeout: 15000 });
    await row.click();
    await page.locator("[data-campaign-audience] [role=radio]", { hasText: PARISH.name }).click();
    await settle(page, 700);
    // Opened again, so the picture shows the choice with the circle ticked.
    await row.click();
    await page.waitForSelector("[data-campaign-audience] [role=radio][aria-checked=true]", { timeout: 15000 });
    await settle(page, 700);
  },
});

// 30 The prayer: the list a creator may choose from, with the kind's own ticked (an illness, the Trisagion prayers).
await shot("30-the-prayer", "starting one: the prayer, with the kind's own ticked", "/campaigns/new", "[role=dialog]:not([data-campaign-new])", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "An illness" }).click();
    await settle(page, 700);
    await page.locator("[data-campaign-new] .set-panel button").nth(2).click();
    await page.waitForSelector("[role=radiogroup]", { timeout: 8000 });
    await settle(page, 700);
    await page.setViewportSize({ width: 390, height: 980 });
  },
});

// 31 to 33 The safety line (his item 129): always at the foot of the rules and of the start screen (still 09),
// and at once to the writer of words that may mean danger.

// 31 The rules, with the safety line at their foot.
await shot("31-rules-safety", "the rules of praying together, with the safety line at their foot", "/campaigns/rules", "[data-campaign-rules]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-rules] [data-campaign-safety]", { timeout: 15000 });
    await whole(page);
  },
});

// 32 A waiting campaign whose own words may mean danger, as its creator sees it at once.
await shot("32-campaign-safety", "a waiting campaign whose words may mean danger, as its creator sees it", `/campaigns/detail?id=${DANGER}`, "[data-campaign-page]", {
  mine: [DANGER],
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-safety=first]", { timeout: 15000 });
    await whole(page);
  },
});

// 33 A comment whose words may mean danger: what its writer is shown under the field, at once.
await shot("33-comment-safety", "a comment whose words may mean danger: what its writer is shown", `/campaigns/detail?id=${MARIA}#comments`, "[data-campaign-page]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-note-field=comment] textarea", { timeout: 15000 });
    await page.fill("[data-note-field=comment] textarea", "I am praying for her. Some days I do not want to live any more myself.");
    await page.locator("[data-note-field=comment] button").click();
    await page.waitForSelector("[data-note-field=comment] [data-campaign-safety=first]", { timeout: 8000 });
    await page.evaluate(() => document.activeElement?.blur());
    await whole(page);
  },
});

// A place (1.9; the notes, 2.9): a country from the app's list and a town or
// region typed, optional and off to begin with.

// 34 Starting one: the Place sheet, with a country chosen and a town typed.
await shot("34-place", "starting one: a place, a country chosen and a town typed", "/campaigns/new", "[role=dialog]:has([data-campaign-place])", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.locator("[data-campaign-new] .set-panel button", { hasText: "Place" }).click();
    await page.waitForSelector("[data-campaign-place] [role=combobox]", { timeout: 8000 });
    await settle(page, 500);
    await choosePlace(page, "gree", "Greece");
    await page.fill("#campaign-town", "Thessaloniki");
    await page.evaluate(() => document.activeElement?.blur());
    await settle(page, 500);
  },
});

// 40 The start screen with a place given: the row says the town and the country, as they will be sent.
await shot("40-start-place", "starting one: the Place row with a town and a country", "/campaigns/new", "[data-campaign-new]", {
  prepare: async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.fill("#campaign-title-field", "For Peter's exams");
    await page.fill("#campaign-name-field", "Peter");
    await page.fill("#campaign-words-field", "His finals begin on Monday.");
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "An exam or studies" }).click();
    await settle(page, 700);
    await page.locator("[data-campaign-new] .set-panel button", { hasText: "Place" }).click();
    await page.waitForSelector("[data-campaign-place] [role=combobox]", { timeout: 8000 });
    await settle(page, 500);
    await choosePlace(page, "gree", "Greece");
    await page.fill("#campaign-town", "Thessaloniki");
    await page.locator("[data-campaign-place] button", { hasText: "Done" }).click();
    await page.waitForSelector("[data-campaign-place]", { state: "detached", timeout: 8000 });
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

// 35 A campaign's page with its place, beside who started it.
await shot("35-campaign-place", "a campaign's page with its place beside who started it", `/campaigns/detail?id=${PETER}`, "[data-campaign-page]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-page] [data-campaign-place]", { timeout: 15000 });
    await whole(page);
  },
});

// 38 The board with a kind chosen behind the sliders: they are lit and say its name, and the list keeps to it.
await shot("38-board-kind", "the board with a kind chosen behind the sliders", "/campaigns", "[data-campaign-board]", {
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-board] [data-campaign-row]", { timeout: 15000 });
    await page.locator('[data-campaign-board] button[aria-haspopup=menu]').click();
    await page.locator("[role=menuitemradio]", { hasText: "An illness" }).click();
    await settle(page, 600);
    await page.evaluate(() => document.activeElement?.blur());
    await whole(page);
  },
});

// Run it again (1.9; the notes, 2.2): a new campaign from the parts of one that is over.

// 36 One of the reader's own that is over: Run it again stands where Add to my prayers stood.
await shot("36-run-again", "a campaign that is over, as its creator sees it: Run it again", `/campaigns/detail?id=${ENDED}`, "[data-campaign-page]", {
  mine: [ENDED],
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-page] a[data-campaign-again]", { timeout: 15000 });
    await whole(page);
  },
});

// 37 The start screen as it opens from it: what was written before, and nothing ticked.
await shot("37-run-again-start", "Run it again: the start screen begins with what was written before", `/campaigns/new?from=${ENDED}`, "[data-campaign-new]", {
  mine: [ENDED],
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-new] p[data-campaign-again]", { timeout: 15000 });
    await settle(page, 700);
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

// 28 Pray together for a reader with a campaign in one of their circles: "In your circles", above the newly asked.
await shot("28-in-your-circles", "Pray together: a campaign in one of the reader's circles", "/community#pray", "[role=tabpanel]", {
  circles: true,
  prepare: async (page) => {
    await page.waitForSelector("[data-campaigns-circles] [data-campaign-row]", { timeout: 15000 });
    await whole(page);
  },
});

// 29 Its page: who can see it, said under its creator, and no link to share.
await shot("29-campaign-circle", "a campaign kept to a circle: its page says who can see it", `/campaigns/detail?id=${THOMAS}`, "[data-campaign-page]", {
  circles: true,
  prepare: async (page) => {
    await page.waitForSelector("[data-campaign-circle]", { timeout: 15000 });
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

async function walk(label, where, run, { set = {}, signedIn = true, mine, closed = false, parts, pictures, holdOpen = false, circles = false, holds, board } = {}) {
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
    // With `holdOpen`, the website's answer to "are campaigns open for this reader" waits for the flow's own word.
    let letGo = () => {};
    const heldOpen = holdOpen ? { until: new Promise((done) => (letGo = done)) } : null;
    await answer(ctx, { mine, closed, parts, pictures, heldOpen, circles, holds, board });
    await go(page, where);
    await settle(page, 1800);
    try {
      await run(page, letGo);
    } finally {
      letGo();
    }
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
    // The prayer's row, before a kind is chosen: the name alone.
    const prayerRow = page.locator("[data-campaign-new] .set-panel button").nth(2);
    expectThat((await prayerRow.innerText()).includes("The prayer") && (await prayerRow.innerText()).includes("The name alone"), `the prayer's row reads "${(await prayerRow.innerText()).replace(/\n/g, " / ")}" before a kind is chosen`);
    // What for: a journey, which brings its own prayer, Psalm 120. It is sent as the kind set it.
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "A journey" }).click();
    await settle(page, 700);
    expectThat((await prayerRow.innerText()).includes("Psalm 120"), `a journey did not bring Psalm 120: the row reads "${(await prayerRow.innerText()).replace(/\n/g, " / ")}"`);
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
    expectThat(b.prayer?.rule === "psalter" && b.prayer?.id === "psalm-120" && b.consent === "blessing" && b.blessing === true && b.rules === true, `sent ${JSON.stringify(b)}`);
    expectThat(b.termsAccepted === true, `the acceptance of the Terms was not sent: ${JSON.stringify(b)}`);
    expectThat((await page.locator("[data-campaign-standing]").innerText()).includes("Waiting for a moderator"), "the campaign does not say it waits");
  }, { mine: [HELD] });

  await walk("starting one: each kind brings its own prayer, and a prayer the creator chose stays through a change of kind", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    const rows = page.locator("[data-campaign-new] .set-panel button");
    const row = async () => (await rows.nth(2).innerText()).replace(/\n/g, " / ");
    const choose = async (kind) => {
      await rows.nth(0).click();
      await page.locator("[role=radio]", { hasText: kind }).click();
      await settle(page, 700);
    };
    // His mapping, kind by kind, as the row says it.
    const KINDS = [
      ["An illness", "The Trisagion Prayers"],
      ["A trial", "Psalm 90"],
      ["The persecuted", "Psalm 26"],
      ["Guidance", "Psalm 142"],
      ["A journey", "Psalm 120"],
      ["Thanksgiving", "Psalm 102"],
      ["An exam or studies", "The name alone"],
      ["Something else", "The name alone"],
    ];
    for (const [kind, prayer] of KINDS) {
      await choose(kind);
      expectThat((await row()).includes(prayer), `"${kind}" did not bring "${prayer}": the row reads "${await row()}"`);
    }
    // The list: the name alone, then the eight prayers by their names.
    await rows.nth(2).click();
    // The sheet's own lines: the page under it has lines to tick of its own ("Who it is for").
    const sheet = page.locator("[role=dialog]:not([data-campaign-new])");
    await sheet.locator("[role=radiogroup]").waitFor({ timeout: 8000 });
    const offered = (await sheet.locator("[role=radio]").allInnerTexts()).map((x) => x.trim().split("\n")[0]);
    const WANT = ["The name alone", "The Trisagion Prayers", "Psalm 24", "Psalm 26", "Psalm 50", "Psalm 90", "Psalm 102", "Psalm 120", "Psalm 142"];
    expectThat(JSON.stringify(offered) === JSON.stringify(WANT), `the list offers ${JSON.stringify(offered)}`);
    // The creator chooses one themselves: Psalm 24, for studies.
    await sheet.locator("[role=radio]", { hasText: "Psalm 24" }).click();
    await settle(page, 700);
    expectThat((await row()).includes("Psalm 24"), `the creator's choice is not on the row: "${await row()}"`);
    // A change of kind now leaves it as they set it.
    await choose("An illness");
    expectThat((await row()).includes("Psalm 24"), `a change of kind took the creator's own choice away: the row reads "${await row()}"`);
    // And the name alone, chosen by hand, stays too.
    await rows.nth(2).click();
    await sheet.locator("[role=radio]", { hasText: "The name alone" }).click();
    await settle(page, 700);
    await choose("A trial");
    expectThat((await row()).includes("The name alone"), `a change of kind set a prayer over "The name alone": the row reads "${await row()}"`);
  });

  await walk("the safety line: always at the foot of the rules, with the three numbers and the one site to open", "/campaigns/rules", async (page) => {
    const line = page.locator("[data-campaign-rules] [data-campaign-safety]");
    await line.waitFor({ timeout: 15000 });
    const words = await line.innerText();
    for (const part of ["911", "112", "988", "findahelpline.com"]) expectThat(words.includes(part), `the line has no ${part}: "${words}"`);
    // The site is the one thing to tap, and it opens outside the app. No number is a button.
    const links = line.locator("a");
    expectThat((await links.count()) === 1, `the line has ${await links.count()} links, not the one site`);
    expectThat((await links.getAttribute("href")) === "https://findahelpline.com" && (await links.getAttribute("target")) === "_blank", "the site does not open as the helplines' list");
    expectThat((await page.locator('[data-campaign-rules] a[href^="tel:"]').count()) === 0, "a number is something to tap");
    // On the rules nothing was written, so nothing is said of a moderator reading first.
    expectThat((await page.locator("[data-campaign-safety=first]").count()) === 0, "the rules say a moderator will read words nobody wrote");
  });

  await walk("the safety line: at the foot of the start screen before a word is written", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    const line = page.locator("[data-campaign-new] [data-campaign-safety]");
    expectThat((await line.count()) === 1, `the start screen has ${await line.count()} safety lines`);
    expectThat((await line.innerText()).includes("988") && (await line.locator("a").count()) === 1, "the start screen's line is not the whole line");
    expectThat((await page.locator("[data-campaign-safety=first]").count()) === 0, "the start screen says a moderator will read words nobody wrote");
  });

  await walk("the safety line: its creator is shown it at once on a waiting campaign whose words may mean danger, and on no other", `/campaigns/detail?id=${DANGER}`, async (page) => {
    await page.waitForSelector("[data-campaign-standing]", { timeout: 15000 });
    const block = page.locator("[data-campaign-safety=first]");
    await block.waitFor({ timeout: 8000 });
    const words = await block.innerText();
    expectThat(words.includes("A moderator will read your words first."), `the block does not say who reads first: "${words}"`);
    for (const part of ["911", "112", "988", "findahelpline.com"]) expectThat(words.includes(part), `the block has no ${part}`);
    // It stands with what the page says of waiting, above the campaign's own words.
    const order = await page.evaluate(() => {
      const safety = document.querySelector("[data-campaign-safety=first]").getBoundingClientRect().top;
      const standing = document.querySelector("[data-campaign-standing]").getBoundingClientRect().top;
      return standing < safety;
    });
    expectThat(order, "the block stands above the page's head");
    // A waiting campaign with no such words: nothing of it.
    await go(page, `/campaigns/detail?id=${HELD}`);
    await page.waitForSelector("[data-campaign-standing]", { timeout: 15000 });
    await settle(page, 900);
    expectThat((await page.locator("[data-campaign-safety]").count()) === 0, "a waiting campaign with no such words shows the safety line");
  }, { mine: [DANGER, HELD] });

  await walk("the safety line: a comment whose words may mean danger is answered with it at once, and a plain comment is not", `/campaigns/detail?id=${MARIA}#comments`, async (page) => {
    await page.waitForSelector("[data-note-field=comment] textarea", { timeout: 15000 });
    const field = page.locator("[data-note-field=comment]");
    // A plain comment: sent, and nothing of safety.
    await field.locator("textarea").fill("Remembering her at the Liturgy on Sunday.");
    await field.locator("button").click();
    await settle(page, 900);
    expectThat((await field.locator("[data-campaign-safety]").count()) === 0, "a plain comment is answered with the safety line");
    // Words that may mean danger: the block, at once, under the field, and the plain notice is not said as well.
    await field.locator("textarea").fill("Some days I do not want to live any more myself.");
    await field.locator("button").click();
    const block = field.locator("[data-campaign-safety=first]");
    await block.waitFor({ timeout: 8000 });
    const words = await block.innerText();
    expectThat(words.includes("A moderator will read your words first.") && words.includes("988"), `the block reads "${words}"`);
    expectThat(!(await field.innerText()).includes("Your words are waiting for a moderator"), "the waiting is said twice");
    const sent = sentTo("POST", /\/thread$/);
    expectThat(sent.length === 2 && sent[1].body.kind === "comment", `sent ${JSON.stringify(sent.map((x) => x.body))}`);
    // The next plain comment clears it: it never stands over other words.
    await field.locator("textarea").fill("Lord, have mercy.");
    await field.locator("button").click();
    await settle(page, 900);
    expectThat((await field.locator("[data-campaign-safety]").count()) === 0, "the block stayed over the next words");
  });

  await walk("the safety line: the moderators' queue reads a comment that may mean danger before the others, and says what it is", "/community/moderate", async (page) => {
    await page.waitForSelector("[data-mod-campaigns]", { timeout: 15000 });
    await page.waitForFunction(() => document.body.innerText.includes("do not want to live"), null, { timeout: 15000 });
    const text = await page.evaluate(() => document.body.innerText);
    // The one written later stands first, because of what its words may mean.
    expectThat(text.indexOf("do not want to live") < text.indexOf("Praying for Maria tonight."), "the comment that may mean danger is not read first");
    // It says what it is, and is not shown under the reason it is filed as.
    const card = page.locator("article", { hasText: "do not want to live" });
    const said = await card.innerText();
    expectThat(said.includes("Read first: the writer may be in danger"), `its card reads "${said.replace(/\n/g, " / ").slice(0, 200)}"`);
    expectThat(!/\bSpam\b/i.test(said.split("\n")[0]), "its card is headed as spam");
    // The ordinary one keeps its own reason.
    const plain = await page.locator("article", { hasText: "Praying for Maria tonight." }).innerText();
    expectThat(!plain.includes("Read first"), "an ordinary hold is marked as danger");
    // Removing such words asks why, at once, and never offers the reason that stands for none.
    await card.locator("button", { hasText: "Remove" }).click();
    const sheet = page.locator("[data-mod-removal-reason]");
    await sheet.waitFor({ timeout: 8000 });
    const reasons = (await sheet.locator("[role=radio]").allInnerTexts()).map((x) => x.trim());
    expectThat(reasons.length === 6 && !reasons.some((r) => /house rules/i.test(r)), `the reasons offered are ${JSON.stringify(reasons)}`);
    expectThat(reasons.includes("Private details about another person"), "a real reason is missing from the list");
    const remove = sheet.locator("button", { hasText: "Remove" });
    expectThat(await remove.isDisabled(), "Remove is lit before a reason is chosen");
    expectThat(sentTo("POST", /^\/api\/community\/moderation$/).length === 0, "it was removed before a reason was chosen");
    await sheet.locator("[role=radio]", { hasText: "Private details about another person" }).click();
    expectThat(!(await remove.isDisabled()), "Remove stays dim with a reason chosen");
    await remove.click();
    await settle(page, 900);
    const [sent] = sentTo("POST", /^\/api\/community\/moderation$/);
    expectThat(sent && sent.body.action === "remove_hold" && sent.body.id === MOD_HOLDS[1].id && sent.body.reason_code === "private", `sent ${JSON.stringify(sent?.body)}`);
  }, { holds: MOD_HOLDS });

  // A place (1.9; the notes, 2.9, 3.6, 4.6).
  /** The start screen, filled far enough to send: a title, a name, a kind, who it is for by the line given, and the two ticks. */
  const fillStart = async (page, who = "Someone else") => {
    await page.fill("#campaign-title-field", "For Peter's exams");
    await page.fill("#campaign-name-field", "Peter");
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "Studies" }).click();
    await settle(page, 700);
    await page.locator("[role=radio]", { hasText: who }).click();
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
  };
  const placeRow = (page) => page.locator("[data-campaign-new] .set-panel button", { hasText: "Place" });
  const openPlace = async (page) => {
    await placeRow(page).click();
    await page.waitForSelector("[data-campaign-place] [role=combobox]", { timeout: 8000 });
    await settle(page, 500);
  };
  const donePlace = async (page) => {
    await page.locator("[data-campaign-place] button", { hasText: "Done" }).click();
    await page.waitForSelector("[data-campaign-place]", { state: "detached", timeout: 8000 });
  };

  await walk("a place: off to begin with; a country from the list and a town typed are sent as the row says them", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await fillStart(page);
    expectThat(plain(await placeRow(page).innerText()).includes("Optional"), `the row reads "${(await placeRow(page).innerText()).replace(/\n/g, " / ")}" before a place is given`);
    await openPlace(page);
    const sheet = page.locator("[data-campaign-place]");
    // No country yet: no town is asked for, and the sheet says what a place is and is never.
    expectThat((await sheet.locator("[role=combobox]").innerText()).includes("None"), "a country is chosen before the creator chose one");
    expectThat((await page.locator("#campaign-town").count()) === 0, "a town is asked for before a country");
    expectThat((await sheet.innerText()).includes("never an address"), "the sheet does not say a place is never an address");
    // The list is searched by a name in English or by the short name readers type.
    await sheet.locator("[role=combobox]").click();
    const list = page.locator("[role=listbox]");
    await list.waitFor({ timeout: 8000 });
    const search = page.locator("input[aria-controls]").last();
    await search.fill("usa");
    await settle(page, 300);
    expectThat((await list.locator("[role=option]").allInnerTexts()).map((x) => x.trim()).join("|") === "United States", `"usa" finds ${(await list.locator("[role=option]").allInnerTexts()).join(" | ")}`);
    await search.fill("gree");
    await settle(page, 300);
    await list.locator("[role=option]", { hasText: "Greece" }).first().click();
    await list.waitFor({ state: "detached", timeout: 8000 });
    // The sheet is still there under the list, with the country chosen and the town now asked for.
    expectThat((await sheet.locator("[role=combobox]").innerText()).includes("Greece"), "the country chosen is not shown");
    await page.fill("#campaign-town", "Thessaloniki");
    expectThat((await page.locator("[data-campaign-place-error]").count()) === 0, "a town of letters is called something else");
    await donePlace(page);
    expectThat(plain(await placeRow(page).innerText()).includes("Thessaloniki, Greece"), `the row reads "${plain(await placeRow(page).innerText()).replace(/\n/g, " / ")}"`);
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.place?.country === "GR" && sent.body.place?.town === "Thessaloniki", `the start sent ${JSON.stringify(sent?.body?.place)} for its place`);
  });

  await walk("a place: none is sent when none is given, and None takes a country away again", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await fillStart(page);
    await openPlace(page);
    await choosePlace(page, "serb", "Serbia");
    await choosePlace(page, "none", "None");
    expectThat((await page.locator("#campaign-town").count()) === 0, "a town is asked for with no country");
    await donePlace(page);
    expectThat(plain(await placeRow(page).innerText()).includes("Optional"), "the row still names a place");
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.place === null, `the start sent ${JSON.stringify(sent?.body?.place)} with no place given`);
  });

  await walk("a place: a town that is not letters is said so in the sheet, and is left out of what is sent", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await fillStart(page);
    await openPlace(page);
    await choosePlace(page, "gree", "Greece");
    await page.fill("#campaign-town", "12 Olive Tree Street");
    const said = page.locator("[data-campaign-place-error]");
    await said.waitFor({ timeout: 8000 });
    expectThat((await said.innerText()).includes("letters only"), `the sheet says "${await said.innerText()}"`);
    expectThat((await page.locator("#campaign-town").getAttribute("aria-invalid")) === "true", "the field is not marked as wrong");
    await donePlace(page);
    // The row says what will be sent: the country alone.
    const row = plain(await placeRow(page).innerText());
    expectThat(row.includes("Greece") && !row.includes("Olive"), `the row reads "${row.replace(/\n/g, " / ")}"`);
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.place?.country === "GR" && sent.body.place?.town === null, `the start sent ${JSON.stringify(sent?.body?.place)}`);
    expectThat(!JSON.stringify(sent?.body ?? {}).includes("Olive"), "an address left the device");
  });

  await walk("a place: for a child the country alone; no town is asked for, and one typed before is not sent", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    // A town typed while it was for someone else.
    await fillStart(page);
    await openPlace(page);
    await choosePlace(page, "gree", "Greece");
    await page.fill("#campaign-town", "Thessaloniki");
    await donePlace(page);
    expectThat(plain(await placeRow(page).innerText()).includes("Thessaloniki, Greece"), "the town was not on the row before");
    // Then it is said to be for a child in the creator's care.
    await page.locator("[role=radio]", { hasText: "A child in my care" }).click();
    await settle(page, 400);
    const row = plain(await placeRow(page).innerText());
    expectThat(row.includes("Greece") && !row.includes("Thessaloniki"), `for a child the row reads "${row.replace(/\n/g, " / ")}"`);
    await openPlace(page);
    expectThat((await page.locator("#campaign-town").count()) === 0, "a town is asked for a child's campaign");
    expectThat((await page.locator("[data-campaign-place]").innerText()).includes("A campaign for a child shows the country alone."), "the sheet does not say why no town is asked");
    await donePlace(page);
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.consent === "guardian" && sent.body.place?.country === "GR" && sent.body.place?.town === null, `the start sent ${JSON.stringify(sent?.body?.place)} for a child`);
    expectThat(!JSON.stringify(sent?.body ?? {}).includes("Thessaloniki"), "a child's town left the device");
  });

  await walk("a place: said beside who started it on the campaign's page, and a campaign with none says nothing", `/campaigns/detail?id=${PETER}`, async (page) => {
    const place = page.locator("[data-campaign-page] [data-campaign-place]");
    await place.waitFor({ timeout: 15000 });
    expectThat(plain(await place.innerText()) === "Thessaloniki, Greece", `the page says "${plain(await place.innerText())}"`);
    expectThat((await place.count()) === 1, `the place is said ${await place.count()} times`);
    await go(page, `/campaigns/detail?id=${MARIA}`);
    await page.waitForSelector("[data-campaign-page] h1", { timeout: 15000 });
    await settle(page, 900);
    expectThat((await page.locator("[data-campaign-page] [data-campaign-place]").count()) === 0, "a campaign with no place names one");
  });

  await walk("a place: the moderators read it with the rest, before anyone else does", "/community/moderate", async (page) => {
    await page.waitForSelector("[data-mod-campaign]", { timeout: 15000 });
    const place = page.locator("[data-mod-campaign] [data-mod-campaign-place]");
    expectThat((await place.count()) === 1 && plain(await place.innerText()) === "Place: Novi Sad, Serbia", `the moderators' list says "${(await place.count()) ? plain(await place.innerText()) : "nothing"}"`);
  });

  // A kind on the board (1.9; the notes, 2.10).
  await walk("the board: a kind behind the sliders keeps the list to it, the same choice again shows every campaign, and the server is asked nothing for it", "/campaigns", async (page) => {
    const rows = page.locator("[data-campaign-board] [role=group][aria-labelledby=board-asked] [data-campaign-row]");
    await rows.first().waitFor({ timeout: 15000 });
    expectThat((await rows.count()) === 4, `the board begins with ${await rows.count()} campaigns`);
    const sliders = page.locator("[data-campaign-board] button[aria-haspopup=menu]");
    expectThat((await sliders.getAttribute("aria-label")) === "What for", `the sliders are named "${await sliders.getAttribute("aria-label")}"`);
    const boardAsks = () => calls.filter((c) => c.path === "/api/campaigns" && c.method === "GET").length;
    const before = boardAsks();
    await sliders.click();
    const items = page.locator("[role=menu] [role=menuitemradio]");
    await items.first().waitFor({ timeout: 8000 });
    // Only the kinds that are on the board, in the start screen's order, the reposed last; none ticked yet.
    expectThat((await items.allInnerTexts()).map((x) => x.trim()).join("|") === "An illness|An exam or studies|Thanksgiving|For the reposed", `the sliders offer ${(await items.allInnerTexts()).join(" | ")}`);
    expectThat((await page.locator("[role=menu] [role=menuitemradio][aria-checked=true]").count()) === 0, "a kind is ticked before one is chosen");
    await items.filter({ hasText: "An illness" }).click();
    await settle(page, 500);
    expectThat((await rows.count()) === 1 && (await rows.first().innerText()).includes("For Maria before her operation"), `an illness shows ${(await rows.allInnerTexts()).map((x) => x.split("\n")[0]).join(" | ")}`);
    expectThat((await sliders.innerText()).includes("An illness"), "the sliders do not say the kind that is on");
    // Another kind takes its place: one at a time.
    await sliders.click();
    await page.locator("[role=menu] [role=menuitemradio]", { hasText: "For the reposed" }).click();
    await settle(page, 500);
    expectThat((await rows.count()) === 1 && (await rows.first().innerText()).includes("Forty days for Nicholas"), "the reposed are not shown alone");
    // The lit choice again: every campaign, and the sliders say no kind.
    await sliders.click();
    expectThat((await page.locator("[role=menu] [role=menuitemradio][aria-checked=true]").innerText()).includes("For the reposed"), "the kind that is on is not ticked");
    await page.locator("[role=menu] [role=menuitemradio]", { hasText: "For the reposed" }).click();
    await settle(page, 500);
    expectThat((await rows.count()) === 4, `the same choice again shows ${await rows.count()} campaigns`);
    expectThat(!(await sliders.innerText()).includes("For the reposed"), "the sliders still say a kind");
    expectThat(boardAsks() === before, `the board was asked for ${boardAsks() - before} more times for the choice`);
    // Which kind a reader looks at is told to no one: no address asked for names one.
    expectThat(!asked.some((a) => /kind|intention|healing|departed/.test(a)), `a kind was sent to the server: ${asked.filter((a) => /kind|intention|healing|departed/.test(a)).join(", ")}`);
  });

  await walk("the board: with one kind on it there is no choice to make, and no sliders", "/campaigns", async (page) => {
    const rows = page.locator("[data-campaign-board] [role=group][aria-labelledby=board-asked] [data-campaign-row]");
    await rows.first().waitFor({ timeout: 15000 });
    expectThat((await rows.count()) === 2, `the board has ${await rows.count()} campaigns`);
    expectThat((await page.locator("[data-campaign-board] button[aria-haspopup=menu]").count()) === 0, "sliders are drawn with one kind to choose from");
  }, { board: [CAMPAIGNS[MARIA], { ...CAMPAIGNS[THOMAS], circle: undefined, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab0" }] });

  // Run it again (1.9; the notes, 2.2).
  await walk("run it again: offered to its creator once a campaign is over; the start page begins with its parts and nothing ticked, and a new campaign is sent", `/campaigns/detail?id=${ENDED}`, async (page) => {
    const offer = page.locator("[data-campaign-page] a[data-campaign-again]");
    await offer.waitFor({ timeout: 15000 });
    expectThat((await offer.innerText()).trim() === "Run it again", `the offer reads "${await offer.innerText()}"`);
    // One that is over has nothing to add to one's prayers: the offer stands in that place.
    expectThat((await page.locator("[data-campaign-page] button[aria-haspopup=dialog]", { hasText: "Add to my prayers" }).count()) === 0, "a campaign that is over can still be added");
    await offer.click();
    await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/campaigns/new", null, { timeout: 15000 });
    const note = page.locator("[data-campaign-new] p[data-campaign-again]");
    await note.waitFor({ timeout: 15000 });
    expectThat((await note.innerText()).includes("A moderator will read it first") && (await note.innerText()).includes("no one is added"), `the page says "${await note.innerText()}"`);
    // What was written and chosen then.
    expectThat((await page.inputValue("#campaign-title-field")) === "For Irene's recovery" && (await page.inputValue("#campaign-name-field")) === "Irene", "the title and the name did not come over");
    expectThat((await page.inputValue("#campaign-words-field")).startsWith("She is home and mending."), "the words did not come over");
    // The first panel is the rows; the second holds the lines of who it is for.
    const rows = plain(await page.locator("[data-campaign-new] .set-panel").first().innerText());
    for (const part of ["An illness", "A week", "The Trisagion Prayers", "Sibiu, Romania"]) expectThat(rows.includes(part), `the rows do not say "${part}": ${rows.replace(/\n/g, " / ")}`);
    // What is given again: who it is for, and the two ticks. Create is dim until they are.
    const create = page.locator("[data-campaign-new] .compose-foot button");
    expectThat(await create.isDisabled(), "Create is lit with no blessing given again");
    expectThat((await page.locator("[data-campaign-new] [role=radio][aria-checked=true]").count()) === 0, "a blessing came over");
    expectThat((await page.locator("[data-campaign-new] [role=checkbox][aria-checked=true]").count()) === 0, "a tick came over");
    await page.locator("[role=radio]", { hasText: "Someone else" }).click();
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    expectThat(!(await create.isDisabled()), "Create stays dim when everything is said again");
    await create.click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent, "nothing was sent");
    const b = sent.body;
    expectThat(b.forWhom === "living" && b.kind === "healing" && b.title === "For Irene's recovery" && b.name === "Irene" && b.days === 7 && b.startsOn === TODAY, `sent ${JSON.stringify(b)}`);
    expectThat(b.prayer?.rule === "morning" && b.prayer?.id === "trisagion" && b.place?.country === "RO" && b.place?.town === "Sibiu", `sent ${JSON.stringify(b)}`);
    expectThat(b.consent === "blessing" && b.blessing === true && b.rules === true && b.termsAccepted === true, `the blessing and the ticks sent are ${JSON.stringify([b.consent, b.blessing, b.rules, b.termsAccepted])}`);
    // A new campaign in every way: nothing of the old one's is sent with it.
    expectThat(!JSON.stringify(b).includes(ENDED), "the old campaign's id was sent with the new one");
  }, { mine: [ENDED] });

  await walk("run it again: not offered on one that runs or waits, and an address naming one of those, or anyone else's, starts an empty page", `/campaigns/detail?id=${NICHOLAS}`, async (page) => {
    await page.waitForSelector("[data-campaign-page] h1", { timeout: 15000 });
    await settle(page, 900);
    expectThat((await page.locator("[data-campaign-again]").count()) === 0, "a campaign that still runs offers to run again");
    await go(page, `/campaigns/detail?id=${HELD}`);
    await page.waitForSelector("[data-campaign-standing]", { timeout: 15000 });
    await settle(page, 900);
    expectThat((await page.locator("[data-campaign-again]").count()) === 0, "a campaign that waits offers to run again");
    // By the address: one that waits (the reader's own), one that runs (their own), and one that is someone else's.
    for (const from of [HELD, NICHOLAS, MARIA]) {
      await go(page, `/campaigns/new?from=${from}`);
      await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
      await settle(page, 1500);
      expectThat((await page.inputValue("#campaign-title-field")) === "" && (await page.inputValue("#campaign-name-field")) === "", `the page began from ${from}`);
      expectThat((await page.locator("[data-campaign-again]").count()) === 0, `the page says it began from ${from}`);
    }
  }, { mine: [NICHOLAS, HELD] });

  await walk("run it again: one kept to a circle comes over kept to it, and says who will see it", `/campaigns/new?from=${PARISH_OVER}`, async (page) => {
    await page.waitForSelector("[data-campaign-new] p[data-campaign-again]", { timeout: 15000 });
    expectThat((await page.inputValue("#campaign-title-field")) === "For Anna's surgery", "the title did not come over");
    const foot = page.locator("[data-campaign-audience-line]");
    expectThat((await foot.getAttribute("data-campaign-audience-line")) === "circle" && (await foot.innerText()).includes(`Only ${PARISH.name} can see this.`), `the foot says ${await foot.innerText()}`);
    await page.locator("[role=radio]", { hasText: "This is my own request." }).click();
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.circleId === PARISH.id, `the start sent ${JSON.stringify(sent?.body?.circleId)} for its circle`);
  }, { mine: [PARISH_OVER], circles: true });

  await walk("run it again: one kept to a circle the reader is no longer in brings nothing over, so nothing of it is set out for everyone", `/campaigns/new?from=${PARISH_OVER}`, async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await settle(page, 2000);
    expectThat((await page.inputValue("#campaign-title-field")) === "" && (await page.inputValue("#campaign-name-field")) === "" && (await page.inputValue("#campaign-words-field")) === "", "its words came over without its circle");
    expectThat((await page.locator("[data-campaign-again]").count()) === 0, "the page says it began from it");
  }, { mine: [PARISH_OVER] });

  await walk("Pray together: campaigns alone, behind its own door, and nothing is asked of the prayer wall", "/community#pray", async (page) => {
    await page.waitForSelector("[data-campaigns]", { timeout: 15000 });
    await settle(page, 1200);
    expectThat((await page.locator("[data-tour=community-halves] [role=tab]").count()) === 2, "the switch between the two halves is not drawn");
    expectThat((await page.locator("[data-prayer-wall]").count()) === 0, "the prayer wall is drawn");
    const said = await page.locator("[role=tabpanel]").innerText();
    expectThat(!/prayer wall|Ask for prayers|I prayed/i.test(said), `the wall's words are on the page: ${said.slice(0, 120)}`);
    expectThat(!calls.some((c) => c.path === "/api/community/prayer-wall"), "the prayer wall was asked for");
  });

  // The door to Pray together is the switch, drawn only once the website has said campaigns are open
  // for this reader. With the answer held back until the walk lets it go, the walk looks at Community
  // while it waits: no switch, its place kept; and then that nothing under it moved when the switch came.
  const doorPlace = (page) =>
    page.evaluate(() => {
      const place = document.querySelector("[data-door-place]");
      const head = document.querySelector(".community-head");
      return {
        place: place ? { state: place.getAttribute("data-door-place"), height: Math.round(place.getBoundingClientRect().height) } : null,
        tabs: document.querySelectorAll("[data-tour=community-halves] [role=tab]").length,
        under: head?.nextElementSibling ? Math.round(head.nextElementSibling.getBoundingClientRect().top + window.scrollY) : null,
      };
    });

  await walk("the door, waiting then open: the switch's place is kept, and the page under it does not move when the switch comes", "/community#pray", async (page, answerNow) => {
    const before = await doorPlace(page);
    expectThat(before.tabs === 0, "the switch is drawn before the website has said campaigns are open");
    expectThat(before.place?.state === "waiting" && before.place.height === 60, `its place is not kept: ${JSON.stringify(before.place)}`);
    answerNow();
    await page.waitForSelector("[data-tour=community-halves] [role=tab]", { timeout: 15000 });
    await settle(page, 900);
    const after = await doorPlace(page);
    expectThat(after.tabs === 2 && after.place === null, `the switch did not take its place: ${JSON.stringify(after)}`);
    expectThat(before.under !== null && after.under === before.under, `the page under the switch moved, from ${before.under} to ${after.under}`);
    expectThat((await page.locator(".community-door-arrives [data-tour=community-halves]").count()) === 1, "the switch that came into its place does not fade in");
    // And it was Pray together that was asked for.
    await page.waitForSelector("[data-campaigns]", { timeout: 15000 });
    expectThat((await page.locator("[data-tour=community-halves] [role=tab][aria-selected=true]").innerText()).trim() === "Pray together", "Pray together is not the open half");
  }, { holdOpen: true });

  await walk("the door, waiting then no: the place closes, there is no switch, and the conversations are shown", "/community#pray", async (page, answerNow) => {
    const before = await doorPlace(page);
    expectThat(before.tabs === 0 && before.place?.state === "waiting" && before.place.height === 60, `while waiting: ${JSON.stringify(before)}`);
    answerNow();
    await page.waitForSelector('[data-door-place="shut"]', { timeout: 15000 });
    await settle(page, 900);
    const after = await doorPlace(page);
    expectThat(after.tabs === 0 && after.place?.state === "shut" && after.place.height === 0, `the place did not close: ${JSON.stringify(after)}`);
    expectThat((await page.locator("[data-campaigns]").count()) === 0, "Pray together draws campaigns");
    expectThat((await page.locator("[data-feed-tab]").count()) > 0, "the conversations are not shown");
    expectThat((await page.locator(".community-on-picture").count()) === 0, "the head still wears Pray together's picture");
  }, { closed: true, holdOpen: true });

  await walk("a profile: no request for prayers on it, no I prayed, and the old answer is asked of no one", `/community/#@${SAMPLE_READER.handle}`, async (page) => {
    await page.waitForFunction((h) => document.querySelector("[data-profile-card]")?.innerText.includes(`@${h}`) && !!document.querySelector("[data-profile-card] [data-profile-doors]"), SAMPLE_READER.handle, { timeout: 25000 });
    await settle(page, 1600);
    const said = await page.locator("[data-profile-card]").innerText();
    expectThat(said.includes(SAMPLE_READER.status) && said.includes(SAMPLE_READER.bio), `the profile is not drawn whole: ${said.slice(0, 120)}`);
    // The words a profile said until 1.9, which no catalog holds any more.
    expectThat(!/asking for your prayers|you asked for prayers|I prayed|you prayed|\d+ prayed/i.test(said), `the request's words are on the profile: ${said.slice(0, 200)}`);
    expectThat(calls.some((c) => c.path === "/api/community/profile"), "the profile was not asked for");
    expectThat(!calls.some((c) => c.path === "/api/community/pray" || c.path === "/api/community/prayer-wall"), "I prayed or the wall was asked for");
  });

  await walk("a circle: starting one kept to a circle sends that circle, and the page says who will see it", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await page.fill("#campaign-title-field", "For Thomas after his fall");
    await page.fill("#campaign-name-field", "Thomas");
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "An illness" }).click();
    await settle(page, 700);
    // Everyone in Community until a circle is chosen, and said so at the foot.
    const foot = page.locator("[data-campaign-audience-line]");
    expectThat((await foot.getAttribute("data-campaign-audience-line")) === "everyone" && (await foot.innerText()).includes("Everyone in Community can read this"), "the foot does not say everyone can read it");
    const row = page.locator("[data-campaign-new] .set-panel button", { hasText: "Who can see it" });
    expectThat((await row.innerText()).includes("Everyone in Community"), "the row does not start at everyone");
    await row.click();
    const lines = page.locator("[data-campaign-audience] [role=radio]");
    // The sheet rises: its lines are read once they are there.
    await lines.first().waitFor({ timeout: 8000 });
    await settle(page, 500);
    expectThat((await lines.allInnerTexts()).map((x) => x.split("\n")[0].trim()).join("|") === `Everyone in Community|${PARISH.name}|${HOUSEHOLD.name}`, `the choices are ${(await lines.allInnerTexts()).join(" | ")}`);
    expectThat((await page.locator("[data-campaign-audience]").innerText()).includes("A campaign kept to a circle is seen by its members only, and is on no list."), "the sheet does not say what keeping it to a circle means");
    await lines.filter({ hasText: PARISH.name }).click();
    await settle(page, 700);
    expectThat((await row.innerText()).includes(PARISH.name), "the row does not name the circle chosen");
    expectThat((await foot.getAttribute("data-campaign-audience-line")) === "circle" && (await foot.innerText()).includes(`Only ${PARISH.name} can see this.`), `the foot says ${await foot.innerText()}`);
    expectThat((await page.locator("[data-campaign-new]").innerText()).includes("before its circle can see it"), "the note still says everyone will see it");
    await page.locator("[role=radio]", { hasText: "Someone else" }).click();
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.circleId === PARISH.id, `the start sent ${JSON.stringify(sent?.body?.circleId)} for its circle`);
  }, { circles: true });

  await walk("a circle: a reader in no circle is offered no choice, and theirs is for everyone", "/campaigns/new", async (page) => {
    await page.waitForSelector("#campaign-title-field", { timeout: 15000 });
    await settle(page, 900);
    expectThat(calls.some((c) => c.path === "/api/campaigns/circles"), "the reader's circles were not asked for");
    expectThat((await page.locator("[data-campaign-new] .set-panel button", { hasText: "Who can see it" }).count()) === 0, "a reader in no circle is offered the choice");
    expectThat((await page.locator("[data-campaign-audience-line]").getAttribute("data-campaign-audience-line")) === "everyone", "the foot does not say everyone");
    await page.fill("#campaign-title-field", "For Elias on his journey");
    await page.fill("#campaign-name-field", "Elias");
    await page.locator("[data-campaign-new] .set-panel button").nth(0).click();
    await page.locator("[role=radio]", { hasText: "A journey" }).click();
    await settle(page, 700);
    await page.locator("[role=radio]", { hasText: "Someone else" }).click();
    const boxes = page.locator("[data-campaign-new] [role=checkbox]");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await page.locator("[data-campaign-new] .compose-foot button").click();
    await settle(page, 1500);
    const [sent] = sentTo("POST", /^\/api\/campaigns$/);
    expectThat(sent && sent.body.circleId === null, `the start sent ${JSON.stringify(sent?.body?.circleId)} for its circle`);
  });

  await walk("a circle: a member finds it in Pray together and opens it; the page says who can see it and offers no link", "/community#pray", async (page) => {
    await page.waitForSelector("[data-campaigns-circles] [data-campaign-row]", { timeout: 15000 });
    const list = page.locator("[data-campaigns-circles]");
    expectThat((await page.locator("#campaigns-circles").innerText()).trim() === "In your circles", "the list is not named In your circles");
    const said = await list.innerText();
    expectThat(said.includes("For Thomas after his fall") && said.includes(PARISH.name), `the row is ${said.replace(/\n/g, " / ")}`);
    // On no board: it is not among the newly asked.
    expectThat(!(await page.locator("[aria-labelledby=campaigns-asked]").innerText()).includes("Thomas"), "it is among the newly asked");
    await list.locator("[data-campaign-row]").first().click();
    await page.waitForSelector("[data-campaign-circle]", { timeout: 15000 });
    expectThat((await page.locator("[data-campaign-circle]").innerText()).trim() === `Only ${PARISH.name} can see this.`, "the page does not say who can see it");
    expectThat((await page.locator("[data-campaign-page] header button[aria-label=Share], [data-campaign-page] header [data-share]").count()) === 0, "a link to share is offered");
  }, { circles: true });

  await walk("a circle: to a reader outside it, its page is the page of a campaign that is not there", `/campaigns/detail?id=${THOMAS}`, async (page) => {
    await settle(page, 1500);
    expectThat((await page.locator("[data-campaign-circle]").count()) === 0 && (await page.locator("#campaign-title").count()) === 0, "the campaign is drawn for a reader outside its circle");
    expectThat(!(await page.locator("body").innerText()).includes("Thomas") && !(await page.locator("body").innerText()).includes(PARISH.name), "its words or its circle's name are on the page");
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
    expectThat((await page.locator("[data-campaign-pictures] button").count()) === 5, `a reader is shown ${await page.locator("[data-campaign-pictures] button").count()} places, not the campaign's five pictures`);
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

  await pictureWalk("pictures, on: at five its creator is offered no more, and nothing names Plus", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    const section = page.locator("[data-campaign-pictures]");
    // Five pictures, the last one waiting: no place to add, and no door to anything else.
    expectThat((await section.locator("button img").count()) === 5, `its creator is shown ${await section.locator("button img").count()} pictures, not five`);
    expectThat((await section.locator('button[aria-label="Add a picture"]').count()) === 0, "a sixth picture is offered");
    expectThat((await section.locator("button").count()) === 5, "there is a place among the pictures that is not a picture");
    expectThat(!/Plus/.test(await section.innerText()), "Plus is named among its creator's pictures");
    expectThat((await page.getByRole("button", { name: /Purify Plus/ }).count()) === 0, "a door to Plus is drawn on the campaign's page");
    expectThat(!calls.some((c) => c.method === "POST" && c.path.endsWith("/pictures")), "something was uploaded");
  }, { mine: [MARIA], parts: { pictures: true }, pictures: { waiting: 1 } });

  await pictureWalk("pictures, on: a reader who did not start the campaign is shown no place to add, and nothing names Plus", `/campaigns/detail?id=${MARIA}`, async (page) => {
    await page.waitForSelector("[data-campaign-pictures] button img", { timeout: 15000 });
    expectThat((await page.getByRole("button", { name: /Purify Plus/ }).count()) === 0, "a reader is shown a door to Plus");
    expectThat((await page.locator("[data-campaign-pictures]").innerText()).includes("Plus") === false, "Plus is named to a reader");
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
    // What the automatic check noticed and left to a person stands on the card before the picture is uncovered.
    const noted = page.locator("[data-mod-campaign-picture]", { hasText: "Weapons 91" });
    expectThat((await noted.count()) === 1, "the check's note is not on the card");
    expectThat((await noted.innerText()).includes("Automatic check: Rekognition 7.0 noticed: Weapons 91"), `the note reads "${(await noted.innerText()).replace(/\n/g, " / ").slice(0, 200)}"`);
    expectThat((await noted.locator("img").count()) === 0, "the picture with a note is drawn before it is asked for");
    // The reported one that is still shown: kept, or removed.
    const reported = page.locator("[data-mod-campaign-picture]", { hasText: "Is this theirs to share?" });
    expectThat((await reported.count()) === 1, "the reader's reason is not shown");
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
    expectThat((await page.locator("[data-tour=community-halves] [role=tab]").count()) === 0, "the switch to Pray together is drawn with nothing behind it");
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
