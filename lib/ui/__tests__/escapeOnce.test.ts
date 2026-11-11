import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { escapePressed, takesEscape } from "@/lib/ui/escape";

/**
 * One press of Escape closes one thing: the sheet or the dialog that rose
 * last.
 *
 * Found by the journal's walk on an export that sells Plus, 2026-11-11: a
 * reader without Plus taps Heading under More, the Plus sheet rises over the
 * writing sheet, and Escape closed both. Every sheet listened on the window
 * for itself, so every sheet heard the key. The phone's Back has been kept
 * from this since build 90 note 1 (lib/platform/useAndroidBack.ts); this is
 * the same rule for the key (lib/ui/escape.ts).
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const key = {} as KeyboardEvent;

/** An overlay that counts the presses it answers. */
function overlay() {
  const state = { answered: 0 };
  const answer = { current: () => void (state.answered += 1) };
  return { state, answer, go: takesEscape(answer) };
}

describe("one press of Escape closes one thing", () => {
  it("with nothing up, a press is no one's", () => {
    expect(() => escapePressed(key)).not.toThrow();
  });

  it("a sheet over a sheet: the one on top answers, and the one under it does not", () => {
    const writing = overlay();
    const plus = overlay();
    escapePressed(key);
    expect(plus.state.answered).toBe(1);
    expect(writing.state.answered).toBe(0);
    // The top one gone, the next press is the lower one's.
    plus.go();
    escapePressed(key);
    expect(writing.state.answered).toBe(1);
    expect(plus.state.answered).toBe(1);
    writing.go();
    escapePressed(key);
    expect(writing.state.answered).toBe(1);
  });

  it("the lower one going first leaves the top one in its place", () => {
    const lower = overlay();
    const upper = overlay();
    lower.go();
    escapePressed(key);
    expect(upper.state.answered).toBe(1);
    expect(lower.state.answered).toBe(0);
    upper.go();
  });

  it("going twice takes nothing else with it", () => {
    const first = overlay();
    const second = overlay();
    second.go();
    second.go();
    escapePressed(key);
    expect(first.state.answered).toBe(1);
    first.go();
  });

  it("the newest handler is the one called, and a new handler does not move an overlay up the order", () => {
    const lower = overlay();
    const upper = overlay();
    let fresh = 0;
    // A render hands the lower sheet a fresh arrow: it keeps its place.
    lower.answer.current = () => void (fresh += 1);
    escapePressed(key);
    expect(upper.state.answered).toBe(1);
    expect(fresh).toBe(0);
    upper.go();
    escapePressed(key);
    expect(fresh).toBe(1);
    lower.go();
  });
});

describe("the house's sheet and its confirm dialog answer through the one rule", () => {
  const hook = read("lib/ui/escape.ts");
  const sheet = read("components/ui/Sheet.tsx");
  const confirm = read("components/ui/ConfirmDialog.tsx");

  it("the hook follows `active` alone, so a fresh handler at every render keeps its place", () => {
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*if \(!active\) return;\s*return takesEscape\(latest\);\s*\}, \[active\]\);/);
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*latest\.current = onEscape;\s*\}, \[onEscape\]\);/);
  });

  it("a sheet has no Escape listener of its own", () => {
    expect(sheet).toContain("useEscape(mounted, onClose);");
    expect(sheet).not.toContain('"Escape"');
    expect(sheet).not.toContain('addEventListener("keydown"');
  });

  it("a confirm dialog's Escape goes the same way, and Enter stays its own", () => {
    expect(confirm).toMatch(/useEscape\(open, \(e\) => \{\s*e\.preventDefault\(\);\s*if \(!pending\) onCancel\(\);\s*\}\);/);
    expect(confirm).not.toContain('"Escape"');
    expect(confirm).toContain('if (e.key !== "Enter") return;');
  });

  it("the phone's Back is kept the same way", () => {
    expect(read("lib/platform/useAndroidBack.ts")).toContain("if (onTop(me)) onBackRef.current();");
  });
});
