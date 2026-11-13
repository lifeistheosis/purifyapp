// The history timeline's peek leaves whole (found with build 95 note 13, the
// arbiter's job of 2026-11-13). Its event was read from the open slug alone,
// so the moment the sheet began to close its words were gone: the panel,
// pinned to the foot of a phone, dropped about 300px in one frame and slid
// away blank, where a profile's card keeps its last face drawn as it leaves.
// Now the last event stays drawn until the sheet has gone.
//
// Read from the source, as this folder's other tests read the timeline
// (vitest runs in node, with no DOM to close a sheet in). The leaving itself
// is measured frame by frame on the export by section 42 of
// scripts/export-walk.mjs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const peek = readFileSync(join(process.cwd(), "components", "history", "EventPeekSheet.tsx"), "utf8");

describe("the history peek leaves whole", () => {
  it("keeps the last event drawn while it closes, and is open only while an event is asked for", () => {
    // The event shown is the last one asked for, kept while rendering.
    expect(peek).toMatch(/const \[kept, setKept\] = useState\(slug\);/);
    expect(peek).toMatch(/if \(slug && slug !== kept\) setKept\(slug\);/);
    expect(peek).toMatch(/const event = kept \? eventBySlug\(kept\) : undefined;/);
    // Open follows the slug: closing is a null slug, with the event still drawn.
    expect(peek).toMatch(/open=\{Boolean\(slug && event\)\}/);
    expect(peek).not.toMatch(/const event = slug \? eventBySlug\(slug\)/);
  });
});
