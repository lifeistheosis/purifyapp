// A reader whose Plus has lapsed still reads what they gathered (1.9, rec 10,
// ideas.json c-flor-gate-flash, the other half), read-only.
//
// What it holds, in the components themselves (the gate decides on the
// device, after the store is read, so a server render cannot show it): the
// gate shows the card and, when the device keeps gatherings, those gatherings
// to read; the hub then offers nothing that begins or keeps one; a gathering
// then offers no note, no removal, no handing on and no Delete; a reader with
// nothing gathered meets the card alone, as before.
//
// What a reader would notice if this broke: their own gatherings hidden
// behind the card once Plus lapsed, or a lapsed reader able to keep
// gathering without Plus.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(rel, "utf8");
const gate = read("components/florilegium/FlorilegiumGate.tsx");
const hub = read("components/florilegium/FlorilegiaHub.tsx");
const detail = read("components/florilegium/FlorilegiumDetail.tsx");

describe("a lapsed reader's gatherings", () => {
  it("the gate: the card, and the device's gatherings under it to read, or the card alone with none", () => {
    expect(gate).toContain("return <KeptReadOnly gate={gate} detailId={detailId} />;");
    expect(gate).toContain("if (!mounted || florilegia.length === 0) return <>{gate}</>;");
    expect(gate).toContain("<FlorilegiumDetail id={detailId} readOnly />");
    expect(gate).toContain("<FlorilegiaHub readOnly />");
    // Entitled readers are as they were.
    expect(gate).toContain("return detailId ? <FlorilegiumDetail id={detailId} /> : <FlorilegiaHub />;");
  });

  it("the hub, read-only: the gatherings to open, and no new one, no starter, no sync line", () => {
    const start = hub.indexOf("if (readOnly) {");
    const branch = hub.slice(start, hub.indexOf("\n  }\n", start));
    expect(branch).toContain("data-florilegium-yours");
    expect(branch).toContain("<GatheringRow f={f} />");
    for (const absent of ["setCreating", "STARTERS", "SyncLine", "StarterSheet", "create("]) expect(branch, absent).not.toContain(absent);
  });

  it("a gathering, read-only: its lines and notes, with no note added, nothing removed, nothing handed on, no Delete", () => {
    expect(detail).toContain("readOnly={readOnly}");
    // Handing on and Delete stand in one part at the foot, and the whole of it is a reader's with Plus.
    const tools = detail.slice(detail.indexOf("{readOnly ? null : ("), detail.indexOf("<ConfirmDialog"));
    expect(tools).toMatch(/^\{readOnly \? null : \(\s*<div className="mt-8" data-gathering-tools="">/);
    for (const held of ["shareText(", "printPart", "setConfirmingDelete(true)"]) expect(tools, held).toContain(held);
    const before = detail.slice(0, detail.indexOf("{readOnly ? null : ("));
    for (const held of ["shareText(", "onClick={printPart}", "setConfirmingDelete(true)"]) expect(before, held).not.toContain(held);
    expect(detail).toContain("{!editing && !readOnly && (");
  });

  it("its back link points back with the icon, on the reading side, in every language", () => {
    expect(detail).toContain('<ChevronLeft size={16} className="me-1.5 shrink-0 rtl:-scale-x-100" />');
    expect(detail).not.toContain("←");
  });
});
