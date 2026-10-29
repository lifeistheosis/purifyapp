// The website's build: `next build`, with room for its TypeScript step.
//
// On 2026-10-29, after 1.8's second round of screens, `next build` compiled
// and then died in its own "Running TypeScript" step: "JavaScript heap out of
// memory" at about 2 GB, the heap Node gives itself on an 8 GB machine. The
// same build passed with the heap at 4 GB. Render's builder has 8 GB too
// (1.3 once ran out of all of it, which is why next.config.ts holds the
// workers to two), so the website's deploy would have died the same way.
//
// NODE_OPTIONS, not a flag on this process: the step can run in a child
// process, and only the environment reaches every child. A heap size the
// caller already set is kept.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HEAP_MB = 4096;

const inherited = process.env.NODE_OPTIONS ?? "";
const NODE_OPTIONS = /--max-old-space-size=/.test(inherited) ? inherited : `${inherited} --max-old-space-size=${HEAP_MB}`.trim();

const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS },
});
process.exit(result.status ?? 1);
