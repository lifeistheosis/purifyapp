#!/usr/bin/env node
// The pre-push guard (2026-11-12, at his word: "can we set up both now?").
//
// On 2026-11-11 a chat on his PC pushed the EIKON gift without running the
// gates. The stylesheet lost a closing brace, and every build of the website
// and the apps failed for hours. Two unit tests read the stylesheet now
// (lib/ui/__tests__/stylesheetCloses.test.ts and stylesheetParses.test.ts);
// this makes sure they and the other gates run before anything leaves a clone.
//
// git runs it from .githooks/pre-push, which every Claude session on this
// repository turns on at its start (.claude/settings.json). It reads what git
// is about to push and decides:
//
// 1. A push to main is refused. Main is the website, and a push to it deploys
//    purifyapp.net. Only his word allows it, as PURIFY_ALLOW_MAIN=1 on that one
//    command; the checks below still run.
// 2. A push that changes only docs (anything under docs/ or .claude/, and a
//    Markdown file at the root) goes at once. A docs file that code imports is
//    code here: the admin panel imports docs/plans/*/drop.json and the cards
//    beside them, and a broken one breaks the website's build. The JSON files
//    of a docs push must parse.
// 3. Anything else runs the checks, stopping at the first failure: the two
//    stylesheet tests, npm run typecheck, eslint on the changed files, and the
//    unit tests that import them (vitest related). The checks read the working
//    tree, so the tree has to be exactly the commit being pushed.
// 4. PURIFY_SKIP_GUARD=1 skips the checks with a loud warning: an emergency,
//    at the arbiter's word only. It never lifts the refusal of main.
//
// docs/OPERATIONS.md, section 5, says the same for people. Everything that
// decides is a pure function, and lib/build/__tests__/pushGuard.test.ts
// imports this file as it is; git and the checks run only from main() below.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAIN_REF = "refs/heads/main";

/** First, because they are quick and they guard the fault that started this. */
export const STYLESHEET_TESTS = ["lib/ui/__tests__/stylesheetCloses.test.ts", "lib/ui/__tests__/stylesheetParses.test.ts"];

/** The packages the checks run, each proved installed by its package.json. */
export const TOOLS = ["typescript", "eslint", "vitest", "next"];

/** What eslint reads: .js, .mjs, .cjs, .ts, .mts, .cts, .jsx, .tsx. */
const LINTED = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
/** What vitest related can trace through imports: the same, and JSON. */
const TRACED = /\.(?:[cm]?[jt]s|[jt]sx|json)$/i;

/** Where code can import a docs file from: every script and source file outside docs/ and .claude/. */
const CODE_FILES = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs", "*.mts", "*.cts", ":(exclude)docs/**", ":(exclude).claude/**"];
/** An import specifier that reaches into docs/: "@/docs/..." or "../docs/...". */
const DOCS_SPECIFIER = String.raw`["'](@/docs/[^"']+|(\.\./)+docs/[^"']+)["']`;

/**
 * Variables git sets for a hook so that its own commands find this
 * repository. A check must not inherit them: a test that makes a repository of
 * its own would otherwise write into this one.
 */
const GIT_LOCATORS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_PREFIX", "GIT_QUARANTINE_PATH", "GIT_NAMESPACE"];

const BAR = "!".repeat(72);

/** The loud warning a skipped guard prints. */
export const SKIP_WARNING = [
  BAR,
  "!! PUSH GUARD SKIPPED (PURIFY_SKIP_GUARD=1). NOTHING WAS CHECKED.",
  "!! This is for an emergency, and only at the arbiter's word.",
  "!! Say so in your report, and run the checks once it is over:",
  "!! npm run typecheck, npm run test:unit and npm run lint.",
  BAR,
];

/**
 * @typedef {{ localRef: string, localSha: string, remoteRef: string, remoteSha: string }} RefUpdate
 *   One line of what git hands a pre-push hook.
 * @typedef {{ remoteRef: string, localSha: string, files: string[] }} Push
 *   One ref's push: the commit it sends and the files it changes on the remote.
 * @typedef {{ kind: "refuse", step: string, lines: string[] }} Refuse
 * @typedef {{ kind: "allow", lines: string[], json: Array<{ sha: string, file: string }> }} Allow
 *   json: the JSON files a docs push changes. Each one its commit still has must parse.
 * @typedef {{ kind: "check", lines: string[], files: string[], lint: string[], related: string[] }} Check
 */

/** A sha of zeros: git's way of saying that a ref is new on the remote, or is being deleted. */
export function isZero(/** @type {string | null | undefined} */ sha) {
  return /^0+$/.test(String(sha ?? ""));
}

/**
 * The lines git writes to a pre-push hook, one per ref:
 * "<local ref> <local sha> <remote ref> <remote sha>". A line it cannot read
 * throws, and the push is refused: a guard that guesses is no guard.
 * @param {string | null | undefined} text
 * @returns {RefUpdate[]}
 */
export function parseUpdates(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length !== 4 || !/^[0-9a-f]+$/i.test(parts[1]) || !/^[0-9a-f]+$/i.test(parts[3])) {
        throw new Error(`cannot read this line from git: "${line}"`);
      }
      const [localRef, localSha, remoteRef, remoteSha] = parts;
      return { localRef, localSha, remoteRef, remoteSha };
    });
}

/**
 * Whether a file is docs by where it stands: under docs/ or .claude/, or a
 * Markdown file at the root (CLAUDE.md, AGENTS.md, README.md). Whether code
 * imports it is asked apart, by importedDocs.
 * @param {string} file a path from the root of the repository
 */
export function isDocs(file) {
  const f = String(file).replace(/\\/g, "/");
  return f.startsWith("docs/") || f.startsWith(".claude/") || /^[^/]+\.md$/i.test(f);
}

/**
 * Which docs files code imports, from the specifiers found in code: an
 * "@/docs/..." from anywhere, a "../docs/..." from the file that holds it. A
 * specifier built from a template ("v${release}/cards/${file}") matches
 * whatever stands in each "${...}".
 * @param {Array<{ file: string, spec: string }>} found
 * @returns {(file: string) => boolean}
 */
export function importedDocs(found) {
  const exact = new Set();
  /** @type {RegExp[]} */
  const patterns = [];
  for (const { file, spec } of found) {
    const bare = String(spec).replace(/^["']|["']$/g, "").replace(/[?#].*$/, "");
    const target = bare.startsWith("@/") ? bare.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(String(file).replace(/\\/g, "/")), bare));
    if (!target.startsWith("docs/")) continue;
    if (!target.includes("${")) {
      exact.add(target);
      continue;
    }
    const source = target
      .split(/\$\{[^}]*\}/)
      .map((piece) => piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^/]*");
    patterns.push(new RegExp(`^${source}$`));
  }
  return (file) => exact.has(file) || patterns.some((p) => p.test(file));
}

/** The refusal of main. True when one of the refs is main and his word is not on the command. */
export function refusesMain(/** @type {Array<{ remoteRef: string }>} */ refs, /** @type {Record<string, string | undefined>} */ env) {
  return refs.some((r) => r.remoteRef === MAIN_REF) && env.PURIFY_ALLOW_MAIN !== "1";
}

const plural = (/** @type {number} */ n, /** @type {string} */ word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const listed = (/** @type {string[]} */ files) => [...files.slice(0, 12).map((f) => `  ${f}`), ...(files.length > 12 ? [`  and ${files.length - 12} more`] : [])];

/**
 * What to do with a push, from facts gathered beforehand. Pure: main() gathers
 * the facts from git and the working tree, and runs what this asks for.
 * @param {object} facts
 * @param {Push[]} facts.pushes one per ref git is about to push
 * @param {Record<string, string | undefined>} facts.env
 * @param {(file: string) => boolean} [facts.imported] true for a docs file that code imports
 * @param {boolean} [facts.installed] node_modules holds what the checks run (TOOLS)
 * @param {string} [facts.head] the commit checked out
 * @param {string[]} [facts.dirty] the paths where the working tree is not that commit
 * @param {(file: string) => boolean} [facts.exists] the file stands in the working tree
 * @returns {Refuse | Allow | Check}
 */
export function decide({ pushes, env, imported = () => false, installed = true, head = "", dirty = [], exists = () => true }) {
  if (refusesMain(pushes, env)) {
    return {
      kind: "refuse",
      step: "main",
      lines: [
        "push guard: refused. This push changes main.",
        "Main is the website: a push to it deploys purifyapp.net, and only his word allows it.",
        "With his word, and for that one command only: PURIFY_ALLOW_MAIN=1 git push ...",
      ],
    };
  }
  /** @type {string[]} */
  const said = pushes.some((p) => p.remoteRef === MAIN_REF) ? ["push guard: main is allowed for this command (PURIFY_ALLOW_MAIN=1, his word)."] : [];
  if (env.PURIFY_SKIP_GUARD === "1") return { kind: "allow", lines: [...said, ...SKIP_WARNING], json: [] };

  const files = [...new Set(pushes.flatMap((p) => p.files))].sort();
  if (!files.length) {
    return { kind: "allow", lines: [...said, "push guard: nothing new to check. Every commit in this push is already on the remote."], json: [] };
  }
  const isCode = (/** @type {string} */ f) => !isDocs(f) || imported(f);
  const code = files.filter(isCode);
  if (!code.length) {
    const json = pushes.flatMap((p) => p.files.filter((f) => /\.json$/i.test(f)).map((file) => ({ sha: p.localSha, file })));
    return { kind: "allow", lines: [...said, `push guard: docs only (${plural(files.length, "file")}), so no checks.`], json };
  }

  if (!installed) {
    return {
      kind: "refuse",
      step: "node_modules",
      lines: ["push guard: refused. node_modules is missing or incomplete, so the checks cannot run.", "Run npm ci, then push."],
    };
  }
  const away = pushes.filter((p) => p.files.length && p.localSha !== head);
  if (away.length) {
    return {
      kind: "refuse",
      step: "checkout",
      lines: [
        `push guard: refused. The checks read the working tree, which is at ${head.slice(0, 9) || "no commit"}, but this push sends:`,
        ...away.map((p) => `  ${p.localSha.slice(0, 9)} to ${p.remoteRef}`),
        "Check out what you push, then push it.",
      ],
    };
  }
  const changed = [...new Set(dirty)].filter(isCode).sort();
  if (changed.length) {
    return {
      kind: "refuse",
      step: "working tree",
      lines: [
        "push guard: refused. The checks read the working tree, and it differs from the commit being pushed here:",
        ...listed(changed),
        "Commit them, or put them aside with git stash -u (and git stash pop after the push), then push.",
      ],
    };
  }
  const standing = code.filter(exists);
  return {
    kind: "check",
    lines: [...said, `push guard: ${plural(files.length, "file")} changed, ${code.length} of them code. Running the checks (a few minutes):`],
    files,
    lint: standing.filter((f) => LINTED.test(f)),
    related: standing.filter((f) => TRACED.test(f)),
  };
}

/**
 * The last lines of a check's output, enough to see why it failed.
 * @param {string} text
 * @param {number} [count]
 */
export function tail(text, count = 120) {
  const lines = String(text).replace(/\s+$/, "").split(/\r?\n/);
  return lines.length > count ? [`(the first ${lines.length - count} lines are cut)`, ...lines.slice(-count)] : lines;
}

// ---------------------------------------------------------------------------
// git and the working tree. Nothing above this line runs a command.

/**
 * @param {string[]} args
 * @param {string} cwd
 */
function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}

/**
 * @param {string[]} args
 * @param {string} cwd
 */
function gitOut(args, cwd) {
  const r = git(args, cwd);
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${String(r.stderr).trim()}`);
  return String(r.stdout);
}

const byNul = (/** @type {string} */ text) => text.split("\0").filter(Boolean);

/**
 * The files one ref's push changes on the remote. Against the remote's tip
 * when git names one that is here; for a ref that is new on the remote,
 * against where the new commits join what the remote already has (its
 * remote-tracking refs). A delete changes no file.
 * @param {RefUpdate} update
 * @param {{ cwd: string, remote: string }} where
 * @returns {string[]}
 */
export function pushedFiles(update, { cwd, remote }) {
  if (isZero(update.localSha)) return [];
  const local = update.localSha;
  const diff = (/** @type {string} */ base) => byNul(gitOut(["diff", "--name-only", "-z", "--no-renames", base, local], cwd));
  if (!isZero(update.remoteSha) && git(["cat-file", "-e", `${update.remoteSha}^{commit}`], cwd).status === 0) {
    return diff(update.remoteSha).sort();
  }
  const tracked = gitOut(["for-each-ref", "--count=1", "--format=%(refname)", `refs/remotes/${remote}/`], cwd).trim();
  const known = tracked ? `--remotes=${remote}` : "--remotes";
  const lines = gitOut(["rev-list", "--boundary", local, "--not", known], cwd).split("\n").filter(Boolean);
  if (!lines.length) return [];
  const bases = lines.filter((l) => l.startsWith("-")).map((l) => l.slice(1));
  if (!bases.length) return byNul(gitOut(["ls-tree", "-r", "--name-only", "-z", local], cwd)).sort();
  return [...new Set(bases.flatMap(diff))].sort();
}

/**
 * The import specifiers that reach into docs/, as the commit has them.
 * @param {string} sha
 * @param {string} cwd
 * @returns {Array<{ file: string, spec: string }>}
 */
export function docsSpecifiers(sha, cwd) {
  const r = git(["grep", "-z", "-o", "-I", "-E", DOCS_SPECIFIER, sha, "--", ...CODE_FILES], cwd);
  if (r.status === 1) return [];
  if (r.status !== 0) throw new Error(`git grep failed: ${String(r.stderr).trim()}`);
  return String(r.stdout)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [where, spec = ""] = line.split("\0");
      return { file: where.slice(where.indexOf(":") + 1), spec };
    });
}

/**
 * The paths where the working tree is not the commit checked out: changed,
 * staged, deleted or untracked (ignored files are not counted).
 * @param {string} cwd
 */
function dirtyPaths(cwd) {
  const entries = byNul(gitOut(["status", "--porcelain=v1", "-z", "--untracked-files=normal"], cwd));
  /** @type {string[]} */
  const paths = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    paths.push(entry.slice(3));
    // A rename or a copy is followed by the path it came from.
    if (/[RC]/.test(entry.slice(0, 2))) paths.push(entries[(i += 1)] ?? "");
  }
  return paths.filter(Boolean);
}

/**
 * Next writes next-env.d.ts and .next/types, and a fresh clone has neither:
 * without them typecheck fails on every image import. The file is ignored by
 * git, and making it takes a second.
 * @param {string} root
 */
function nextTypesMissing(root) {
  const env = path.join(root, "next-env.d.ts");
  if (!existsSync(env)) return true;
  const text = readFileSync(env, "utf8");
  const wanted = [...text.matchAll(/^\s*import\s+["'](\.[^"']+)["']/gm), ...text.matchAll(/<reference\s+path=["']([^"']+)["']/g)].map((m) => m[1]);
  return wanted.some((rel) => !existsSync(path.join(root, rel)));
}

/**
 * The script of a package's command, run with this node so that nothing
 * depends on a shell (Windows included).
 * @param {string} root
 * @param {string} pkg
 * @param {string} name
 */
function binOf(root, pkg, name) {
  const json = JSON.parse(readFileSync(path.join(root, "node_modules", pkg, "package.json"), "utf8"));
  const rel = typeof json.bin === "string" ? json.bin : json.bin?.[name];
  return path.join(root, "node_modules", pkg, rel);
}

const seconds = (/** @type {number} */ ms) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`);

/**
 * Splits a long list of files into runs that fit on one command line
 * (Windows allows about 32,000 characters).
 * @param {string[]} files
 */
function batches(files, limit = 8000) {
  /** @type {string[][]} */
  const out = [];
  let current = /** @type {string[]} */ ([]);
  let size = 0;
  for (const f of files) {
    if (current.length && size + f.length + 1 > limit) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(f);
    size += f.length + 1;
  }
  if (current.length) out.push(current);
  return out;
}

/** What to type to see a failure again; a very long one names the whole run instead. */
const again = (/** @type {string} */ command, /** @type {string} */ whole) => (command.length > 600 ? whole : command);

const say = (/** @type {string} */ line) => process.stderr.write(`${line}\n`);

/**
 * Runs one check with its output held back, and shows the end of it only when
 * the check fails.
 * @param {{ name: string, command: string, args: string[], shell?: boolean, reproduce: string, hint?: (output: string) => string | null }} step
 * @param {{ root: string, env: NodeJS.ProcessEnv }} where
 */
function run(step, { root, env }) {
  process.stderr.write(`  ${step.name} ... `);
  const started = Date.now();
  const r = spawnSync(step.command, step.args, { cwd: root, env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, shell: step.shell ?? false });
  const took = seconds(Date.now() - started);
  if (!r.error && r.status === 0) {
    say(`ok (${took})`);
    return true;
  }
  say(`FAILED (${took})`);
  const output = r.error ? String(r.error) : `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  for (const line of tail(output)) say(`    ${line}`);
  say(`push guard: refused at "${step.name}". To see it again: ${step.reproduce}`);
  const hint = step.hint?.(output);
  if (hint) say(hint);
  return false;
}

/**
 * The checks of an app push, in order, stopping at the first failure.
 * @param {Check} plan
 * @param {string} root
 */
export function runChecks(plan, root) {
  const env = { ...process.env };
  for (const name of GIT_LOCATORS) delete env[name];
  const where = { root, env };
  const node = process.execPath;
  const vitest = binOf(root, "vitest", "vitest");
  const win = process.platform === "win32";
  const started = Date.now();

  if (!run({ name: "stylesheet tests", command: node, args: [vitest, "run", ...STYLESHEET_TESTS], reproduce: `npx vitest run ${STYLESHEET_TESTS.join(" ")}` }, where)) return false;
  if (nextTypesMissing(root) && !run({ name: "next typegen (its types were missing)", command: node, args: [binOf(root, "next", "next"), "typegen"], reproduce: "npx next typegen" }, where)) return false;
  const typecheck = {
    name: "typecheck",
    command: win ? "npm run typecheck" : "npm",
    args: win ? [] : ["run", "typecheck"],
    shell: win,
    reproduce: "npm run typecheck",
    hint: (/** @type {string} */ out) => {
      const errors = out.split(/\r?\n/).filter((l) => /error TS\d+/.test(l));
      return errors.length && errors.every((l) => /^\.next[\\/]/.test(l))
        ? "Every error is in .next/, which Next generates and which goes stale: rm -rf .next && npx next typegen, then push."
        : null;
    },
  };
  if (!run(typecheck, where)) return false;

  const eslint = binOf(root, "eslint", "eslint");
  for (const group of batches(plan.lint)) {
    const shown = `npx eslint --no-warn-ignored ${group.join(" ")}`;
    if (!run({ name: `eslint (${plural(group.length, "file")})`, command: node, args: [eslint, "--no-warn-ignored", ...group], reproduce: again(shown, "npm run lint") }, where)) return false;
  }
  if (!plan.lint.length) say("  eslint ... no changed script or source file");

  for (const group of batches(plan.related)) {
    const shown = `npx vitest related --run --passWithNoTests ${group.join(" ")}`;
    if (!run({ name: `unit tests related to ${plural(group.length, "file")}`, command: node, args: [vitest, "related", "--run", "--passWithNoTests", ...group], reproduce: again(shown, "npm run test:unit") }, where)) return false;
  }
  if (!plan.related.length) say("  unit tests ... no changed file that a test can import");

  say(`push guard: every check passed (${seconds(Date.now() - started)}).`);
  return true;
}

/** git hands the refs on stdin; a person running this by hand gets told how. */
async function readStdin() {
  if (process.stdin.isTTY) return null;
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

/**
 * The hook. Returns the exit code: 0 lets the push go, anything else stops it.
 * @param {string[]} args what git passes: the remote's name, then its address
 */
export async function main(args) {
  const text = await readStdin();
  if (text === null) {
    say("This is git's pre-push hook (.githooks/pre-push). To try it by hand:");
    say("  printf '%s\\n' '<local ref> <local sha> <remote ref> <remote sha>' | node scripts/push-guard.mjs origin");
    return 2;
  }
  const remote = args[0] || "origin";
  const env = process.env;
  try {
    const updates = parseUpdates(text);
    if (!updates.length) return 0;
    // The refusal of main and the bypass need nothing from git, so they come first.
    if (refusesMain(updates, env) || env.PURIFY_SKIP_GUARD === "1") {
      const plan = decide({ pushes: updates.map((u) => ({ ...u, files: [] })), env });
      for (const line of plan.lines) say(line);
      return plan.kind === "refuse" ? 1 : 0;
    }
    const root = gitOut(["rev-parse", "--show-toplevel"], process.cwd()).trim();
    const pushes = updates.map((u) => {
      const files = pushedFiles(u, { cwd: root, remote });
      const peeled = isZero(u.localSha) ? u.localSha : gitOut(["rev-parse", "--verify", "--quiet", `${u.localSha}^{commit}`], root).trim();
      return { remoteRef: u.remoteRef, localSha: peeled, files };
    });
    const found = [...new Set(pushes.filter((p) => p.files.length).map((p) => p.localSha))].flatMap((sha) => docsSpecifiers(sha, root));
    const plan = decide({
      pushes,
      env,
      imported: importedDocs(found),
      installed: TOOLS.every((pkg) => existsSync(path.join(root, "node_modules", pkg, "package.json"))),
      head: gitOut(["rev-parse", "HEAD"], root).trim(),
      dirty: dirtyPaths(root),
      exists: (f) => existsSync(path.join(root, f)),
    });
    for (const line of plan.lines) say(line);
    if (plan.kind === "refuse") return 1;
    if (plan.kind === "allow") {
      for (const { sha, file } of plan.json) {
        if (git(["cat-file", "-e", `${sha}:${file}`], root).status !== 0) continue; // deleted by this push
        try {
          JSON.parse(gitOut(["show", `${sha}:${file}`], root));
        } catch (error) {
          say(`push guard: refused. ${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
          return 1;
        }
      }
      return 0;
    }
    return runChecks(plan, root) ? 0 : 1;
  } catch (error) {
    say(`push guard: refused, because it could not finish: ${error instanceof Error ? error.message : String(error)}`);
    say("A guard that cannot check lets nothing through. If this is the guard's own fault, tell the arbiter.");
    return 1;
  }
}

/** True when node was started on this file (not when a test imports it). */
function startedHere() {
  if (process.argv.includes("--hook")) return true;
  if (!process.argv[1]) return false;
  try {
    const a = realpathSync.native(process.argv[1]);
    const b = realpathSync.native(fileURLToPath(import.meta.url));
    return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch {
    return false;
  }
}

// exitCode, not exit(): on Windows and macOS a write to a pipe or a terminal
// can still be on its way, and exit() would cut the refusal short.
if (startedHere()) {
  main(process.argv.slice(2).filter((a) => a !== "--hook")).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      say(`push guard: refused, because it failed: ${error instanceof Error ? error.stack : String(error)}`);
      process.exitCode = 1;
    },
  );
}
