// The pre-push guard (2026-11-12, at his word: "can we set up both now?").
//
// On 2026-11-11 a chat pushed the EIKON gift without running the gates. The
// stylesheet lost a closing brace, and every build of the website and the apps
// failed for hours. scripts/push-guard.mjs now runs on every push from a clone
// whose git uses .githooks, which .claude/settings.json turns on at the start
// of each Claude session. This holds what it decides, the git it reads, and
// the wiring that makes it run.
//
// What would go wrong if this broke: a push to main deploys the website
// without his word, or a broken commit reaches the branch unchecked.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  decide,
  docsSpecifiers,
  importedDocs,
  isDocs,
  isZero,
  MAIN_REF,
  parseUpdates,
  pushedFiles,
  SKIP_WARNING,
  STYLESHEET_TESTS,
  tail,
} from "@/scripts/push-guard.mjs";

const ROOT = path.resolve(__dirname, "../../..");
const GUARD = path.join(ROOT, "scripts/push-guard.mjs");
const BRANCH = "refs/heads/ccr-07896cf2-bo0afd";
const A = "a".repeat(40);
const B = "b".repeat(40);
const ZERO = "0".repeat(40);

const push = (files: string[], over: { remoteRef?: string; localSha?: string } = {}) => ({ remoteRef: BRANCH, localSha: A, files, ...over });

describe("what git hands the hook", () => {
  it("is read line by line, a delete included", () => {
    expect(parseUpdates(`refs/heads/x ${A} refs/heads/x ${B}\r\n(delete) ${ZERO} refs/heads/old ${B}\n\n`)).toEqual([
      { localRef: "refs/heads/x", localSha: A, remoteRef: "refs/heads/x", remoteSha: B },
      { localRef: "(delete)", localSha: ZERO, remoteRef: "refs/heads/old", remoteSha: B },
    ]);
    expect(parseUpdates("")).toEqual([]);
    expect(isZero(ZERO)).toBe(true);
    expect(isZero(A)).toBe(false);
  });

  it("refuses a line it cannot read, rather than guess", () => {
    expect(() => parseUpdates("nonsense")).toThrow(/cannot read/);
    expect(() => parseUpdates(`refs/heads/x ${A} refs/heads/x`)).toThrow(/cannot read/);
  });
});

describe("which files are docs", () => {
  it("is anything under docs/ or .claude/, and a Markdown file at the root", () => {
    for (const f of ["docs/NOW.md", "docs/plans/v1.9/store/01.png", ".claude/settings.json", "CLAUDE.md", "AGENTS.md", "readme.MD"]) expect(isDocs(f), f).toBe(true);
    for (const f of ["app/globals.css", "lib/notes.md", "docsite/a.md", "app/docs/a.md", "scripts/push-guard.mjs", ".githooks/pre-push", "package.json"]) {
      expect(isDocs(f), f).toBe(false);
    }
  });

  it("is not a docs file that code imports, a template's files included", () => {
    const imported = importedDocs([
      { file: "lib/drop/current.ts", spec: '"@/docs/plans/v1.9/drop.json"' },
      { file: "scripts/drop.mjs", spec: '"@/docs/plans/v${release}/cards/${file}"' },
      { file: "lib/a/b.ts", spec: "'../../docs/notes/data.json'" },
      { file: "lib/a/b.ts", spec: '"@/lib/other"' },
    ]);
    expect(imported("docs/plans/v1.9/drop.json")).toBe(true);
    expect(imported("docs/plans/v2.0/cards/01-cover.webp")).toBe(true);
    expect(imported("docs/notes/data.json")).toBe(true);
    expect(imported("docs/plans/v1.9/drop.md")).toBe(false);
    expect(imported("docs/plans/v2.0/cards/deeper/x.webp")).toBe(false);
    expect(imported("docs/NOW.md")).toBe(false);
  });

  it("finds the imports this repository has: the admin panel's drop files are code", () => {
    const imported = importedDocs(docsSpecifiers("HEAD", ROOT));
    expect(imported("docs/plans/v1.9/drop.json")).toBe(true);
    expect(imported("docs/plans/v1.5/cards/01-cover.webp")).toBe(true);
    expect(imported("docs/OPERATIONS.md")).toBe(false);
  });
});

describe("the decision", () => {
  it("refuses a push to main unless his word is on the command, docs, deletes and the bypass included", () => {
    const refusal = decide({ pushes: [push(["docs/NOW.md"], { remoteRef: MAIN_REF })], env: {} });
    expect(refusal).toMatchObject({ kind: "refuse", step: "main" });
    expect(refusal.lines.join("\n")).toMatch(/deploys purifyapp\.net/);
    expect(refusal.lines.join("\n")).toMatch(/PURIFY_ALLOW_MAIN=1/);
    // The step is asserted, not only the refusal: a push that passed the main
    // rule by mistake would still be refused here, by a later rule.
    for (const word of ["true", "yes", "0", ""]) {
      expect(decide({ pushes: [push(["lib/a.ts"], { remoteRef: MAIN_REF })], env: { PURIFY_ALLOW_MAIN: word }, head: A }), word).toMatchObject({ kind: "refuse", step: "main" });
    }
    expect(decide({ pushes: [push([], { remoteRef: MAIN_REF, localSha: ZERO })], env: {} })).toMatchObject({ kind: "refuse", step: "main" });
    const skipped = decide({ pushes: [push(["lib/a.ts"]), push(["lib/a.ts"], { remoteRef: MAIN_REF })], env: { PURIFY_SKIP_GUARD: "1" }, head: A });
    expect(skipped).toMatchObject({ kind: "refuse", step: "main" });
  });

  it("lets main through with PURIFY_ALLOW_MAIN=1, and still checks what goes", () => {
    const env = { PURIFY_ALLOW_MAIN: "1" };
    const docs = decide({ pushes: [push(["docs/NOW.md"], { remoteRef: MAIN_REF })], env });
    expect(docs.kind).toBe("allow");
    expect(docs.lines.join("\n")).toMatch(/main is allowed/);
    expect(decide({ pushes: [push(["lib/a.ts"], { remoteRef: MAIN_REF })], env, head: A }).kind).toBe("check");
  });

  it("lets a docs-only push through at once, its JSON files to be parsed", () => {
    const plan = decide({ pushes: [push(["docs/NOW.md", ".claude/settings.json", "CLAUDE.md", "AGENTS.md"])], env: {}, installed: false, head: B, dirty: ["lib/wip.ts"] });
    expect(plan).toMatchObject({ kind: "allow", json: [{ sha: A, file: ".claude/settings.json" }] });
    expect(plan.lines.join("\n")).toMatch(/docs only \(4 files\), so no checks/);
  });

  it("lets a push with nothing new through: every commit is already on the remote", () => {
    expect(decide({ pushes: [push([], { remoteRef: "refs/tags/v1.9" })], env: {} })).toMatchObject({ kind: "allow", json: [] });
  });

  it("sends a docs file that code imports to the checks", () => {
    const imported = (f: string) => f === "docs/plans/v1.9/drop.json";
    expect(decide({ pushes: [push(["docs/NOW.md", "docs/plans/v1.9/drop.json"])], env: {}, imported, head: A })).toMatchObject({
      kind: "check",
      lint: [],
      related: ["docs/plans/v1.9/drop.json"],
    });
  });

  it("sends app files to the checks, linting and tracing only the code that stands", () => {
    const files = ["app/globals.css", "lib/x.ts", "components/y.tsx", "scripts/z.mjs", "docs/NOW.md", "lib/gone.ts", "data/a.json", "public/p.png"];
    const plan = decide({ pushes: [push(files)], env: {}, head: A, dirty: ["docs/draft.md"], exists: (f) => f !== "lib/gone.ts" });
    expect(plan).toMatchObject({
      kind: "check",
      files: [...files].sort(),
      lint: ["components/y.tsx", "lib/x.ts", "scripts/z.mjs"],
      related: ["components/y.tsx", "data/a.json", "lib/x.ts", "scripts/z.mjs"],
    });
    expect(plan.lines.join("\n")).toMatch(/8 files changed, 7 of them code/);
  });

  it("refuses an app push when node_modules is missing: run npm ci, then push", () => {
    const plan = decide({ pushes: [push(["lib/x.ts"])], env: {}, installed: false, head: A });
    expect(plan).toMatchObject({ kind: "refuse", step: "node_modules" });
    expect(plan.lines).toContain("Run npm ci, then push.");
  });

  it("refuses an app push when the working tree is not the commit being pushed", () => {
    expect(decide({ pushes: [push(["lib/x.ts"])], env: {}, head: B })).toMatchObject({ kind: "refuse", step: "checkout" });
    const dirty = decide({ pushes: [push(["lib/x.ts"])], env: {}, head: A, dirty: ["lib/wip.ts", "docs/draft.md"] });
    expect(dirty).toMatchObject({ kind: "refuse", step: "working tree" });
    expect(dirty.lines).toContain("  lib/wip.ts");
    expect(dirty.lines.join("\n")).not.toMatch(/draft\.md/);
  });

  it("skips the checks with PURIFY_SKIP_GUARD=1, loudly, and only that value", () => {
    const plan = decide({ pushes: [push(["lib/x.ts"])], env: { PURIFY_SKIP_GUARD: "1" }, installed: false, head: B });
    expect(plan).toMatchObject({ kind: "allow", lines: SKIP_WARNING, json: [] });
    expect(SKIP_WARNING.join("\n")).toMatch(/NOTHING WAS CHECKED/);
    expect(SKIP_WARNING.join("\n")).toMatch(/arbiter's word/);
    expect(decide({ pushes: [push(["lib/x.ts"])], env: { PURIFY_SKIP_GUARD: "true" }, installed: false })).toMatchObject({ kind: "refuse", step: "node_modules" });
  });

  it("shows the end of a long failure, and says what was cut", () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join("\n");
    const shown = tail(text, 120);
    expect(shown[0]).toBe("(the first 80 lines are cut)");
    expect(shown.at(-1)).toBe("line 200");
    expect(tail("one\ntwo\n")).toEqual(["one", "two"]);
  });
});

// A repository of its own for each run, with the user's git configuration and
// any variable git sets for a hook kept out, so nothing here can touch this one.
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const CLEAN = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(GIT_|PURIFY_)/.test(key))) as NodeJS.ProcessEnv;

function scratchRepo() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "push-guard-"));
  made.push(base);
  const dir = path.join(base, "repo");
  fs.mkdirSync(dir);
  const config = path.join(base, "gitconfig");
  fs.writeFileSync(config, "");
  const env: NodeJS.ProcessEnv = {
    ...CLEAN,
    GIT_CONFIG_GLOBAL: config,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Guard Test",
    GIT_AUTHOR_EMAIL: "guard@example.invalid",
    GIT_COMMITTER_NAME: "Guard Test",
    GIT_COMMITTER_EMAIL: "guard@example.invalid",
  };
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: dir, env, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git("init", "-q");
  git("symbolic-ref", "HEAD", "refs/heads/work");
  const commit = (files: Record<string, string | null>, message: string) => {
    for (const [file, text] of Object.entries(files)) {
      const full = path.join(dir, file);
      if (text === null) fs.rmSync(full);
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, text);
      }
    }
    git("add", "-A");
    git("commit", "-q", "--no-verify", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const guard = (stdin: string, extra: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [GUARD, "--hook", "origin", "https://example.invalid/repo"], { cwd: dir, env: { ...env, ...extra }, input: stdin, encoding: "utf8" });
    return { code: r.status, said: `${r.stdout}${r.stderr}` };
  };
  return { dir, git, commit, guard };
}

describe("the files a push changes", () => {
  const r = scratchRepo();
  const first = r.commit({ "app/a.ts": "1", "docs/x.md": "1" }, "first");
  r.git("update-ref", "refs/remotes/origin/work", first);
  r.commit({ "docs/x.md": "2" }, "second");
  const third = r.commit({ "lib/b.ts": "1" }, "third");
  const where = { cwd: r.dir, remote: "origin" };
  const update = (localSha: string, remoteSha: string) => ({ localRef: "refs/heads/work", localSha, remoteRef: "refs/heads/work", remoteSha });

  it("are what changed since the remote's tip, for a ref the remote has", () => {
    expect(pushedFiles(update(third, first), where)).toEqual(["docs/x.md", "lib/b.ts"]);
  });

  it("are only the new commits' files, for a ref that is new on the remote", () => {
    expect(pushedFiles(update(third, ZERO), where)).toEqual(["docs/x.md", "lib/b.ts"]);
    expect(pushedFiles(update(third, "f".repeat(40)), where)).toEqual(["docs/x.md", "lib/b.ts"]);
    expect(pushedFiles(update(third, ZERO), { cwd: r.dir, remote: "https://example.invalid/repo" })).toEqual(["docs/x.md", "lib/b.ts"]);
  });

  it("are none for a commit the remote already has, or for a delete", () => {
    expect(pushedFiles(update(first, ZERO), where)).toEqual([]);
    expect(pushedFiles({ localRef: "(delete)", localSha: ZERO, remoteRef: "refs/heads/work", remoteSha: first }, where)).toEqual([]);
  });

  it("name both sides of a rename and every deletion", () => {
    const fourth = r.commit({ "lib/b.ts": null, "lib/c.ts": "1", "app/a.ts": null }, "fourth");
    expect(pushedFiles(update(fourth, third), where)).toEqual(["app/a.ts", "lib/b.ts", "lib/c.ts"]);
  });

  it("are the whole tree when the remote shares no history with it", () => {
    r.git("update-ref", "-d", "refs/remotes/origin/work");
    expect(pushedFiles(update(third, ZERO), where)).toEqual(["app/a.ts", "docs/x.md", "lib/b.ts"]);
  });
});

describe("the hook, run as git runs it", () => {
  const r = scratchRepo();
  const first = r.commit({ "lib/a.ts": "export const a = 1;\n", "docs/x.md": "1" }, "first");
  r.git("update-ref", "refs/remotes/origin/work", first);
  const line = (sha: string, remoteRef = "refs/heads/work") => `refs/heads/work ${sha} ${remoteRef} ${ZERO}\n`;

  it("refuses main, and exits 1 so git stops the push", () => {
    const run = r.guard(line(first, MAIN_REF));
    expect(run.code).toBe(1);
    expect(run.said).toMatch(/refused\. This push changes main/);
  });

  it("lets a docs-only push go at once, and refuses one whose JSON does not parse", () => {
    const docs = r.commit({ "docs/x.md": "2", ".claude/settings.json": '{ "hooks": {} }\n' }, "docs");
    const run = r.guard(line(docs));
    expect(run.code, run.said).toBe(0);
    expect(run.said).toMatch(/docs only \(2 files\), so no checks/);
    const broken = r.commit({ ".claude/settings.json": "{\n" }, "broken");
    const refused = r.guard(line(broken));
    expect(refused.code).toBe(1);
    expect(refused.said).toMatch(/\.claude\/settings\.json is not valid JSON/);
  });

  it("refuses an app push in a clone with no node_modules: run npm ci, then push", () => {
    const app = r.commit({ "lib/a.ts": "export const a = 2;\n" }, "app");
    const run = r.guard(line(app));
    expect(run.code).toBe(1);
    expect(run.said).toMatch(/Run npm ci, then push\./);
    const skipped = r.guard(line(app), { PURIFY_SKIP_GUARD: "1" });
    expect(skipped.code).toBe(0);
    expect(skipped.said).toMatch(/PUSH GUARD SKIPPED/);
  });
});

describe("the wiring", () => {
  it("has git's hook executable, handing what git gives it to the guard", () => {
    const hook = path.join(ROOT, ".githooks/pre-push");
    const text = fs.readFileSync(hook, "utf8");
    expect(text.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(text).toContain('exec node "$root/scripts/push-guard.mjs" --hook "$@"');
    const index = spawnSync("git", ["ls-files", "-s", ".githooks/pre-push"], { cwd: ROOT, env: CLEAN, encoding: "utf8" }).stdout;
    expect(index, "git must record the hook as executable: git add --chmod=+x .githooks/pre-push").toMatch(/^100755 /);
    if (process.platform !== "win32") expect(fs.statSync(hook).mode & 0o111).not.toBe(0);
  });

  it("turns the hook on at the start of every Claude session, never failing one, in bash and in PowerShell", () => {
    const settings = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude/settings.json"), "utf8"));
    const commands: string[] = (settings.hooks?.SessionStart ?? []).flatMap((group: { hooks?: { command?: string }[] }) => (group.hooks ?? []).map((h) => h.command ?? ""));
    expect(commands).toContain("git config core.hooksPath .githooks; exit 0");
    for (const command of commands) expect(command, "bash-only syntax fails under PowerShell on a Windows PC").not.toMatch(/&&|\|\||\/dev\/null|\$CLAUDE_/);
  });

  it("runs the stylesheet tests first, and they are where it looks", () => {
    for (const file of STYLESHEET_TESTS) expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
  });
});
