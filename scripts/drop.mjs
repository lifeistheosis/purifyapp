// The drop tool: everything that tells people a release exists, as one file
// that is drafted, checked and written out the same way every time.
//
//   node scripts/drop.mjs new <release>     start docs/plans/v<release>/drop.json from the release's notes
//   node scripts/drop.mjs draft [release]   add every piece the drop lacks and fill every blank (never a written one)
//   node scripts/drop.mjs check [release]   hold the drop to its rules; exit 1 if one is broken
//   node scripts/drop.mjs kit [release]     the same, and write the kit the owner sends from
//   node scripts/drop.mjs status [release]  where every piece stands
//   node scripts/drop.mjs cards <folder>    small copies of the card stills, for the admin panel's Drop tab
//
//   node scripts/drop.mjs note <version> <written|queued|accepted> [--revision <id>] [--on <day>]
//   node scripts/drop.mjs served <android|ios> [--on <day>]
//   node scripts/drop.mjs sent <piece> [--by owner] [--on <day>] [--link <url>] [--words "..."] [--early "..."]
//   node scripts/drop.mjs waits <piece> "<what it waits for>"      (or --clear)
//
// The last four record what has happened. Each is checked before it is kept:
// a record the rules refuse (a store post marked sent before that store
// serves the build) is put back as it was.
//
// It never sends, posts, pushes or touches the database. The owner sends;
// this keeps the words ready and the record straight. The rules are in
// lib/drop/check.ts, tried in lib/drop/__tests__/, and set out in docs/DROP.md.
//
// Like `release.mjs email`, the checking is done by the test runner: lib/drop
// is TypeScript with the app's own import paths, and the same file that
// refuses a broken drop in `npm run test:unit` writes the kit when asked.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const has = (name) => rest.includes(name);
const words = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && rest[i - 1].startsWith("--") && rest[i - 1] !== "--clear"));

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const json = (p) => JSON.parse(read(p));
/** Keep each file's own line endings: this checkout is CRLF, CI is LF. */
const write = (p, text) => {
  const crlf = exists(p) ? read(p).includes("\r\n") : false;
  const lf = text.replace(/\r\n/g, "\n");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, crlf ? lf.replace(/\n/g, "\r\n") : lf);
};
const releaseOf = (v) => v.split(".").slice(0, 2).join(".");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fail = (text) => {
  console.error(text);
  process.exit(1);
};
const usage = () => fail("Usage: node scripts/drop.mjs <new|draft|check|kit|status|cards|note|served|sent|waits> ...   (see the top of scripts/drop.mjs)");

const CURRENT = (read("lib/whatsNew/version.ts").match(/export const CURRENT_VERSION = "([^"]+)"/) ?? [])[1];
const RELEASE = releaseOf(CURRENT ?? "");
const file = (release = RELEASE) => `docs/plans/v${release}/drop.json`;
const outDir = (release = RELEASE) => `.release-logs/drop/${release}`;

// ---------------------------------------------------------------- new

function start(release) {
  if (!release || !/^\d+\.\d+$/.test(release)) fail(`"${release ?? ""}" is not a release. A drop belongs to a release, written as 1.6: its patches are covered by it.`);
  if (exists(file(release))) fail(`${file(release)} is already there.`);
  const entries = json("data/changelog/entries.json");
  const mine = entries.filter((e) => releaseOf(e.version) === release).reverse();
  const own = mine.find((e) => e.version === release);
  if (!own) fail(`There is no ${release} note in data/changelog/entries.json. Write the note first: node scripts/release.mjs note ${release}`);
  const store = read("lib/appUpdate/release.ts");
  const drop = {
    release,
    version: mine[mine.length - 1].version,
    covers: mine.map((e) => e.version),
    name: own.kind,
    line: (own.blurb.match(/^.*?\.(?=\s|$)/) ?? [own.blurb])[0],
    closing: "The Scriptures, the saints, the prayers and the calendar stay free.",
    links: {
      whatsNew: "https://purifyapp.net/whats-new",
      appStore: (store.match(/iosStoreUrl:\s*"([^"]+)"/) ?? [])[1] ?? "",
      play: (store.match(/androidStoreUrl:\s*"([^"]+)"/) ?? [])[1] ?? "",
    },
    hashtags: ["#orthodox", "#orthodoxchristian", "#bible", "#saints", "#prayer"],
    notes: mine.map((e) => ({ version: e.version, state: "written" })),
    builds: { android: { build: 0, served: null }, ios: { build: 0, served: null } },
    never: [],
    figures: [{ figure: release, source: "the release's own name" }],
    points: [],
    also: [],
    pieces: [],
  };
  write(file(release), `${JSON.stringify(drop, null, 2)}\n`);
  console.log(`Started ${file(release)}: it covers ${drop.covers.join(", ")}.`);
  console.log("Now write, in that file:");
  console.log("  points   what the release brought, ten at most. Each names the note line it comes from.");
  console.log("  also     smaller things worth a line where there is room.");
  console.log("  never    what may not be said yet (switched off, not built, not seen working), with why.");
  console.log("  figures  the numbers a caption or a card may carry, with where each comes from.");
  console.log("  builds   the two store build numbers, once the builds are made.");
  console.log("Then:  node scripts/drop.mjs draft");
}

// ---------------------------------------------------------------- draft, check, kit, status

/** Runs the drop's own test as a tool. Returns the runner's exit code and what it printed. */
function run({ draft = false, release = RELEASE } = {}) {
  if (!exists(file(release))) fail(`There is no ${file(release)}. Start one: node scripts/drop.mjs new ${release}`);
  const vitest = path.join(path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")), "vitest.mjs");
  const done = spawnSync(process.execPath, [vitest, "run", "lib/drop/__tests__/currentDrop.test.ts"], {
    encoding: "utf8",
    env: { ...process.env, DROP_OUT: outDir(release), DROP_RELEASE: release, ...(draft ? { DROP_DRAFT: "1" } : {}) },
  });
  return { code: done.status ?? 1, printed: `${done.stdout ?? ""}${done.stderr ?? ""}` };
}

function report({ code, printed }, { quiet = false, release = RELEASE } = {}) {
  const statusFile = `${outDir(release)}/status.txt`;
  const drafted = printed.split(/\r?\n/).find((l) => l.includes("Drafts:"));
  if (drafted) console.log(drafted.slice(drafted.indexOf("Drafts:")));
  if (!quiet && exists(statusFile)) console.log(read(statusFile));
  const findings = exists(`${outDir(release)}/findings.json`) ? json(`${outDir(release)}/findings.json`) : [];
  const refused = findings.filter((f) => f.level === "error");
  // The runner can fail for a reason the findings do not hold (the drop is not this release's, say).
  if (code !== 0 && !refused.length) console.error(printed.split(/\r?\n/).filter((l) => /FAIL|Error|expected|×/.test(l)).join("\n") || printed);
  return { code, refused };
}

function kitPaths(release = RELEASE) {
  console.log(`The kit, for the owner to send from:  ${outDir(release)}/kit.html`);
  console.log(`A text file for each piece:            ${outDir(release)}/paste/`);
  console.log(`The drop as a page to read in a diff:  docs/plans/v${release}/drop.md   (commit it with drop.json)`);
}

// ---------------------------------------------------------------- recording what happened

/** Changes drop.json, and keeps the change only if the rules still hold. */
function record(change, said) {
  if (!exists(file())) fail(`There is no ${file()}.`);
  const before = read(file());
  const drop = JSON.parse(before);
  change(drop);
  write(file(), `${JSON.stringify(drop, null, 2)}\n`);
  const { refused } = report(run(), { quiet: true });
  if (refused.length) {
    fs.writeFileSync(file(), before);
    run();
    console.error("Not recorded. The rules refuse it:");
    for (const f of refused) console.error(`  ${f.rule}  ${f.where}: ${f.says}`);
    process.exit(1);
  }
  console.log(said);
  console.log(`Written to ${file()} and docs/plans/v${RELEASE}/drop.md. Commit them.`);
}

const pieceOf = (drop, id) => drop.pieces.find((p) => p.id === id) ?? fail(`The drop has no piece "${id}". They are: ${drop.pieces.map((p) => p.id).join(", ")}`);

// ---------------------------------------------------------------- the cards, for the admin panel

const CARDS_MODULE = "components/admin/drop/cards.generated.ts";

/**
 * Small copies of a release's card stills, so the Drop tab in the admin
 * panel can show what is going out. The stills themselves are made and kept
 * in the purify-ads repository; these are 540 pixels wide and are imported by
 * the tab, not placed under public/, so they ride in the admin page's own
 * bundle and never in the apps.
 */
async function cards(dir) {
  if (!dir || !exists(dir)) fail(`Give the folder that holds the card stills, for example ../purify-ads/out/release-1-5. "${dir ?? ""}" is not one.`);
  const stills = fs.readdirSync(dir).filter((f) => /^\d+[\w-]*\.png$/i.test(f)).sort();
  if (!stills.length) fail(`${dir} holds no numbered PNG stills (01-cover.png and so on).`);
  const { default: sharp } = await import("sharp");
  const out = `docs/plans/v${RELEASE}/cards`;
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const still of stills) {
    const to = path.join(out, still.replace(/\.png$/i, ".webp"));
    await sharp(path.join(dir, still)).resize({ width: 540 }).webp({ quality: 82 }).toFile(to);
    console.log(`  ${to.replace(/\\/g, "/")}  ${Math.round(fs.statSync(to).size / 1024)} KB`);
  }
  writeCardsModule();
  console.log(`${stills.length} card(s) for ${RELEASE}, and ${CARDS_MODULE} written. Open each before it is committed.`);
}

/** The module the Drop tab imports: every release that has a cards folder, in order. */
function writeCardsModule() {
  const releases = fs
    .readdirSync("docs/plans")
    .filter((d) => /^v\d+\.\d+$/.test(d) && exists(`docs/plans/${d}/cards`))
    .map((d) => d.slice(1))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const imports = [];
  const tables = [];
  for (const release of releases) {
    const files = fs.readdirSync(`docs/plans/v${release}/cards`).filter((f) => f.endsWith(".webp")).sort();
    const rows = files.map((file) => {
      const name = file.replace(/\.webp$/, "");
      const id = `c${release.replace(/\./g, "_")}_${name.replace(/[^a-z0-9]/gi, "_")}`;
      const words = name.replace(/^\d+-/, "").replace(/-/g, " ");
      imports.push(`import ${id} from "@/docs/plans/v${release}/cards/${file}";`);
      return `    { file: "${name}", label: "${words.charAt(0).toUpperCase()}${words.slice(1)}", src: ${id} },`;
    });
    tables.push(`  "${release}": [\n${rows.join("\n")}\n  ],`);
  }
  write(
    CARDS_MODULE,
    [
      "// Written by `node scripts/drop.mjs cards <folder>`. Do not edit: run it again.",
      "//",
      "// Small copies of each release's card stills, for the Drop tab. Imported, and",
      "// not placed under public/, so they ride in the admin page's own bundle and",
      "// never in the apps: scripts/native-build.mjs leaves the admin tree out.",
      "",
      'import type { StaticImageData } from "next/image";',
      "",
      ...imports,
      "",
      "export type DropCard = { file: string; label: string; src: StaticImageData };",
      "",
      "export const DROP_CARDS: Readonly<Record<string, DropCard[]>> = {",
      ...tables,
      "};",
      "",
    ].join("\n"),
  );
}

// draft, check, kit and status take a release, for reading an old drop or
// starting the next one before the versions are bumped. Without one they
// work on the release this checkout is.
const target = rest[0] && /^\d+\.\d+$/.test(rest[0]) ? rest[0] : RELEASE;

if (cmd === "new") start(rest[0]);
else if (cmd === "cards") await cards(rest[0]);
else if (cmd === "draft") {
  const done = report(run({ draft: true, release: target }), { release: target });
  kitPaths(target);
  process.exit(done.code);
} else if (cmd === "check" || cmd === "status") {
  process.exit(report(run({ release: target }), { release: target }).code);
} else if (cmd === "kit") {
  const done = report(run({ release: target }), { release: target });
  kitPaths(target);
  process.exit(done.code);
} else if (cmd === "note") {
  const [version, state] = words;
  if (!version || !["written", "queued", "accepted"].includes(state)) usage();
  record((drop) => {
    const note = drop.notes.find((n) => n.version === version) ?? fail(`The drop does not cover a ${version} note.`);
    note.state = state;
    if (flag("--revision")) note.revision = flag("--revision");
    note.on = flag("--on") ?? today();
  }, `The ${version} note is ${state}.`);
} else if (cmd === "served") {
  const [store] = words;
  if (!["android", "ios"].includes(store)) usage();
  record((drop) => void (drop.builds[store].served = flag("--on") ?? today()), `${store} is serving the build since ${flag("--on") ?? today()}.`);
} else if (cmd === "sent") {
  const [id] = words;
  if (!id) usage();
  const sent = { on: flag("--on") ?? today(), by: flag("--by") ?? "owner" };
  if (flag("--words")) sent.words = flag("--words");
  if (flag("--link")) sent.link = flag("--link");
  // Sent before a store had the build, on the owner's word: what that means for the reader.
  if (flag("--early")) sent.early = flag("--early");
  record((drop) => void (pieceOf(drop, id).sent = sent), `${id} went out on ${sent.on}, sent by ${sent.by}.`);
} else if (cmd === "waits") {
  const [id, what] = words;
  if (!id || (!what && !has("--clear"))) usage();
  record((drop) => {
    const piece = pieceOf(drop, id);
    if (has("--clear")) delete piece.waits;
    else piece.waits = what;
  }, has("--clear") ? `${id} waits on nothing now.` : `${id} waits on: ${what}`);
} else usage();
