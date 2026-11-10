// The patch notes are read on the server. A client component that imports
// them carries every note ever written into the scripts a reader's browser
// loads: components/marketing/WhatsNewChip.tsx did, for one title, and
// 175 KB of notes rode in the front door's scripts until 1.9
// (docs/1.9-build/notes/optimization-fable.md, item 8).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** The modules that hold the notes whole. */
const WHOLE_NOTES = ["@/lib/changelog", "@/lib/whatsNew/entries", "@/data/changelog/patches.json", "@/data/changelog/entries.json"];

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__" && entry.name !== "node_modules") sources(full, found);
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

describe("the patch notes stay off the client", () => {
  it("no client component imports the notes whole (a type alone is free)", () => {
    const carried: string[] = [];
    for (const file of [...sources("app"), ...sources("components")]) {
      const source = fs.readFileSync(file, "utf8");
      if (!/^\s*["']use client["']/.test(source)) continue;
      for (const mod of WHOLE_NOTES) {
        const imports = source.match(new RegExp(`^import (?!type )[^;]*from "${mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}";`, "gm")) ?? [];
        if (imports.length) carried.push(`${file}: ${mod}`);
      }
    }
    expect(carried).toEqual([]);
  });
});
