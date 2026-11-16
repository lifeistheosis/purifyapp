// You and Profile as one design (build 98 note 11; the owner, 2026-11-15,
// with a photo of each: "can your revamp the your profile screen").
//
// Profile read as an account's record: the address the reader signs in with
// stood large under their name, on a screen people photograph and share, with
// "Member since", "Last signed in" and the plan in a list under it; the
// patron saint was a form further down; the Community card was a row of
// words about it; and the badges and the days kept were on another screen.
// This holds what the redesign is: one piece for who the reader is on both
// screens, and the account's facts off Profile's face.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
/** The code without its comments, so a note about the old screen is not read as the screen. */
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PIECE = "components/profile/ReaderIdentity.tsx";
const HERO = "components/profile/ProfileHero.tsx";
const PAGE = "components/profile/ProfileTabClient.tsx";
const YOU = "components/you/YouIdentity.tsx";

describe("who the reader is: one piece, on You and on Profile", () => {
  it("is drawn by both screens, and by the reader without an account", () => {
    expect(code(YOU)).toMatch(/<ReaderIdentity\b/);
    expect(code(HERO)).toMatch(/<ReaderIdentity\b/);
    expect(code("components/profile/LocalProfileHero.tsx")).toMatch(/<ReaderIdentity\b/);
  });

  it("is the picture, the name, the patron saint as one line with his own picture, then the badges", () => {
    const piece = code(PIECE);
    const order = ["<ReaderAvatar ", "data-reader-name", "<PatronLine ", "<ReaderBadges "].map((p) => piece.indexOf(p));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The saint from the library the apps carry, so his picture opens with no network.
    expect(piece).toContain("patronFor(patron.slug, patron.name)");
    // Arriving whole, as every face does (lib/ui/__tests__/arrivingImage.test.ts).
    expect(piece).toMatch(/\{saint\.icon \? \(\s*<ArrivingImage\s+src=\{saint\.icon\}/);
  });

  it("carries the picture from You into Profile, and the name with it", () => {
    expect(code(YOU)).toContain('carry="from"');
    expect(code(HERO)).toContain('carry="into"');
    const piece = code(PIECE);
    expect(piece).toContain('data-carry={carry === "from" ? CARRY : undefined}');
    expect(piece).toContain('data-carry-into={carry === "into" ? CARRY : undefined}');
    const css = read("app/globals.css");
    expect(css).toMatch(/\.reader-who:has\(\[data-reader-picture\]\[style\*="view-transition-name"\]\) \.reader-name \{\s*view-transition-name: reader-name;/);
  });

  it("keeps the patron and the card on the device, so they are there with the page", () => {
    const store = code("lib/profile/myCard.ts");
    expect(store).toContain('const CACHE_KEY = "purify.myCard";');
    // Whose it is, and nothing of the account.
    expect(store).toMatch(/type Kept = \{ uid: string; card: MyCard; at: number \};/);
    expect(store).not.toMatch(/\bemail\b|subscribed|settings\b/);
    // A patron saved on this device is on the card at once.
    expect(store).toContain("window.addEventListener(PATRON_EVENT,");
  });
});

describe("Profile: who the reader is, and nothing of the account on its face", () => {
  it("draws no sign-in address, no dates of the account and no plan in words", () => {
    for (const file of [HERO, PIECE, "components/profile/CommunityCardPreview.tsx"]) {
      const src = code(file);
      expect(src, file).not.toMatch(/\bemail\b/i);
      for (const gone of ['t("profile.memberSince")', 't("ui.lastSignedIn")', 't("ui.plan")']) expect(src, `${file}: ${gone}`).not.toContain(gone);
    }
    // The page hands the hero a name and whose badges to read, never the address.
    expect(code(PAGE)).toContain("<ProfileHero uid={data.uid} initialDisplayName={data.displayName} />");
    // The plan is the supporter's mark by the name.
    expect(code(HERO)).toContain('tier={tier === "plus" || tier === "pro" ? tier : null}');
    expect(code(PIECE)).toContain("<SupporterMark tier={tier} size={17} />");
  });

  it("runs: the piece with Edit, the patron's card, the life kept, the Community card, the account's row", () => {
    const page = code(PAGE);
    const order = ["<ProfileHero ", "<PatronSaintPicker />", "<LifeKeptHere ", "<CommunityCardPreview ", 'href="/account/security"', "<ProfileStats />"].map((p) => page.indexOf(p));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(code(HERO)).toContain('{t("common.edit")}');
    // An existing word for the row, and the screen it opens lists the facts.
    expect(page).toContain('t("settings.accountSecurity")');
    expect(code("components/account/security/SecurityTabClient.tsx")).toContain("<AccountFacts />");
    const facts = code("components/profile/AccountFacts.tsx");
    for (const key of ['t("common.email")', 't("profile.memberSince")', 't("ui.lastSignedIn")', 't("ui.plan")']) expect(facts, key).toContain(key);
  });

  it("draws the patron saint as a picture card with the way to change him", () => {
    const picker = code("components/profile/PatronSaintPicker.tsx");
    expect(picker).toContain("<PatronSelect choice={shown} card waiting={!ready} />");
    const chooser = code("components/profile/PatronChooser.tsx");
    expect(chooser).toContain('size={card ? "sm" : "xs"}');
    expect(chooser).toContain('{t("learn.change")}');
    expect(chooser).toContain('{t("saints.feastLabel")} <FeastDays days={[chosen.feast]} />');
  });

  it("draws the Community card from Community's own pieces, the whole of it the way into its editor", () => {
    const card = code("components/profile/CommunityCardPreview.tsx");
    expect(card).toContain('import { ProfileFace, ProfileTop, profileSurface, surfaceClass } from "@/components/community/profile/ProfileCard";');
    expect(card).toContain('<ProfileFace profile={card} nameAs="p" compact />');
    expect(card).toContain('const EDIT = "/account/profile/edit";');
    expect(card.match(/href=\{EDIT\}/g)).toHaveLength(2);
  });
});
