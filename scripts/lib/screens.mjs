// One page of every route the export carries.
//
// A walk that says "every screen" has to mean it. The app's routes are the
// page files under app/ (groups and private folders left out); the export
// holds one folder for every address it was built with. This pairs them: for
// each route, the first exported address that fits it, so a route with ten
// thousand pages (a chapter, a saint) is walked once and a route the export
// leaves out (the admin, a seller's pages) is not walked at all.
//
// scripts/room-walk.mjs and scripts/last-words-walk.mjs walk this list.
// (scripts/stripe-walk.mjs keeps its own copy of the same reading.)

import fs from "node:fs";
import path from "node:path";

/** Every page in app/ as its route, groups and private folders left out. */
function patterns(dir = "app", parts = []) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "api" || name.startsWith("_") || name.startsWith("@") || name === "__tests__") continue;
      out.push(...patterns(full, /^\(.*\)$/.test(name) ? parts : [...parts, name]));
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
      out.push(parts);
    }
  }
  return out;
}

/** The export's pages, as the app's addresses. */
function exported(dir, rel = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isDirectory() || name === "_next") continue;
    const at = `${rel}/${name}`;
    if (fs.existsSync(path.join(full, "index.txt"))) out.push(at);
    out.push(...exported(full, at));
  }
  return out;
}

/**
 * @param out  the export's folder (npm run build:android, or build:ios)
 * @returns    one address for every route the export carries, sorted, each ending in a slash
 */
export function screens(out) {
  const pages = ["/", ...exported(out).sort()];
  const chosen = [];
  for (const parts of patterns()) {
    const re = new RegExp(
      `^${parts.map((p) => `/${/^\[\[?\.\.\./.test(p) ? ".+" : /^\[.*\]$/.test(p) ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("")}$`,
    );
    const found = parts.length === 0 ? "/" : pages.find((p) => re.test(p));
    if (found && !chosen.includes(found)) chosen.push(found);
  }
  return chosen.sort().map((p) => (p === "/" ? p : `${p}/`));
}
