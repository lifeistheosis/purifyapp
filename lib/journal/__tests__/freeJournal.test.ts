// The journal is everyone's (1.9). His word of 2026-11-08: "let's make the
// free version just a journal, right, for you", and Plus "the full Notion
// style journal" (docs/1.9-build/JOURNAL.md). Writing, the days and every
// entry are free; what Plus adds is shown with the Plus mark, never hidden,
// and the paywall no longer says the journal itself is Plus.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { PREMIUM_PLAN_DE, PREMIUM_PLAN_EN } from "@/lib/premium/plans";
import { PLUS_ROWS } from "@/lib/premium/plusRows";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const words = en as Record<string, string>;

describe("everyone writes", () => {
  const client = read("components/journal/JournalClient.tsx");
  const write = read("components/journal/WriteButton.tsx");

  it("no Plus card stands where the journal would be, and Write never opens the upgrade sheet", () => {
    expect(client).not.toContain("PlusGate");
    const begin = client.slice(client.indexOf("const begin = useCallback"), client.indexOf("const write = () =>"));
    expect(begin).not.toContain("upgrade");
    expect(begin).not.toContain("locked");
  });

  it("the Write button carries no Plus mark", () => {
    expect(write).not.toMatch(/locked|PREMIUM_CHIP|purifyPlus/);
  });
});

describe("what Plus adds is shown, never hidden", () => {
  const client = read("components/journal/JournalClient.tsx");
  const feed = read("components/journal/JournalFeed.tsx");

  it("From this day: a note is waiting, with the Plus mark, and the sheet named for the journal", () => {
    const locked = client.slice(client.indexOf('data-journal-remembered="locked"'), client.indexOf(") : remembered.length > 0 ? ("));
    expect(locked).toContain("<PlusMark />");
    expect(locked).toContain('upgrade.open("journal")');
    expect(locked).toContain('t("journal.fromThisDayPlus")');
    // A row to tap, 44px or more.
    expect(locked).toMatch(/<button[\s\S]*?className="[^"]*\bmin-h-11\b/);
  });

  it("the journal's search: the field at rest, with the Plus mark", () => {
    expect(client).toContain('onSearchLocked={locked ? () => upgrade.open("journal") : undefined}');
    const lockedSearch = feed.slice(feed.indexOf('data-journal-search="locked"'), feed.indexOf("<SearchField"));
    expect(lockedSearch).toContain("<PlusMark");
    expect(lockedSearch).toContain("h-[48px]");
    expect(lockedSearch).toContain('t("journal.search")');
  });

  it("printing stays free: what a reader wrote is theirs to keep", () => {
    const print = client.slice(client.indexOf("{!native ? ("), client.indexOf("{t(\"journal.print\")}"));
    expect(print).not.toMatch(/locked|upgrade/);
  });
});

describe("the paywall says what Plus adds, and never that the journal is Plus", () => {
  it("the journal row is the full journal, and says writing stays free", () => {
    const row = PLUS_ROWS.find((r) => r.feature === "journal")!;
    expect(words[row.title!]).toBe("The full journal is part of Purify Plus");
    expect(words[row.name]).toBe("The full journal");
    expect(words[row.body]).toMatch(/^Search everything you have written/);
    expect(words[row.keep!]).toMatch(/^Writing in your journal/);
    expect(words[row.keep!]).toContain("stay free");
  });

  it("the pricing pages list the journal among what is free, in English and German", () => {
    expect(PREMIUM_PLAN_EN.freeItems.some((i) => i.startsWith("Your journal"))).toBe(true);
    expect(PREMIUM_PLAN_DE.freeItems.some((i) => i.startsWith("Dein Tagebuch"))).toBe(true);
    expect(PREMIUM_PLAN_EN.plusItems.find((i) => i.id === "journal")?.title).toBe("The full journal");
    expect(PREMIUM_PLAN_DE.plusItems.find((i) => i.id === "journal")?.title).toBe("Das ganze Tagebuch");
  });
});
