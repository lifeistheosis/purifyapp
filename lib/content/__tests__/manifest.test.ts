import { describe, it, expect } from "vitest";
import { openNodeStore } from "../storage/nodeStore";
import {
  validateManifest,
  verifyPackage,
  importPackage,
  installedContentVersion,
  PackageImportError,
} from "../manifest";
import { buildSamplePackage, SAMPLE_RECORDS } from "./fixtures";

describe("content manifest + transactional import", () => {
  it("verifies a well-formed package", async () => {
    const pkg = await buildSamplePackage();
    expect(await verifyPackage(pkg)).toBeNull();
  });

  it("rejects a tampered package (checksum mismatch)", async () => {
    const pkg = await buildSamplePackage();
    // Mutate a record after the checksum was computed.
    pkg.records[0].title = "Tampered";
    expect(await verifyPackage(pkg)).toBe("checksum mismatch");
  });

  it("catches a manifest count mismatch", async () => {
    const pkg = await buildSamplePackage();
    pkg.manifest.recordCount = 999;
    expect(validateManifest(pkg.manifest)).toMatch(/counts/);
  });

  it("imports content and records the version", async () => {
    const store = await openNodeStore();
    const pkg = await buildSamplePackage("v1");
    const version = await importPackage(store, pkg);
    expect(version).toBe("v1");
    expect(await installedContentVersion(store)).toBe("v1");
    const row = await store.get<{ n: number }>("SELECT COUNT(*) AS n FROM content");
    expect(row?.n).toBe(SAMPLE_RECORDS.length);
  });

  it("rolls back a failed import, leaving the prior library intact", async () => {
    const store = await openNodeStore();
    await importPackage(store, await buildSamplePackage("v1"));

    // A package whose import fails mid-transaction: two records collide on the
    // (type, ref_id) primary key, so the second INSERT throws and the whole
    // import must roll back — no DELETE of v1, no version bump.
    const dup = SAMPLE_RECORDS[0];
    const bad = await buildSamplePackage("v2", [dup, { ...dup }]);
    await expect(importPackage(store, bad, { verify: false })).rejects.toThrow();

    expect(await installedContentVersion(store)).toBe("v1");
    const row = await store.get<{ n: number }>("SELECT COUNT(*) AS n FROM content");
    expect(row?.n).toBe(SAMPLE_RECORDS.length); // v1 content survived
  });

  it("throws PackageImportError on an invalid package", async () => {
    const store = await openNodeStore();
    const pkg = await buildSamplePackage();
    pkg.manifest.sha256 = "deadbeef";
    await expect(importPackage(store, pkg)).rejects.toBeInstanceOf(PackageImportError);
  });
});
