// Your space's choices grow their rows as a change inside the page (Gate 6c,
// 2026-11-17).
//
// The motion walk on every screen at CPU 4x, as a new reader, with motion on
// (docs/handoffs/gate-6-walks/motion-6c.tsv): on /settings/ each of the eleven
// focus cards was an instant cut, 86 to 89% of the change in one frame 102 to
// 121ms after the tap, and the reading mode preview under it jumped 48px; the
// three Familiarity choices, 77 to 80% in a frame, the Fasting row under them
// jumping 26 or 45px. A new reader has no answer yet, so the first tap brings
// the line under Familiarity (one line, or two for Practicing) and the Day 1
// under the cards, and both were drawn at once with everything below dropping
// under them. CLAUDE.md: every change moves in the house's motion; reduced
// motion stays still (lib/ui/inPageMove.ts makes the change at once there).
//
// Read as text: Settings is a client component and vitest runs in node
// (vitest.config.ts). The frames are measured on the built app by
// scripts/motion-walk.mjs.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const code = (file: string) =>
  fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const settings = code("components/settings/SettingsClient.tsx");
const space = settings.slice(settings.indexOf("function SpaceSection()"), settings.indexOf("function TestersSection("));

describe("Your space: a choice that changes its row's height", () => {
  it("Familiarity grows its own row, the line under it let down and the rows below gliding", () => {
    expect(space).toMatch(/const levelRow = useRef<HTMLDivElement>\(null\);/);
    expect(space).toMatch(/<Row\s+rowRef=\{levelRow\}[\s\S]{0,200}label=\{t\("settings\.level"\)\}/);
    expect(space).toMatch(
      /onChange=\{\(l\) =>\s*movePage\(\s*\(\) => \{\s*writeLevel\(l\);\s*writeDepth\(depthFor\(l\)\);\s*refreshDayOne\(\);\s*\},\s*\{ grows: \[levelRow\.current\] \},\s*\)\s*\}/,
    );
  });

  it("a focus card grows its row by the Day 1 it gives, and the account keeps the answer once it is written", () => {
    expect(space).toMatch(/const focusRow = useRef<HTMLDivElement>\(null\);/);
    expect(space).toMatch(/<Row rowRef=\{focusRow\}[\s\S]{0,120}label=\{t\("settings\.focus"\)\}>/);
    // The write comes inside the move, so the save reads the new answer, never the old.
    expect(space).toMatch(
      /onPick=\{\(i\) =>\s*movePage\(\s*\(\) => \{\s*writeIntent\(i\);\s*writeFocus\(\[focusFor\(i\)\]\);\s*refreshDayOne\(\);\s*void saveSpaceToAccount\(\);\s*\},\s*\{ grows: \[focusRow\.current\] \},\s*\)\s*\}/,
    );
    // Nothing writes the space outside a move.
    expect(space.match(/writeLevel\(|writeIntent\(/g)?.length).toBe(2);
  });

  it("the row lends its box to what grows it", () => {
    const panel = code("components/settings/LitPanel.tsx");
    expect(panel).toMatch(/rowRef\?: Ref<HTMLDivElement>;/);
    expect(panel).toContain('<div ref={rowRef} className="set-row">');
  });
});
