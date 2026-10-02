import { describe, expect, it } from "vitest";

import { symbolRuns } from "../symbols";

const marked = (text: string) =>
  symbolRuns(text)
    .map((r) => (r.symbol ? `[${r.text}]` : r.text))
    .join("");

describe("symbolRuns", () => {
  it("leaves plain text whole, with nothing to split", () => {
    expect(symbolRuns("Lord, have mercy.")).toEqual([{ text: "Lord, have mercy.", symbol: false }]);
    expect(symbolRuns("")).toEqual([{ text: "", symbol: false }]);
  });

  it("picks out the characters from @purify's posts that fetched fonts", () => {
    expect(marked("v1.4 Is Out! Update Your Apps! 🎊")).toBe("v1.4 Is Out! Update Your Apps! [🎊]");
    expect(marked("● Fixed the reader ✨ and the shop 📱")).toBe("[●] Fixed the reader [✨] and the shop [📱]");
  });

  it("keeps a whole emoji together: joiners, skin tones, selectors, flags", () => {
    expect(marked("a👨‍👩‍👧b")).toBe("a[👨‍👩‍👧]b");
    expect(marked("👍🏽 ok")).toBe("[👍🏽] ok");
    expect(marked("I ❤️ it")).toBe("I [❤️] it");
    expect(marked("Ελλάδα 🇬🇷")).toBe("Ελλάδα [🇬🇷]");
    expect(marked("☦ Christ is risen")).toBe("[☦] Christ is risen");
  });

  it("leaves the text face its own punctuation and letters, in any script", () => {
    expect(marked("“Glory” – © Purify™ … Слава Богу")).toBe("“Glory” – © Purify™ … Слава Богу");
    expect(marked("السلام عليكم")).toBe("السلام عليكم");
  });

  it("joins back to the same text", () => {
    const s = "Pray 🙏🏻 for us ● ✨ always ☦️";
    expect(symbolRuns(s).map((r) => r.text).join("")).toBe(s);
  });
});
