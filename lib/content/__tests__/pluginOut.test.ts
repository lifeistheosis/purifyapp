// The on-device content layer is off (lib/content/enabled.ts), and from 1.9
// the plugin it runs on is out of the apps: it put SQLCipher in every install
// for a store no screen reads (docs/1.9-build/notes/optimization-fable.md,
// item 6). This holds the three things that have to stay true together: the
// plugin is in no build, the code that would use it does not make a build
// look for it, and each shell deletes the old store under the right name.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { LOCAL_CONTENT_ENABLED } from "@/lib/content/enabled";
import { DEVICE_DB_FILE, DEVICE_DB_NAME } from "@/lib/content/storage/capacitorStore";

const read = (file: string) => fs.readFileSync(file, "utf8");
const PLUGIN = "@capacitor-community/sqlite";

describe("the SQLite plugin is out of the apps while the layer is off", () => {
  it("is still off: turning it on means bringing the plugin back first", () => {
    expect(LOCAL_CONTENT_ENABLED).toBe(false);
  });

  it("is in no package list and no Android build file", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain(PLUGIN);
    expect(read("android/capacitor.settings.gradle")).not.toContain("capacitor-community-sqlite");
    expect(read("android/app/capacitor.build.gradle")).not.toContain("capacitor-community-sqlite");
  });

  it("is not imported by name anywhere, so no build looks for it", () => {
    const store = read("lib/content/storage/capacitorStore.ts");
    expect(store).not.toMatch(/import\(\s*["']@capacitor-community\/sqlite["']\s*\)/);
    expect(store).not.toMatch(/from\s+["']@capacitor-community\/sqlite["']/);
  });

  it("names the old store's file the way the plugin did", () => {
    expect(DEVICE_DB_NAME).toBe("purify_content");
    expect(DEVICE_DB_FILE).toBe("purify_contentSQLite.db");
  });

  it("has each shell delete that file at start", () => {
    expect(read("android/app/src/main/java/net/purifyapp/purify/MainActivity.java")).toContain(`deleteDatabase("${DEVICE_DB_FILE}")`);
    const ios = read("ios/App/App/AppDelegate.swift");
    for (const name of [DEVICE_DB_FILE, `${DEVICE_DB_FILE}-wal`, `${DEVICE_DB_FILE}-shm`]) expect(ios).toContain(`"${name}"`);
    expect(ios).toContain(".documentDirectory");
  });
});
