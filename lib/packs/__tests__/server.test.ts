import { describe, expect, it, vi } from "vitest";

// The board is read from the live table on the website. Here it is the
// committed file, the same thing the website falls back to, and nothing is
// asked of any database.
vi.mock("@/lib/whatsNew/boardLive", async () => {
  const { currentBoardMessage } = await import("@/lib/whatsNew/board");
  return { getBoardMessage: async () => ({ message: currentBoardMessage(), fromFallback: true }) };
});

import { buildPacks, VERSE_DAYS_AHEAD } from "@/lib/packs/server";
import { readPacks, readVerseEntry } from "@/lib/packs/types";
import { getVerseOfDayTable } from "@/lib/today/verseOfDay";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";
import { currentBoardMessage } from "@/lib/whatsNew/board";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

describe("what /api/packs answers", () => {
  const now = new Date("2026-10-14T15:00:00Z");

  it("is read whole by the apps' own check: the website never makes a pack the apps would throw away", async () => {
    const made = await buildPacks(now);
    const read = readPacks(JSON.parse(JSON.stringify(made)));
    expect(read).not.toBeNull();
    expect(read!.packs["verse-of-day"]).toEqual(made.packs["verse-of-day"]);
    expect(read!.packs.board).toEqual(made.packs.board);
    for (const [day, entry] of Object.entries(made.packs["verse-of-day"]!.days)) {
      expect(readVerseEntry(entry), day).not.toBeNull();
    }
  });

  it("says which release made it, and when", async () => {
    const made = await buildPacks(now);
    expect(made.release).toBe(CURRENT_VERSION);
    expect(made.made).toBe(now.toISOString());
  });

  it("carries the days from yesterday on, exactly as the Verse of the Day card would show them", async () => {
    const made = await buildPacks(now);
    const days = made.packs["verse-of-day"]!.days;
    const keys = Object.keys(days);
    expect(keys).toHaveLength(VERSE_DAYS_AHEAD);
    expect(keys[0]).toBe("2026-10-13");
    const base = new Date(now);
    base.setUTCDate(base.getUTCDate() - 1);
    // Each day also carries its machine translations (TEMPORARY,
    // lib/today/machineVerse.ts), which lib/today/__tests__/machineVerse.test.ts
    // holds; what the card renders from is otherwise the same, word for word.
    const english = (entry: VerseOfDayEntry): VerseOfDayEntry => {
      const copy = { ...entry };
      delete copy.machine;
      return copy;
    };
    const asCard = Object.fromEntries(Object.entries(days).map(([day, entry]): [string, VerseOfDayEntry] => [day, english(entry)]));
    expect(asCard).toEqual(await getVerseOfDayTable(base, VERSE_DAYS_AHEAD));
  });

  it("carries the board message the website shows", async () => {
    const made = await buildPacks(now);
    expect(made.packs.board!.message).toEqual(currentBoardMessage() ?? null);
  });
});

describe("what /api/packs says about the next update", () => {
  it("is the committed file, read through the apps' own check", async () => {
    const nextUpdate = (await import("@/data/changelog/next-update.json")).default as Record<string, unknown>;
    const made = await buildPacks(new Date("2026-10-14T15:00:00Z"));
    expect(made.packs.release?.next).toEqual({ name: nextUpdate.name, version: nextUpdate.version, date: nextUpdate.date });
  });
});
