// What is kept on this phone (1.9, Listening 3: "a storage view: what is
// saved, its size, remove a book"): the books saved to listen offline counted
// with their sizes, and the view drawn in the apps only.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { savedByBook } from "@/components/settings/StorageSection";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

describe("the storage view", () => {
  it("counts each book's saved chapters and the bytes they take", () => {
    const one = { mp3: "a", json: "b", bytes: 1_000_000 };
    expect(savedByBook({ "john/1": one, "john/2": { ...one, bytes: 2_500_000 }, "mark/4": one }).sort((a, b) => a.book.localeCompare(b.book))).toEqual([
      { book: "john", chapters: 2, bytes: 3_500_000 },
      { book: "mark", chapters: 1, bytes: 1_000_000 },
    ]);
    expect(savedByBook({})).toEqual([]);
  });

  it("is drawn in the apps only, on Settings, with Remove for each Bible and each book", () => {
    const view = read("components/settings/StorageSection.tsx");
    expect(view).toContain("if (!native) return null;");
    expect(view).toContain("void removeBible(b.id)");
    expect(view).toContain("void removeBook(b.book)");
    expect(read("components/settings/SettingsClient.tsx")).toContain("<StorageSection />");
  });
});
