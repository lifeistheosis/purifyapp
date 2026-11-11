// A reader's own words on their profile say they are theirs (1.9, the
// pre-build gate's third run, 2026-11-11).
//
// The house writes no em dash, and scripts/mock-check.mjs fails a screen that
// shows one. A reader's own words are not the house's: the feed has marked
// them since the gate's first run (a post, its title, a reply, a name), so
// the check lists them instead of failing. A reader's profile sheet did not,
// and the third run opened one whose "About me" has a long dash in it: the
// sheet failed for the reader's own sentence. Of the thirty profiles the
// feed's first screens lead to, two have one, both in "About me".
//
// What a reader would notice if this broke: nothing. The gate would: every
// walk of Community would fail on whichever reader last typed a long dash.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READERS_WORDS } from "@/components/community/readersWords";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const card = read("components/community/profile/ProfileCard.tsx");

describe("a reader's own words on their profile", () => {
  it("carry the feed's own mark, word for word", () => {
    const feed = /const READERS_WORDS = (\{[^}]*\}) as const;/.exec(read("components/community/CommunityClient.tsx"));
    expect(feed, "the feed's READERS_WORDS").not.toBeNull();
    // The feed's object as written, read as the values it holds.
    const held = Object.fromEntries([...feed![1].matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]));
    expect(READERS_WORDS).toEqual(held);
    // An em dash and a star a reader typed are both theirs, and the reason is said.
    expect(READERS_WORDS["data-mock-allow"].split(" ")).toEqual(expect.arrayContaining(["emdash", "sparkle"]));
    expect(READERS_WORDS["data-mock-why"]).toBe("a reader's own words");
  });

  it("About me is marked on the paragraph that holds the reader's words, and on nothing of the app's", () => {
    expect(card).toContain('import { READERS_WORDS } from "@/components/community/readersWords";');
    const bio = /<p dir="auto" \{\.\.\.READERS_WORDS\} className="[^"]*">\s*<SymbolText text=\{profile\.bio\} \/>\s*<\/p>/.exec(card);
    expect(bio, "the About me paragraph").not.toBeNull();
    // Its heading is the app's own word, and is not marked.
    const heading = card.slice(card.indexOf('{t("profile.aboutMe")}') - 160, card.indexOf('{t("profile.aboutMe")}'));
    expect(heading).toContain('role="heading"');
    expect(heading).not.toContain("READERS_WORDS");
  });

  it("the name they chose, their parish and where they serve are marked too", () => {
    expect(card).toMatch(/<span \{\.\.\.READERS_WORDS\} className=\{nameColorClass\(profile\.cosmetics\.nameColor\)\}>\{profile\.name\}<\/span>/);
    expect(card).toMatch(/<span \{\.\.\.READERS_WORDS\} className="min-w-0">\{profile\.parish\}<\/span>/);
    expect(card).toMatch(/\{clergyWhere \? <span \{\.\.\.READERS_WORDS\} className="block text-paper\/65">\{clergyWhere\}<\/span> : null\}/);
  });

  it("the check takes the mark as it takes the feed's", () => {
    // checkMock allows a check by name where the element, or one around it, lists it (allowance).
    const checker = read("scripts/mock-check.mjs");
    expect(checker).toMatch(/dashes\.push\(\{ name: nameOf\(el\), allow: allowance\(el, "emdash"\) \}\);/);
  });
});
