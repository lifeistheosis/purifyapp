import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * A profile's colours: four greys for everyone, the Church's colours and gold
 * for Plus members (1.8). The owner, 2026-10-31: "gold is allowed for the
 * community profiles by the way but only exclusive to plus members", and the
 * same night, picking r3-28's colour: "Two for normal users, one for plus
 * users". A free reader's profile is the sheet's way 2, black, white and the
 * greys Night, Smoke, Stone and Silver for the banner and the theme, with no
 * colour of their own; a Plus member's is way 1, the Church's colours and any
 * of their own, gold among them.
 *
 * The frames, the effects, the name colours and the moving banners were Plus
 * already, on the server (app/api/profile/me) and on the screen
 * (visibleCosmetics, and the feed's author marks). Until 1.8 a free reader
 * could put on any banner colour but gold. This holds the three places that
 * decide it now: what is saved, what others see, and what the editor sends.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
  profiles: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
// The row a save starts from is a copy of the one in the database; the
// profile it answers with is built from tables this suite does not model.
vi.mock("@/lib/profile/server", async (original) => ({
  ...(await original<typeof import("@/lib/profile/server")>()),
  loadProfileRow: async (_admin: unknown, by: { id: string }) => {
    const row = state.profiles.find((p) => p.id === by.id);
    return row ? { ...row } : null;
  },
  buildMyProfile: async (_admin: unknown, row: Row) => ({ row }),
}));

import { PUT } from "@/app/api/profile/me/route";
import {
  BANNER_COLORS,
  GREYS,
  THEMES,
  bannerNeedsPlus,
  nearestGrey,
  themeNeedsPlus,
  visibleCosmetics,
  type Cosmetics,
} from "@/lib/profile/cosmetics";
import { forgetFilter } from "@/lib/moderation/server";

const ANNA = "22222222-2222-4222-8222-222222222222";
const GOLD = "#8f6f35";
const PASCHAL = "#7d1d27";
const STONE = "#55555c";
const DAY = 86_400_000;

/** Anna's profile, with a subscription that runs until `until` (or none). */
function world({ until = null as string | null, banner = null as string | null, theme = null as null | [string, string] } = {}) {
  state.profiles = [
    { id: ANNA, handle: "anna", display_name: "Anna", banner_color: banner, theme_primary: theme?.[0] ?? null, theme_accent: theme?.[1] ?? null },
  ];
  state.admin = cappedApi({
    profiles: state.profiles,
    entitlements: until ? [{ user_id: ANNA, plus_until: until, pro_until: null }] : [],
    community_filter_terms: [],
  }).client as SupabaseClient;
  forgetFilter();
}

const anna = () => state.profiles[0];

async function save(body: Row) {
  const res = await PUT(
    new Request("https://purifyapp.net/api/profile/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: (await res.json()) as Row };
}

beforeEach(() => {
  state.user = { id: ANNA, email: "anna@example.com", user_metadata: {} };
  world();
});

describe("which colours are Plus", () => {
  it("every banner colour but the four greys: the Church's, gold, and any typed in", () => {
    for (const g of GREYS) expect(bannerNeedsPlus(g.primary), g.id).toBe(false);
    expect(bannerNeedsPlus(STONE.toUpperCase())).toBe(false);
    for (const c of BANNER_COLORS) expect(bannerNeedsPlus(c.hex), c.id).toBe(true);
    for (const hex of [GOLD, "#d4af37", "#000000", "#ffffff", "#3a3a41", "#b33200"]) expect(bannerNeedsPlus(hex), hex).toBe(true);
    // None at all, or what is not a colour, is nothing to pay for.
    expect(bannerNeedsPlus(null)).toBe(false);
    expect(bannerNeedsPlus("gold")).toBe(false);
  });

  it("every theme but the greys' four pairs, and a grey pair only as itself", () => {
    for (const g of GREYS) expect(themeNeedsPlus(g.primary, g.accent), g.id).toBe(false);
    for (const th of THEMES) expect(themeNeedsPlus(th.primary, th.accent), th.id).toBe(true);
    expect(themeNeedsPlus(GREYS[0].primary, GREYS[1].accent)).toBe(true);
    expect(themeNeedsPlus(GREYS[0].primary, THEMES[0].accent)).toBe(true);
    expect(themeNeedsPlus(null, null)).toBe(false);
  });

  it("the greys are greys: no hue a reader would call a colour", () => {
    for (const g of GREYS) {
      for (const hex of [g.primary, g.accent]) {
        const [r, gr, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        expect(Math.max(r, gr, b) - Math.min(r, gr, b), `${g.id} ${hex}`).toBeLessThanOrEqual(8);
      }
    }
  });
});

describe("what others see of a colour", () => {
  const saved = (bannerColor: string | null, theme: [string, string] | null = null): Cosmetics => ({
    bannerColor,
    bannerUrl: "https://example.supabase.co/storage/v1/object/public/avatars/b/x.webp",
    themePrimary: theme?.[0] ?? null,
    themeAccent: theme?.[1] ?? null,
    decoration: "laurel",
    effect: "gold-dust",
    nameColor: "gilded",
    bannerMotion: "shimmer",
  });

  it("everything saved, gold and the Church's colours among it, while Plus runs", () => {
    expect(visibleCosmetics(saved(GOLD, [THEMES[2].primary, THEMES[2].accent]), true)).toMatchObject({
      bannerColor: GOLD,
      themePrimary: THEMES[2].primary,
      decoration: "laurel",
      effect: "gold-dust",
      nameColor: "gilded",
      bannerMotion: "shimmer",
    });
  });

  it("without it, the banner and the theme in their nearest grey, and nothing else", () => {
    const free = visibleCosmetics(saved(GOLD, [THEMES[2].primary, THEMES[2].accent]), false);
    expect(free).toEqual({
      bannerColor: nearestGrey(GOLD)!.primary,
      bannerUrl: null,
      themePrimary: nearestGrey(THEMES[2].primary)!.primary,
      themeAccent: nearestGrey(THEMES[2].primary)!.accent,
      decoration: null,
      effect: null,
      nameColor: null,
      bannerMotion: null,
    });
    for (const c of BANNER_COLORS) {
      const shown = visibleCosmetics(saved(c.hex), false).bannerColor;
      expect(GREYS.map((g) => g.primary), c.id).toContain(shown);
    }
    // A grey stays itself; none stays none.
    expect(visibleCosmetics(saved(STONE), false).bannerColor).toBe(STONE);
    expect(visibleCosmetics(saved(null), false).bannerColor).toBeNull();
  });

  it("the nearest grey is the nearest in lightness", () => {
    expect(nearestGrey("#1b1b20")?.id).toBe("night");
    expect(nearestGrey(PASCHAL)?.id).toBe("smoke");
    expect(nearestGrey("#2f5d3a")?.id).toBe("stone");
    expect(nearestGrey(GOLD)?.id).toBe("silver");
    expect(nearestGrey("not a colour")).toBeNull();
  });
});

describe("saving a colour", () => {
  it("saves a grey banner and a grey theme for anyone", async () => {
    const { status } = await save({ bannerColor: STONE, themePrimary: GREYS[0].primary, themeAccent: GREYS[0].accent });
    expect(status).toBe(200);
    expect(anna()).toMatchObject({ banner_color: STONE, theme_primary: GREYS[0].primary, theme_accent: GREYS[0].accent });
  });

  it("refuses gold and the Church's colours to a reader without Plus, and writes nothing", async () => {
    for (const banner of [GOLD, PASCHAL, "#D4AF37", "#123456"]) {
      const { status, json } = await save({ bannerColor: banner, status: "Glory to God" });
      expect(status, banner).toBe(403);
      expect(json.code).toBe("plus_required");
      expect(anna().banner_color).toBeNull();
      expect(anna().status_text).toBeUndefined();
    }
  });

  it("refuses a Church theme, and a theme half grey and half not, without Plus", async () => {
    expect((await save({ themePrimary: THEMES[2].primary, themeAccent: THEMES[2].accent })).status).toBe(403);
    world({ theme: [THEMES[2].primary, THEMES[2].accent] });
    // Only the top changed: the pair it makes is still a Church colour's.
    expect((await save({ themePrimary: GREYS[0].primary })).status).toBe(403);
    expect(anna().theme_primary).toBe(THEMES[2].primary);
  });

  it("refuses them once Plus has lapsed", async () => {
    world({ until: new Date(Date.now() - DAY).toISOString() });
    expect((await save({ bannerColor: GOLD })).status).toBe(403);
    expect((await save({ themePrimary: THEMES[0].primary, themeAccent: THEMES[0].accent })).status).toBe(403);
  });

  it("saves gold and the Church's colours with Plus", async () => {
    world({ until: new Date(Date.now() + 30 * DAY).toISOString() });
    expect((await save({ bannerColor: GOLD })).status).toBe(200);
    expect(anna().banner_color).toBe(GOLD);
    expect((await save({ themePrimary: THEMES[0].primary, themeAccent: THEMES[0].accent })).status).toBe(200);
    expect(anna().theme_primary).toBe(THEMES[0].primary);
  });

  it("lets anyone take a colour off", async () => {
    world({ banner: GOLD, theme: [THEMES[2].primary, THEMES[2].accent] });
    expect((await save({ bannerColor: null, themePrimary: null, themeAccent: null })).status).toBe(200);
    expect(anna()).toMatchObject({ banner_color: null, theme_primary: null, theme_accent: null });
  });
});

describe("the editor", () => {
  const src = readFileSync(path.resolve(__dirname, "../../../components/community/profile/ProfileEditor.tsx"), "utf8");

  it("offers the greys to everyone, and tries the Church's colours on like a Plus option", () => {
    expect(src).toContain("GREYS.map((g) =>");
    expect(src).toContain("plusBannerChanged(a, b) ||");
    expect(src).toContain("plusThemeChanged(a, b) ||");
    expect(src).toContain("const bannerTried = !subscribed && plusBannerChanged(draft, saved);");
    expect(src).toContain("if (draft.bannerColor !== saved.bannerColor && !bannerTried) patch.bannerColor = draft.bannerColor;");
  });

  it("shows a colour kept from before as others see it, in its nearest grey", () => {
    expect(src).toContain("const bannerKept = !subscribed && bannerNeedsPlus(draft.bannerColor) && draft.bannerColor === saved.bannerColor;");
    expect(src).toContain("nearestGrey(draft.bannerColor)");
  });

  it("starts the colour picker and the moving banners from a grey, not the gold", () => {
    expect(src).toContain('const NO_BANNER = "#3a3a40";');
    expect(src).not.toContain(GOLD);
  });

  it("has no streak switch: a profile shows no streak (refinement 4)", () => {
    expect(src).not.toContain("showStreak");
    expect(src).not.toContain("profile.streakToggle");
  });
});
