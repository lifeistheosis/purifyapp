// One-off: strip em dashes (-) from authored source + bible data.
// Replaces " - " with " - " and bare "-" with "-".

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ROOTS = ["app", "components", "lib", "scripts", "data", "AGENTS.md", "README.md"];
const EXTS = new Set([".ts", ".tsx", ".md", ".mjs", ".json", ".js"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

async function walk(p, out) {
  const st = await fs.stat(p);
  if (st.isDirectory()) {
    if (SKIP_DIRS.has(path.basename(p))) return;
    for (const child of await fs.readdir(p)) {
      await walk(path.join(p, child), out);
    }
  } else if (EXTS.has(path.extname(p))) {
    out.push(p);
  }
}

async function main() {
  const files = [];
  for (const r of ROOTS) {
    const abs = path.join(ROOT, r);
    try {
      await walk(abs, files);
    } catch {}
  }
  let changed = 0;
  let totalReplaced = 0;
  for (const f of files) {
    const raw = await fs.readFile(f, "utf8");
    if (!raw.includes("-")) continue;
    // Preserve spacing where possible.
    const next = raw
      .replace(/ - /g, " - ")
      .replace(/-/g, "-");
    if (next !== raw) {
      const before = (raw.match(/-/g) || []).length;
      await fs.writeFile(f, next);
      changed++;
      totalReplaced += before;
    }
  }
  console.log(`Stripped ${totalReplaced} em dashes from ${changed} files.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
