import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEMES, THEME_ACCENT_MAX_LUMINANCE, luminance, readableThemeAccent, readableThemeColor } from "@/lib/profile/cosmetics";
import type { PublicProfile } from "@/lib/profile/publicProfile";

/**
 * A shared profile's link preview (app/(app)/u/[handle]/opengraph-image.tsx,
 * website only) draws a theme's foot as the card does: no lighter than the
 * floor (readableThemeAccent, the arbiter, 2026-11-11 20:25 UTC). The words
 * of the preview stand on its lower half, and a reader's own pale pick, left
 * as saved, could fall under them in a message's link preview. The card got
 * the floor in 7e2d2201b; the preview takes the same function, not a copy.
 */

// The picture as the route builds it, not as a PNG: the element handed to ImageResponse.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(
      public element: ReactElement,
      public options: unknown,
    ) {}
  },
}));
const shared = vi.hoisted(() => ({ profile: null as unknown }));
vi.mock("@/lib/profile/shared", () => ({ sharedProfile: async () => shared.profile }));

const reader = (themePrimary: string | null, themeAccent: string | null) =>
  ({
    handle: "herman",
    name: "Herman",
    private: false,
    bio: "Learning the Paschal Canon by heart.",
    status: null,
    cosmetics: { bannerColor: null, bannerUrl: null, themePrimary, themeAccent, decoration: null, effect: null, nameColor: null, bannerMotion: null },
  }) as unknown as PublicProfile;

/** The preview's ground, as the route writes it on its outermost box. */
async function ground(profile: PublicProfile): Promise<string> {
  shared.profile = profile;
  const { default: Image } = await import("@/app/(app)/u/[handle]/opengraph-image");
  const picture = (await Image({ params: Promise.resolve({ handle: "herman" }) })) as unknown as { element: ReactElement<{ style: { background: string } }> };
  expect(isValidElement(picture.element)).toBe(true);
  return picture.element.props.style.background;
}

describe("a shared profile's link preview", () => {
  beforeEach(() => {
    shared.profile = null;
  });

  it("draws a reader's own pale foot no lighter than the card does", async () => {
    // As the server sends a pale pick: each colour deepened only to the top colour's limit.
    for (const pick of ["#ff0000", "#ffffff", "#ffff00", "#00ffff"]) {
      const saved = readableThemeColor(pick)!;
      const foot = readableThemeAccent(saved)!;
      expect(foot, pick).not.toBe(saved);
      expect(luminance(foot), pick).toBeLessThanOrEqual(THEME_ACCENT_MAX_LUMINANCE);
      const background = await ground(reader(saved, saved));
      expect(background, pick).toBe(`linear-gradient(180deg, ${saved} 0%, ${foot} 100%)`);
    }
  });

  it("leaves every house theme's foot as it is, and a profile without a theme on the house's night", async () => {
    for (const t of THEMES) {
      expect(await ground(reader(t.primary, t.accent)), t.id).toBe(`linear-gradient(180deg, ${t.primary} 0%, ${t.accent} 100%)`);
    }
    expect(await ground(reader(null, null))).toBe("linear-gradient(180deg, #2a2a30 0%, #101013 100%)");
  });
});
