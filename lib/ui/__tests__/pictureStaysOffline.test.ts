// Updates 95 (Gate 4, 2026-11-15): with no network the website's pictures cannot come, and a picture
// that took its own box away when it failed moved the page after it had arrived.
//
//   group 1, a /history/ page: the event's plate was removed when its picture failed, and its empty
//   holder's margin ran through the column under the top bar, which fell 30px (y 72 to 102), with
//   motion on and reduced, from / and from the taps into /history/;
//   group 6, /walkthroughs/job/1/: a note's portrait square was removed when its icon failed, and
//   the person's name and feast beside it were drawn at x 89, then at 17.
//
// Online the pictures come and fade in over what stood in for them. The rule (the arbiter's): nothing
// on a page moves after it arrives, so what stands in for a picture stays when it cannot come.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** The file's code without its comments, so words in a comment neither pass nor fail these. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

describe("an event's plate stays as it opened when its picture cannot come (Gate 4, group 1)", () => {
  const plate = code("components/history/EventPlate.tsx");

  it("never takes the plate away", () => {
    expect(plate).not.toMatch(/\bfailed\b|\bsetFailed\b/);
    expect(plate).not.toContain("return null");
  });

  it("a failed AVIF still falls back to the JPEG, and a failed JPEG changes nothing", () => {
    expect(plate).toMatch(
      /onError=\{\(e\) => \{\s*if \(!jpegOnly && picture\.avif && e\.currentTarget\.currentSrc\.endsWith\("\.avif"\)\) setJpegOnly\(true\);\s*\}\}/,
    );
  });

  it("a picture already in before the page listened is shown at once, and a broken one is left unseen", () => {
    expect(plate).toContain("if (img?.complete && img.naturalWidth > 0) setArrived(true);");
    expect(plate).not.toContain("naturalWidth === 0");
  });

  it("what stands in is the frame and the picture's own colours, and the picture shows only once it is in", () => {
    // Preconditions: the stand-in the plate keeps.
    expect(plate).toContain("src={picture.preview}");
    expect(plate).toContain("relative aspect-[16/9] w-full");
    expect(plate).toContain("style={{ width: wholePlateWidth(picture, tallest) }}");
    expect(plate).toContain('arrived ? "opacity-100" : "opacity-0"');
  });
});

describe("a walkthrough note's portrait square stays when its icon cannot come (Gate 4, group 6)", () => {
  const figures = code("components/walkthrough/NoteFigures.tsx");
  const portrait = figures.slice(figures.indexOf("function PortraitIcon"), figures.indexOf("export function NoteFigures"));

  it("never takes the square away from beside the name", () => {
    expect(portrait.length).toBeGreaterThan(0);
    expect(portrait).not.toContain("return null");
    expect(portrait).not.toMatch(/state === "gone"\)\s*return/);
  });

  it("draws the square from the first frame, whatever the icon does", () => {
    expect(portrait.match(/\breturn \(/g)).toHaveLength(1);
    expect(portrait).toMatch(/return \(\s*<span aria-hidden data-walk-portrait=\{state\} className="relative block size-14 shrink-0/);
    // Precondition: the icon itself is unseen until it is in.
    expect(portrait).toContain('state === "shown" ? "opacity-100" : "opacity-0"');
  });
});
