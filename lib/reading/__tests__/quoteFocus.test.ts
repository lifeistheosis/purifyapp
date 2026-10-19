// "Read it in Purify" opens a text on the words quoted from it, lit
// (lib/reading/quoteFocus.ts, components/reading/QuoteFocus.tsx). Held here:
// the words are found however a page splits them into text, a request is
// taken once and only by its page, and every quotation in the guide to a
// first Liturgy can be found in the text its door opens.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { locate, pathOf, requestQuoteFocus, takeQuoteFocus } from "@/lib/reading/quoteFocus";
import { SOURCES, allQuotes } from "@/lib/start/firstLiturgy";

describe("locate", () => {
  it("finds words inside one piece", () => {
    expect(locate(["Let my prayer be set forth before thee as incense."], "set forth before thee")).toEqual({
      start: { piece: 0, offset: 17 },
      end: { piece: 0, offset: 38 },
    });
  });

  it("finds words a page split across text nodes, a drop cap or a reader's highlight", () => {
    const pieces = ["F", "or the honour which is paid to ", "the image", " passes on."];
    const at = locate(pieces, "For the honour which is paid to the image passes on.");
    expect(at).toEqual({ start: { piece: 0, offset: 0 }, end: { piece: 3, offset: 11 } });
  });

  it("collapses white space and folds curly quotes on both sides", () => {
    const pieces = ["he said,\n   “the Lord’s Day”  and"];
    const at = locate(pieces, 'said, "the Lord\'s Day" and');
    expect(at).not.toBeNull();
    expect(pieces[0].slice(at!.start.offset, at!.end.offset)).toBe("said,\n   “the Lord’s Day”  and");
  });

  it("answers null for words the page does not carry, or for none", () => {
    expect(locate(["Gospodi pomiluj"], "Lord, have mercy")).toBeNull();
    expect(locate(["anything"], "   ")).toBeNull();
    expect(locate([], "anything")).toBeNull();
  });
});

describe("pathOf", () => {
  it("keeps only a link's page", () => {
    expect(pathOf("/saints/basil-the-great/on-the-holy-spirit#s27")).toBe("/saints/basil-the-great/on-the-holy-spirit");
    expect(pathOf("/councils/second-nicaea/the-decree-on-the-holy-icons/")).toBe("/councils/second-nicaea/the-decree-on-the-holy-icons");
    expect(pathOf("/bible/psalms/140?x=1#v2")).toBe("/bible/psalms/140");
    expect(pathOf("/")).toBe("/");
  });
});

describe("a request", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("is taken once, by the page it names", () => {
    requestQuoteFocus("/bible/psalms/140#v2", ["Let my prayer be set forth"]);
    expect(takeQuoteFocus("/start/first-liturgy")).toBeNull();
    expect(takeQuoteFocus("/bible/psalms/140")).toEqual(["Let my prayer be set forth"]);
    expect(takeQuoteFocus("/bible/psalms/140")).toBeNull();
  });

  it("goes stale when the reader went somewhere else first", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    requestQuoteFocus("/councils/first-nicaea/the-twenty-canons", ["prayer be made to God standing"]);
    vi.setSystemTime(new Date("2026-10-19T12:02:00Z"));
    expect(takeQuoteFocus("/councils/first-nicaea/the-twenty-canons")).toBeNull();
    expect(store.size).toBe(0);
  });

  it("never throws when storage is refused", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {},
    });
    expect(() => requestQuoteFocus("/bible/psalms/140", ["x"])).not.toThrow();
    expect(takeQuoteFocus("/bible/psalms/140")).toBeNull();
  });
});

describe("the guide's doors", () => {
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")) as unknown;
  /** Every string in a text's file: its paragraphs, its verses, its titles. */
  const strings = (v: unknown): string[] =>
    typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];

  it("open on text that holds each quotation within one paragraph, so it can be lit", () => {
    const quotes = allQuotes().filter(({ quote }) => SOURCES[quote.source].href);
    expect(quotes.length).toBeGreaterThanOrEqual(8);
    for (const { where, quote } of quotes) {
      const file = SOURCES[quote.source].file as string;
      const lit = strings(read(file)).some((s) => locate([s], quote.text) !== null);
      expect(lit, `${where}: "${quote.text.slice(0, 40)}" is not within one string of ${file}`).toBe(true);
    }
  });
});
