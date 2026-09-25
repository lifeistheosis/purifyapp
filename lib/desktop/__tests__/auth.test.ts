import { describe, expect, it } from "vitest";

import { desktopAuthRedirect } from "../auth";

describe("desktopAuthRedirect", () => {
  it("returns to the app with the page to land on", () => {
    expect(desktopAuthRedirect("/account/profile")).toBe("purify://auth-callback?next=%2Faccount%2Fprofile");
  });

  it("never carries anything but a plain site path", () => {
    expect(desktopAuthRedirect("//evil.example")).toBe("purify://auth-callback?next=%2F");
    expect(desktopAuthRedirect("https://evil.example")).toBe("purify://auth-callback?next=%2F");
  });
});
