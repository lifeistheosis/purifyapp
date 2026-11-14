// Today's Saint card carries its picture into the saint's page (CLAUDE.md,
// "Every page switch is a transition": a card that opens its own page carries
// its picture into it). Seen by the motion walk on two exports (cdb67306d and
// 27e539c63, Updates 69) and again by Updates 73 on 5c4bd9562: on Today, the
// band of a saint with no words of his own (SaintBand, round 12) is a link
// around his picture, and it opened /saints/apostle-philip/ with only (root)
// in the change. Its picture wore no `data-carry`, so routeMotion's
// `liftFrom` found nothing to lift (lib/ui/routeMotion.ts, pictureOf).
//
// The saint's page takes a picture by the address of his icon
// (components/saints/SaintHeroPicture.tsx, `data-carry-into={iconUrl}`, the
// stand-in on a page with a wide picture and the plate on one without), as the
// Saints tab's cards give it (components/saints/SaintIcon.tsx). So the band's
// picture wears that address, and what stands on it in the card (its shade and
// its words) is pictured over it while it travels, as a tile's is
// (`data-carry-over`, routeMotion's wear), or the shade is gone under the
// picture in the first frame.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const RAIL = "components/today/ChurchTodayRail.tsx";

/** The source of one top-level function in a file, from its name to its closing brace at the margin. */
function fnSource(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  expect(start, `${name} is in the file`).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("\n}\n", start);
  return src.slice(start, end + 2);
}

/** Where the opening tag that starts at `start` ends, braces and strings skipped. */
function tagEnd(src: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) return i + 1;
  }
  throw new Error(`an opening tag at ${start} never closes`);
}

/** Every opening tag in a piece of source, in order. */
function tags(src: string): { name: string; head: string; at: number }[] {
  return [...src.matchAll(/<([A-Za-z][\w.]*)\b/g)].map((m) => {
    const at = m.index ?? 0;
    return { name: m[1], head: src.slice(at, tagEnd(src, at)), at };
  });
}

describe("Today's Saint card carries its picture into his page", () => {
  const rail = read(RAIL);
  const band = fnSource(rail, "SaintBand");

  it("is a link to his page around his picture", () => {
    expect(band).toMatch(/<Link href=\{saint\.href\}/);
    expect(band).toMatch(/<SaintFace\b/);
  });

  it("names the picture's frame by the key his page takes, once", () => {
    const all = tags(band);
    const carrying = all.filter((t) => /\sdata-carry=/.test(t.head));
    expect(carrying, "one picture in the card wears data-carry").toHaveLength(1);
    const [frame] = carrying;
    // The frame is the element that is the picture, cut to its shape: the
    // span the face stands in, the next element after it.
    expect(frame.name).toBe("span");
    expect(frame.head).toMatch(/overflow-hidden/);
    const next = all[all.indexOf(frame) + 1];
    expect(next?.name, "the face stands in the frame that wears the name").toBe("SaintFace");
    expect(frame.head).toMatch(/data-carry=\{saint\.carry \|\| undefined\}/);
  });

  it("the key is the address of his icon, which his page takes", () => {
    // Set where the band is made for a saint the registry has profiled.
    const made = /const saint: BandSaint = headlineSaint\s*\?\s*\{([\s\S]*?)\n\s*\}/.exec(rail);
    expect(made, "the profiled saint's band is made in the rail").not.toBeNull();
    expect(made![1]).toMatch(/carry: headlineSaint\.iconUrl,/);
    // His page: the hero is given his icon's address, and both its forms take that address.
    expect(read("components/saints/SaintHero.tsx")).toMatch(/<SaintHeroPicture[^>]*iconUrl=\{saint\.iconUrl\}/);
    const hero = read("components/saints/SaintHeroPicture.tsx");
    expect(hero.match(/data-carry-into=\{iconUrl\}/g) ?? []).toHaveLength(2);
    // And the Saints tab's cards give the same key, so the band travels as they do.
    expect(read("components/saints/SaintIcon.tsx")).toMatch(/data-carry=\{saint\.iconUrl \|\| undefined\}/);
  });

  it("what stands on the picture in the card is pictured over it while it travels", () => {
    // Its shade and its words, the frame's siblings in the link (wear names
    // the siblings marked data-carry-over, three at most).
    const all = tags(band);
    const frame = all.find((t) => /\sdata-carry=/.test(t.head))!;
    const shade = all.find((t) => t.at > frame.at && /bg-gradient-to-r/.test(t.head));
    const words = all.find((t) => t.at > frame.at && /relative block px-4 py-3\.5/.test(t.head));
    expect(shade?.head, "the shade over his picture").toMatch(/\sdata-carry-over=""/);
    expect(words?.head, "his name and line beside it").toMatch(/\sdata-carry-over=""/);
    expect(all.filter((t) => /\sdata-carry-over=/.test(t.head))).toHaveLength(2);
  });
});
