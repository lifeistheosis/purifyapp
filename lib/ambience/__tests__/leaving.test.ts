// Build 97 note 10, round 4 (Updates 65, mended by Updates 67). Closing the
// ambience over the player's Words view fell in 26 frames in 1.5s on the
// export (68 dropped, longest 233ms; scripts/ambience-open-walk.mjs wants 60),
// worse than before the words were made to rest under it (32). The words woke
// as the sheet began to close: `open` turned false at the tap, while the house
// sheet's close ran 300ms more, so their glow was restyled every frame behind
// the falling sheet. The rule: they wait until the sheet has gone, which the
// sheet's own content says as the house sheet lets it go.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ambience/warmPhotos", () => ({ warmAmbiencePhotos: () => Promise.resolve() }));

import { closeAmbience, isAmbienceLeaving, markAmbienceDrawn, openAmbience } from "@/lib/ambience/sheet";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("the ambience sheet's close, over the player's words", () => {
  it("runs from the close until the house sheet lets the sheet go", () => {
    expect(isAmbienceLeaving()).toBe(false);
    openAmbience({ overPlayer: true });
    markAmbienceDrawn(true);
    expect(isAmbienceLeaving()).toBe(false);
    closeAmbience();
    expect(isAmbienceLeaving()).toBe(true);
    markAmbienceDrawn(false);
    expect(isAmbienceLeaving()).toBe(false);
  });

  it("ends at once when the sheet is opened again during its close", () => {
    openAmbience({ overPlayer: true });
    markAmbienceDrawn(true);
    closeAmbience();
    expect(isAmbienceLeaving()).toBe(true);
    openAmbience({ overPlayer: true });
    expect(isAmbienceLeaving()).toBe(false);
    closeAmbience();
    markAmbienceDrawn(false);
    expect(isAmbienceLeaving()).toBe(false);
  });

  it("is said by the sheet's own content, which the house sheet draws only until its close has run", () => {
    const sheet = read("components/player/AmbienceSheet.tsx");
    const content = sheet.slice(sheet.indexOf("function AmbienceSheetContent"));
    expect(content).toMatch(/useLayoutEffect\(\(\) => \{\s*markAmbienceDrawn\(true\);\s*return \(\) => markAmbienceDrawn\(false\);\s*\}, \[\]\);/);
    expect(sheet).toMatch(/<Sheet[\s\S]*?<AmbienceSheetContent overPlayer=\{overPlayer\} \/>\s*<\/Sheet>/);
    // The house sheet drops its content once it lets go (lib/ui/useDraggableSheet.ts, 300ms after
    // the close): were it ever kept, the words would never wake.
    expect(read("components/ui/Sheet.tsx")).toMatch(/if \(!mounted \|\| typeof document === "undefined"\) return null;/);
  });

  it("keeps Now Playing's words at rest until then", () => {
    const player = read("components/player/NowPlayingSheet.tsx");
    expect(player).toMatch(/const ambienceLeaving = useAmbienceLeaving\(\) && ambienceSheet\.overPlayer;/);
    expect(player).toMatch(/active=\{words && !covered && !ambienceLeaving\}/);
  });
});
