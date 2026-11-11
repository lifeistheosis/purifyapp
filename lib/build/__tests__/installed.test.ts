// What is installed is what the branch asks for.
//
// A checkout that pulls a commit which moves a package and does not install
// again goes on running the old one, and nothing says so. On 2026-11-11 a
// chat had pulled the move to Next 16.4.6 (2346e7cc, the security update due
// before the 1.9 store builds) sixteen hours earlier and was still on 16.2.6.
// The one test that happened to read Next's version went red there, and it
// was reported as a broken page switch on the branch head. Everything that
// chat built or drew from the app in those hours ran on the old Next.
//
// So this compares the packages package.json names with what stands in
// node_modules, against the versions package-lock.json records, and fails in
// plain words with the remedy: run npm ci. The arbiter's standing rule is to
// run it after any pull that changes the lockfile; this is what notices when
// it was not.
//
// It reads the packages the project names itself, not the hundreds under
// them: those are the ones a pull moves on purpose, and npm ci puts every
// one of the rest right in the same stroke.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const json = (file: string) => JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));

type Lock = { packages: Record<string, { version?: string; optional?: boolean; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }> };

describe("what is installed is what the branch asks for", () => {
  const pkg = json("package.json") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const lock = json("package-lock.json") as Lock;
  const named = { ...pkg.dependencies, ...pkg.devDependencies };

  it("package-lock.json was made from this package.json", () => {
    // A package added or moved in package.json with no install after it: the lockfile still holds the old list.
    expect(lock.packages[""]?.dependencies ?? {}, "package.json's dependencies are not the lockfile's: run npm install, and commit package-lock.json with it").toEqual(pkg.dependencies ?? {});
    expect(lock.packages[""]?.devDependencies ?? {}, "package.json's devDependencies are not the lockfile's: run npm install, and commit package-lock.json with it").toEqual(pkg.devDependencies ?? {});
  });

  it("every package the project names is installed at the version the lockfile records", () => {
    expect(Object.keys(named).length).toBeGreaterThan(20);
    const wrong: string[] = [];
    for (const name of Object.keys(named).sort()) {
      const asked = lock.packages[`node_modules/${name}`];
      if (!asked?.version) {
        wrong.push(`${name} (named in package.json, missing from package-lock.json)`);
        continue;
      }
      const file = path.join(ROOT, "node_modules", name, "package.json");
      const here = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version : null;
      // A package that is only for another kind of machine may rightly be absent.
      if (here === null && asked.optional) continue;
      if (here !== asked.version) wrong.push(`${name} (${here ?? "not installed"} here, ${asked.version} asked for)`);
    }
    expect(
      wrong,
      `This checkout's packages are not the ones package-lock.json asks for. Run npm ci, then npx next typegen. Until then everything built or tested here runs on the wrong packages: ${wrong.join("; ")}`,
    ).toEqual([]);
  });
});
