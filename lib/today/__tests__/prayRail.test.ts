import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { PrayRail } from "@/components/today/PrayNowCard";
import { getMessages } from "@/lib/i18n";
import { sectionMedia } from "@/lib/media/sections";

import { hourPrayer } from "../greeting";
import { ANTHEM, prayRail, railOrder, type MineCard } from "../prayRail";

// Pray on Today (1.8, the owner's pick B of round 13, "The hour, large"):
// one card for the hour's prayer and the rest of the day as tiles, the same
// prayers in the same order as the row of 1.7.

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const en = getMessages("en");
const none = () => false;
const keptOnly = (...ids: string[]) => (id: string) => ids.includes(id);
const MINE_EVENING: MineCard = { part: "evening", id: "mine-evening", href: "/prayers/personal/evening", minutes: 11 };

describe("the hour's card", () => {
  it("is the Morning Rule by day, its name, its minutes and its own line", () => {
    const { hour } = prayRail("morning", null, none);
    expect(hour).toMatchObject({
      key: "morning",
      href: "/prayers/morning",
      titleKey: "today.prayNow.morningFallback",
      lineKey: "prayers.rule.morning.description",
      minutes: 8,
      done: false,
    });
  });

  it("is the Evening Rule from the evening, as round 13 drew it: Now, 8 min", () => {
    const { hour } = prayRail("evening", null, none);
    expect(hour).toMatchObject({ key: "evening", href: "/prayers/evening", titleKey: "today.prayNow.eveningFallback", minutes: 8 });
    expect(hour.lineKey).toBe("prayers.rule.evening.description");
  });

  it("is the reader's own rule when it has the part the hour calls for", () => {
    const { hour } = prayRail("evening", MINE_EVENING, none);
    expect(hour).toMatchObject({
      key: "mine-evening",
      href: "/prayers/personal/evening",
      titleKey: "prayers.mine.eveningTitle",
      lineKey: "prayers.mine.youHint",
      minutes: 11,
    });
  });

  it("makes the same choice as the greeting's pill", () => {
    for (const [now, mine] of [["morning", null], ["evening", null], ["evening", MINE_EVENING]] as const) {
      const { hour } = prayRail(now, mine, none);
      const pill = hourPrayer(now, mine);
      expect({ href: hour.href, titleKey: hour.titleKey, minutes: hour.minutes }).toEqual(pill);
    }
  });

  it("carries the done mark once the hour's prayer is kept today", () => {
    expect(prayRail("evening", null, keptOnly("evening")).hour.done).toBe(true);
    expect(prayRail("evening", MINE_EVENING, keptOnly("mine-evening")).hour.done).toBe(true);
    expect(prayRail("evening", MINE_EVENING, keptOnly("evening")).hour.done).toBe(false);
  });
});

describe("the tiles under it", () => {
  const keys = (now: "morning" | "evening", mine: MineCard | null, kept: (id: string) => boolean) =>
    prayRail(now, mine, kept).tiles.map((t) => t.key);

  it("are the rest of the day in order, the anthem last", () => {
    expect(keys("morning", null, none)).toEqual(["midday", "evening", "before-sleep", "anthem"]);
    // The evening of round 13: Before sleep, 2 min, and the anthem.
    expect(keys("evening", null, none)).toEqual(["before-sleep", "anthem"]);
    const evening = prayRail("evening", null, none).tiles;
    expect(evening[0]).toMatchObject({ titleKey: "prayers.rule.before-sleep.title", minutes: 2, href: "/prayers/before-sleep" });
    expect(evening[1]).toBe(ANTHEM);
  });

  it("bring back an earlier prayer already said today, marked", () => {
    const tiles = prayRail("evening", null, keptOnly("morning")).tiles;
    expect(tiles.map((t) => t.key)).toEqual(["before-sleep", "morning", "anthem"]);
    expect(tiles[1].done).toBe(true);
    expect(tiles[0].done).toBe(false);
  });

  it("start with the hour's rule when the reader's own leads", () => {
    expect(keys("evening", MINE_EVENING, none)).toEqual(["evening", "before-sleep", "anthem"]);
  });

  it("follow the order of 1.7's row exactly", () => {
    for (const now of ["morning", "evening"] as const) {
      for (const kept of [none, keptOnly("morning"), keptOnly("midday", "morning")]) {
        expect(keys(now, null, kept)).toEqual([...railOrder(now, kept).slice(1), "anthem"]);
      }
    }
  });

  it("name every word they show in the catalog", () => {
    for (const now of ["morning", "evening"] as const) {
      for (const mine of [null, MINE_EVENING]) {
        const { hour, tiles } = prayRail(now, mine, none);
        const shown = [hour.titleKey, hour.lineKey, ...tiles.map((t) => t.titleKey), ...tiles.flatMap((t) => (t.subKey ? [t.subKey] : []))];
        for (const key of shown) expect(en[key], key).toBeTruthy();
      }
    }
  });
});

describe("Pray, drawn", () => {
  // The server's drawing, which the apps' export carries: the morning, words
  // held invisible until the device knows its hour, nothing marked.
  const out = renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(PrayRail)));

  it("leads its list with the hour's card, the Pantocrator a light at its side", () => {
    const items = [...out.matchAll(/<li[\s>]/g)].map((m) => m.index ?? -1);
    expect(items.length).toBeGreaterThan(2);
    expect(out.indexOf("data-pray-hour")).toBeGreaterThan(items[0]);
    expect(out.indexOf("data-pray-hour")).toBeLessThan(items[1]);
    expect(out).toContain(`src="${sectionMedia("prayers")!.src}"`);
    expect(out).toContain('href="/prayers/morning"');
  });

  it("says Now and the minutes, the name, one line and Begin", () => {
    expect(out).toContain(`${en["prayers.timeline.now"]} · ${en["today.minRead"].replace("{count}", "8")}`);
    expect(out).toContain(en["today.prayNow.morningFallback"]);
    expect(out).toContain(en["prayers.rule.morning.description"]);
    expect(out).toContain(en["today.prayNow.begin"]);
  });

  it("draws the tiles in the day's order, the anthem last", () => {
    const at = (s: string) => out.indexOf(s);
    expect(at(en["prayers.rule.midday.title"])).toBeGreaterThan(at(en["prayers.rule.morning.description"]));
    expect(at(en["today.prayNow.eveningFallback"])).toBeGreaterThan(at(en["prayers.rule.midday.title"]));
    expect(at(en["prayers.rule.before-sleep.title"])).toBeGreaterThan(at(en["today.prayNow.eveningFallback"]));
    expect(at('href="/chants/prayer-rope-anthem"')).toBeGreaterThan(at(en["prayers.rule.before-sleep.title"]));
  });

  it("shows no done mark before the device is asked", () => {
    expect(out).not.toContain(en["shop.prayedToday"]);
  });
});
