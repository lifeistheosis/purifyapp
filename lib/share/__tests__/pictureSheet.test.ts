// The picture sheet with a quote's own looks (1.8, round 3: r3-11, the owner's
// pick of all three layouts, each a tile of the sheet, and r3-11b, "The sheet
// holds them all"), read as source: the sheet itself mounts only in a page.
//
// What a reader would notice if this broke: a saint's picture back to the
// verse's looks with no face, the layouts or the looks as a cloud of pills, a
// layout lost when the look is changed, or another screen's Share as a picture
// broken because the sheet's props moved under it.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const sheet = read("components/share/PictureSheet.tsx");

describe("the picture sheet", () => {
  it("keeps every prop the other screens call it with", () => {
    for (const prop of ["open", "onClose", "words", "title", "name", "caption", "referenceLabel", "lead", "leadLabel"]) {
      expect(sheet, prop).toMatch(new RegExp(`\\n  ${prop},\\n`));
    }
    // The Theology deck's portrait lead still opens first and is drawn as the verse's looks are.
    expect(sheet).toMatch(/lead \? \{ \.\.\.DEFAULT_STYLE, look: lead\.id \}/);
    expect(sheet).toContain("{LOOKS.map((look) => (");
  });

  it("opens a quote on its own looks: his portrait, on Night, as a post", () => {
    expect(sheet).toContain("quote ? QUOTE_STYLE : lead ?");
    expect(sheet).toMatch(/tab === "look" && quote \? \(\s*<QuoteLooks/);
    expect(sheet).toContain("prepareQuote(words, quote, style)");
    expect(sheet).toContain("quote ? await renderQuoteCard(words, quote, style) : await renderVerseCard(words, style, { photo })");
  });

  it("draws a Layout row of three tiles, each the words in that layout, and one scrolling row of round swatches, the chosen ringed white", () => {
    const looks = sheet.slice(sheet.indexOf("function QuoteLooks("), sheet.indexOf("/** A switch in the Words tab"));
    expect(looks).toContain('t("picture.layout")');
    expect(looks).toContain("LAYOUT_ORDER.map((l) => (");
    expect(looks).toContain("QUOTE_LOOKS.map((look) => (");
    // No pill cloud: one row each, the looks scrolling sideways rather than wrapping.
    expect(looks).not.toMatch(/flex-wrap/);
    expect(looks).toMatch(/flex gap-2\.5 overflow-x-auto/);
    expect(looks).toContain("aria-pressed={on}");
    // The chosen swatch ringed white, as the councils' chosen Father is.
    expect(looks).toContain("0_0_0_2px_var(--color-night),0_0_0_3.5px_var(--color-paper)");
    // Each tile is the picture itself, drawn in its layout with the chosen look.
    expect(looks).toContain("prepareQuote(words, quote, { ...QUOTE_STYLE, look, font, layout })");
  });

  it("keeps the layout when the look changes, and the look when the layout changes", () => {
    expect(sheet).toContain("onLayout={(layout) => change({ layout })}");
    expect(sheet).toContain("onLook={(look) => change({ look })}");
    expect(sheet).toContain("setStyle((now) => ({ ...now, ...patch }))");
  });

  it("rests the cross and the alignment on the Page and the Seal, where the layout sets them", () => {
    expect(sheet).toContain('const portraitOnly = Boolean(quote) && (style.layout ?? "portrait") !== "portrait";');
    expect(sheet).toContain("disabled={icon || portraitOnly}");
    expect(sheet.match(/disabled=\{portraitOnly\}/g)).toHaveLength(2);
  });

  it("is opened with whose words they are from Today's saint, Today's saying and a council's page", () => {
    for (const file of ["components/today/SaintWindow.tsx", "components/today/TodaySayingCard.tsx", "components/councils/CouncilWords.tsx"]) {
      const source = read(file);
      expect(source, file).toMatch(/dynamic\(\(\) => import\("@\/components\/share\/PictureSheet"\)/);
      expect(source, file).toContain("quote={quote}");
    }
    expect(read("components/today/SaintWindow.tsx")).toContain("face: quoteFace(saint, isNativeClient())");
    expect(read("components/today/TodaySayingCard.tsx")).toContain("quoteFace({ slug: saying.speaker }, isNativeClient())");
  });
});
