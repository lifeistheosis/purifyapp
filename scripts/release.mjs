// The release tool: the mechanical half of the release ritual (AGENTS.md),
// so a release is the same steps every time and none is forgotten.
//
//   node scripts/release.mjs new <version>     start docs/plans/v<version>/ from the templates
//   node scripts/release.mjs note <version>    put the written note into entries.json, patches.json
//                                              and the Update Hierarchy checklist
//   node scripts/release.mjs bump <version>    move the six version identifiers and release.ts
//   node scripts/release.mjs email             write the release email as pages to open and read
//   node scripts/release.mjs check             say what is ready and what is not; exit 1 if not
//
// It writes only files in this repo. It never pushes, never sends, never
// touches the database and never raises androidVersionCode or iosBuildNumber:
// those move by hand, after a store is serving the build
// (lib/appUpdate/release.ts). The human steps live in docs/RELEASE.md.

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const [cmd, arg] = process.argv.slice(2);
const PREVIEW_DIR = ".release-logs/email";
const CATEGORIES = ["fixes", "saints", "library", "shop", "perks", "stats"];
const EM_DASH = String.fromCharCode(0x2014);

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
/** Keep each file's own line endings: this checkout is CRLF, CI is LF. */
const write = (p, text) => {
  const crlf = exists(p) ? read(p).includes("\r\n") : true;
  const lf = text.replace(/\r\n/g, "\n");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, crlf ? lf.replace(/\n/g, "\r\n") : lf);
};
const writeJson = (p, v) => write(p, JSON.stringify(v, null, 2) + "\n");
const json = (p) => JSON.parse(read(p));
const dir = (v) => `docs/plans/v${v}`;
const usage = () => {
  console.error("Usage: node scripts/release.mjs <new|note|bump|email|check> [version]");
  process.exit(1);
};
const needVersion = () => {
  if (!arg || !/^\d+\.\d+(\.\d+)?$/.test(arg)) {
    console.error(`"${arg ?? ""}" is not a version. Write it as 1.6 or 1.6.1.`);
    process.exit(1);
  }
  return arg;
};

// ---------------------------------------------------------------- where the versions live

const FILES = {
  version: "lib/whatsNew/version.ts",
  sw: "public/sw.js",
  gradle: "android/app/build.gradle",
  pbx: "ios/App/App.xcodeproj/project.pbxproj",
  release: "lib/appUpdate/release.ts",
};
function versions() {
  const one = (p, re) => (read(p).match(re) ?? [])[1] ?? null;
  return {
    version: one(FILES.version, /export const CURRENT_VERSION = "([^"]+)"/),
    sw: one(FILES.sw, /const CACHE_VERSION = "purify-([^"]+)"/),
    gradle: one(FILES.gradle, /versionName\s*=\s*"([^"]+)"/),
    pbx: [...read(FILES.pbx).matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1].trim()),
    release: one(FILES.release, /versionName: "([^"]+)"/),
    android: Number(one(FILES.release, /androidVersionCode: (\d+)/)),
    ios: Number(one(FILES.release, /iosBuildNumber: (\d+)/)),
  };
}

// ---------------------------------------------------------------- new

function start(v) {
  const d = dir(v);
  // The release before this one is the newest note that is not this one's,
  // whether or not the versions have been bumped yet.
  const prev = json("data/changelog/entries.json").find((e) => e.version !== v)?.version ?? versions().version;
  const made = [];
  const put = (name, text) => {
    const p = `${d}/${name}`;
    if (exists(p)) return;
    write(p, text);
    made.push(p);
  };
  put("RELEASE.md", read("docs/release/TEMPLATE.md").replaceAll("<version>", v).replaceAll("<previous>", prev));
  put(`since-${prev}.md`, `# What we have done since ${prev}\n\nOne entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.\n\n## Fixes\n\n## Saints\n\n## Library\n\n## Shop\n\n## Perks\n\n## Stats\n\n## Community and plain lines\n\n## Silent: admin and plumbing\n`);
  put(`patch-note-${v}.json`, JSON.stringify({ version: v, kind: "", date: "", title: "", blurb: "", items: ["A plain line.", { category: "fixes", text: "A line filed under a category." }] }, null, 2) + "\n");
  put(`patch-long-${v}.json`, JSON.stringify({ intro: "", sections: [{ heading: "", body: "" }] }, null, 2) + "\n");
  // The screenshots this release needs, for scripts/release-pictures.mjs. Its header says what a shot is.
  put("pictures.json", "[]\n");
  put("announcements.md", `# ${v} announcements\n\nDrafts. The owner posts and sends everything here.\n\n## Discord\n\n### The announcement (the day the web is live)\n\n### The short one\n\n### In the stores (only when a store shows ${v})\n\n## The weekly board in the app\n\n## The release email\n\nBuilt from the published note by releaseBody; sent from Admin, Email.\n`);
  console.log(made.length ? `Started ${d}:\n  ${made.join("\n  ")}` : `${d} already has everything.`);
  console.log(`Next: write the note, then  node scripts/release.mjs note ${v}`);
}

// ---------------------------------------------------------------- note

function longDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function note(v) {
  const draftPath = `${dir(v)}/patch-note-${v}.json`, longPath = `${dir(v)}/patch-long-${v}.json`;
  for (const p of [draftPath, longPath]) if (!exists(p)) { console.error(`Missing ${p}. Run: node scripts/release.mjs new ${v}`); process.exit(1); }
  const draft = json(draftPath), long = json(longPath);
  if (draft.version !== v) { console.error(`${draftPath} names version ${draft.version}, not ${v}.`); process.exit(1); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) { console.error(`${draftPath}: write the date as 2026-10-04.`); process.exit(1); }
  const everything = JSON.stringify([draft, long]);
  if (everything.includes(EM_DASH)) { console.error("The note carries an em dash. This repo allows none."); process.exit(1); }
  for (const s of long.sections ?? []) if (!s.heading || !s.body) { console.error(`${longPath}: every section needs a heading and a body.`); process.exit(1); }
  if (!long.intro) { console.error(`${longPath}: the intro is empty.`); process.exit(1); }

  const entry = { version: v, kind: draft.kind, date: longDate(draft.date), blurb: draft.blurb, items: draft.items };
  writeJson("data/changelog/entries.json", [entry, ...json("data/changelog/entries.json").filter((e) => e.version !== v)]);
  const patch = { id: `v${v.replaceAll(".", "-")}`, version: v, date: draft.date, title: draft.title || draft.kind, intro: long.intro, sections: long.sections };
  writeJson("data/changelog/patches.json", [patch, ...json("data/changelog/patches.json").filter((p) => p.version !== v)]);

  // The checklist: a category with lines is shipped. One without is skipped,
  // and its reason is left empty on purpose, so the unit test refuses the
  // release until somebody writes why.
  const listPath = `data/changelog/checklists/${v}.json`;
  const before = exists(listPath) ? json(listPath).categories ?? {} : {};
  const filed = new Set(draft.items.filter((it) => typeof it !== "string").map((it) => it.category));
  const categories = Object.fromEntries(
    CATEGORIES.map((c) => [c, filed.has(c) ? { status: "shipped" } : { status: "skipped", reason: before[c]?.reason ?? "" }]),
  );
  writeJson(listPath, { version: v, categories });
  const open = CATEGORIES.filter((c) => categories[c].status === "skipped" && !categories[c].reason);
  console.log(`Note ${v}: ${draft.items.length} lines, ${long.sections.length} sections, in entries.json and patches.json.`);
  console.log(open.length ? `Write a reason in ${listPath} for: ${open.join(", ")}.` : `Checklist ${listPath} is complete.`);
}

// ---------------------------------------------------------------- bump

function bump(v) {
  const now = versions();
  const from = now.version;
  if (from === v) return console.log(`Already ${v}.`);
  const swap = (p, a, b, times = 1) => {
    const s = read(p);
    const n = s.split(a).length - 1;
    if (n !== times) { console.error(`${p}: expected ${times} of "${a}", found ${n}. Nothing was written to this file.`); process.exitCode = 1; return; }
    fs.writeFileSync(p, s.split(a).join(b));
    console.log(`  ${p}`);
  };
  console.log(`${from} to ${v}:`);
  swap(FILES.version, `export const CURRENT_VERSION = "${from}";`, `export const CURRENT_VERSION = "${v}";`);
  // The cache name is major.minor.patch; a release starts its patch at 0.
  const cache = v.split(".").length === 2 ? `${v}.0` : v;
  swap(FILES.sw, `const CACHE_VERSION = "purify-${now.sw}";`, `const CACHE_VERSION = "purify-${cache}";`);
  swap(FILES.gradle, `versionName = "${now.gradle}"`, `versionName = "${v}"`);
  swap(FILES.pbx, `MARKETING_VERSION = ${now.pbx[0]};`, `MARKETING_VERSION = ${v};`, now.pbx.length);
  swap(FILES.release, `versionName: "${now.release}",`, `versionName: "${v}",`);
  console.log("androidVersionCode and iosBuildNumber were left alone. Raise each only after its store serves the build.");
}

// ---------------------------------------------------------------- email

// The release email is built from the note by lib/email, which is TypeScript
// with the app's own import paths, so the test runner renders it: the same
// file that refuses a release whose email could not be sent
// (lib/email/__tests__/releaseEmail.test.ts) writes the pages when asked.
function email() {
  const vitest = path.join(path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")), "vitest.mjs");
  const run = spawnSync(process.execPath, [vitest, "run", "lib/email/__tests__/releaseEmail.test.ts"], {
    stdio: "inherit",
    env: { ...process.env, RELEASE_EMAIL_PREVIEW: PREVIEW_DIR },
  });
  if (run.status !== 0) {
    console.error("\nThe release email did not pass. Nothing above this line may be sent as it is.");
    process.exit(run.status ?? 1);
  }
  const made = exists(PREVIEW_DIR) ? fs.readdirSync(PREVIEW_DIR).filter((f) => /^release[-.]/.test(f)) : [];
  if (!made.length) {
    console.error(`\nNo preview was written. Is there a note for ${versions().version} in data/changelog/entries.json?`);
    process.exit(1);
  }
  console.log(`\nThe release email for ${versions().version}, as it would be sent today:`);
  for (const f of made) console.log(`  ${PREVIEW_DIR}/${f}`);
  console.log("Open release-night.html in a browser and read it to the end. Night is the mode every email goes out in");
  console.log("(lib/email/theme.ts); the other three are there to compare. release.txt is the plain-text part.");
  console.log("The owner sends it from Admin, Email, after the note is published and the site is live.");
}

// ---------------------------------------------------------------- check

/** What lib/whatsNew/highlights.ts names, read as text: the release and every picture. */
function highlights() {
  const p = "lib/whatsNew/highlights.ts";
  if (!exists(p)) return null;
  const s = read(p).slice(read(p).indexOf("export const RELEASE_HIGHLIGHTS"));
  return {
    version: (s.match(/version: "([^"]+)"/) ?? [])[1] ?? null,
    pictures: [...s.matchAll(/src: "([^"]+)"/g)].map((m) => m[1]),
  };
}

/** What lib/whatsNew/releaseEmail.ts names: the release, how many points, and its picture. */
function letter() {
  const p = "lib/whatsNew/releaseEmail.ts";
  if (!exists(p)) return null;
  const s = read(p).slice(read(p).indexOf("export const RELEASE_EMAIL"));
  return {
    version: (s.match(/version: "([^"]+)"/) ?? [])[1] ?? null,
    picture: (s.match(/src: "([^"]+)"/) ?? [])[1] ?? null,
    points: [...s.matchAll(/emoji: "/g)].length,
  };
}

function check() {
  const v = versions();
  const want = v.version;
  // A patch (1.5.1) keeps its release's (1.5) highlights and announcement
  // email: lib/whatsNew/version.ts, featureRelease.
  const release = want.split(".").slice(0, 2).join(".");
  let failed = 0;
  const line = (ok, text, fix) => {
    if (!ok) failed++;
    console.log(`${ok ? "  ok  " : "  NO  "}${text}${!ok && fix ? `\n        ${fix}` : ""}`);
  };
  const info = (text) => console.log(`  ..  ${text}`);
  console.log(`Release ${want}\n`);

  console.log("Versions");
  line(v.sw?.split(".").slice(0, 2).join(".") === want.split(".").slice(0, 2).join("."), `service worker cache is purify-${v.sw}`, `node scripts/release.mjs bump ${want}`);
  line(v.gradle === want, `Android versionName is ${v.gradle}`);
  line(v.pbx.length > 0 && v.pbx.every((x) => x === want), `iOS MARKETING_VERSION is ${[...new Set(v.pbx)].join(" and ")} (${v.pbx.length} places)`);
  line(v.release === want, `release.ts versionName is ${v.release}`);
  info(`update prompt: Android ${v.android || "off"}, iOS ${v.ios || "off"} (off until a store serves this build)`);

  console.log("\nThe note");
  const entries = json("data/changelog/entries.json"), patches = json("data/changelog/patches.json");
  line(entries[0]?.version === want, `entries.json opens with ${entries[0]?.version}`, `node scripts/release.mjs note ${want}`);
  line(patches[0]?.version === want, `patches.json opens with ${patches[0]?.version}`, `node scripts/release.mjs note ${want}`);
  const draftPath = `${dir(want)}/patch-note-${want}.json`;
  line(exists(draftPath), `the owner's queue draft exists (${draftPath})`);
  if (exists(draftPath) && entries[0]?.version === want) {
    line(JSON.stringify(json(draftPath).items) === JSON.stringify(entries[0].items), "the draft and entries.json carry the same lines", `node scripts/release.mjs note ${want}`);
  }
  if (entries[0]?.version === want) {
    line(!JSON.stringify([entries[0], patches[0]]).includes(EM_DASH), "no em dash in the note");
    const listPath = `data/changelog/checklists/${want}.json`;
    line(exists(listPath), `the Update Hierarchy checklist exists (${listPath})`);
    if (exists(listPath)) {
      const cats = json(listPath).categories ?? {};
      const counts = Object.fromEntries(CATEGORIES.map((c) => [c, entries[0].items.filter((it) => typeof it !== "string" && it.category === c).length]));
      for (const c of CATEGORIES) {
        const s = cats[c];
        if (!s) line(false, `${c}: missing from the checklist`);
        else if (s.status === "shipped") line(counts[c] > 0, `${c}: shipped, ${counts[c]} line(s)`);
        else line(Boolean(s.reason) && counts[c] === 0, `${c}: skipped${s.reason ? "" : ", with no reason written"}`);
      }
    }
  }

  console.log("\nThe top of What's New");
  const hl = highlights();
  if (!hl) info("no lib/whatsNew/highlights.ts");
  else {
    line(hl.version === release, `the highlights are ${hl.version}'s`, `write ${release}'s set in lib/whatsNew/highlights.ts, with its pictures and strings`);
    const missing = hl.pictures.filter((src) => !exists(`public${src}`));
    line(missing.length === 0, missing.length ? `pictures missing from public/: ${missing.join(", ")}` : `${hl.pictures.length} picture(s) are in public/`);
  }

  console.log("\nThe words that go out");
  line(exists(`${dir(want)}/announcements.md`), `announcements drafted (${dir(want)}/announcements.md)`);
  line(exists(`${dir(want)}/RELEASE.md`), `this release's checklist exists (${dir(want)}/RELEASE.md)`, `node scripts/release.mjs new ${want}`);
  const mail = letter();
  if (mail?.version === release) {
    line(mail.points > 0, `the release email has ${mail.points} point(s) of its own (lib/whatsNew/releaseEmail.ts)`);
    if (mail.picture) line(exists(`public${mail.picture}`), `its picture is in public/ (${mail.picture})`);
    else info("the release email has no picture");
  } else {
    info(`the release email will send ${release}'s blurb: lib/whatsNew/releaseEmail.ts is still ${mail?.version ?? "missing"}'s`);
  }
  const previews = exists(PREVIEW_DIR) ? fs.readdirSync(PREVIEW_DIR).filter((f) => f.endsWith(".html")) : [];
  info(previews.length ? `release email preview is in ${PREVIEW_DIR}/ (run "email" again after the note changes)` : "release email not previewed yet: node scripts/release.mjs email");

  console.log("\nGit");
  const git = (...a) => { try { return execFileSync("git", a, { encoding: "utf8" }).trim(); } catch { return null; } };
  const dirty = git("status", "--porcelain");
  line(dirty === "", dirty ? `${dirty.split("\n").length} file(s) not committed` : "everything is committed");
  const behind = git("rev-list", "--count", "HEAD..origin/main");
  if (behind !== null) line(behind === "0", `${behind} commit(s) on origin/main are not in this branch (as of the last fetch)`, "git fetch origin && git rebase origin/main, then run the gates again");

  console.log("\nStill to run by hand, in this order (each must be green):");
  for (const g of ["npm run typecheck", "npm run test:unit", "npm run lint", "npm run build:android", "npm run build:ios   (never beside the Android one)", "npm run build", "a browser walk of what changed"]) console.log(`  -   ${g}`);
  console.log(failed ? `\n${failed} thing(s) not ready.` : "\nEverything this tool can see is ready.");
  process.exit(failed ? 1 : 0);
}

if (cmd === "new") start(needVersion());
else if (cmd === "note") note(needVersion());
else if (cmd === "bump") bump(needVersion());
else if (cmd === "email") email();
else if (cmd === "check") check();
else usage();
