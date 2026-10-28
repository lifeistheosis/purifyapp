// The phone's tab bar: five tabs, and where the two that left it went.
//
// What a reader would notice if this broke: a tab bar with nothing lit while
// they are in the shop or in Chat, no way to either from Discover, or the
// account screen lighting the wrong tab.
//
// Read as text because the bar is a client component with next and React
// behind it, and this suite runs in plain node.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const bar = read("components/nav/MobileTabBar.tsx");
const discover = read("components/mobile/DiscoverMobile.tsx");

/** Each tab's own lines in the list, by its key. */
const tabs = new Map<string, string>();
const list = bar.slice(bar.indexOf("const TABS: Tab[] = ["), bar.indexOf("\n  ];", bar.indexOf("const TABS: Tab[] = [")));
for (const tab of list.split(/\n\s*key: "/).slice(1)) tabs.set(tab.slice(0, tab.indexOf('"')), tab);

describe("the tab bar", () => {
  it("has five tabs, in the order the owner chose on 2026-10-13", () => {
    expect([...tabs.keys()]).toEqual(["today", "bible", "discover", "prayers", "you"]);
  });

  it("names each from the catalog, so the bar is in the reader's language", () => {
    expect(tabs.get("today")).toContain('label: t("nav.today")');
    expect(tabs.get("bible")).toContain('label: t("nav.bible")');
    expect(tabs.get("discover")).toContain('label: t("nav.discover")');
    expect(tabs.get("prayers")).toContain('label: t("nav.prayers")');
    expect(tabs.get("you")).toContain('label: t("nav.you")');
  });

  it("no longer has the Shop or Chat on it, with the flag or without", () => {
    expect(list).not.toContain("shopEnabled");
    expect(list).not.toContain('href: "/shop"');
    expect(list).not.toContain('href: "/community"');
  });

  it("opens the reader's own screen from You, and lights You there", () => {
    const you = tabs.get("you")!;
    expect(you).toContain('href: "/account"');
    for (const route of ['p === "/account"', 'p.startsWith("/account/")', 'p === "/saved"', 'p.startsWith("/saved/")', 'p === "/settings"']) {
      expect(you, route).toContain(route);
    }
  });

  it("lights You on the pages Settings' Purify rows open, and on the Florilegium, Saved's first row", () => {
    const you = tabs.get("you")!;
    for (const page of ["privacy", "support", "whats-new", "about", "faq", "terms", "florilegium"]) {
      expect(you, page).toContain(`p === "/${page}"`);
      expect(you, page).toContain(`p.startsWith("/${page}/")`);
    }
  });

  it("lights Discover in the shop and in Chat, which are its tiles now", () => {
    const tab = tabs.get("discover")!;
    for (const route of ['p === "/shop"', 'p.startsWith("/shop/")', 'p === "/community"', 'p.startsWith("/community/")', 'p === "/campaigns"', 'p.startsWith("/campaigns/")']) {
      expect(tab, route).toContain(route);
    }
    // And no longer where You is lit: two tabs lit at once is a broken bar.
    for (const route of ['"/account"', '"/saved"', '"/settings"']) expect(tab, route).not.toContain(route);
  });

  it("claims no route for two tabs", () => {
    const claimed = new Map<string, string>();
    for (const [key, tab] of tabs) {
      for (const [, route] of tab.matchAll(/p === "(\/[a-z-]*)"/g)) {
        expect(claimed.get(route), `${route} is claimed by ${claimed.get(route)} and ${key}`).toBeUndefined();
        claimed.set(route, key);
      }
    }
    expect(claimed.size).toBeGreaterThan(20);
  });

  it("carries Chat's unread dot on Discover's glyph", () => {
    expect(bar).toContain('{key === "discover" ? <NotificationsBadge /> : null}');
    expect(bar).not.toContain('key === "community"');
  });
});

describe("Discover, where the two went", () => {
  const start = discover.indexOf("const entries: DiscoverEntry[] = [");
  const entries = discover.slice(start, discover.indexOf("\n  ];", start));

  // Doors in a gallery since 1.8 (the owner's pick of 2026-10-27, round 7b,
  // D): each a band with its picture and no glyph, which is why the glyphs
  // the tabs wore (the cart, the speech bubble) are no longer checked here.
  it("has a Shop door, only while the shop is on, under the name its tab had", () => {
    const shop = entries.slice(entries.indexOf("...(shopEnabled()"), entries.indexOf('href: "/community"'));
    expect(shop).toContain('label: <T k="nav.shop" />');
    expect(shop).toContain('href: "/shop"');
  });

  it("has a Chat door under the name its tab had, with the unread dot on it", () => {
    const chat = entries.slice(entries.indexOf('label: <T k="nav.chat" />'));
    expect(chat).toContain('href: "/community"');
    expect(chat.slice(0, chat.indexOf("\n    },"))).toContain("badge: <UnreadDot />");
    expect(discover).toContain('import { UnreadDot } from "@/components/community/NotificationsInbox";');
  });

  it("writes its words as islands, never as strings the server looked up", () => {
    expect(entries).not.toMatch(/label: t\(|label: "/);
  });
});

describe("the unread dot", () => {
  const inbox = read("components/community/NotificationsInbox.tsx");

  it("is asked for in one place and only read in the other", () => {
    const badge = inbox.slice(inbox.indexOf("export function NotificationsBadge()"), inbox.indexOf("export function UnreadDot()"));
    const dot = inbox.slice(inbox.indexOf("export function UnreadDot()"));
    expect(badge).toContain("refreshInbox()");
    expect(badge).toContain("return <UnreadDot />;");
    expect(dot.slice(0, dot.indexOf("\n}\n"))).not.toContain("refreshInbox");
  });
});
