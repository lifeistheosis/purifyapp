import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AVATAR_COPIES, avatarRef } from "../avatarPath";

const PREFIX = "https://proj.supabase.co/storage/v1/object/public/avatars/";
const ANNA = "11111111-1111-4111-8111-111111111111";
const FILE = "9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";

describe("avatarRef", () => {
  it("reads a random path, which names nobody", () => {
    for (const ext of ["jpg", "png", "webp"]) {
      expect(avatarRef(`${PREFIX}a/${FILE}.${ext}`, PREFIX)).toEqual({ path: `a/${FILE}.${ext}`, ext, legacyOwner: null });
    }
  });

  it("reads an old path, and says whose folder it was", () => {
    expect(avatarRef(`${PREFIX}u/${ANNA}/1759400000000.jpg`, PREFIX)).toEqual({
      path: `u/${ANNA}/1759400000000.jpg`,
      ext: "jpg",
      legacyOwner: ANNA,
    });
  });

  it("answers nothing for an address that is not a profile picture of ours", () => {
    const not: unknown[] = [
      null,
      undefined,
      42,
      "",
      PREFIX,
      // Another host, and one that only starts like ours.
      `https://evil.example/storage/v1/object/public/avatars/a/${FILE}.jpg`,
      `https://proj.supabase.co.evil.example/storage/v1/object/public/avatars/a/${FILE}.jpg`,
      // Another bucket, and the banner folder of this one.
      `https://proj.supabase.co/storage/v1/object/public/kitchen/a/${FILE}.jpg`,
      `${PREFIX}b/${FILE}.jpg`,
      // Not the names the route writes.
      `${PREFIX}a/${FILE}.gif`,
      `${PREFIX}a/${FILE}.jpg?download=1`,
      `${PREFIX}a/${FILE}.jpg#x`,
      `${PREFIX}a/${FILE}.jpg/`,
      `${PREFIX}a/${FILE.toUpperCase()}.jpg`,
      `${PREFIX}a/${ANNA}/${FILE}.jpg`,
      `${PREFIX}a/../u/${ANNA}/1759400000000.jpg`,
      `${PREFIX}u/${ANNA}/../${ANNA}/1759400000000.jpg`,
      `${PREFIX}u/${ANNA}/old/1759400000000.jpg`,
      `${PREFIX}u/${ANNA}/picture.jpg`,
      `${PREFIX}u/not-a-uuid/1759400000000.jpg`,
      `${PREFIX}u/${ANNA}/12345678901234567.jpg`,
    ];
    for (const url of not) expect(avatarRef(url, PREFIX), String(url)).toBeNull();
  });

  it("answers nothing when it is not told the bucket's own prefix", () => {
    expect(avatarRef(`${PREFIX}a/${FILE}.jpg`, "")).toBeNull();
  });
});

describe("AVATAR_COPIES", () => {
  // A replaced picture's file is deleted once every copy of its address has
  // been pointed at the new one. A table that copies the address and is not
  // listed would be left showing a picture that is gone.
  it("names every table the migrations give an avatar column, other than profiles", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const copying = new Set<string>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
      const sql = readFileSync(join(dir, file), "utf8")
        .split(/\r?\n/)
        .map((line) => line.replace(/--.*$/, ""))
        .join("\n");
      for (const m of sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
        if (/\b\w*avatar\w*\s+text\b/.test(m[2])) copying.add(m[1]);
      }
      for (const m of sql.matchAll(/alter table (?:if exists )?public\.(\w+)\b([^;]*);/g)) {
        if (/add column (?:if not exists )?\w*avatar(?!_decoration)\w*\s+text\b/.test(m[2])) copying.add(m[1]);
      }
    }
    copying.delete("profiles");
    expect([...copying].sort()).toEqual(AVATAR_COPIES.map((c) => c.table).sort());
  });
});
