// Build 95 note 12 (the owner, 2026-11-13, two screenshots of a profile's
// Badges, Verified chosen and then Bug Hunter): "badge UI moving".
//
// The card under the case of medals said what the lit badge means, and held
// the lit badge's words alone: Verified's two lines ("Our team has confirmed
// who this is.") and Bug Hunter's three ("Found a real bug and told us.",
// "Since October 2026") gave it two heights. The sheet is pinned to the foot
// of a phone, so each tap moved everything above the card by a line (20px at
// 412 wide, measured on the export). Now the card holds every badge's words
// in one cell, the lit one's shown and the rest keeping their room unseen, as
// the doors keep the tallest door's room (ProfileDoors.tsx): its height is
// its longest badge's, whichever is lit.
//
// Rendered to static markup (vitest runs in node). What the card's height
// does on a phone is measured on the export by scripts/export-walk.mjs,
// section 50, which taps every badge and holds the sheet still.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { MedalCase } from "@/components/community/profile/ProfileBadges";
import type { BadgeId, EarnedBadge } from "@/lib/profile/badges";

/** The two he chose, and two more of other lengths. */
const BADGES: EarnedBadge[] = [
  { id: "verified", since: null },
  { id: "first_share", since: "2026-09-20T00:00:00Z" },
  { id: "early_reader", since: "2026-09-12T00:00:00Z" },
  { id: "bug_hunter", since: "2026-10-12T00:00:00Z" },
];

type ProviderProps = Parameters<typeof MessagesProvider>[0];

/** The case in English with `initial` lit, as a reader sees it before tapping another. */
function caseWith(initial: BadgeId): string {
  return renderToStaticMarkup(
    createElement(MessagesProvider, { locale: "en" } as ProviderProps, createElement(MedalCase, { badges: BADGES, initial })),
  );
}

/** The card under the case: the live region, which holds no other div. */
function card(html: string): string {
  const at = html.indexOf('<div aria-live="polite"');
  expect(at, "the card under the case").toBeGreaterThan(-1);
  return html.slice(at, html.indexOf("</div>", at) + "</div>".length);
}

const words = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Each badge's words in the card: its id, whether it is shown, and its classes. */
function groups(markup: string): { id: string; shown: boolean; className: string }[] {
  return [...markup.matchAll(/<span([^>]*)data-badge-words="([^"]+)"([^>]*)>/g)].map((m) => {
    const attrs = `${m[1]} ${m[3]}`;
    const className = /class="([^"]*)"/.exec(attrs)?.[1] ?? "";
    return { id: m[2], shown: !/aria-hidden="true"/.test(attrs) && !/(^|\s)invisible(\s|$)/.test(className), className };
  });
}

describe("the badge card holds one height (build 95 note 12)", () => {
  const lit = BADGES.map((b) => b.id);

  it("holds every badge's words whichever is lit, so choosing one cannot change its height", () => {
    const seen = lit.map((id) => words(card(caseWith(id))));
    for (const text of seen) {
      expect(text).toContain("Our team has confirmed who this is.");
      expect(text).toContain("Found a real bug and told us.");
      expect(text).toContain("Since October 2026");
      expect(text).toContain("Shared a line from Scripture or the Fathers with Community.");
    }
    // The same words, in the same order, with Verified lit as with Bug Hunter.
    expect(new Set(seen).size).toBe(1);
  });

  it("shows only the lit badge's words; the rest keep their room unseen, in the same cell", () => {
    for (const id of lit) {
      const g = groups(card(caseWith(id)));
      expect(g.map((x) => x.id)).toEqual(lit);
      expect(g.filter((x) => x.shown).map((x) => x.id)).toEqual([id]);
      for (const x of g) expect(x.className.split(/\s+/)).toEqual(expect.arrayContaining(["col-start-1", "row-start-1"]));
    }
  });

  it("keeps a lit medal's 'Since' at 4.5:1: at paper/45 it measured 4.50:1 on Black, on the lit ground", () => {
    // checkMock with pixels on the export (build 95 note 12's checklist): every
    // lit tile with a date failed contrast on Black at /45; /50 passes on the
    // five palettes and the seventeen looks. The words of a control at 4.5:1.
    const html = caseWith("bug_hunter");
    const lit = /<button[^>]*aria-pressed="true"[^>]*>([\s\S]*?)<\/button>/.exec(html)?.[1] ?? "";
    const sinceLine = [...lit.matchAll(/<span class="([^"]*)">([^<]*)<\/span>/g)].find((m) => m[2].startsWith("Since"));
    expect(sinceLine?.[2]).toBe("Since Oct 2026");
    const alpha = Number(/(?:^|\s)text-paper\/(\d+)(?:\s|$)/.exec(sinceLine?.[1] ?? "")?.[1] ?? 0);
    expect(alpha).toBeGreaterThanOrEqual(50);
  });

  it("hands the words over only with motion on; with motion off they change at once", () => {
    const g = groups(card(caseWith("verified")));
    expect(g.length).toBe(BADGES.length);
    for (const x of g) {
      const moves = x.className.split(/\s+/).filter((c) => /transition/.test(c));
      expect(moves.length, x.id).toBe(1);
      expect(moves[0], x.id).toMatch(/^motion-safe:\[transition:opacity_var\(--duration-fast\)_var\(--ease-house\)/);
    }
  });
});
