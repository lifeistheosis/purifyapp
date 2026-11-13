// The page file an address is drawn by: app/**/page.tsx, read as Next reads the folder (a route
// group "(name)" adds nothing to the address, "[name]" is one segment, "[...name]" one or more and
// "[[...name]]" none or more). A page the gate's walks report on is named by this file, so the
// arbiter can route a finding about a page switch to the page it lands on.

import fs from "node:fs";
import path from "node:path";

let routes = null;

/** Every page in app/, as its segments and its file, the most particular first (static before dynamic). */
function allRoutes(root) {
  const out = [];
  const walk = (dir, segs) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name.startsWith("_") || name.startsWith("@") || name === "api") continue;
        walk(full, /^\(.*\)$/.test(name) ? segs : [...segs, name]);
      } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) out.push({ segs, file: path.relative(root, full) });
    }
  };
  walk(path.join(root, "app"), []);
  const weight = (s) => (s.startsWith("[[...") ? 3 : s.startsWith("[...") ? 2 : s.startsWith("[") ? 1 : 0);
  return out.sort((a, b) => a.segs.reduce((n, s) => n + weight(s), 0) - b.segs.reduce((n, s) => n + weight(s), 0) || b.segs.length - a.segs.length);
}

/** The page file that draws `pathname`, or null. */
export function pageFileOf(pathname, root = process.cwd()) {
  routes ??= allRoutes(root);
  const parts = pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  for (const r of routes) {
    let i = 0;
    let ok = true;
    for (let k = 0; k < r.segs.length && ok; k++) {
      const s = r.segs[k];
      if (s.startsWith("[[...")) i = parts.length;
      else if (s.startsWith("[...")) {
        if (i >= parts.length) ok = false;
        else i = parts.length;
      } else if (s.startsWith("[")) {
        if (i >= parts.length) ok = false;
        else i++;
      } else if (parts[i] === s) i++;
      else ok = false;
    }
    if (ok && i === parts.length) return r.file;
  }
  return null;
}
