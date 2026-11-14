// The saints' grid with motion reduced (Updates 40, the arbiter's routing of
// 2026-11-14; found by Updates 39 once the century bars were named). A filter
// chosen on the still path changes the page at once, and the count of the
// filter ("N saints") came into the flow above the grid, which moved from 40px
// below the timeline to 16px below the count: the grid jumped 37px under the
// finger, 3 recordings of 3 ("The Apostle to the Nations", the gate's judge,
// scripts/gate/frames.mjs). The grid now stands in one place in both states,
// and the count sits in the gap above it, out of the flow; the page with no
// filter is as it was (the grid 40px below the timeline, no count).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.join(process.cwd(), "components/saints/SaintsBrowser.tsx"), "utf8");
const at = src.indexOf('tn("saints.saintCount", visible.length)');
const grid = /<div className=(\{[^}]*\}|"[^"]*")>\s*\{visible\.map\(/.exec(src);

describe("the saints' grid stands still when a filter is chosen", () => {
  it("the grid's place does not hang on the filter", () => {
    expect(grid, "the grid of saints").not.toBeNull();
    expect(grid![1]).not.toMatch(/isFiltering/);
    expect(grid![1]).not.toMatch(/\bm[ty]-/);
  });

  it("the count is out of the flow, in the gap above the grid, set from the start", () => {
    expect(at).toBeGreaterThan(0);
    const p = src.slice(src.lastIndexOf("<p", at), at);
    expect(p).toMatch(/className="absolute bottom-full start-0 /);
    expect(p).not.toMatch(/\b(left|right)-|text-(left|right)/);
  });

  it("the gap is the one the page had with no filter: 40px, held by the box round both", () => {
    const box = src.slice(src.lastIndexOf("<div", src.lastIndexOf("<p", at)), src.lastIndexOf("<p", at));
    expect(box).toMatch(/^<div className="relative mt-10">/);
    expect(src.indexOf("{visible.map(")).toBeGreaterThan(at);
    expect(src).not.toMatch(/isFiltering \? \(\s*<p className="mt-10/);
  });
});
