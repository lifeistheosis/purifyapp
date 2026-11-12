// The web behind a tall card is inert (the arbiter's word, 2026-11-12, on the gate's confirm run). When the card
// stands tall, the faded web behind it cannot be tapped or focused: a tap on it lands on the empty web, which lowers
// the card as a backdrop does, and nothing under the card opens. The focus stands in the card meanwhile, whatever
// raised it, and goes back where it was when the card lowers. Before, the faded saints at 30 percent could still be
// tapped and reached by the keyboard, their words at 1.5 to 2.6:1. The taps and the focus are walked in the browser
// on the export (four webs at 390 and 320); this holds the code that does it.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** A source file with its whitespace run together, so a rule reads the same however its lines are broken. */
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\s+/g, " ");
const web = read("components/saints/web/WebConstellation.tsx");
const card = read("components/saints/web/WebCard.tsx");

describe("the web behind a tall card", () => {
  it("is inert while the card stands tall, and the card keeps the focus and gives it back when it lowers", () => {
    // The web's tall is the card's.
    expect(web).toContain('const tall = card === "tall" && !dragging;');
    // The canvas, which holds every saint, his name and his line, the threads and the middle saint, is inert while tall.
    const canvas = /<div ref=\{canvasRef\}[^>]*?className="saint-web-canvas absolute inset-0"/.exec(web)?.[0] ?? "";
    expect(canvas, "the web's canvas").not.toBe("");
    expect(canvas).toContain("inert={tall}");
    // A tap that lands on the empty web while the card is tall brings the card down, and does nothing else.
    expect(web).toContain('if (el === room || el === slotRef.current || el === canvasRef.current) setCard((c) => (c === "tall" ? "short" : "tucked"));');

    // The last place the focus stood outside the tall face is kept.
    expect(card).toContain('document.addEventListener("focusin", keep);');
    expect(card).toContain("if (e.target instanceof HTMLElement && !tallRef.current?.contains(e.target)) focusBack.current = e.target;");
    // Tall: the focus goes into the tall face, whether a key or a finger raised the card.
    expect(card).toContain("if (tall) { if (!tallRef.current?.contains(document.activeElement)) lessRef.current?.focus({ preventScroll: true }); return; }");
    // Lowered from tall with the focus lost: it goes back where it was, unless that is gone or inert now.
    expect(card).toContain("const lowered = wasTall.current && !tall;");
    expect(card).toMatch(/if \(!lowered\) return;.*back\?\.isConnected && !back\.closest\("\[inert\]"\)\) back\.focus\(\{ preventScroll: true \}\);/);
    // A key that lowers it still lands on the control that raises it again.
    expect(card).toContain('if (want === "short" && !away) { shortRef.current?.focus(); return; }');
  });
});
