// The three legal texts wear one look, and their words are theirs alone (1.9).
//
// His word of 2026-11-10: "and also can you revamp the TOS design?", and his
// yes to the Privacy Policy and the shop's policy taking the same look. The
// brief: not one word changes; it is approved legal text.
//
// What this holds:
//   1. each text sets its headings, paragraphs, lists and links from the one
//      shared file, and the Privacy Policy, which writes the strings out (so
//      privacyLevel.test.ts can read each block's look), writes those same
//      strings and none of the old ones;
//   2. each text draws its contents once, under its opening words, and the
//      list is read from the page's own headings: no second copy of a
//      heading is kept, and a tap changes no address (in the sheet the
//      phone's Back must still close it in one press);
//   3. each page stands in the shared frame, with the page's name from the
//      catalog;
//   4. no gold, no side stripe, and nothing here is a row of pills.
//
// What a reader would notice if this broke: three legal pages that look
// unrelated, a contents list that names a section the text does not have,
// or a Back press that walks the contents instead of closing the sheet.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import * as look from "@/components/legal/legalStyle";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const terms = read("components/legal/TermsText.tsx");
const shop = read("components/legal/ShopPoliciesText.tsx");
const privacy = read("components/legal/PrivacyText.tsx");
const contents = read("components/legal/LegalContents.tsx");
const frame = read("components/legal/LegalPage.tsx");

/** Every class string a text writes out. */
const written = (src: string) => [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);

describe("the legal texts' one look", () => {
  it("the Terms and the shop's policy set everything from the shared file", () => {
    for (const [name, src] of [["Terms", terms], ["shop", shop]] as const) {
      expect(src, name).toContain('from "./legalStyle"');
      expect(src, name).toContain("<h1 className={LEGAL_H1}>");
      expect(src, name).toContain("<p className={LEGAL_LEAD}>");
      expect(src, name).toContain("const H2 = LEGAL_H2;");
      expect(src, name).toContain("const P = LEGAL_P;");
      expect(src, name).toContain("const A = LEGAL_A;");
      // What it still writes out itself is only the bold the law wants seen.
      expect(written(src).filter((c) => c !== "text-paper"), name).toEqual([]);
    }
    expect(terms).toContain("const H3 = LEGAL_H3;");
    expect(terms).toContain("const UL = LEGAL_UL;");
  });

  it("the Privacy Policy writes out the shared strings, and none of the old ones", () => {
    const allowed = new Set<string>([
      look.LEGAL_H1,
      look.LEGAL_LEAD,
      look.LEGAL_LEAD_NEXT,
      look.LEGAL_H2,
      look.LEGAL_P,
      look.LEGAL_A,
      look.LEGAL_UL,
      look.LEGAL_CARD,
      look.LEGAL_CARD_NAME,
      look.LEGAL_CARD_P,
      look.LEGAL_CARD_P_NEXT,
      look.LEGAL_CARD_NOTE,
      look.LEGAL_CLOSE,
      look.LEGAL_CLOSE_P,
      // Its own: the two cards' grid, a technical name, and its bold.
      "mt-5 grid grid-cols-1 gap-3 md:grid-cols-2",
      "font-mono text-ui text-paper/70",
      "font-semibold text-paper",
    ]);
    const used = new Set(written(privacy));
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
    // Every shared string it has a use for is in it, in English and in German alike.
    for (const c of [look.LEGAL_H1, look.LEGAL_LEAD, look.LEGAL_LEAD_NEXT, look.LEGAL_H2, look.LEGAL_P, look.LEGAL_UL, look.LEGAL_CARD, look.LEGAL_CLOSE]) {
      expect(privacy.split(`className="${c}"`).length - 1, c).toBeGreaterThanOrEqual(2);
      expect((privacy.split(`className="${c}"`).length - 1) % 2, c).toBe(0);
    }
    // Its twelve sections are headings a reader, and a screen reader, can move by.
    expect(privacy.split(`<h2 className="${look.LEGAL_H2}">`).length - 1).toBe(24);
  });

  it("no legal text or part wears gold, and none sets a size from the old scale", () => {
    for (const [name, src] of [["Terms", terms], ["shop", shop], ["privacy", privacy], ["contents", contents], ["frame", frame], ["look", read("components/legal/legalStyle.ts")]] as const) {
      expect(/\bgold\b/.test(src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")), `${name}: gold`).toBe(false);
      expect(/text-(?:body|lede|display|display-sm|title-sm)\b/.test(src), `${name}: an old size`).toBe(false);
      expect(/border-(?:l|s|r|e|x)-\[?\d/.test(src), `${name}: a side stripe`).toBe(false);
    }
  });
});

describe("a legal text's contents", () => {
  it("stand once in each text, right under its opening words", () => {
    const after = (src: string, lead: string) => {
      const at = src.indexOf(lead);
      const end = src.indexOf("</p>", at) + "</p>".length;
      return src.slice(end, end + 200);
    };
    expect(terms.split("<LegalContents />").length - 1).toBe(1);
    expect(shop.split("<LegalContents />").length - 1).toBe(1);
    // English and German.
    expect(privacy.split("<LegalContents />").length - 1).toBe(2);
    expect(after(terms, "<p className={LEGAL_LEAD}>")).toContain("<LegalContents />");
    expect(after(shop, "<p className={LEGAL_LEAD}>")).toContain("<LegalContents />");
    expect(after(privacy, `<p className="${look.LEGAL_LEAD_NEXT}">`)).toContain("<LegalContents />");
    // Before the first section, so the list never lists what is above it.
    for (const src of [terms, shop, privacy]) expect(src.indexOf("<LegalContents />")).toBeLessThan(src.indexOf("<h2"));
  });

  it("are read from the page's own headings, and a tap changes no address", () => {
    expect(contents).toContain('root.querySelectorAll<HTMLElement>("h2")');
    expect(contents).toContain("new MutationObserver(read)");
    expect(contents).toContain('section.el.scrollIntoView({ block: "start", behavior: scrollBehavior() })');
    // No link to a place in the page, and no address written: the sheet's Back stays one press.
    expect(contents).not.toMatch(/href=|location\.|history\.|router\./);
    // Its name is the catalog's, in the reader's language, whatever language the text is in.
    expect(contents).toContain('t("saints.contents")');
    expect(contents).toContain("lang={locale} dir={textDir(locale)}");
    // A heading's words keep the language and direction the text gave them.
    expect(contents).toContain('<span lang={s.lang} dir={textDir(s.lang)} className="min-w-0 flex-1 rtl:text-right">');
    // A finger's target, folded and open, and the rail's rows the same under a mouse: no smaller size anywhere.
    expect(contents).toContain("min-h-[52px]");
    expect(contents.split("min-h-11").length - 1).toBeGreaterThanOrEqual(2);
    expect(contents).not.toMatch(/pointer:fine|min-h-(?:[1-9]|10)\b/);
    // The rail keeps the row being read in sight by moving itself alone, never the page.
    expect(contents).toContain("nav.scrollTop -= box.top - at.top + 8;");
    expect(contents).toContain("nav.scrollTop += at.bottom - box.bottom + 8;");
    // Folded until asked for, and it says which.
    expect(contents).toContain("aria-expanded={open}");
    expect(contents).toContain("useState(false)");
  });
});

describe("the legal pages' frame", () => {
  it("holds all three pages, each with its text", () => {
    const pages: Record<string, [string, string]> = {
      "app/(app)/terms/page.tsx": ['<LegalPage doc="terms">', "<TermsText />"],
      "app/(app)/privacy/page.tsx": ['<LegalPage doc="privacy">', '<PrivacyText lang="en" />'],
      "app/(app)/shop/policies/page.tsx": ['<LegalPage doc="shop-policies">', "<ShopPoliciesText />"],
    };
    for (const [file, [opens, draws]] of Object.entries(pages)) {
      const src = read(file);
      expect(src, file).toContain(opens);
      expect(src, file).toContain(draws);
    }
  });

  it("names the page from the catalog at its head, and the page's own bar says the same once the head has gone by", () => {
    expect(frame).toContain('terms: "terms.eyebrow", privacy: "privacy.eyebrow", "shop-policies": "shop.eikonShippingReturns"');
    expect(frame).toContain("<p id={LEGAL_PAGE_NAME}");
    expect(frame).toContain("<T k={NAME[doc]} />");
    // The bar is the page's to draw, never the frame's: only a page or a
    // layout mounts one (lib/nav/__tests__/backBar.test.ts). It says the
    // frame's name for the page, and waits for the frame's head.
    expect(frame).not.toContain("MobileTopBar");
    expect(read("app/(app)/terms/page.tsx")).toContain('<MobileTopBar titleKey="terms.eyebrow" back revealTitleOn={LEGAL_PAGE_NAME} />');
    expect(read("app/(app)/privacy/page.tsx")).toContain('<MobileTopBar titleKey="privacy.eyebrow" back revealTitleOn={LEGAL_PAGE_NAME} />');
    // The shop's policy stands under the shop's own tabs and takes none.
    expect(read("app/(app)/shop/policies/page.tsx")).not.toContain("MobileTopBar");
    const en = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;
    for (const key of ["terms.eyebrow", "privacy.eyebrow", "shop.eikonShippingReturns", "study.related", "saints.contents", "ui.termsOfServiceX", "ui.privacyPolicyX"]) {
      expect(en[key]?.trim(), key).toBeTruthy();
    }
  });

  it("gives a wide page its contents as a rail, and stands the folded list down beside it", () => {
    expect(frame).toContain("<LegalContents rail />");
    expect(frame).toContain("lg:[&_[data-legal-contents=fold]]:hidden");
    // A computer's only: in the apps a tablet keeps the folded list and takes no rail.
    expect(frame).toMatch(/<aside className="[^"]*\bnative-md-hidden\b/);
    expect(frame).toMatch(/lg:grid [^"]*\bnative-md-block"/);
    expect(contents).toMatch(/data-legal-contents="fold"[^>]*\bnative-md-block"/);
    // The text is found by this mark, by the rail and by the folded list.
    expect(frame).toContain('<div data-legal-text=""');
    expect(contents).toContain('closest<HTMLElement>("[data-legal-text], [data-legal-sheet]")');
    expect(read("components/legal/LegalSheet.tsx")).toContain("data-legal-sheet={shown}");
  });

  it("leads to the other texts, as rows", () => {
    // The shop's policy is a way in to the shop: only where the shop is open.
    expect(frame).toContain('const others = DOCS.filter((d) => d !== doc && (d !== "shop-policies" || shopEnabled()));');
    expect(frame).toContain("<Link href={LEGAL_HREF[d]}");
    expect(frame).toContain("<T k={LEGAL_TITLE_KEY[d]} />");
    expect(frame).not.toContain("rounded-pill");
  });
});
