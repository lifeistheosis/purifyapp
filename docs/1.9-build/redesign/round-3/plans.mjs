// Round 3's stills: the journal's page, the chants door, You and Profile, the
// Bible's opening, Plus, a plan's own page and the Voice sheet.
// node docs/1.9-build/redesign/round-3/plans.mjs <scratchpad>  ->  plan3-before.json, plan3-after.json (for tools/shots.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const S = process.argv[2];
const NEW = { "purify:secondchance.done": "1" };
const morning = "2026-11-13T08:30:00";
const AR = { "CapacitorStorage.purify_locale": "ar" };
const base = (o) => ({ clock: morning, wait: 2500, ...o, set: { ...NEW, ...(o.set ?? {}) } });
// You and Profile: a signed-in reader shown offline through a stand-in session
// (reader@example.com; no key, no network). The lines and their seeds are the builder's.
const you = JSON.parse(fs.readFileSync(path.join(here, "you-lines.json"), "utf8"));
const [youKept, youNew, profile] = you;
const day3 = { "purify:plans": JSON.stringify({ gospels: { startedOn: "2026-11-11", done: { 0: "2026-11-11", 1: "2026-11-12" }, at: 1763020800000 } }) };
const seen = { "purify:bible:commentary-hint-seen": "1" };
const more = [{ tap: "[data-mobile-topbar] button[aria-haspopup=dialog]", then: 1200 }];
const door = (sel) => [{ eval: `[...document.querySelectorAll('${sel}')].find(e=>e.getBoundingClientRect().width>0).scrollIntoView({block:'center'})` }, { wait: 1200 }];
// Plus is offered only inside a phone's shell: the stand-in says so, then the page is opened.
const plus = [{ eval: "window.Capacitor={...(window.Capacitor??{}),getPlatform:()=>'android',isNativePlatform:()=>true};window.next.router.push('/pricing/')" }, { wait: 4000 }];
const J = fs.existsSync(path.join(here, "journal-lines.json")) ? JSON.parse(fs.readFileSync(path.join(here, "journal-lines.json"), "utf8")) : { before: [], after: [] };
const V = fs.existsSync(path.join(here, "voice-lines.json")) ? JSON.parse(fs.readFileSync(path.join(here, "voice-lines.json"), "utf8")) : { before: [], after: [] };

const before = [
  base({ name: "door", to: "/prayers/", steps: door("a.lm-feature") }),
  { ...youKept, name: "you" },
  { ...profile, name: "profile" },
  base({ name: "john", to: "/bible/john/1/", measure: "document.querySelector('#v1').getBoundingClientRect().top / innerHeight" }),
  base({ name: "more", to: "/bible/john/1/", steps: more }),
  base({ name: "plus", to: "/support/", full: true, steps: plus }),
  base({ name: "plan", to: "/plans/gospels/" }),
  ...J.before, ...V.before,
].map((s) => ({ ...s, check: false }));

const wide = (s, width, height) => ({ ...s, name: `${s.name}-${width}`, width, height, full: false });
const ar = (s) => ({ ...s, name: `${s.name}-ar`, set: { ...s.set, ...AR }, full: false });
const core = [
  base({ name: "door", to: "/prayers/", steps: door("[data-chants-door]") }),
  { ...youKept, name: "you", full: true },
  { ...youNew, name: "you-new" },
  { ...profile, name: "profile", full: true },
  base({ name: "john", to: "/bible/john/1/", measure: "document.querySelector('#v1').getBoundingClientRect().top / innerHeight" }),
  base({ name: "john-seen", to: "/bible/john/1/", set: seen, measure: "document.querySelector('#v1').getBoundingClientRect().top / innerHeight" }),
  base({ name: "more", to: "/bible/john/1/", set: seen, steps: more }),
  base({ name: "plus", to: "/support/", full: true, steps: plus }),
  base({ name: "plan", to: "/plans/gospels/" }),
  base({ name: "plan-day3", to: "/plans/gospels/", set: day3, full: true }),
  ...J.after, ...V.after,
];
// Each screen again in Arabic, at 800 and at 1032 (sheets and the keyboard still at a phone's width only).
const again = core.filter((s) => !/-new$|-seen$|keys|sample/.test(s.name));
const after = [...core, ...again.map(ar), ...again.map((s) => wide(s, 800, 1180)), ...again.map((s) => wide(s, 1032, 900))];
fs.writeFileSync(`${S}/plan3-before.json`, JSON.stringify(before));
fs.writeFileSync(`${S}/plan3-after.json`, JSON.stringify(after));
fs.writeFileSync(`${S}/plan3-core.json`, JSON.stringify(core));
console.log(before.length, "before,", core.length, "after at a phone's width,", after.length, "after in all");
