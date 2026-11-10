// Community as the owner picked it on 2026-10-30, r3-02 "B with A's top"
// (Homebase/boards/purify-master/variants/r3-02-community.html), drawn to
// markup: the head with its one switch, A's head in Pray together (the
// Pentecost icon behind the name, the running campaign's card under it, gone
// when none runs), and Talk together's three words with the rest behind the
// sliders. The prayer wall stood under the card until 1.9, when it went at
// his word ("I'd say remove the prayer wall and just keep the prayer
// campaigns", and then "wall B", 2026-11-10).
//
// vitest runs in node with no DOM (vitest.config.ts); react-dom/server needs
// none, and what is checked here is all in the markup.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { feedSliders, feedTabs, type CommunityHalf, type FeedFilter, type PrayDoor } from "@/lib/community/halves";
import { runningCampaign, type RunningCampaign } from "@/lib/community/runningCampaign";

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function draw(el: ReactElement, locale = "en"): string {
  return renderToStaticMarkup(createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, el));
}

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

function head(half: CommunityHalf, door: PrayDoor = "open", arrives = false): string {
  return draw(createElement(CommunityHead, { half, onChoose: () => {}, door, arrives, bell: null, idBase: "community-half" }));
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
    const html = head("talk", "none");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("data-door-place");
    expect(html).toContain(">Community</h1>");
  });

  it("names the halves in every language, never as a key", () => {
    for (const locale of ["el", "ru", "ar", "ka"]) {
      const words = tabs(draw(createElement(CommunityHead, { half: "talk", onChoose: () => {}, door: "open", bell: null, idBase: "h" }), locale)).map((t) => t.text);
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

  it("draws no card and no sample when none runs", () => {
    const html = draw(createElement(PrayTogether, { signedIn: true, campaign: null }));
    expect(html).not.toContain("data-campaign-card");
    expect(html).not.toMatch(/SAMPLE/i);
  });

  it("has no prayer wall: nothing of it is drawn, to a reader signed in or not, and nothing stands in its place", () => {
    for (const signedIn of [true, false]) {
      const html = draw(createElement(PrayTogether, { signedIn, campaign: null }));
      expect(html).not.toContain("data-prayer-wall");
      expect(html).not.toContain("The prayer wall");
      expect(html).not.toContain("Ask for prayers");
      expect(html).not.toContain("I prayed");
      // With campaigns not open for this reader either, the half is empty: no heading, no button, no line of words.
      expect(html.replace(/<[^>]+>/g, "").trim()).toBe("");
    }
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
    const html = draw(createElement(PrayTogether, { signedIn: true, campaign }));
    const card = /<article data-campaign-card=""[\s\S]*?<\/article>/.exec(html)?.[0] ?? "";
    expect(card).not.toBe("");
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

describe("the prayer wall is gone, with everything that drew it", () => {
  it("its two screens are not in the app, and nothing imports them", () => {
    expect(existsSync(join(root, "components/community/PrayerWall.tsx"))).toBe(false);
    expect(existsSync(join(root, "components/community/AskPrayersSheet.tsx"))).toBe(false);
    const naming: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(join(root, dir))) {
        const rel = `${dir}/${name}`;
        if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(name) && /PrayerWall\b|AskPrayersSheet|fetchPrayerWall|sayPrayed\b/.test(read(rel))) naming.push(rel);
      }
    };
    for (const dir of ["app", "components", "lib"]) walk(dir);
    expect(naming).toEqual([]);
  });

  it("Pray together's door is drawn only where there is something behind it", () => {
    // It holds prayer campaigns and nothing else now. Where none is open for
    // this reader, and the app runs none of its own, Community shows no
    // switch, and an address that asks for Pray together shows the
    // conversations: never an empty half behind a door. The rule itself is
    // lib/community/halves.ts (prayDoor, halfShown; halves.test.ts).
    const screen = read("components/community/CommunityClient.tsx");
    expect(screen).toContain("const campaignsOpen = useCampaignsAnswer();");
    expect(screen).toContain("const door = prayDoor({ campaigns: campaignsOpen, ownCampaign: campaign !== null, placeKept });");
    expect(screen).toContain("const half = halfShown(asked, door);");
    expect(screen).toContain('door={groupId ? "none" : door}');
    // The panel names a tab only where the switch that holds it is drawn.
    expect(screen).toContain('{...(groupId || door !== "open" ? {} : { role: "tabpanel"');
    // And the head without its switch is the head a group's thread has: the title and the bell.
    const html = head("talk", "none");
    expect(html).toContain(">Community</h1>");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("Pray together");
  });

  it("while the app waits to hear, the switch's place is kept empty, so the page does not move when it comes", () => {
    // Not known yet: no switch and no word of Pray together, and in its
    // place a box of the switch's own height that says nothing to anyone.
    for (const half of ["talk", "pray"] as const) {
      const waiting = head(half, "waiting");
      expect(waiting).not.toContain('role="tablist"');
      expect(waiting).not.toContain("Pray together");
      expect(waiting).toMatch(/<div aria-hidden="true" data-door-place="waiting" class="community-door-place"><\/div>/);
    }
    // The switch that comes into that place fades in; one that was there from the first is simply there.
    expect(head("talk", "open", true)).toContain("community-door-arrives");
    expect(head("talk", "open")).not.toContain("community-door-arrives");
    // The answer was no: the same box, closing, and still no switch.
    const shut = head("talk", "shut");
    expect(shut).toContain('data-door-place="shut"');
    expect(shut).not.toContain('role="tablist"');
    // The screen marks the place as kept only where it was drawn (not in a group's thread).
    const screen = read("components/community/CommunityClient.tsx");
    expect(screen).toContain('if (door === "waiting" && !groupId && !placeKept) setPlaceKept(true);');
    expect(screen).toContain("arrives={placeKept}");

    // The place is the switch's own height and the space above it, and it
    // closes to nothing. With motion off, neither moves.
    const css = read("app/globals.css");
    const rule = (selector: string) => {
      const at = css.indexOf(`\n${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    expect(read("components/community/PrayTalkSwitch.tsx")).toContain('className="community-halves relative grid h-[60px] ');
    expect(read("components/community/CommunityHead.tsx")).toContain('<div className={cn("mt-4 lg:max-w-[720px]", arrives && "community-door-arrives")}>');
    expect(rule(".community-door-place")).toMatch(/height: 60px;\s*margin-top: 16px;/);
    expect(rule('.community-door-place[data-door-place="shut"]')).toMatch(/height: 0;\s*margin-top: 0;/);
    expect(rule(':where([data-motion="reduce"]) .community-door-place')).toContain("transition: none;");
    expect(rule(':where([data-motion="reduce"]) .community-door-arrives')).toContain("animation: none;");
  });

  it("waiting on an address for Pray together, the head is Pray together's, and it is the plain head once the answer is no", () => {
    expect(head("pray", "waiting")).toContain("community-on-picture");
    expect(head("pray", "open")).toContain("community-on-picture");
    for (const door of ["shut", "none"] as const) expect(head("talk", door)).not.toContain("community-on-picture");
  });

  it("a profile draws no request, no I prayed and no count of who prayed, and its editor has no switch for one", () => {
    const viewer = read("components/community/profile/ProfileViewer.tsx");
    const editor = read("components/community/profile/ProfileEditor.tsx");
    for (const source of [viewer, editor]) {
      expect(source).not.toMatch(/prayerRequest|prayedCount|profile\.pray\b|profile\.prayed\b|prayerToggle/);
    }
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
