// A native build that was stopped midway left the website's files in its
// stash: git showed app/api and the rest deleted, and the next build refused
// to start (found by Fable Themes, 2026-11-11). The build now puts a leftover
// stash back on entry and on a stop signal (scripts/lib/export-stash.mjs).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { exportStash } from "../../../scripts/lib/export-stash.mjs";

const PATHS = [["app", "api"], ["app", "(app)", "shop", "seller"], ["public", "covers"], ["app", "robots.ts"]];
const made: string[] = [];

function checkout() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "export-stash-"));
  made.push(root);
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write("app/api/health/route.ts", "api");
  write("app/(app)/shop/seller/page.tsx", "seller");
  write("public/covers/a.jpg", "cover");
  write("app/robots.ts", "robots");
  write("app/page.tsx", "home");
  const said: string[] = [];
  const stash = exportStash({ root, dir: path.join(root, ".native-export-stash"), paths: PATHS, log: (line: string) => said.push(line) });
  const has = (file: string) => fs.existsSync(path.join(root, file));
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
  return { root, stash, said, has, read, write };
}
const dead = { alive: () => false, describe: () => "", kill: () => true };

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("the native export's stash", () => {
  it("sets the website's files aside and puts them back, and putting back twice does no harm", () => {
    const { stash, has, read } = checkout();
    stash.stashAll();
    expect(has("app/api")).toBe(false);
    expect(has("app/robots.ts")).toBe(false);
    expect(has("app/page.tsx")).toBe(true);
    expect(stash.restoreAll()).toBe(4);
    expect(read("app/api/health/route.ts")).toBe("api");
    expect(read("app/robots.ts")).toBe("robots");
    expect(has(".native-export-stash")).toBe(false);
    expect(stash.restoreAll()).toBe(0);
  });

  it("finds nothing to recover in a clean checkout", () => {
    const { stash, said } = checkout();
    expect(stash.recover(dead)).toEqual({ state: "none" });
    expect(said).toEqual([]);
  });

  it("puts a stopped build's stash back on the next build's entry, and says so", () => {
    const { stash, said, has, read } = checkout();
    stash.stashAll();
    // The build is killed here: no finally, no handler.
    said.length = 0;
    const left = stash.recover(dead);
    if (left.state !== "restored") throw new Error(`recovered nothing: ${left.state}`);
    expect(left.restored).toEqual(["app/api", "app/(app)/shop/seller", "public/covers", "app/robots.ts"]);
    expect(left.kept).toEqual([]);
    expect(read("app/api/health/route.ts")).toBe("api");
    expect(read("app/(app)/shop/seller/page.tsx")).toBe("seller");
    expect(read("public/covers/a.jpg")).toBe("cover");
    expect(has(".native-export-stash")).toBe(false);
    expect(said.join("\n")).toMatch(/an earlier build was stopped before it put the website's files back: restored 4/);
  });

  it("recovers a stash an older build left with no owner written in it", () => {
    const { stash, root, read } = checkout();
    stash.stashAll();
    fs.rmSync(path.join(root, ".native-export-stash", "owner.json"));
    expect(stash.recover(dead).state).toBe("restored");
    expect(read("app/api/health/route.ts")).toBe("api");
  });

  it("touches nothing while the build that owns the stash is still running", () => {
    const { stash, root, has } = checkout();
    stash.stashAll();
    fs.writeFileSync(path.join(root, ".native-export-stash", "owner.json"), JSON.stringify({ pid: 4242 }));
    const left = stash.recover({ alive: (pid: number) => pid === 4242, describe: () => "node scripts/native-build.mjs --platform ios", kill: () => true });
    expect(left).toEqual({ state: "running", pid: 4242 });
    expect(has("app/api")).toBe(false);
    expect(has(".native-export-stash/0")).toBe(true);
  });

  it("does not take another program that was handed the dead build's number for the build", () => {
    const { stash, root, read } = checkout();
    stash.stashAll();
    fs.writeFileSync(path.join(root, ".native-export-stash", "owner.json"), JSON.stringify({ pid: 4242 }));
    const left = stash.recover({ alive: () => true, describe: () => "/usr/bin/python3 server.py", kill: () => true });
    expect(left.state).toBe("restored");
    expect(read("app/api/health/route.ts")).toBe("api");
  });

  it("stops the dead build's workers, which still hold .next/lock, before putting the files back", () => {
    const { stash, root, said } = checkout();
    stash.stashAll();
    fs.writeFileSync(path.join(root, ".native-export-stash", "owner.json"), JSON.stringify({ pid: 4242, build: 4300 }));
    const killed: [number, string][] = [];
    const left = stash.recover({
      alive: (pid: number) => pid === 4300,
      describe: (pid: number) => (pid === 4300 ? "node node_modules/.bin/next build" : ""),
      kill: (pid: number, signal: string) => { killed.push([pid, signal]); return true; },
    });
    expect(killed).toEqual([[4300, "SIGKILL"]]);
    expect(left.state === "restored" && left.stopped).toBe(4300);
    expect(said.join("\n")).toMatch(/still held \.next\/lock/);
  });

  it("never writes a stashed copy over a tree that has come back another way: it keeps both", () => {
    const { stash, root, said, read, write, has } = checkout();
    stash.stashAll();
    // git checkout brought app/api back, and it has since changed.
    write("app/api/health/route.ts", "newer");
    const left = stash.recover(dead);
    if (left.state !== "restored") throw new Error(`recovered nothing: ${left.state}`);
    expect(left.restored).toEqual(["app/(app)/shop/seller", "public/covers", "app/robots.ts"]);
    expect(left.kept).toEqual(["app/api"]);
    expect(read("app/api/health/route.ts")).toBe("newer");
    expect(fs.readFileSync(path.join(left.keptAt as string, "0", "health", "route.ts"), "utf8")).toBe("api");
    expect(path.relative(root, left.keptAt as string).startsWith(".native-export-stash-kept")).toBe(true);
    expect(has(".native-export-stash")).toBe(false);
    expect(said.join("\n")).toMatch(/had come back another way and were left as they are/);
  });
});

describe("scripts/native-build.mjs", () => {
  const build = fs.readFileSync("scripts/native-build.mjs", "utf8");

  it("recovers a leftover stash on entry, before any step reads the tree or wipes out/", () => {
    const guard = build.indexOf("stash.recover()");
    expect(guard).toBeGreaterThan(0);
    const firstStep = build.search(/^run\(/m);
    expect(firstStep).toBeGreaterThan(guard);
    expect(build.indexOf('fs.rmSync(path.join(ROOT, "out")')).toBeGreaterThan(guard);
    expect(build).toMatch(/left\.state === "running"[\s\S]{0,400}process\.exit\(1\)/);
  });

  it("puts the files back on a stop signal, after stopping the build and its workers, and in a finally", () => {
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) expect(build, signal).toContain(`${signal}:`);
    expect(build).toMatch(/process\.on\(signal, \(\) => onSignal\(signal\)\)/);
    expect(build).toMatch(/killGroup\(child\.pid, signal\)/);
    expect(build).toMatch(/finally \{\s*stash\.restoreAll\(\);/);
    expect(build).toMatch(/process\.on\("exit", \(\) => stash\.restoreAll\(\)\)/);
    // The build runs as a child the script waits on: a handler cannot run while execSync holds the process.
    expect(build).toContain('await buildWithTheWebsiteSetAside("next build"');
    expect(build).not.toMatch(/run\("next build"/);
  });

  it("keeps the stash and the copies set aside out of git", () => {
    const ignore = fs.readFileSync(".gitignore", "utf8");
    expect(ignore).toContain(".native-export-stash/");
    expect(ignore).toContain(".native-export-stash-kept/");
  });
});
