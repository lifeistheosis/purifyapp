import { describe, expect, it } from "vitest";

import { headedSomewhere, isSitePath, nextPath, SIGNED_IN_HOME, withNext } from "../nextPath";

/**
 * Where the sign-in screen sends a reader (components/auth/SignInForm.tsx).
 * In the apps the export's server cannot read `?next=`, so every sign-in went
 * to Profile, and a reader the reminders step sent to sign in was not brought
 * back to their reminders. Now the address is read on the device.
 */
describe("nextPath", () => {
  it("takes what the page was given, on the website", () => {
    expect(nextPath("/settings", "?next=/elsewhere")).toBe("/settings");
  });

  it("reads the address itself in the apps, where the page is given nothing", () => {
    expect(nextPath(undefined, "?next=/")).toBe("/");
    expect(nextPath(undefined, "?next=%2Fsettings")).toBe("/settings");
  });

  it("goes to Profile when nothing usable was asked for", () => {
    expect(nextPath(undefined, "")).toBe(SIGNED_IN_HOME);
    expect(nextPath(null, null)).toBe(SIGNED_IN_HOME);
    expect(nextPath(undefined, "?error=x")).toBe(SIGNED_IN_HOME);
  });

  it("never sends a reader to another site", () => {
    for (const bad of ["//evil.example/", "/\\evil.example", "https://evil.example/", "evil", "/a\nb"]) {
      expect(isSitePath(bad), bad).toBe(false);
      expect(nextPath(bad, `?next=${encodeURIComponent(bad)}`), bad).toBe(SIGNED_IN_HOME);
    }
  });
});

/**
 * Sign-in and sign-up point at each other. A reader the gift page sent to sign
 * in (/signin?next=/gift) who has no account yet must still come back to the
 * gift after making one.
 */
describe("withNext", () => {
  it("carries the way on between the two screens", () => {
    expect(withNext("/signup", "/gift")).toBe("/signup?next=%2Fgift");
    expect(withNext("/signin", "/settings")).toBe("/signin?next=%2Fsettings");
    expect(nextPath(undefined, withNext("/signup", "/gift").slice("/signup".length))).toBe("/gift");
  });

  it("leaves the default off, and never carries another site", () => {
    expect(withNext("/signup", SIGNED_IN_HOME)).toBe("/signup");
    expect(withNext("/signup", "//evil.example/")).toBe("/signup");
    expect(withNext("/signup", "https://evil.example/")).toBe("/signup");
  });
});

describe("headedSomewhere", () => {
  it("is true for a page to come back to", () => {
    expect(headedSomewhere("?next=%2Fgift")).toBe(true);
    expect(headedSomewhere("?next=/settings")).toBe(true);
  });

  it("is false for home, Profile, nothing, or another site", () => {
    expect(headedSomewhere("?next=/")).toBe(false);
    expect(headedSomewhere(`?next=${encodeURIComponent(SIGNED_IN_HOME)}`)).toBe(false);
    expect(headedSomewhere("")).toBe(false);
    expect(headedSomewhere(null)).toBe(false);
    expect(headedSomewhere("?next=%2F%2Fevil.example%2F")).toBe(false);
  });
});
