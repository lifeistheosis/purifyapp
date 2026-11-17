import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inOrderShown, latestFirst } from "@/lib/you/you";

/**
 * You with days kept, as Gate 6c's tap walk met it (2026-11-17, app
 * b40e4192; docs/handoffs/gate-6-walks/tap-you-kept.json.gz). Two fails on
 * /account/, under the owner's pre-build gate: Back that does not return the
 * reader where they were, and a control that moves under the finger.
 *
 *  1. Where you left off, the second place tapped ("Homilies on the Gospel of
 *     Matthew"), then Back: opening it made it the newest, so the tab drawn
 *     again put it on the large card on top, and the row the reader had
 *     tapped at 458px was at 542px. lib/ui/returnPlace.ts looks for the
 *     tapped link between the two links it stood between, which the new order
 *     had changed, and gave up. Coming back by Back, the same places keep the
 *     order last drawn.
 *  2. Share under the verse: the status line under the bar, hidden with
 *     `sr-only`, kept its `pb-3`, and stood 12px out of the foot of a card
 *     that clips (`overflow-hidden`), so the card could be scrolled inside.
 *     Brought into view, Share rose 12px in the card; when "Picture saved"
 *     appeared the overflow went, and Share fell 12px under the finger.
 *
 * This reads the source and runs the ordering. How the screen behaves in a
 * built app is the walk (`bash docs/handoffs/gate-6-walks/new6.sh you`).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The You tab's own files: the page and the parts drawn on it. */
const YOU = ["components/mobile/YouMobile.tsx", ...fs.readdirSync(path.join(ROOT, "components/you")).filter((f) => f.endsWith(".tsx")).map((f) => `components/you/${f}`)];

const place = (key: string, at: number) => ({ key, at });

describe("Back to Where you left off keeps the places where the reader left them", () => {
  // The walk's reader: Morning prayers newest, then the Homilies, then Luke 10.
  const drawn = latestFirst([place("bible", 1794432600000), place("work", 1794517800000), place("prayer", 1794557100000)], 3);

  it("draws the newest first on a visit", () => {
    expect(drawn.map((p) => p.key)).toEqual(["prayer", "work", "bible"]);
  });

  it("keeps the order last drawn when the same places come back", () => {
    // The Homilies opened: now the newest.
    const now = latestFirst([place("bible", 1794432600000), place("work", Date.now()), place("prayer", 1794557100000)], 3);
    expect(now.map((p) => p.key)).toEqual(["work", "prayer", "bible"]);
    expect(inOrderShown(now, drawn.map((p) => p.key)).map((p) => p.key)).toEqual(["prayer", "work", "bible"]);
  });

  it("draws the newest first when the places are not the ones drawn", () => {
    const now = [place("work", 3), place("plan:psalter", 2), place("bible", 1)];
    expect(inOrderShown(now, ["prayer", "work", "bible"]).map((p) => p.key)).toEqual(["work", "plan:psalter", "bible"]);
    expect(inOrderShown(now, ["work", "bible"]).map((p) => p.key)).toEqual(["work", "plan:psalter", "bible"]);
    expect(inOrderShown(now, null).map((p) => p.key)).toEqual(["work", "plan:psalter", "bible"]);
    expect(inOrderShown(now, ["work", "work", "bible"]).map((p) => p.key)).toEqual(["work", "plan:psalter", "bible"]);
  });

  it("leaves the places it is given as they were", () => {
    const now = [place("work", 3), place("prayer", 2)];
    inOrderShown(now, ["prayer", "work"]);
    expect(now.map((p) => p.key)).toEqual(["work", "prayer"]);
  });

  it("asks whether Back brought the reader, and keeps the order last drawn only then", () => {
    const card = code("components/you/PickUpCard.tsx");
    const hook = card.slice(card.indexOf("export function usePickUp"), card.indexOf("export function PickUpCard"));
    // Asked once the route has committed, in the layout effect that reads the device (lib/ui/scrollReset.ts says when it may be asked).
    expect(hook).toMatch(/useLayoutEffect\(\(\) => \{[^}]*cameBack\(\)/);
    expect(hook).toMatch(/\.back \? inOrderShown\(\w+, drawnLast\) : \w+/);
    // And what was drawn is remembered, for the next Back.
    expect(hook).toMatch(/drawnLast = rows\.map\(\(r\) => r\.key\)/);
  });
});

describe("A hidden line takes no room on the You tab", () => {
  it("toggles `sr-only` only on a line that has no padding or margin of its own while hidden", () => {
    const found: string[] = [];
    for (const file of YOU) {
      for (const call of code(file).match(/cn\((?:[^()]|\([^()]*\))*\)/g) ?? []) {
        if (!/["']sr-only["']/.test(call)) continue;
        // What stands whatever the condition: the call's plain strings, outside any `x && "..."` or ternary.
        const always = call
          .replace(/[\w.!?]+\s*&&\s*["'][^"']*["']/g, "")
          .replace(/\?\s*["'][^"']*["']\s*:\s*["'][^"']*["']/g, "")
          .match(/["'][^"']*["']/g);
        const room = (always ?? []).join(" ").match(/(?:^|[\s"'])-?(?:p|m)[xytblrse]?-[\w.[\]/-]+/g);
        if (room) found.push(`${file}: ${call.replace(/\s+/g, " ")} (${room.map((r) => r.trim().replace(/^["']/, "")).join(", ")})`);
      }
    }
    expect(found).toEqual([]);
  });

  it("gives the verse's status line its room only while it says something", () => {
    const verse = code("components/you/KeptVerse.tsx");
    const line = verse.match(/<p role="status" className=\{([^}]*)\}/)?.[1] ?? "";
    expect(line).toContain('said ? "px-4 pb-3" : "sr-only"');
    expect(line).not.toMatch(/cn\("[^"]*\b(?:px|pb|py|p)-/);
  });
});
