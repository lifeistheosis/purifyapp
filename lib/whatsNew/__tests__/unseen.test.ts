// Whether this release's notes are new to the device: the bell in the phone
// tab bar is drawn filled while they are (components/nav/NotificationsButton).
//
// What a reader would notice if this broke: a bell lit for good, or one that
// never lights for a new release. Versions are read as numbers, so 1.10 is
// newer than 1.9.

import { describe, expect, it } from "vitest";

import { CURRENT_VERSION, whatsNewUnseen } from "../version";

describe("a release's notes are new to the device", () => {
  it("when nothing is kept, or what is kept is not a version", () => {
    expect(whatsNewUnseen(null, "1.6")).toBe(true);
    expect(whatsNewUnseen("", "1.6")).toBe(true);
    expect(whatsNewUnseen("soon", "1.6")).toBe(true);
    expect(whatsNewUnseen("1.x", "1.6")).toBe(true);
  });

  it("when the kept version is older, read number by number", () => {
    expect(whatsNewUnseen("1.5", "1.6")).toBe(true);
    expect(whatsNewUnseen("1.9", "1.10")).toBe(true);
    expect(whatsNewUnseen("1.6", "1.6.1")).toBe(true);
    expect(whatsNewUnseen("0.9", "1.0")).toBe(true);
  });

  it("and not when it is this release or a later one", () => {
    expect(whatsNewUnseen("1.6", "1.6")).toBe(false);
    expect(whatsNewUnseen("1.6.0", "1.6")).toBe(false);
    expect(whatsNewUnseen("1.10", "1.9")).toBe(false);
    // The export walk keeps "99" to say every release has been seen.
    expect(whatsNewUnseen("99", "1.6")).toBe(false);
    expect(whatsNewUnseen(CURRENT_VERSION)).toBe(false);
  });
});
