// The Community profile as the owner picked it, r3-28 A, "fade and doors"
// (notes 75 and 81, 2026-10-31; Homebase/boards/purify-master/variants/
// r3-28-profile.html and r3-28b-plus-designs.html), rendered to static
// markup: there is no DOM here (vitest runs in node, component testing is
// Playwright's), but react-dom/server needs none, and what a reader sees of
// colour is in the markup and the stylesheet.
//
// What a reader would notice if this broke:
//   - a free reader's profile in gold, or in a Church colour: his "two for
//     normal users, one for plus users" gives a free profile black, white and
//     four greys, and a Plus member's the Church's colours and gold;
//   - a streak's count on a profile, or a number on a prayer rope medal
//     (refinement 4: "on prayer, no figures");
//   - a door that leads nowhere, or Campaigns before campaigns ship.
//
// How the built app draws a sample profile, free and with Plus, on the five
// palettes and with motion off, is section 50 of scripts/export-walk.mjs.

import { createElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Medal, MedalCase } from "@/components/community/profile/ProfileBadges";
import { ProfileFace, ProfileTop, profileSurface } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { STANDING_BADGES, BADGE_ORDER, type BadgeId, type EarnedBadge } from "@/lib/profile/badges";
import { BANNER_COLORS, GREYS, THEMES, visibleCosmetics, type Cosmetics } from "@/lib/profile/cosmetics";
import { CAMPAIGNS_DOOR, profileDoors } from "@/lib/profile/doors";
import type { PublicProfile } from "@/lib/profile/publicProfile";
import { isGoldTone, oklchOf, rgbOfHex, type Rgb } from "@/lib/ui/goldTone";

const ROOT = process.cwd();
const render = (el: ReactElement) => renderToStaticMarkup(el);

/** Every colour written in a piece of markup or a stylesheet: hex, and rgb() however Tailwind writes it. */
function colours(text: string): { literal: string; rgb: Rgb }[] {
  const out: { literal: string; rgb: Rgb }[] = [];
  for (const m of text.matchAll(/(?<!url\()#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g)) {
    const rgb = rgbOfHex(m[0]);
    if (rgb) out.push({ literal: m[0], rgb });
  }
  for (const m of text.matchAll(/rgba?\(\s*([\d.]+)[\s,_]+([\d.]+)[\s,_]+([\d.]+)/g)) {
    out.push({ literal: m[0], rgb: [Number(m[1]), Number(m[2]), Number(m[3])] as unknown as Rgb });
  }
  return out;
}

/** A grey, white or black: no hue a reader would call a colour (the greys' own is 0.012). */
const greyOnly = (c: { rgb: Rgb }) => oklchOf(c.rgb).C < 0.02;
const gold = (c: { rgb: Rgb }) => isGoldTone(oklchOf(c.rgb));

/** Everything a reader could put on, gold and the Church's colours throughout. */
const SAVED: Cosmetics = {
  bannerColor: BANNER_COLORS.find((c) => c.id === "gold")!.hex,
  bannerUrl: "https://example.supabase.co/storage/v1/object/public/avatars/b/x.webp",
  themePrimary: THEMES.find((t) => t.id === "gilded")!.primary,
  themeAccent: THEMES.find((t) => t.id === "gilded")!.accent,
  decoration: "laurel",
  effect: "gold-dust",
  nameColor: "gilded",
  bannerMotion: "shimmer",
};

const BADGES: EarnedBadge[] = [
  { id: "verified", since: null },
  { id: "psalter", since: "2026-10-01T00:00:00Z" },
  { id: "streak_40", since: "2026-09-01T00:00:00Z" },
  { id: "early_reader", since: "2026-07-03T00:00:00Z" },
  { id: "bug_hunter", since: "2026-10-12T00:00:00Z" },
];

function person(cosmetics: Cosmetics): Pick<PublicProfile, "name" | "handle" | "avatar" | "status" | "cosmetics" | "clergy"> {
  return { name: "Herman", handle: "herman", avatar: null, status: "Learning the Paschal Canon by heart", cosmetics, clergy: null };
}

/** The card as a reader sees it: its ground, the light or the banner, the face, the effect, the medals. */
function card(cosmetics: Cosmetics): { markup: string; ground: string } {
  const markup = [
    render(createElement(ProfileTop, { cosmetics })),
    // On the reader's name day the picture wears its light.
    render(createElement(ProfileFace, { profile: person(cosmetics), celebrating: true })),
    render(createElement(ProfileEffect, { effect: cosmetics.effect, quiet: true })),
    render(createElement(MedalCase, { badges: BADGES })),
  ].join("\n");
  const ground = String(profileSurface(cosmetics).style?.background ?? "");
  return { markup, ground };
}

describe("a free reader's profile (way 2)", () => {
  const free = visibleCosmetics(SAVED, false);
  const { markup, ground } = card(free);

  it("is black, white and grey: no gold and no Church colour anywhere on it", () => {
    const found = [...colours(markup), ...colours(ground)];
    expect(found.length).toBeGreaterThan(10);
    expect(found.filter(gold).map((c) => c.literal)).toEqual([]);
    expect(found.filter((c) => !greyOnly(c)).map((c) => c.literal)).toEqual([]);
    // And none of the Church's colours by name (Holy Week black and
    // Theophany's foot are greys themselves, and the medals' enamel is one).
    const church = [...BANNER_COLORS.map((c) => c.hex), ...THEMES.flatMap((t) => [t.primary, t.accent])].filter(
      (hex) => !greyOnly({ rgb: rgbOfHex(hex)! }),
    );
    expect(church.length).toBeGreaterThan(8);
    for (const hex of church) expect(markup + ground, hex).not.toContain(hex);
  });

  it("wears none of Plus: no frame, no effect, no name colour, no moving banner, no picture", () => {
    expect(markup).not.toContain("data-frame");
    expect(markup).not.toMatch(/\bpfx\b/);
    expect(markup).not.toContain("name-color");
    expect(markup).not.toContain("banner-motion");
    expect(markup).not.toContain("<img");
  });

  it("keeps the colour saved, shown as the nearest grey (gold, as light as Silver, is Silver)", () => {
    expect(free.bannerColor).toBe(GREYS.find((g) => g.id === "silver")!.primary);
    expect(markup).toContain(`--cloth:${free.bannerColor}`);
    expect(SAVED.bannerColor).toBe("#8f6f35");
  });

  it("with nothing chosen, wears the soft light at the top", () => {
    const plain = render(createElement(ProfileTop, { cosmetics: visibleCosmetics({ ...SAVED, bannerColor: null, themePrimary: null, themeAccent: null }, false) }));
    expect(plain).toContain('data-profile-top="light"');
    expect(plain).toContain("profile-light");
  });
});

describe("a Plus member's profile (way 1)", () => {
  const plus = visibleCosmetics(SAVED, true);
  const { markup, ground } = card(plus);

  it("may wear gold: the laurel, the gilded name, the gold dust, the gold leaf, the gilded theme", () => {
    expect(colours(markup).filter(gold).length).toBeGreaterThan(0);
    expect(markup).toContain('data-frame="laurel"');
    expect(markup).toContain("name-color-gilded");
    expect(markup).toContain("pfx-gold-dust");
    expect(markup).toContain("banner-motion-shimmer");
    expect(colours(ground).some(gold)).toBe(true);
  });

  it("may wear the Church's colours: a Theotokos banner is its own blue, cloth with its woven cross", () => {
    const blue = BANNER_COLORS.find((c) => c.id === "theotokos")!.hex;
    const top = render(createElement(ProfileTop, { cosmetics: visibleCosmetics({ ...SAVED, bannerColor: blue, bannerUrl: null }, true) }));
    expect(top).toContain(`--cloth:${blue}`);
    expect(top).toContain("profile-cloth");
    expect(top).toContain('data-profile-top="banner"');
  });
});

describe("the stylesheet of a profile", () => {
  const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("draws the light, the fading banner, the cloth and the medals in white and black alone", () => {
    // A rule's selector is what stands between the last brace and its own.
    const rules = [...css.matchAll(/([^{}]*\.profile-[^{}]*)\{([^}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(6);
    const found = rules.flatMap((r) => colours(r[2].replace(/%23/g, "#")));
    expect(found.filter((c) => !greyOnly(c)).map((c) => c.literal)).toEqual([]);
  });

  it("holds the banner's arrival and the medals' light still on the motion switch", () => {
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.profile-top-in\s*\{\s*animation: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.profile-medal\s*\{\s*transition: none;/);
  });
});

describe("the medals", () => {
  it("are struck for every badge, silver and white, never gold or a colour", () => {
    for (const id of BADGE_ORDER) {
      const svg = render(createElement(Medal, { id, size: 58 }));
      expect(svg, id).toContain(`data-medal="${id}"`);
      expect(colours(svg).filter((c) => !greyOnly(c)).map((c) => `${id} ${c.literal}`)).toEqual([]);
    }
  });

  it("set the standing badges on silver with a dark glyph, the rest on enamel with a white one", () => {
    const standing = render(createElement(Medal, { id: STANDING_BADGES[0] as BadgeId }));
    const earned = render(createElement(Medal, { id: "psalter" }));
    expect(standing).toContain("color:#16161a");
    expect(earned).toContain("color:#ffffff");
  });

  it("draw the streak's three as a prayer rope, seven, forty and a hundred knots, with no number", () => {
    for (const [id, knots, r] of [["streak_7", 7, "3.7"], ["streak_40", 40, "1.75"], ["streak_100", 100, "1.02"]] as const) {
      const svg = render(createElement(Medal, { id }));
      // Each knot twice: the knot, and its light under it.
      expect(svg.match(new RegExp(`<circle cx="[\\d.]+" cy="[\\d.]+" r="${r.replace(".", "\\.")}"`, "g"))?.length, id).toBe(knots * 2);
      expect(svg, id).not.toContain("<text");
      expect(svg.replace(/<[^>]*>/g, ""), id).toBe("");
    }
  });

  it("light the one tapped, and the case says what the lit one means", () => {
    const html = render(createElement(MedalCase, { badges: BADGES, initial: "psalter" }));
    expect(html.match(/data-lit=""/g)?.length).toBe(2);
    expect(html).toContain("profile.badgeAbout.psalter");
    expect(html).toContain('aria-pressed="true"');
  });
});

describe("the doors", () => {
  const base = {
    private: false,
    postsHidden: false,
    badges: BADGES,
    bio: "Reader at our parish.",
    patronSaint: { slug: "herman-of-alaska", name: "St. Herman of Alaska" },
    favoriteVerse: null,
    joinedAt: "2026-07-03T00:00:00Z",
    parish: null,
    nowReading: null,
  } satisfies Parameters<typeof profileDoors>[0];

  it("are About, Badges and Posts, in the sheet's order; Campaigns waits for campaigns (1.9)", () => {
    expect(CAMPAIGNS_DOOR).toBe(false);
    expect(profileDoors(base)).toEqual(["about", "badges", "posts"]);
    expect(profileDoors(base, { campaigns: true })).toEqual(["about", "badges", "posts", "campaigns"]);
  });

  it("are only the ones a profile has", () => {
    expect(profileDoors({ ...base, bio: null, patronSaint: null, joinedAt: null })).toEqual(["badges", "posts"]);
    expect(profileDoors({ ...base, bio: null, patronSaint: null, joinedAt: null }, { inCommon: 2 })).toEqual(["about", "badges", "posts"]);
    expect(profileDoors({ ...base, postsHidden: true })).toEqual(["about", "badges"]);
    expect(profileDoors(base, { posts: false })).toEqual(["about", "badges"]);
  });

  it("on a private profile, About says so, and Badges holds the standing ones, if any", () => {
    const priv = { ...base, private: true, postsHidden: true, bio: null, patronSaint: null, joinedAt: null };
    expect(profileDoors({ ...priv, badges: [{ id: "verified", since: null }] })).toEqual(["about", "badges"]);
    expect(profileDoors({ ...priv, badges: [] })).toEqual(["about"]);
  });
});

describe("the face", () => {
  const src = readFileSync(join(ROOT, "components", "community", "profile", "ProfileCard.tsx"), "utf8");

  it("shows no streak and no status bubble: the status is one quiet line in the language's own quotation marks", () => {
    expect(src).not.toMatch(/StreakChip|StatusBubble|\.streak\b/);
    const html = render(createElement(ProfileFace, { profile: person(visibleCosmetics(SAVED, false)) }));
    // Outside a MessagesProvider the key stands for the words.
    expect(html).toContain("profile.statusAria");
    expect(html).toContain("Learning the Paschal Canon by heart");
    expect(html).toMatch(/<h2[^>]*id="profile-name"/);
  });
});
