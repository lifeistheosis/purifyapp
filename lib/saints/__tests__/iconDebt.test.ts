// The admin's list of saint icons to clear (item A9). It only reads the icon
// rights file, so these hold that it reads it right: every file once, the
// debt first, and the counts that the rights file's own test bounds.

import { describe, expect, it } from "vitest";

import { ICON_RIGHTS, UNVERIFIED_ICONS } from "../iconRights";
import { iconList } from "../iconDebt";

describe("iconList, on the real registries", () => {
  const list = iconList();

  it("lists every icon the rights file knows, once", () => {
    const files = list.rows.map((r) => r.file);
    expect(new Set(files).size).toBe(files.length);
    expect(files.length).toBe(new Set([...Object.keys(ICON_RIGHTS), ...Object.keys(UNVERIFIED_ICONS)]).size);
  });

  it("counts the debt as the rights file holds it, the questions first and then the rest of the debt", () => {
    const debtAsked = list.rows.filter((r) => r.state === "needs-you" && r.file in UNVERIFIED_ICONS).length;
    expect(list.toClear + debtAsked).toBe(Object.keys(UNVERIFIED_ICONS).length);
    expect(list.rows.slice(0, list.needsYou).every((r) => r.state === "needs-you")).toBe(true);
    expect(list.rows.slice(list.needsYou, list.needsYou + list.toClear).every((r) => r.state === "to-clear")).toBe(true);
    expect(list.needsYou + list.toClear + list.unnamed + list.settled).toBe(list.rows.length);
  });

  it("names the saints that show an icon", () => {
    const anthony = list.rows.find((r) => r.file === "anthony-the-great.jpg");
    expect(anthony?.saints.length).toBeGreaterThan(0);
  });
});

describe("iconList, on a small set", () => {
  const list = iconList({
    rights: {
      "b.jpg": {
        status: "verified",
        inspectedOn: "2026-11-01",
        alt: "a",
        work: "w",
        artist: "x",
        workDate: "c. 1400",
        source: "Wikimedia Commons",
        license: "Public domain",
        evidenceUrl: "https://example.org",
      },
      "c.jpg": {
        status: "permission",
        inspectedOn: "2026-11-02",
        grantedBy: "Supplied by the owner",
        confirmedOn: "2026-11-02",
        license: "Used with permission",
        alt: "a",
        work: "w",
        artist: "Unrecorded",
        workDate: "Unrecorded",
        source: "Supplied by the owner",
      },
    },
    unverified: { "z.jpg": "No source. 321x420 JPG, 22 KB. Not yet opened.", "a.jpg": "No source.", "q.jpg": "No source." },
    unnamed: ["c.jpg"],
    questions: { "q.jpg": { question: "A living iconographer's work: ask for permission, or find another?", candidateUrl: "https://example.org/q" } },
    saints: [
      { name: "St A", iconUrl: "/saints/icons/a.jpg" },
      { name: "St A2", iconUrl: "/saints/icons/a.jpg" },
      { name: "St B", iconUrl: "/saints/icons/b.jpg" },
      { name: "No icon" },
    ],
    authors: { "St. B": "/saints/icons/b.jpg" },
  });

  it("puts the owner's questions first, then the debt A to Z, then the unnamed permissions, then the settled", () => {
    expect(list.rows.map((r) => [r.file, r.state])).toEqual([
      ["q.jpg", "needs-you"],
      ["a.jpg", "to-clear"],
      ["z.jpg", "to-clear"],
      ["c.jpg", "unnamed"],
      ["b.jpg", "verified"],
    ]);
    expect(list).toMatchObject({ needsYou: 1, toClear: 2, unnamed: 1, settled: 1 });
    expect(list.rows[0].question?.candidateUrl).toBe("https://example.org/q");
  });

  it("carries who shows it, the notes, the size the record states, and the picture's address", () => {
    const a = list.rows[1];
    expect(a).toMatchObject({ saints: ["St A", "St A2"], inNotes: false, size: null, url: "/saints/icons/a.jpg", inspectedOn: null, question: null });
    expect(list.rows[2].size).toBe("321x420 JPG, 22 KB");
    const b = list.rows[4];
    expect(b).toMatchObject({ saints: ["St B"], inNotes: true, inspectedOn: "2026-11-01" });
    expect(b.note).toBe("Wikimedia Commons; Public domain");
  });
});
