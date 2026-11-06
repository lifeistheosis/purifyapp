import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import { VerseStrip } from "@/components/bible/VerseStrip";

// The verse strip, the owner's pick B of 2026-11-06: a tap on a verse opens
// this strip just under it.
describe("the verse strip", () => {
  const props = {
    reference: "John 1:1",
    verseText: "In the beginning was the Word",
    edition: "KJV",
    link: "https://purifyapp.net/bible/john/1#v1",
    highlight: { color: null, onPick: () => {}, onRemove: () => {} },
    copied: false,
    onCopy: () => {},
    onNote: () => {},
    study: [{ key: "crossrefs", label: "Cross-references", onSelect: () => {}, locked: true }],
    onClose: () => {},
  };

  it("holds Highlight, Copy, Share, Image, Note and Study, in that order, as a toolbar named for the verse", () => {
    const html = renderToStaticMarkup(createElement(VerseStrip, props));
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="bible.verseActionsFor"');
    const order = ["bible.strip.highlight", "common.copy", "common.share", "bible.strip.image", "bible.strip.note", "bible.strip.study"].map((k) => html.indexOf(k));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("stands under the verse in the page, for phones and the apps' tablets only", () => {
    const html = renderToStaticMarkup(createElement(VerseStrip, props));
    expect(html).toContain("data-verse-strip");
    expect(html).toMatch(/absolute inset-x-0[^"]*md:hidden native-md-block/);
    expect(html).toContain("top-full");
  });

  it("says Copied once the verse is copied", () => {
    expect(renderToStaticMarkup(createElement(VerseStrip, { ...props, copied: true }))).toContain("common.copied");
  });
});
