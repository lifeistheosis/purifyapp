// Community as the owner picked it on 2026-10-30, r3-02 "B with A's top"
// (Homebase/boards/purify-master/variants/r3-02-community.html), drawn to
// markup: the head with its one switch, A's head in Pray together (the
// Pentecost icon behind the name, the running campaign's card under it, gone
// when none runs), the prayer wall under that, and Talk together's three
// words with the rest behind the sliders.
//
// vitest runs in node with no DOM (vitest.config.ts); react-dom/server needs
// none, and what is checked here is all in the markup.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CampaignCard } from "@/components/community/CampaignCard";
import { COMMUNITY_PICTURE, CommunityHead } from "@/components/community/CommunityHead";
import { FeedTabs } from "@/components/community/FeedTabs";
import { PrayTogether } from "@/components/community/PrayTogether";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { getMessages } from "@/lib/i18n";
import { feedSliders, feedTabs, type CommunityHalf, type FeedFilter } from "@/lib/community/halves";
import { runningCampaign, type RunningCampaign } from "@/lib/community/runningCampaign";

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function draw(el: ReactElement, locale = "en"): string {
  return renderToStaticMarkup(createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, el));
}

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

function head(half: CommunityHalf, showSwitch = true): string {
  return draw(createElement(CommunityHead, { half, onChoose: () => {}, showSwitch, bell: null, idBase: "community-half" }));
}

/** Each tab of a tablist as drawn: its id, whether it is selected, and its words. */
function tabs(html: string) {
  return [...html.matchAll(/<button[^>]*role="tab"[^>]*>([\s\S]*?)<\/button>/g)].map(([whole, inner]) => ({
    id: /id="([^"]+)"/.exec(whole)?.[1] ?? /data-feed-tab="([^"]+)"/.exec(whole)?.[1] ?? null,
    selected: /aria-selected="true"/.test(whole),
    tabindex: /tabindex="(-?\d)"/.exec(whole)?.[1] ?? null,
    text: inner.replace(/<[^>]+>/g, "").trim(),
  }));
}

describe("the head: the name and one switch", () => {
  it("is Pray together and Talk together, Talk together open by default", () => {
    const html = head("talk");
    expect(html).toContain(">Community</h1>");
    expect(tabs(html)).toEqual([
      { id: "community-half-tab-pray", selected: false, tabindex: "-1", text: "Pray together" },
      { id: "community-half-tab-talk", selected: true, tabindex: "0", text: "Talk together" },
    ]);
    // The raised half stands under the open one: across for Talk together,
    // and across the other way in a right-to-left language.
    expect(html).toMatch(/community-half-thumb[^"]*translate-x-full[^"]*rtl:-translate-x-full/);
  });

  it("draws no picture in Talk together, B's plain head", () => {
    const html = head("talk");
    expect(html).not.toContain(COMMUNITY_PICTURE);
    expect(html).not.toContain("community-on-picture");
  });

  it("opens Pray together on A's head: the Pentecost icon behind the name", () => {
    const html = head("pray");
    expect(COMMUNITY_PICTURE).toBe("/discover/tiles/chat.webp");
    expect(html).toContain(`src="${COMMUNITY_PICTURE}"`);
    expect(html).toContain("community-on-picture");
    // Behind the words, not read out: the page's name says where the reader is.
    expect(html).toMatch(/<div aria-hidden="true" data-community-picture=""/);
    // Its blurred preview holds the place while the picture comes.
    expect(html).toMatch(/background-image:url\(data:image\/webp;base64,/);
    expect(tabs(html).find((t) => t.selected)?.id).toBe("community-half-tab-pray");
    expect(html).not.toMatch(/community-half-thumb[^"]*translate-x-full/);
  });

  it("has no switch in a group's thread, a conversation of its own", () => {
    const html = head("talk", false);
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain(">Community</h1>");
  });

  it("names the halves in every language, never as a key", () => {
    for (const locale of ["el", "ru", "ar", "ka"]) {
      const words = tabs(draw(createElement(CommunityHead, { half: "talk", onChoose: () => {}, showSwitch: true, bell: null, idBase: "h" }), locale)).map((t) => t.text);
      expect(words, locale).toHaveLength(2);
      for (const w of words) {
        expect(w, locale).not.toMatch(/community\./);
        expect(w, locale).not.toMatch(/^(Pray|Talk) together$/);
      }
    }
  });
});

describe("Pray together", () => {
  it("runs no campaign in 1.8, so its head is the icon and the title", () => {
    // Campaigns are withdrawn for their rework, and no campaign yet carries
    // the Church's prayer with its source (lib/community/runningCampaign.ts).
    expect(runningCampaign()).toBeNull();
  });

  it("draws no card and no sample when none runs: the wall stands under the head", () => {
    const html = draw(createElement(PrayTogether, { signedIn: true, campaign: null, onOpenProfile: () => {} }));
    expect(html).not.toContain("data-campaign-card");
    expect(html).not.toMatch(/SAMPLE/i);
    expect(html).toContain("data-prayer-wall");
    expect(html).toContain(">The prayer wall</h2>");
    expect(html).toContain("Ask for prayers");
  });

  it("asks a reader with no account to sign in where Ask for prayers stands", () => {
    const html = draw(createElement(PrayTogether, { signedIn: false, campaign: null, onOpenProfile: () => {} }));
    expect(html).toMatch(/<a[^>]*href="\/signin\?next=\/community"[^>]*>Sign in<\/a>/);
    expect(html).not.toContain("Ask for prayers");
  });

  it("draws a campaign that runs under the head: its picture, the Church's words as printed, Pray, Add to my prayers and Share", () => {
    // A test's campaign, never the app's: the app draws only one that runs.
    const campaign: RunningCampaign = {
      id: "c1",
      title: "Memory eternal: forty days for Nicholas",
      eyebrow: "The departed",
      picture: { src: "/icons/prayer/anastasis.jpg", alt: "The Resurrection" },
      prayer: {
        text: "O God of spirits, and of all flesh, who hast trampled down death, and overthrown the Devil, and given life unto thy world:",
        source: "Hapgood, Service Book (1906), p. 91",
      },
      href: "/campaigns/detail?id=c1",
      name: "Nicholas",
    };
    const html = draw(createElement(PrayTogether, { signedIn: true, campaign, onOpenProfile: () => {} }));
    const card = /<article data-campaign-card=""[\s\S]*?<\/article>/.exec(html)?.[0] ?? "";
    expect(card).not.toBe("");
    // Under the head and above the wall.
    expect(html.indexOf("data-campaign-card")).toBeLessThan(html.indexOf("data-prayer-wall"));
    expect(card).toContain('src="/icons/prayer/anastasis.jpg"');
    expect(card).toContain('alt="The Resurrection"');
    expect(card).toContain(campaign.prayer.text);
    expect(card).toContain(campaign.prayer.source);
    expect(card).toMatch(/<a[^>]*href="\/campaigns\/detail\?id=c1"[^>]*>[\s\S]*?Pray<\/a>/);
    expect(card).toContain("Add to my prayers");
    expect(card).toContain('aria-label="Share"');
    // Nobody is counted: no number on the card but the page of the printing.
    expect(card.replace(/<[^>]+>/g, " ").replace(campaign.prayer.source, "")).not.toMatch(/\d/);
  });

  it("says a name already in the reader's prayers is there", () => {
    const campaign = {
      id: "c2",
      title: "For Maria",
      eyebrow: null,
      picture: { src: "/x.jpg", alt: "" },
      prayer: { text: "Words", source: "A printing" },
      href: "/campaigns/detail?id=c2",
      name: "Maria",
    } satisfies RunningCampaign;
    expect(draw(createElement(CampaignCard, { campaign, added: true, onAdd: () => {} }))).toContain("In my prayers");
    expect(draw(createElement(CampaignCard, { campaign, added: false, onAdd: () => {} }))).toContain("Add to my prayers");
  });
});

describe("the prayer wall, one step in", () => {
  const wall = read("components/community/PrayerWall.tsx");

  it("draws no number beside anyone (the sheet's open question, built as drawn)", () => {
    expect(wall).not.toContain("prayedCount");
    expect(wall).not.toMatch(/\{r\.count\}/);
  });

  it("is set like a page: the requests as rows with no box around them", () => {
    expect(wall).toContain('<ul className="divide-y divide-paper/[0.08]">');
    expect(wall).not.toMatch(/<ul className="[^"]*rounded-2xl border/);
  });

  it("lights I prayed white and keeps every colour out of it", () => {
    expect(wall).toContain('"reader-lit bg-paper text-night hover:bg-paper/90"');
    // It was the fasting green (sage) once said.
    expect(wall).not.toMatch(/(?:border|bg|text)-sage/);
  });
});

describe("Talk together's three words and its sliders", () => {
  function line(filter: FeedFilter, signedIn = true): string {
    return draw(
      createElement(FeedTabs, {
        tabs: feedTabs(false),
        sliders: feedSliders({ signedIn, inGroup: false }),
        filter,
        onFilter: () => {},
      }),
    );
  }

  it("shows All, Ask a Priest and Discussion, the open one selected", () => {
    const html = line("all");
    expect(tabs(html)).toEqual([
      { id: "all", selected: true, tabindex: "0", text: "All" },
      { id: "questions", selected: false, tabindex: "-1", text: "Ask a Priest" },
      { id: "discussion", selected: false, tabindex: "-1", text: "Discussion" },
    ]);
    // The sliders rest unlit, with no word beside them.
    const sliders = /<button[^>]*aria-haspopup="menu"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(sliders?.[0]).toContain('aria-label="Show posts"');
    expect(sliders?.[0]).not.toContain("community-lit");
    expect(sliders?.[1].replace(/<[^>]+>/g, "").trim()).toBe("");
  });

  it("lights the sliders and says the choice beside them when one behind them is on", () => {
    const html = line("scripture");
    expect(tabs(html).some((t) => t.selected)).toBe(false);
    // The first word keeps the way in for the keyboard.
    expect(tabs(html)[0].tabindex).toBe("0");
    const sliders = /<button[^>]*aria-haspopup="menu"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    expect(sliders?.[0]).toContain("community-lit");
    expect(sliders?.[1].replace(/<[^>]+>/g, "").trim()).toBe("Scripture");
  });

  it("has no pill cloud: the words are a line with a rule under the open one", () => {
    const html = line("questions");
    expect(html).not.toMatch(/role="tab"[^>]*class="[^"]*rounded-pill/);
    expect(html).toMatch(/class="community-tab[^"]*"[^>]*>Ask a Priest/);
  });
});
