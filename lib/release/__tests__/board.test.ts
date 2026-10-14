import { describe, expect, it } from "vitest";

import boardJson from "@/data/changelog/board.json";
import { BoardInput, isoWeekOf } from "@/lib/whatsNew/boardShape";
import {
  boardEntry,
  boardFreshness,
  EYEBROW,
  isoDate,
  isoWeek,
  placeBoardEntry,
  STALE_DAYS,
} from "@/scripts/lib/release-board.mjs";

/**
 * `node scripts/release.mjs board`, which writes a release's own board
 * message into data/changelog/board.json from its drop, before the store
 * builds carry the file away. The freshness rule for the build in hand is
 * held in lib/whatsNew/__tests__/board.test.ts; this holds the writing.
 */

const DROP = {
  release: "9.1",
  pieces: [
    { id: "letter", subject: "Not this one", text: "Nor this." },
    { id: "board", subject: "9.1 is here", text: "Five tabs.\n\nOne Settings.\nThe full note is below.\n" },
  ],
};
const NOTE = { version: "9.1", date: "October 14, 2026" };
const entry = () => boardEntry({ drop: DROP, note: NOTE });

const message = (week: string, date: string, headline = "A week", body = ["Words."]) => ({
  week,
  date,
  eyebrow: EYEBROW,
  headline,
  body,
});

describe("the board message a release writes", () => {
  it("numbers weeks exactly as the admin editor does", () => {
    // isoWeek is a copy of isoWeekOf, since this plain script cannot load
    // TypeScript. Three years of days, year ends and week 53s among them.
    for (let t = Date.UTC(2024, 11, 20); t <= Date.UTC(2028, 0, 10); t += 86_400_000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      expect(isoWeek(iso), iso).toBe(isoWeekOf(iso));
    }
  });

  it("reads the note's date as entries.json writes it", () => {
    expect(isoDate("October 14, 2026")).toBe("2026-10-14");
    expect(isoDate("2026-10-14")).toBe("2026-10-14");
    expect(isoDate("Octember 14, 2026")).toBeNull();
    expect(isoDate("")).toBeNull();
  });

  it("is the drop's board piece, in board.json's own shape", () => {
    expect(entry()).toEqual({
      week: "2026-W42",
      date: "2026-10-14",
      eyebrow: "This week at Purify",
      headline: "9.1 is here",
      body: ["Five tabs.", "One Settings.", "The full note is below."],
    });
    // The keys in the order every entry already has them, so a pull and this
    // write the same file.
    expect(Object.keys(entry())).toEqual(Object.keys(boardJson[0]));
    // And the admin editor would take it as it is, so the same message can go
    // into the table at the announcement.
    expect(() => BoardInput.parse(entry())).not.toThrow();
  });

  it("refuses what it cannot write", () => {
    const without = (piece: object) => ({ release: "9.1", pieces: [piece] });
    expect(() => boardEntry({ drop: { release: "9.1", pieces: [] }, note: NOTE })).toThrow(/no piece "board"/);
    expect(() => boardEntry({ drop: without({ id: "board", text: "Words." }), note: NOTE })).toThrow(/no subject/);
    expect(() => boardEntry({ drop: without({ id: "board", subject: "9.1", text: " \n " }), note: NOTE })).toThrow(/no text/);
    expect(() => boardEntry({ drop: DROP, note: undefined })).toThrow(/no note/);
    expect(() => boardEntry({ drop: DROP, note: { version: "9.1", date: "soon" } })).toThrow(/not a date/);
    const dash = String.fromCharCode(0x2014);
    expect(() => boardEntry({ drop: without({ id: "board", subject: `9.1 ${dash} here`, text: "Words." }), note: NOTE })).toThrow(/em dash/);
  });
});

/** What board.json held on 2026-10-14, in short: nothing newer than 2026-09-08. */
const older = () => [message("2026-W37", "2026-09-08"), message("2026-W33", "2026-08-12")];

describe("putting it in board.json", () => {
  it("goes on top, once, however often it runs", () => {
    const first = placeBoardEntry(older(), entry());
    expect(first.change).toBe("added");
    expect(first.board.map((m) => m.week)).toEqual(["2026-W42", "2026-W37", "2026-W33"]);
    const again = placeBoardEntry(first.board, entry());
    expect(again.change).toBe("same");
    expect(again.board).toBe(first.board);
  });

  it("puts the release's own message back when its words change", () => {
    const first = placeBoardEntry(older(), entry()).board;
    const tuned = { ...entry(), body: ["Five tabs, tuned."] };
    const second = placeBoardEntry(first, tuned);
    expect(second.change).toBe("replaced");
    expect(second.board.filter((m) => m.week === "2026-W42")).toEqual([tuned]);
  });

  it("never writes over another message in its week unless told to", () => {
    const owners = [message("2026-W42", "2026-10-12", "The owner's week"), ...older()];
    expect(() => placeBoardEntry(owners, entry())).toThrow(/already has a message for 2026-W42: "The owner's week"/);
    const replaced = placeBoardEntry(owners, entry(), { replace: true });
    expect(replaced.change).toBe("replaced");
    expect(replaced.board[0]).toEqual(entry());
    expect(replaced.board).toHaveLength(3);
  });

  it("leaves a newer message on top, and says so", () => {
    const later = [message("2026-W43", "2026-10-20"), ...older()];
    const placed = placeBoardEntry(later, entry());
    expect(placed.board.map((m) => m.week)).toEqual(["2026-W43", "2026-W42", "2026-W37", "2026-W33"]);
    expect(placed.newer.map((m) => m.week)).toEqual(["2026-W43"]);
  });
});

describe("a stale board", () => {
  it(`is one whose newest message is more than ${STALE_DAYS} days before the note`, () => {
    const at = (date: string) => [message("2026-W01", date)];
    expect(boardFreshness(at("2026-09-14"), "October 14, 2026")).toMatchObject({ stale: false, days: 30 });
    expect(boardFreshness(at("2026-09-13"), "October 14, 2026")).toMatchObject({ stale: true, days: 31 });
    expect(boardFreshness(at("2026-10-20"), "2026-10-14")).toMatchObject({ stale: false, days: -6 });
    // The newest by date, wherever it sits in the file, as the reader picks it.
    const shuffled = [message("2026-W30", "2026-07-20"), message("2026-W41", "2026-10-06")];
    expect(boardFreshness(shuffled, "2026-10-14")).toMatchObject({ stale: false, days: 8 });
  });

  it("is what 1.6 would have shipped: five weeks old", () => {
    expect(boardFreshness(older(), "October 14, 2026")).toMatchObject({ stale: true, days: 36 });
  });

  it("is any board with no message, or a note with no date to hold it to", () => {
    expect(boardFreshness([], "2026-10-14").stale).toBe(true);
    expect(boardFreshness(older(), "soon").stale).toBe(true);
  });
});
