// The rule under test: a shared quotation must come from Purify's own
// library, proved on the server, because the composer offering only
// Florilegium lines was a property of the UI and not of the API.

import { describe, expect, it } from "vitest";
import {
  isRefusal,
  verifyFatherQuote,
  verifyScriptureQuote,
} from "@/lib/community/verifyQuote";

describe("verifyScriptureQuote", () => {
  it("builds the text and the citation itself, ignoring anything a caller typed", async () => {
    const v = await verifyScriptureQuote({ book: "john", chapter: 1, verse: 1 });
    expect(isRefusal(v)).toBe(false);
    if (isRefusal(v)) return;
    expect(v.quoteText.toLowerCase()).toContain("in the beginning was the word");
    expect(v.quoteSource).toBe("John 1:1");
    expect(v.quoteHref).toBe("/bible/john/1");
  });

  it("refuses a book we do not carry", async () => {
    const v = await verifyScriptureQuote({
      book: "book-of-mormon",
      chapter: 1,
      verse: 1,
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a verse that does not exist", async () => {
    const v = await verifyScriptureQuote({ book: "john", chapter: 1, verse: 999 });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a path-traversal book slug rather than reading off disk", async () => {
    const v = await verifyScriptureQuote({
      book: "../../../etc/passwd",
      chapter: 1,
      verse: 1,
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses an incomplete locator", async () => {
    expect(isRefusal(await verifyScriptureQuote({ book: "john" }))).toBe(true);
  });
});

describe("verifyFatherQuote", () => {
  it("accepts a line that really is in the work it cites", async () => {
    // Ignatius opens his letter to Polycarp by naming himself. Verbatim from
    // data/saints/ignatius-of-antioch/epistle-to-polycarp.json.
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: "epistle-to-polycarp",
      text: "Ignatius, who is also called Theophorus, to Polycarp",
    });
    expect(isRefusal(v)).toBe(false);
    if (isRefusal(v)) return;
    expect(v.quoteSource).toContain("Ignatius");
    expect(v.quoteHref).toBe("/saints/ignatius-of-antioch/epistle-to-polycarp");
  });

  it("REFUSES invented patristic text, which is the whole point", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: "epistle-to-polycarp",
      text: "The soul is a wheel of fire that turns upon the axle of the will.",
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a real line credited to the wrong work", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: "epistle-to-the-romans",
      text: "Ignatius, who is also called Theophorus, to Polycarp",
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a share that names no work, rather than trusting it", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: null,
      text: "Ignatius, who is also called Theophorus, to Polycarp",
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a saint we do not carry", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "not-a-saint",
      work: "some-work",
      text: "a line long enough to pass the length floor",
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("refuses a fragment too short to attribute", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: "epistle-to-polycarp",
      text: "to",
    });
    expect(isRefusal(v)).toBe(true);
  });

  it("tolerates curly quotes and collapsed whitespace in a faithful copy", async () => {
    const v = await verifyFatherQuote({
      saintSlug: "ignatius-of-antioch",
      work: "epistle-to-polycarp",
      text: "  Ignatius,   who is also called Theophorus,\n to Polycarp  ",
    });
    expect(isRefusal(v)).toBe(false);
  });
});
