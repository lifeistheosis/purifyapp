import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { HOUSE_PHOTOS, housePhotoCredit, withHousePhoto } from "@/lib/trapeza/housePhotos";
import type { TrapezaRecipe } from "@/lib/trapeza/recipes";

// The same rights bar as the History images
// (lib/history/__tests__/events.integrity.test.ts): a free licence, a named
// author, a https source page, and a real image on disk.
const ALLOWED = /^(cc0|cc by(-sa)? \d\.\d)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function recipe(over: Partial<TrapezaRecipe> = {}): TrapezaRecipe {
  return {
    id: "a04665fa-2de5-4ebf-8172-3a5f71ab1f13",
    author_id: null,
    title: "Lenten Lentil Soup",
    fast_level: "oil_wine",
    season: "lent",
    tradition: "any",
    summary: null,
    ingredients: "x",
    steps: "y",
    servings: null,
    time_minutes: null,
    status: "published",
    created_at: "2026-07-13T00:00:00Z",
    ...over,
  };
}

describe("Kitchen house photos", () => {
  const entries = Object.entries(HOUSE_PHOTOS);

  it("covers all seventeen house recipes", () => {
    expect(entries).toHaveLength(17);
  });

  it("every photo is rights-complete, bundled and a real JPEG", () => {
    const srcs = new Set<string>();
    for (const [id, p] of entries) {
      expect(id, "recipe id").toMatch(UUID);
      expect(p.src.startsWith("/kitchen-photos/"), `${id} path`).toBe(true);
      expect(srcs.has(p.src), `${p.src} used twice`).toBe(false);
      srcs.add(p.src);
      const onDisk = path.join(process.cwd(), "public", p.src.replace(/^\//, ""));
      expect(fs.existsSync(onDisk), `${p.src} missing`).toBe(true);
      const head = fs.readFileSync(onDisk).subarray(0, 3);
      expect(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff, `${p.src} is not a JPEG`).toBe(true);
      expect(fs.statSync(onDisk).size, `${p.src} is heavier than a card needs`).toBeLessThan(450 * 1024);
      for (const field of ["title", "author", "license", "licenseUrl", "sourceUrl"] as const) {
        expect(p[field].trim(), `${id} ${field}`).not.toBe("");
      }
      expect(ALLOWED.test(p.license), `${id} licence '${p.license}'`).toBe(true);
      expect(p.licenseUrl.startsWith("https://creativecommons.org/"), `${id} licence url`).toBe(true);
      expect(p.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"), `${id} source`).toBe(true);
      expect(p.author, `${id} author carries licence boilerplate`).not.toMatch(/licen[cs]e|http/i);
    }
  });

  it("every bundled file is one of the photos, so none ships unaccounted for", () => {
    const dir = path.join(process.cwd(), "public", "kitchen-photos");
    const onDisk = fs.readdirSync(dir).map((f) => `/kitchen-photos/${f}`).sort();
    expect(onDisk).toEqual(entries.map(([, p]) => p.src).sort());
  });

  it("fills in a house recipe that has no photo, with its credit and links", () => {
    const r = withHousePhoto(recipe());
    const p = HOUSE_PHOTOS["a04665fa-2de5-4ebf-8172-3a5f71ab1f13"];
    expect(r.photo_url).toBe(p.src);
    expect(r.photo_credit).toBe(housePhotoCredit(p));
    expect(r.photo_credit).toBe("Dianeira, CC BY-SA 4.0");
    expect(r.photo_source_url).toBe(p.sourceUrl);
    expect(r.photo_license_url).toBe(p.licenseUrl);
  });

  it("never replaces a photo set from the admin console, and never touches a member's recipe", () => {
    const own = recipe({ photo_url: "https://x.supabase.co/storage/v1/object/public/kitchen/h/a/1.jpg" });
    expect(withHousePhoto(own)).toBe(own);
    const member = recipe({ author_id: "11111111-2222-3333-4444-555555555555" });
    expect(withHousePhoto(member).photo_url).toBeUndefined();
    const unknown = recipe({ id: "99999999-2222-3333-4444-555555555555" });
    expect(withHousePhoto(unknown).photo_url).toBeUndefined();
  });
});
