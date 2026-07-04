import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { verifyPackage, type ContentPackage } from "../manifest";
import { openNodeStore } from "../storage/nodeStore";
import { importPackage } from "../manifest";
import { ContentRepository } from "../repository";

// Integrity of the ACTUAL generated package (out/content/content-package.json),
// using the app's real verifier + importer — so packager output and the
// on-device code path can't drift. Skipped when the package hasn't been built
// (e.g. CI without `npm run build:android`); the synthetic-package tests in
// manifest.test.ts still run there.
const PKG_PATH = "out/content/content-package.json";
const built = existsSync(PKG_PATH);

describe.skipIf(!built)("generated content package", () => {
  const pkg = built
    ? (JSON.parse(readFileSync(PKG_PATH, "utf8")) as ContentPackage)
    : ({} as ContentPackage);

  it("passes the app's own verifier (checksum + counts)", async () => {
    expect(await verifyPackage(pkg)).toBeNull();
  });

  it("imports and is queryable through the repository", async () => {
    const store = await openNodeStore();
    await importPackage(store, pkg, { verify: false });
    const repo = new ContentRepository(store);
    // Saints + feasts were added this milestone.
    const saint = await repo.getSaint<{ name: string }>("john-chrysostom");
    expect(saint?.name).toMatch(/Chrysostom/);
    const results = await repo.searchLibrary("compline");
    expect(results.length).toBeGreaterThan(0);
  });
});
