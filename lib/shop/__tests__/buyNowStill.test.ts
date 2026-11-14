// Buy now stays under the finger when the agreement is asked for (1.9, Gate
// 2's third fault, 2026-11-14).
//
// On a phone the piece's buy bar (components/shop/BuyBar.tsx) stands on the
// screen's foot (fixed, bottom-0), so it grows upward: whatever comes into it
// lifts everything above that place by its own height. Buy now with the box
// not ticked lets down "Please agree to the Terms and shipping & refund policy
// first."; that line stood under the box, so the bar rose by it and carried
// Buy now up 27px under the finger (/shop/icons/byzantine-three-beam-wall-
// cross/, both readers). Ticking the box took the line away the same way, and
// the box went down 27px under the finger.
//
// This reads the bar as written: on a phone the line stands before Buy now
// and the box in the bar's order (its head), so it lifts only the bar's edge
// and the price; it is opened and folded by its own height, never by
// picturing the whole bar, whose picture moved Buy now with it. In the
// sidebar (md and up) it stays under the box, where the sidebar grows down.
// And the clickwrap is held as it was: the box, its words, termsAccepted,
// and the ask before checkout.
//
// What a reader would notice if this broke: Buy now, or the box, jumps away
// from the finger the moment the agreement is asked for.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const BAR = readFileSync(join(process.cwd(), "components", "shop", "BuyBar.tsx"), "utf8");

/** The class string of the element whose JSX opens at `at` (the first className after it). */
function classAfter(at: number): string {
  return /className=(?:"([^"]*)"|\{cn\(\s*"([^"]*)")/.exec(BAR.slice(at))?.slice(1).find(Boolean) ?? "";
}

describe("Buy now and the box stay under the finger when the agreement is asked for", () => {
  const buyNow = BAR.indexOf("onClick={startCheckout}");
  const box = BAR.indexOf("ref={agreeRef}");
  // The line the reader sees: the one element inked as an error.
  const line = BAR.indexOf("text-crimson-soft");

  it("reads the bar, Buy now, the box and the line", () => {
    expect(BAR).toContain('"fixed inset-x-0 bottom-0 ');
    expect(buyNow).toBeGreaterThan(0);
    expect(box).toBeGreaterThan(buyNow);
    expect(line).toBeGreaterThan(0);
    expect(BAR.indexOf("text-crimson-soft", line + 1), "one line for what a tap says").toBe(-1);
  });

  it("on a phone the line stands at the bar's head, before Buy now and the box", () => {
    if (line < buyNow) return;
    // Written after them, so it must be ordered first on a phone, in a column the bar's words stand in.
    const opening = BAR.lastIndexOf("<div", line);
    const wrapper = BAR.slice(opening, line);
    expect(wrapper, "the line's wrapper is first in the bar's order on a phone").toMatch(/\bmax-md:order-first\b/);
    const column = /<div className="(mx-auto [^"]*max-w-\[560px\][^"]*)">\s*\{\/\* The price, and whether it is in hand\./.exec(BAR)?.[1] ?? "";
    expect(column, "the bar's words stand in one column, so an order applies").toMatch(/\bflex\b[^"]*\bflex-col\b/);
    // And in the sidebar, where the bar grows down, it stays under the box: no order there.
    expect(wrapper).not.toMatch(/(?<![\w-])md:order-/);
  });

  it("the line opens and folds by its own height, never by picturing the whole bar", () => {
    expect(BAR).not.toMatch(/grows: \[barRef\.current\]/);
    const opening = BAR.lastIndexOf("<div", line);
    const wrapper = BAR.slice(opening, line);
    expect(wrapper).toContain('error ? "grid-rows-[1fr]" : "grid-rows-[0fr]"');
    expect(wrapper).toContain("motion-safe:transition-[grid-template-rows]");
    expect(classAfter(line - 80)).toMatch(/\bmin-h-0\b.*\boverflow-hidden\b/);
  });

  it("the alert still reads what a tap says, once, as it comes", () => {
    expect(BAR).toMatch(/<p role="alert" className="sr-only">\s*\{error\}\s*<\/p>/);
  });

  it("the clickwrap is as it was: the box, its words, termsAccepted, and the ask first", () => {
    expect(BAR).toContain("termsAccepted: true");
    // A tap on Buy now without the box asks, lights the box and gives it the focus, and goes no further.
    const ask = BAR.slice(BAR.indexOf("if (!agreed) {"), BAR.indexOf("return;", BAR.indexOf("if (!agreed) {")));
    for (const step of ['t("shop.agreeTermsFirst")', "setNudge(true)", "agreeRef.current?.focus()"]) expect(ask).toContain(step);
    expect(ask).not.toContain("apiFetch");
    expect(BAR).toContain('type="checkbox"');
    expect(BAR).toContain("checked={agreed}");
    for (const key of ['t("ui.iAgreeToThe")', 't("shop.terms")', 't("ui.andThe")', 't("shop.shippingRefundPolicy")']) expect(BAR).toContain(key);
    // Buy now is never greyed out for the agreement: it asks.
    expect(BAR).toContain("disabled={busy}");
  });
});
