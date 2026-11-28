// The website runs ahead of the store builds (his word, 2026-11-28: "keep the website public
// on v2.0 and drop mobile in announcement update batches"), and must never fail them ("always
// ensure the public silent v2.0 on the website doesnt interfere with the mobiles live version
// (chants not loading etc ...)"). scripts/apps-compat.mjs holds every push to main to the
// store builds' own commits; these prove it refuses what would fail them.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import * as compat from "../../../scripts/apps-compat.mjs";

type Check = { lines: string[]; problems: string[] };
const { check, routeFor, streamedRoots, corsOrigins, promptNumbers, linkedApps } = compat as {
  check: (o: { web: string; builds: unknown[]; cwd: string }) => Check;
  routeFor: (asked: string, routes: string[]) => string | null;
  streamedRoots: (s: string) => string[];
  corsOrigins: (s: string) => string[];
  promptNumbers: (s: string) => { android: number; ios: number };
  linkedApps: (s: string) => string[];
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apps-compat-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: dir, encoding: "utf8" }).trim();
const write = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
};
const commit = (message: string) => {
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "-m", message);
  return git("rev-parse", "HEAD");
};

// A store build's commit: it streams chants from the website and asks one route.
git("init", "-q");
write("lib/media/streamed.ts", 'export const STREAMED_ROOTS = ["/audio/chants/"] as const;\n');
write("public/audio/chants/anthem/en.json", '{"lines":[]}\n');
write("app/api/chants/cleared/route.ts", "export async function GET() {}\n");
write("app/api/saints/[slug]/route.ts", "export async function GET() {}\n");
write("components/Chants.tsx", 'fetch("/api/chants/cleared"); fetch(`/api/saints/${slug}`);\n');
write("lib/api/cors.ts", 'const ALLOWED = ["capacitor://localhost", "https://localhost"];\n');
write("lib/appUpdate/release.ts", "export const CURRENT_RELEASE = {\n  androidVersionCode: 0,\n  iosBuildNumber: 0,\n};\n");
const store = commit("the store build");
const build = { version: "t", commit: store, android: 101, ios: 39 };

const after = (change: () => void) => {
  git("checkout", "-q", store);
  change();
  return commit("the website");
};

describe("the live apps' guard", () => {
  it("lets through a website that still serves the store build", () => {
    const web = after(() => write("app/api/new/route.ts", "export async function GET() {}\n"));
    expect(check({ web, builds: [build], cwd: dir }).problems).toEqual([]);
  });

  it("refuses a website that lost a chants file the app streams", () => {
    const web = after(() => fs.rmSync(path.join(dir, "public/audio/chants/anthem/en.json")));
    expect(check({ web, builds: [build], cwd: dir }).problems.join("\n")).toContain("missing public/audio/chants/anthem/en.json");
  });

  it("refuses one that changed it under the app", () => {
    const web = after(() => write("public/audio/chants/anthem/en.json", '{"verses":[]}\n'));
    expect(check({ web, builds: [build], cwd: dir }).problems.join("\n")).toContain("changed public/audio/chants/anthem/en.json");
  });

  it("refuses one with no route for an address the app asks", () => {
    const web = after(() => fs.rmSync(path.join(dir, "app/api/chants"), { recursive: true }));
    expect(check({ web, builds: [build], cwd: dir }).problems.join("\n")).toContain("no route answers /api/chants/cleared");
  });

  it("refuses a narrower CORS list, and an update prompt above what the store serves", () => {
    const web = after(() => {
      write("lib/api/cors.ts", 'const ALLOWED = ["https://localhost"];\n');
      write("lib/appUpdate/release.ts", "export const CURRENT_RELEASE = {\n  androidVersionCode: 102,\n  iosBuildNumber: 0,\n};\n");
    });
    const problems = check({ web, builds: [build], cwd: dir }).problems.join("\n");
    expect(problems).toContain("no longer allows capacitor://localhost");
    expect(problems).toContain("Android build 102, above the 101 the store serves");
  });

  it("reads routes as the website serves them", () => {
    const routes = ["/api/saints/[slug]", "/api/admin/health", "/api/community/posts"];
    expect(routeFor("/api/saints/:p", routes)).toBe("/api/saints/[slug]");
    expect(routeFor("/api/admin", routes)).toBe("/api/admin/health");
    expect(routeFor("/api/community/posts?limit=20", routes)).toBe("/api/community/posts");
    expect(routeFor("/api/gone", routes)).toBeNull();
    expect(streamedRoots('export const STREAMED_ROOTS = ["/audio/chants/", "/covers/"] as const;')).toEqual(["/audio/chants/", "/covers/"]);
    expect(corsOrigins('["capacitor://localhost", "https://purifyapp.net"]')).toEqual(["capacitor://localhost", "https://purifyapp.net"]);
    expect(promptNumbers("  androidVersionCode: 7,\n  iosBuildNumber: 3,")).toEqual({ android: 7, ios: 3 });
    expect(linkedApps('[{"target":{"namespace":"android_app","package_name":"net.purifyapp.admin"}}]')).toEqual(["android_app:net.purifyapp.admin"]);
  });

  it("knows the store builds in readers' hands, and the push guard holds main to them", () => {
    const record = JSON.parse(fs.readFileSync("data/release/live-apps.json", "utf8")) as { builds: { commit: string; android: number; ios: number }[] };
    expect(record.builds.length).toBeGreaterThan(0);
    for (const b of record.builds) {
      expect(b.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(Number.isInteger(b.android) && Number.isInteger(b.ios)).toBe(true);
    }
    expect(fs.readFileSync("scripts/push-guard.mjs", "utf8")).toMatch(/if \(!appsStillServed\(updates, root\)\) return 1;/);
  });
});
