// The gate cuts its export with the store builds' own switches (the arbiter,
// 2026-11-13): the store workflows open the shop inside the app and Community,
// and the gate's recorded recipe did not, so the shop inside the app was never
// gated. scripts/lib/store-switches.mjs reads the workflows at run time; this
// fails when the gate's switches and a store workflow's disagree, when a
// workflow takes a value from a secret the gate has not named a stand-in for,
// and when a walk would take an export cut without the store's switches.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STAND_INS, WORKFLOWS, disagreements, gateSwitches, storeSwitches } from "../../../scripts/lib/store-switches.mjs";

type Switch = { name: string; kind: string; value?: string; secret?: string };

describe("the gate's export takes the store workflows' own switches", () => {
  it("reads each store workflow's export step", () => {
    for (const platform of Object.keys(WORKFLOWS)) {
      const names = (storeSwitches(platform) as Switch[]).map((s) => s.name);
      expect(names).toContain("NEXT_PUBLIC_SHOP_ENABLED");
      expect(names).toContain("NEXT_PUBLIC_COMMUNITY_ENABLED");
    }
  });

  it("agrees with every value a store workflow writes", () => {
    expect(disagreements()).toEqual([]);
  });

  it("names a stand-in for every value a store workflow takes from a secret", () => {
    for (const platform of Object.keys(WORKFLOWS)) {
      expect(() => gateSwitches(platform)).not.toThrow();
      for (const s of storeSwitches(platform) as Switch[]) {
        if (s.kind === "secret") expect(STAND_INS, `${platform}: ${s.name}`).toHaveProperty(s.name);
      }
    }
  });

  it("fails on a planted disagreement, and on a secret it has not named", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gate-switches-"));
    fs.mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
    const android = fs.readFileSync(".github/workflows/android-apk.yml", "utf8");
    const ios = fs.readFileSync(".github/workflows/ios-release.yml", "utf8");
    fs.writeFileSync(path.join(root, WORKFLOWS.android.file), android);
    // The iPhone's shop switched off while Android's is on: the gate cannot stand for both.
    fs.writeFileSync(path.join(root, WORKFLOWS.ios.file), ios.replace('NEXT_PUBLIC_SHOP_ENABLED: "1"', 'NEXT_PUBLIC_SHOP_ENABLED: "0"'));
    expect(disagreements(root).join("\n")).toMatch(/ios-release\.yml writes NEXT_PUBLIC_SHOP_ENABLED="0"/);
    // A new value from a secret, unnamed.
    fs.writeFileSync(path.join(root, WORKFLOWS.android.file), android.replace("NEXT_PUBLIC_COMMUNITY_ENABLED: \"1\"", "NEXT_PUBLIC_COMMUNITY_ENABLED: \"1\"\n          NEXT_PUBLIC_SOMETHING_NEW: ${{ secrets.NEXT_PUBLIC_SOMETHING_NEW }}"));
    expect(() => gateSwitches("android", root)).toThrow(/NEXT_PUBLIC_SOMETHING_NEW/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("is what every gate walk checks its export against", () => {
    for (const walk of ["scripts/motion-walk.mjs", "scripts/tap-walk.mjs", "scripts/guardrail-walk.mjs"]) {
      expect(fs.readFileSync(walk, "utf8"), walk).toMatch(/checkStoreExport\(/);
    }
  });
});
