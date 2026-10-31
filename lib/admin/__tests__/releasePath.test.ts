import { describe, expect, it } from "vitest";

import { DROPS } from "@/lib/drop/current";
import type { Drop } from "@/lib/drop/kit";

import { FOCUS_MOMENT, checkLine, openingStep, pathSteps, standing, stepRight, stepTitle, type LiveState } from "../releasePath";

/**
 * Releases, his pick A on r3-17 (2026-10-30): one path in the drop's order,
 * the step that waits on him open with its tool, every old tab landing on
 * its step. Run over the app's own 1.8 drop file; the marks are made up.
 */

const DROP = DROPS["1.8"] as Drop;
const NOW = Date.parse("2026-10-30T18:00:00Z");

const live = (over: Partial<LiveState> = {}): LiveState => ({
  plan: { moments: {}, done: {}, stores: {}, upcoming: [] },
  notes: [{ version: "1.8", published: false }],
  ...over,
});

const proposal = { version: "1.8", author: "claude", created_at: "2026-10-30T16:00:00Z", status: "pending" };

describe("the path", () => {
  it("is the drop's six moments in order", () => {
    const steps = pathSteps(DROP, live(), [], NOW);
    expect(steps.map((s) => s.moment)).toEqual(["ready", "submit", "web", "stores", "after", "numbers"]);
    expect(steps.map((s) => s.title)).toEqual([
      "The 1.8 note",
      "Store texts, then submit both builds",
      "The board message, Discord, our post in Community",
      "The release email, the update prompt, the cards",
      "A notification",
      "The first week's numbers",
    ]);
    expect(steps[0].eyebrow).toBe("1 · Before anything goes out");
    expect(steps.reduce((n, s) => n + s.pieces.length, 0)).toBe(DROP.pieces.length);
  });

  it("lights the note when Claude's change waits on him, and says who and when", () => {
    const steps = pathSteps(DROP, live(), [proposal], NOW);
    expect(steps[0]).toMatchObject({ state: "current", waitsOnYou: true, meta: "A change from Claude, 2 h ago" });
    expect(stepRight(steps[0])).toBe("Waits on you");
    expect(steps.slice(1).every((s) => s.state === "later" && !s.waitsOnYou)).toBe(true);
    expect(stepRight(steps[1])).toMatch(/^\d+ to go$/);
  });

  it("moves on once a step is done", () => {
    const done = Object.fromEntries(
      DROP.pieces.filter((p) => p.moment === "ready").map((p) => [p.id, { on: "2026-10-30", notes: null }]),
    );
    const steps = pathSteps(DROP, live({ plan: { moments: {}, done, stores: {}, upcoming: [] }, notes: [{ version: "1.8", published: true }] }), [], NOW);
    expect(steps[0].state).toBe("done");
    expect(stepRight(steps[0])).toBe("Done");
    expect(steps[1].state).toBe("current");
  });

  it("opens the step that waits, or the one an old link lands on", () => {
    const steps = pathSteps(DROP, live(), [proposal], NOW);
    expect(openingStep(steps, null)).toBe("ready");
    expect(openingStep(steps, "note")).toBe("ready");
    expect(openingStep(steps, "email")).toBe("stores");
    expect(openingStep(steps, "push")).toBe("after");
    expect(FOCUS_MOMENT).toEqual({ note: "ready", email: "stores", push: "after" });
  });

  it("reads a piece's state from the file with his marks over it", () => {
    const note = DROP.pieces.find((p) => p.channel === "note")!;
    expect(standing(DROP, note, live()).label).toBe("Not filed yet");
    expect(standing(DROP, note, live({ notes: [{ version: "1.8", published: true }] })).tone).toBe("emerald");
    const board = DROP.pieces.find((p) => p.channel === "board")!;
    const marked = live({ plan: { moments: {}, done: { [board.id]: { on: "2026-11-12", notes: null } }, stores: {}, upcoming: [] } });
    expect(standing(DROP, board, marked)).toEqual({ label: "Sent Thu 12 Nov", tone: "emerald" });
  });

  it("names each step the same way for any release", () => {
    expect(stepTitle("ready", "1.9")).toBe("The 1.9 note");
  });

  it("says what the check found in one line", () => {
    expect(checkLine(DROP, [])).toEqual({
      passes: true,
      title: "The check passes",
      line: `${DROP.pieces.length} pieces, none refused. ${DROP.never.length === 1 ? "One word waits until it is true." : `${DROP.never.length} words wait until they are true.`}`,
    });
    const refused = checkLine(DROP, [{ level: "error" }, { level: "warn" }]);
    expect(refused.passes).toBe(false);
    expect(refused.title).toBe("The check refuses one piece");
  });
});
