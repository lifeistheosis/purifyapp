import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A reader's own words on a campaign run as they were written (build 90 note
 * 4; the arbiter's yes of 2026-11-10 to folding the campaigns' screens in).
 *
 * A campaign's title, its words, an update and a comment are typed by a
 * reader, in whatever language they pray in. In an English app, Arabic set
 * left to right has its full stop at the wrong end and reads from the wrong
 * side. So each place that draws those words says dir="auto", and the
 * browser takes the direction from the words themselves, as Community's
 * posts do. The fields they are typed into are held by
 * lib/i18n/__tests__/typedWords.test.ts.
 *
 * What would go wrong if this broke: a campaign written in Arabic or Urdu,
 * shown to a reader whose app is in English, with its punctuation on the
 * wrong side and its lines starting at the wrong edge.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("a reader's own words on a campaign take their own direction", () => {
  it("its title and its words on its page", () => {
    const page = read("components/campaigns/CampaignPage.tsx");
    expect(page).toContain('<h1 id="campaign-title" dir="auto" ');
    expect(page).toMatch(/\{campaign\.details \? <p dir="auto" [^>]*>\{campaign\.details\}<\/p> : null\}/);
  });

  it("an update and a comment", () => {
    const notes = read("components/campaigns/CampaignNotes.tsx");
    expect(notes.match(/<p dir="auto" [^>]*>\{note\.body\}<\/p>/g)).toHaveLength(2);
    // And not one drawn without it.
    expect(notes.match(/\{note\.body\}/g)).toHaveLength(2);
  });

  it("its title wherever it stands as a row or a card", () => {
    expect(read("components/campaigns/CampaignRow.tsx")).toContain('<span dir="auto" className="set-label break-words">{title}</span>');
    expect(read("components/community/CampaignCard.tsx")).toMatch(/<h2 dir="auto" [^>]*>\{campaign\.title\}<\/h2>/);
  });

  it("and in the moderators' queue, where it is read first", () => {
    const queue = read("components/campaigns/CampaignModeration.tsx");
    expect(queue.match(/<p dir="auto" className="break-words font-semibold">\{c\.title\}<\/p>/g)).toHaveLength(2);
    expect(queue).toContain('<p dir="auto" className="break-words font-semibold">{p.campaign.title}</p>');
    expect(queue).not.toMatch(/<p className="[^"]*">\{c\.(?:title|details)\}<\/p>/);
  });
});
