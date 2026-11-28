#!/usr/bin/env node
// Does the website still serve the apps in readers' hands?
//
// His word, 2026-11-28: "keep the website public on v2.0 and drop mobile in announcement
// update batches. (so silently drop v2.0 updates)", then "but always ensure the public silent
// v2.0 on the website doesnt interfere with the mobiles live version (chants not loading etc
// or whatever else that might be a interferencer)". The website now runs ahead of the store
// builds, and the store builds fetch from it: the media they stream (chants, the read-aloud
// timings, covers, the history's pictures, the shop's, the Bibles), the /api/ routes they
// call, its CORS list and the update prompt's numbers. This compares the commit each store
// build was cut from (data/release/live-apps.json) with the code about to be the website:
//
//   1. every file a build streams from the website (its own STREAMED_ROOTS) is there, byte
//      for byte;
//   2. every /api/ address a build's code asks for has a route;
//   3. its plumbing holds: every origin its CORS list allowed still allowed, the update
//      prompt never above a build a store serves, every app its app-links file named still
//      named;
//   4. the routes a build calls that changed, and the server code behind them that changed,
//      are listed to read: a change in what a route answers is what a file check cannot see.
//
// 1 to 3 refuse (exit 1); 4 is for reading. The push guard runs it on every push to main.
//
//   node scripts/apps-compat.mjs [--web <ref>]      the code about to be the website (HEAD)

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The repository read: this one, or the one a test hands check(). */
let CWD = ROOT;
const git = (args) => execFileSync("git", args, { cwd: CWD, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const shown = new Map();
const show = (ref, file) => {
  const key = `${ref}:${file}`;
  if (!shown.has(key)) {
    try {
      shown.set(key, git(["show", key]));
    } catch {
      shown.set(key, null);
    }
  }
  return shown.get(key);
};

/** Path to blob of every file under the given folders at a ref. */
function blobs(ref, dirs) {
  if (!dirs.length) return new Map();
  const out = new Map();
  for (const line of git(["ls-tree", "-r", ref, "--", ...dirs]).split("\n")) {
    const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

/** The roots a build streams from the website, from its own lib/media/streamed.ts. */
export function streamedRoots(source) {
  const list = /STREAMED_ROOTS\s*=\s*\[([^\]]*)\]/.exec(source ?? "");
  return list ? [...list[1].matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]) : [];
}

/** Every /api/ address a build's code names, with a variable part as ":p". */
export function askedApis(ref) {
  let text = "";
  try {
    text = git(["grep", "-hoP", "[\"'`]/api/[A-Za-z0-9_/.\\-]+(\\$\\{[^}]*\\}[A-Za-z0-9_/.\\-]*)*", ref, "--", "components", "lib", "app", ":!app/api", ":!**/__tests__/**"]);
  } catch {
    return [];
  }
  const asked = new Set();
  for (const raw of text.split("\n")) {
    const a = raw.replace(/^["'`]/, "").replace(/\$\{[^}]*\}/g, ":p").replace(/\/+$/, "");
    if (a && a !== "/api/..." && a !== "/api") asked.add(a);
  }
  return [...asked].sort();
}

/** The routes a website serves: /api/... for each app/api/.../route.ts, dynamic segments kept. */
export function routesAt(ref) {
  return git(["ls-tree", "-r", "--name-only", ref, "--", "app/api"])
    .split("\n")
    .filter((f) => /\/route\.(ts|js)$/.test(f))
    .map((f) => f.replace(/^app/, "").replace(/\/route\.(ts|js)$/, "").replace(/\/\([^/)]+\)/g, ""));
}

const routePattern = (route) => new RegExp(`^${route.replace(/[.*+?^${}()|\\]/g, "\\$&").replace(/\\\[[^\]]+\\\]|\[[^\]]+\]/g, "[^/]+")}$`);

/** The route that answers an address, or null. An address that ends where a variable joins it is answered by any route under it. */
export function routeFor(asked, routes) {
  const plain = asked.split("?")[0];
  const filled = plain.replace(/:p/g, "x");
  const exact = routes.find((r) => routePattern(r).test(filled));
  if (exact) return exact;
  // A stem the code builds addresses on ("/api/admin" + "/" + name, or a variable joined
  // to it) is answered when routes stand under it.
  const base = (plain.includes(":p") ? plain.slice(0, plain.indexOf(":p")) : plain).replace(/\/+$/, "");
  return routes.find((r) => r === base || r.startsWith(`${base}/`)) ?? null;
}

/** The origins a CORS file allows: every quoted origin in it. */
export function corsOrigins(source) {
  return [...(source ?? "").matchAll(/["'`]((?:https?|capacitor|ionic):\/\/[^"'`\s]+)["'`]/g)].map((m) => m[1]);
}

/** The update prompt's numbers, from lib/appUpdate/release.ts. */
export function promptNumbers(source) {
  const n = (key) => Number(new RegExp(`^\\s+${key}:\\s*(\\d+)`, "m").exec(source ?? "")?.[1] ?? NaN);
  return { android: n("androidVersionCode"), ios: n("iosBuildNumber") };
}

/** The apps an app-links file names: namespace and package. */
export function linkedApps(source) {
  try {
    const list = JSON.parse(source ?? "[]");
    return (Array.isArray(list) ? list : []).map((s) => `${s?.target?.namespace}:${s?.target?.package_name}`);
  } catch {
    return [];
  }
}

/** The files a route reaches through its imports, inside the repository, at a ref. */
function reached(ref, start, files) {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = show(ref, file);
    if (!text || !/\.(ts|tsx|js|mjs)$/.test(file)) continue;
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)) {
      const spec = m[1];
      let base = null;
      if (spec.startsWith("@/")) base = spec.slice(2);
      else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
      if (!base) continue;
      const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.tsx`].find((c) => files.has(c));
      if (hit && !seen.has(hit)) queue.push(hit);
    }
  }
  return seen;
}

export function check({ web = "HEAD", builds, cwd = ROOT }) {
  CWD = cwd;
  shown.clear();
  const lines = [];
  const problems = [];
  const webFiles = new Set(git(["ls-tree", "-r", "--name-only", web]).split("\n").filter(Boolean));
  const routes = routesAt(web);
  for (const build of builds) {
    const at = build.commit;
    const name = `${build.version} (Android ${build.android}, iOS ${build.ios})`;
    lines.push(`The store builds ${name}, cut from ${at.slice(0, 8)}:`);

    // 1. What it streams from the website.
    const roots = streamedRoots(show(at, "lib/media/streamed.ts"));
    const dirs = roots.map((r) => `public${r.replace(/\/$/, "")}`);
    const theirs = blobs(at, dirs);
    const ours = blobs(web, dirs);
    const gone = [...theirs.keys()].filter((f) => !ours.has(f));
    const changed = [...theirs.keys()].filter((f) => ours.has(f) && ours.get(f) !== theirs.get(f));
    lines.push(`  streamed files: ${theirs.size} under ${roots.join(" ")}; missing ${gone.length}, changed ${changed.length}`);
    for (const f of [...gone, ...changed].slice(0, 20)) problems.push(`${name}: ${gone.includes(f) ? "missing" : "changed"} ${f}`);

    // 2. What it asks the website for.
    const asked = askedApis(at);
    const unanswered = asked.filter((a) => !routeFor(a, routes));
    lines.push(`  /api/ addresses its code asks for: ${asked.length}; without a route ${unanswered.length}`);
    for (const a of unanswered) problems.push(`${name}: no route answers ${a}`);

    // 3. Its plumbing.
    const allowed = corsOrigins(show(web, "lib/api/cors.ts"));
    const dropped = corsOrigins(show(at, "lib/api/cors.ts")).filter((o) => !allowed.includes(o));
    for (const o of dropped) problems.push(`${name}: the CORS list no longer allows ${o}`);
    const prompt = promptNumbers(show(web, "lib/appUpdate/release.ts"));
    if (!(prompt.android <= build.android)) problems.push(`${name}: the update prompt names Android build ${prompt.android}, above the ${build.android} the store serves`);
    if (!(prompt.ios <= build.ios)) problems.push(`${name}: the update prompt names iOS build ${prompt.ios}, above the ${build.ios} the store serves`);
    const named = linkedApps(show(web, "public/.well-known/assetlinks.json"));
    for (const app of linkedApps(show(at, "public/.well-known/assetlinks.json")).filter((a) => !named.includes(a))) problems.push(`${name}: the app links file no longer names ${app}`);
    lines.push(`  plumbing: CORS ${dropped.length ? "narrowed" : "as wide"}, update prompt Android ${prompt.android} / iOS ${prompt.ios}, app links ${named.length} named`);

    // 4. What changed behind the routes it calls: to read, not to refuse. The words
    // (lib/i18n/messages) are left out: they change what a line says, never a route's shape.
    const changedSince = new Set(git(["diff", "--name-only", at, web]).split("\n").filter(Boolean));
    const called = [...new Set(asked.map((a) => routeFor(a, routes)).filter(Boolean))];
    const ownChanged = [];
    const behind = new Set();
    for (const route of called) {
      const file = ["ts", "js"].map((x) => `app${route}/route.${x}`).find((f) => webFiles.has(f));
      if (!file) continue;
      if (changedSince.has(file)) ownChanged.push(route);
      for (const f of reached(web, file, webFiles)) if (f !== file && changedSince.has(f) && !f.startsWith("lib/i18n/messages/")) behind.add(f);
    }
    lines.push(`  to read: ${ownChanged.length} of the ${called.length} routes it calls changed${ownChanged.length ? `: ${ownChanged.join(", ")}` : ""}`);
    lines.push(`  to read: ${behind.size} changed files of the server code behind them${behind.size ? `: ${[...behind].sort().join(", ")}` : ""}`);
  }
  return { lines, problems };
}

/** A store build's commit, fetched when this clone does not have it (a shallow one). */
function haveCommit(sha) {
  const has = () => {
    try {
      git(["cat-file", "-e", `${sha}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  };
  if (has()) return true;
  try {
    git(["fetch", "--quiet", "origin", sha]);
  } catch {
    /* told below */
  }
  return has();
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--web");
  const web = at >= 0 ? args[at + 1] : "HEAD";
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, "data/release/live-apps.json"), "utf8"));
  const absent = record.builds.filter((b) => !haveCommit(b.commit));
  if (absent.length) {
    // A guard that cannot check lets nothing through.
    console.log(`apps-compat: refused. This clone cannot read the commit of ${absent.map((b) => `${b.version} (${b.commit.slice(0, 8)})`).join(", ")}: git fetch origin ${absent[0].commit}`);
    return 1;
  }
  const { lines, problems } = check({ web, builds: record.builds });
  for (const line of lines) console.log(line);
  if (problems.length) {
    console.log(`\napps-compat: refused. The website at ${web} would fail the apps in readers' hands:`);
    for (const p of problems) console.log(`  - ${p}`);
    return 1;
  }
  console.log(`\napps-compat: the website at ${web} still serves every store build named in data/release/live-apps.json.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
