// Whether the on-screen keyboard is up (lib/ui/viewport.ts, keyboardCovers),
// which the one search reads (1.8, the owner's pick of r3-12): while it is up
// the search shows what answers before the Search key, and once it steps
// away, the results.
//
// What a reader would notice if this broke: the results never showing after
// the keyboard was put away, or a phone turned on its side read as a phone
// with its keyboard up.

import { describe, expect, it } from "vitest";

import { keyboardCovers } from "../viewport";

describe("the keyboard over the screen's foot", () => {
  it("shows where a phone lays it over the page and leaves the window as it was", () => {
    expect(keyboardCovers(390, 844, 0, 844)).toBe(false);
    expect(keyboardCovers(390, 508, 0, 844)).toBe(true);
    expect(keyboardCovers(390, 844, 0, 844)).toBe(false);
  });

  it("shows where an app's window shrinks for it, against the tallest the screen has been", () => {
    expect(keyboardCovers(391, 800, 0, 800)).toBe(false);
    expect(keyboardCovers(391, 470, 0, 470)).toBe(true);
    // A small change is a bar, not a keyboard.
    expect(keyboardCovers(391, 760, 0, 760)).toBe(false);
  });

  it("measures again when the phone turns", () => {
    expect(keyboardCovers(392, 800, 0, 800)).toBe(false);
    expect(keyboardCovers(800, 392, 0, 392)).toBe(false);
  });
});
