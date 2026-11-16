import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { chantIndex } from "@/lib/chants/registry.server";
import { SHELF_FIRST, SHELF_MOST, chantShelf } from "@/lib/chants/shelf";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
/** A file's code, without its comments. */
const code = (file: string) => read(file).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const cover = (src: string) => ({ src, alt: "" });

describe("the covers on the chants door (build 98 note 3)", () => {
  it("leads with the Prayer Rope Anthem, and shows every chant of the library as it is today", () => {
    const index = chantIndex();
    const shelf = chantShelf(index);
    expect(shelf[0]?.slug).toBe(SHELF_FIRST);
    expect(shelf.map((c) => c.slug).sort()).toEqual(index.filter((r) => r.cover).map((r) => r.slug).sort().slice(0, SHELF_MOST));
    // Each is the chant's own cover, the one its tile wears in the library.
    for (const c of shelf) expect(index.find((r) => r.slug === c.slug)?.cover?.src).toBe(c.src);
  });

  it("does not stand two chants that wear one picture side by side where another order avoids it", () => {
    const shelf = chantShelf(chantIndex());
    for (let i = 1; i < shelf.length; i += 1) expect(shelf[i].src, shelf[i].slug).not.toBe(shelf[i - 1].src);
    const made = chantShelf([
      { slug: "a", cover: cover("/david.jpg") },
      { slug: "b", cover: cover("/david.jpg") },
      { slug: "c", cover: cover("/anastasis.jpg") },
      { slug: SHELF_FIRST, cover: cover("/trinity.jpg") },
    ]);
    expect(made.map((c) => c.slug)).toEqual([SHELF_FIRST, "a", "c", "b"]);
  });

  it("leaves out a chant with no cover, holds no more than the shelf takes, and is empty for an empty library", () => {
    expect(chantShelf([{ slug: "bare" }, { slug: "one", cover: cover("/one.jpg") }]).map((c) => c.slug)).toEqual(["one"]);
    const many = Array.from({ length: 9 }, (_, i) => ({ slug: `c${i}`, cover: cover(`/c${i}.jpg`) }));
    expect(chantShelf(many)).toHaveLength(SHELF_MOST);
    expect(chantShelf([])).toEqual([]);
  });
});

describe("the chants door on both Prayers pages", () => {
  const DOOR = "components/chants/ChantsDoor.tsx";

  it("is one link to the library, with no play mark, no disc and no band", () => {
    const door = code(DOOR);
    expect(door).toContain('href="/chants"');
    expect(door.match(/<Link\b/g)).toHaveLength(1);
    expect(door).not.toMatch(/\bPlay\b/);
    expect(door).not.toContain("rounded-full");
    expect(door).not.toContain("gradient");
    // The words it had, and the chevron that says it opens.
    for (const key of ["chants.door.kicker", "chants.title", "chants.door.sub"]) expect(door).toContain(`k="${key}"`);
    expect(door).toContain("<ChevronRight");
    // The small line in the house's form.
    expect(door).toContain("font-sans text-caption font-semibold text-paper/55");
  });

  it("draws the covers as decoration, and only the first travels into the library", () => {
    const door = code(DOOR);
    expect(door).toContain('alt: ""');
    expect(door).toContain("carry={i === 0 ? c.src : undefined}");
    // The library's first tile takes the picture it wears.
    expect(code("components/chants/ChantsHome.tsx")).toContain("carryInto={row.cover?.src}");
  });

  it("stands on a phone and on a computer in place of the play band and the play disc", () => {
    const phone = code("components/mobile/PrayersMobile.tsx");
    const computer = code("app/(app)/prayers/page.tsx");
    expect(phone).toContain("<ChantsDoor covers={chantCovers} />");
    expect(phone).not.toContain("FeatureBand");
    expect(computer).toContain("<ChantsDoor covers={chantCovers}");
    expect(computer).toContain("<PrayersMobile chantCovers={chantCovers} />");
    expect(computer).toContain("chantShelf(chantIndex())");
    expect(computer).not.toMatch(/\bPlay\b/);
  });
});
