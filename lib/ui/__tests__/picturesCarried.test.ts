// Cause 8 of the gate: a card that opens its own page carries its picture
// into it (CLAUDE.md, "Every page switch is a transition", the owner's word of
// 2026-11-10). The motion walk on the export of 2a273a46 (Updates 37) found
// 27 cards whose picture stood on the page they opened with no View
// Transition carrying it: Theology's nine path plates and the medal of where
// the reader left off, into the step's room; the seven councils from the
// councils' page and from Theology's library, into the council's head; and
// the Fathers in the studies, into their own pages. Each card's picture now
// wears data-carry, and the head of the page it opens takes it with
// data-carry-into (lib/ui/routeMotion.ts, "A picture that leads to its own
// page"); what stands on a travelling picture is pictured apart from it
// (data-carry-over), as a tile's words are.
//
// The shop's piece, the twenty-seventh, is carried since Updates 38: its
// outline takes the card's picture (lib/shop/__tests__/pieceCarried.test.ts).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Theology's path: the plate and the medal go into the step's room", () => {
  it("each plate wears its step's picture, and the room of the step's page takes it", () => {
    expect(code("components/theology/PathPlates.tsx")).toContain('<span data-state={state} data-carry={s.picture.src} className="path-plate">');
    expect(code("app/(app)/theology/path/[subject]/page.tsx")).toContain('<div aria-hidden data-step-room="" data-carry-into={step.picture.src} className="step-room saint-icon-in">');
  });

  it("the medal of where the reader left off carries the same picture, only where it is asked to", () => {
    const medal = code("components/theology/PathMedal.tsx");
    expect(medal).toMatch(/<span data-carry=\{carry\} className="absolute overflow-hidden rounded-full/);
    const hub = code("components/theology/TheologyHub.tsx");
    // The resume card's medal is inside the link to its step; the folded path's is in a summary that opens in place.
    expect(hub).toContain("size={82} inner={66} states={states} carry={step.picture.src} />");
    expect(hub).toMatch(/size=\{44\} inner=\{34\} states=\{states\} \/>/);
  });
});

describe("the councils: the band and the film go into the council's head", () => {
  it("the council's head takes whatever picture comes to it", () => {
    expect(code("components/councils/CouncilHero.tsx")).toMatch(/data-council-hero=""\s*data-carry-into=""/);
  });

  it("the councils' page: each band's picture travels, and its words stand apart from it on the way", () => {
    expect(code("app/(app)/councils/page.tsx")).toMatch(/picture=\{picture\.src\}\s*carry=\{picture\.src\}/);
    const band = code("components/ui/GalleryBand.tsx");
    expect(band).toContain("tall={tall} priority={priority} carry={carry} />");
    expect(band).toContain('data-carry-over={carry ? "" : undefined}');
    expect(code("components/ui/BandPicture.tsx")).toContain('<span aria-hidden data-band-picture="" data-carry={carry} className=');
  });

  it("Theology's library: the film's picture in a frame cut to the card, its words apart", () => {
    const lib = code("components/theology/TheologyLibrary.tsx");
    expect(lib).toContain('<span data-carry={c.picture.src} className="absolute inset-0 overflow-hidden rounded-[inherit]">');
    expect(lib).toContain('<span data-carry-over="" className="absolute inset-x-[9px] bottom-2 z-[1]">');
  });
});

describe("the Fathers in the studies go into their own pages", () => {
  it("a Father's face wears his icon's address, which his page's icon takes (SaintHeroPicture)", () => {
    expect(code("components/theology/FathersShelf.tsx")).toContain("data-carry={picture ? f.iconUrl || undefined : undefined}");
    expect(code("components/saints/SaintHeroPicture.tsx")).toContain("data-carry-into={iconUrl}");
  });
});
