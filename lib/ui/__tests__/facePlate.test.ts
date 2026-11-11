// Every face the app draws stands on the house's plate, its lit cross at the
// middle (1.9, build 93 note 1). The owner's words, of St Alexander's empty
// circle on the First Council's page: "you could clearly see that his photo
// isn't loaded"; the arbiter's word: "never an empty circle anywhere: where
// no cleared picture exists, the plate". What a reader would notice if this
// broke: a dark empty round, an empty halo or a saint's initials where a
// picture should be, read as a picture that failed to load.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SaintIcon as CommentaryFace } from "@/components/bible/SaintIcon";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { SaintAvatar } from "@/components/shop/SaintAvatar";
import { FatherFace } from "@/components/theology/FatherFace";
import { authorIcon } from "@/lib/saints/icons";

const ROOT = process.cwd();
const draw = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const onPlate = (html: string) => html.includes('data-face-plate=""') && html.includes("cross-plate-mark");
/** The plate comes first and the picture over it, so a picture that cannot come leaves the cross. */
const plateUnder = (html: string) => onPlate(html) && html.indexOf('data-face-plate=""') < html.indexOf("<img");

describe("a face with no cleared picture is the plate", () => {
  it("on a saint's card, a commemoration's row and a feast's panel (the icon panel), with no halo or initials", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const html = draw(createElement(SaintIcon, { saint: { name: "St. Alexander of Alexandria" }, size }));
      expect(onPlate(html), size).toBe(true);
      expect(html, size).not.toContain("<img");
      expect(html, size).not.toMatch(/>\s*AA\s*</);
      expect(html, size).not.toContain("border-gold");
    }
  });

  it("beside a commentary in the Bible", () => {
    const author = "A commentator the library has no picture of";
    expect(authorIcon(author)).toBeFalsy();
    const html = draw(createElement(CommentaryFace, { author }));
    expect(onPlate(html)).toBe(true);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/>\s*AC?\s*</);
  });

  it("in the shop's saint round", () => {
    const html = draw(createElement(SaintAvatar, { saint: { shortName: "Nicholas the Wonderworker", iconUrl: null }, sizes: "64px", className: "size-16" }));
    expect(onPlate(html)).toBe(true);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/>\s*NW\s*</);
  });

  it("in Theology's round: a Father before his picture is chosen, and a text no saint wrote", () => {
    for (const father of [{ slug: "alexander-of-alexandria", name: "St. Alexander of Alexandria" }, { name: "The Council of Laodicea" }, undefined]) {
      const html = draw(createElement(FatherFace, { father, size: 34 }));
      expect(onPlate(html), father?.name ?? "no father").toBe(true);
      expect(html).not.toMatch(/>\s*[A-Z]\s*</);
    }
  });
});

describe("a face with a picture stands on the plate, the picture over it", () => {
  it("in the icon panel, the commentary's round and the shop's round", () => {
    expect(plateUnder(draw(createElement(SaintIcon, { saint: { name: "St. Cyprian of Carthage", iconUrl: "/saints/icons/cyprian-of-carthage.jpg" } })))).toBe(true);
    const author = "St. John Chrysostom";
    expect(authorIcon(author)).toBeTruthy();
    expect(plateUnder(draw(createElement(CommentaryFace, { author })))).toBe(true);
    expect(plateUnder(draw(createElement(SaintAvatar, { saint: { shortName: "Apostle Peter", iconUrl: "/saints/icons/apostle-peter.v2.jpg" }, sizes: "64px" })))).toBe(true);
  });
});

/** Every file under components/ that draws a saint's framed face (SaintFace). */
function facesDrawn(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && fs.readFileSync(p, "utf8").includes("<SaintFace")) out.push(path.relative(ROOT, p).split(path.sep).join("/"));
    }
  };
  walk(path.join(ROOT, "components"));
  return out.sort();
}

describe("every frame a saint's face is drawn in", () => {
  // Drawn with no frame of their own, so nothing empty can stand there; each with its reason.
  const FRAMELESS: Record<string, string> = {
    "components/theology/StudyCover.tsx": "a study's cover: the whole icon of its subject always stands under his portrait",
    "components/today/ChurchTodayRail.tsx": "the day's saint's band: his face melts into its side, and a saint with no face has a band of words alone",
  };

  it("stands on the plate, or is known to draw no frame", () => {
    const files = facesDrawn();
    expect(files.length).toBeGreaterThanOrEqual(7);
    const missing = files.filter((f) => !FRAMELESS[f] && !fs.readFileSync(path.join(ROOT, f), "utf8").includes("<FacePlate"));
    expect(missing, "a face's frame with no FacePlate (components/ui/CrossPlate.tsx) shows an empty round when it has no picture").toEqual([]);
    for (const f of Object.keys(FRAMELESS)) expect(files, `${f} no longer draws a face; take it off FRAMELESS`).toContain(f);
  });

  it("puts the picture over the plate, never under it", () => {
    // A plain <img> after an absolute plate paints under it; each face's picture is positioned.
    for (const f of ["components/theology/FatherFace.tsx", "components/theology/FathersShelf.tsx", "components/today/SaintWindow.tsx"]) {
      expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).toMatch(/<SaintFace [^>]*className="relative"/);
    }
    expect(fs.readFileSync(path.join(ROOT, "components/councils/CouncilFathers.tsx"), "utf8")).toMatch(/<SaintFace [^>]*className="absolute inset-0"/);
  });
});
