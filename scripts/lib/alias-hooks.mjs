// Teach plain Node the "@/" alias, so build scripts can import app modules.
//
// ── Why this exists ─────────────────────────────────────────────────────
//
// scripts/emit-registries.mjs gets away with `import("../lib/saints/saints.ts")`
// because that module happens to use no path aliases. Most of lib/ does:
// lib/calendar/orthodox.ts opens with four "@/" imports, so a script that
// needs the liturgical calendar cannot simply reach for it.
//
// The two alternatives were worse. Rewriting orthodox.ts to relative imports
// edits a core file to suit a build script and leaves a diff no reviewer can
// explain. Duplicating the calendar into the script is how the paschalion ends
// up with two implementations that drift.
//
// So the alias is resolved here, once, for any script that opts in with
//   node --experimental-strip-types --import ./scripts/lib/register-alias.mjs
//
// ── Extension guessing, deliberately narrow ─────────────────────────────
//
// TypeScript imports are extensionless ("@/lib/calendar/orthodox") but Node
// resolves exact paths, so the candidates are tried in the same order the
// TypeScript resolver would: the exact path, then .ts/.tsx, then an index.
// JSON is imported with its extension already and hits the exact-path case.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CANDIDATES = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  // Next supplies `server-only` while it builds and it is no package of ours,
  // so a script that reaches server code (the widget data reads the Verse of
  // the Day, lib/today/verseOfDay.ts) is handed an empty module for it, the
  // same stand-in vitest.config.ts gives the tests.
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  // An app module's own neighbours, written as TypeScript writes them, with
  // no extension ("./events" from lib/history/load.ts): the same candidates,
  // beside the module that asks. Only for a file of this repository that is
  // no package's, and only when the path as written is not a file already.
  const relative = /^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/");
  if (!specifier.startsWith("@/") && !relative) return nextResolve(specifier, context);

  const base = relative ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier) : path.join(ROOT, specifier.slice(2));
  if (relative && !base.startsWith(ROOT + path.sep)) return nextResolve(specifier, context);
  for (const ext of CANDIDATES) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      // Node ESM requires `with { type: "json" }` on a JSON import; bundlers
      // and the TypeScript compiler add it implicitly, so app source does not
      // carry it and orthodox.ts imports three calendar tables without it.
      // Supplying the attribute here keeps the app source untouched.
      const resolved = await nextResolve(pathToFileURL(candidate).href, context);
      return candidate.endsWith(".json")
        ? { ...resolved, importAttributes: { type: "json" } }
        : resolved;
    }
  }
  throw new Error(
    `Cannot resolve "${specifier}" under ${ROOT}. Tried: ` +
      CANDIDATES.map((e) => path.relative(ROOT, base + e)).join(", "),
  );
}
