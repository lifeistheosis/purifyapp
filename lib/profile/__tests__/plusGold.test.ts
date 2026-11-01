import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * Gold on a Community profile is for Plus members only (1.8, refinement 2).
 * The owner, 2026-10-31: "gold is allowed for the community profiles by the
 * way but only exclusive to plus members".
 *
 * The frames, the effects, the name colours, the themes and the moving
 * banners were Plus already, on the server (app/api/profile/me) and on the
 * screen (visibleCosmetics, and the feed's author marks). The one gold a
 * reader without Plus could put on was the banner colour: the gold swatch
 * (#8f6f35) sat among the free liturgical colours, any colour could be typed
 * in, and the editor offered the gold as the colour picker's start. This
 * holds the three places that decide it: what is saved, what others see, and
 * what the editor sends.
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
import { BANNER_COLORS, bannerNeedsPlus, visibleCosmetics, type Cosmetics } from "@/lib/profile/cosmetics";
import { forgetFilter } from "@/lib/moderation/server";

const ANNA = "22222222-2222-4222-8222-222222222222";
const GOLD = "#8f6f35";
const PASCHAL = "#7d1d27";
const DAY = 86_400_000;

/** Anna's profile, with a subscription that runs until `until` (or none). */
function world({ until = null as string | null, banner = null as string | null } = {}) {
  state.profiles = [{ id: ANNA, handle: "anna", display_name: "Anna", banner_color: banner }];
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

describe("which banner colours are gold, and so Plus", () => {
  it("the gold swatch and any gold typed in; never the Church's other colours", () => {
    for (const hex of [GOLD, "#C9A25A", "#d4af37", "#b8892f", "#7c621d", "#e2c068"]) expect(bannerNeedsPlus(hex), hex).toBe(true);
    for (const hex of [PASCHAL, "#1f3a6b", "#2f5d3a", "#4b2c5e", "#1b1b20", "#5b6e7a", "#3a3a40", "#000000", "#ffffff", "#b33200"]) {
      expect(bannerNeedsPlus(hex), hex).toBe(false);
    }
    expect(bannerNeedsPlus(null)).toBe(false);
    expect(bannerNeedsPlus("gold")).toBe(false);
  });

  it("of the editor's swatches, gold alone", () => {
    expect(BANNER_COLORS.filter((c) => bannerNeedsPlus(c.hex)).map((c) => c.id)).toEqual(["gold"]);
  });
});

describe("what others see of a banner colour", () => {
  const saved = (bannerColor: string): Cosmetics => ({
    bannerColor,
    bannerUrl: null,
    themePrimary: null,
    themeAccent: null,
    decoration: "laurel",
    effect: "gold-dust",
    nameColor: "gilded",
    bannerMotion: "shimmer",
  });

  it("a gold banner, and every other gold, only while Plus runs", () => {
    expect(visibleCosmetics(saved(GOLD), true)).toMatchObject({ bannerColor: GOLD, decoration: "laurel", effect: "gold-dust", nameColor: "gilded" });
    expect(visibleCosmetics(saved(GOLD), false)).toEqual({
      bannerColor: null,
      bannerUrl: null,
      themePrimary: null,
      themeAccent: null,
      decoration: null,
      effect: null,
      nameColor: null,
      bannerMotion: null,
    });
  });

  it("any other colour, Plus or not", () => {
    expect(visibleCosmetics(saved(PASCHAL), false).bannerColor).toBe(PASCHAL);
    expect(visibleCosmetics(saved("#5B6E7A"), false).bannerColor).toBe("#5b6e7a");
  });
});

describe("saving a banner colour", () => {
  it("refuses gold to a reader without Plus, and writes nothing", async () => {
    const { status, json } = await save({ bannerColor: GOLD });
    expect(status).toBe(403);
    expect(json.code).toBe("plus_required");
    expect(anna().banner_color).toBeNull();
  });

  it("refuses a gold typed in as well as the swatch", async () => {
    const { status } = await save({ bannerColor: "#D4AF37", status: "Glory to God" });
    expect(status).toBe(403);
    expect(anna().banner_color).toBeNull();
    expect(anna().status_text).toBeUndefined();
  });

  it("refuses gold once Plus has lapsed", async () => {
    world({ until: new Date(Date.now() - DAY).toISOString() });
    expect((await save({ bannerColor: GOLD })).status).toBe(403);
  });

  it("saves gold with Plus", async () => {
    world({ until: new Date(Date.now() + 30 * DAY).toISOString() });
    const { status } = await save({ bannerColor: GOLD });
    expect(status).toBe(200);
    expect(anna().banner_color).toBe(GOLD);
  });

  it("saves every other colour for anyone, and lets anyone take a gold one off", async () => {
    expect((await save({ bannerColor: PASCHAL })).status).toBe(200);
    expect(anna().banner_color).toBe(PASCHAL);
    world({ banner: GOLD });
    expect((await save({ bannerColor: null })).status).toBe(200);
    expect(anna().banner_color).toBeNull();
  });
});

describe("the editor", () => {
  const src = readFileSync(path.resolve(__dirname, "../../../components/community/profile/ProfileEditor.tsx"), "utf8");

  it("tries a gold banner on like a Plus option, and sends it only with Plus", () => {
    expect(src).toContain("goldBannerChanged(a, b) ||");
    expect(src).toContain("const goldTried = !subscribed && goldBannerChanged(draft, saved);");
    expect(src).toContain("if (draft.bannerColor !== saved.bannerColor && !goldTried) patch.bannerColor = draft.bannerColor;");
    expect(src).toContain('!(k === "bannerColor" && goldTried)');
  });

  it("starts the colour picker and the moving banners from a grey, not the gold", () => {
    expect(src).toContain('const NO_BANNER = "#3a3a40";');
    expect(src).not.toContain(GOLD);
  });
});
