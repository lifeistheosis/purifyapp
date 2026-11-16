// Build 98 (Updates 98l, from Updates 98i's Arabic still of Now Playing): in Arabic the transport row
// followed the page's direction, so it read forward 15, Pause, back 15 from the right, and next, whose
// mark turned round with it, stood at the left. Media controls name the direction of time, not of
// reading: the row keeps its order in every language (back 15, Play or Pause, forward 15, next, with
// previous before them), and next's mark points on in time. checkMock's mirror pass is told so by name
// and reason on the row (data-mock-allow="mirror"), and a piece that sets its own direction is kept.
//
// The row is components/player/Transport.tsx, Now Playing's (through PlayerSteps) and a chant's Sing
// along's; the dock and the mini player carry Play alone.
//
// Fails on the code before the mend: the row sets no direction, and StepGlyph turns round in Arabic.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = fs.readFileSync(path.join(process.cwd(), "components/player/Transport.tsx"), "utf8");
const transport = SRC.slice(SRC.indexOf("export function Transport("), SRC.indexOf("function StepButton("));

describe("the transport row in every language", () => {
  it("keeps its order, back 15, Play, forward 15, next, whatever the page's direction", () => {
    const rows = [...transport.matchAll(/<div dir="ltr" \{\.\.\.TIME_ROW\} className=\{cn\("flex items-center justify-(center gap-10|between)"/g)];
    expect(rows.map((m) => m[1])).toEqual(["center gap-10", "between"]);
    expect(transport.indexOf('onClick={() => onSkip(-15)}')).toBeLessThan(transport.indexOf("onClick={onToggle}"));
    expect(transport.indexOf("onClick={onToggle}")).toBeLessThan(transport.indexOf("onClick={() => onSkip(15)}"));
    expect(transport.indexOf("<StepButton step={steps.previous} back />")).toBeLessThan(transport.indexOf("{middle}\n      <StepButton step={steps.next} />"));
  });

  it("tells checkMock's mirror pass why it stays, by name and reason", () => {
    const row = SRC.match(/const TIME_ROW = \{([\s\S]*?)\} as const;/)?.[1] ?? "";
    expect(row).toContain('"data-mock-allow": "mirror"');
    expect(row).toMatch(/"data-mock-why": "media controls name the direction of time, not of reading/);
  });

  it("points next on in time, never turned round for Arabic", () => {
    const glyph = SRC.slice(SRC.indexOf("export function StepGlyph("), SRC.indexOf("export function optionClass("));
    expect(glyph).toContain("<svg");
    expect(glyph).not.toMatch(/rtl:|scale-x/);
  });
});
