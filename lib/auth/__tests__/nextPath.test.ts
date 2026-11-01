import { describe, expect, it } from "vitest";

import { isSitePath, nextPath, SIGNED_IN_HOME } from "../nextPath";

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
