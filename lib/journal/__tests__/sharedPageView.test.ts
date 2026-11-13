// The shared page as a visitor reads it (components/journal/SharedPageView.tsx),
// rendered as the website would: every block of a page, the mark that it is a
// reader's page made with Purify, Report, and never the library's mark.

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { SharedPageView } from "@/components/journal/SharedPageView";
import { getMessages } from "@/lib/i18n";
import { libraryBlock, serializePage, verseBlock } from "@/lib/journal/page";
import { COVERS } from "@/lib/journal/covers";
import { publicPage } from "@/lib/journal/share";
import type { SharedPage } from "@/lib/journal/sharedPage";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const render = (shared: SharedPage) =>
  renderToString(createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, createElement(SharedPageView, { shared })));

const page = publicPage(
  serializePage({
    title: "A page of my own",
    blocks: [
      { type: "text", text: "Some words of my own.", color: "blue" },
      verseBlock("john", 4, 14)!,
      { type: "quote", text: "Words a friend said to me.", by: "A friend" },
      libraryBlock("Lord, have mercy.", "Morning Prayers", "/prayers/")!,
      { type: "heading", text: "A heading" },
      { type: "check", items: [{ text: "A line done", done: true }] },
      { type: "divider", style: "dots" },
      { type: "callout", icon: "candle", text: "Words set apart." },
    ],
  }),
)!;

const shared: SharedPage = {
  id: "00000000-0000-4000-8000-000000000003",
  page,
  createdAt: "2026-11-08T10:00:00.000Z",
  reviewed: false,
  verses: { "john/4/14": "But whosoever drinketh of the water that I shall give him shall never thirst;" },
};

describe("a shared page, as a visitor reads it", () => {
  const out = render(shared);

  it("shows every block of the page, Scripture's words from the server's Bible", () => {
    for (const s of ["A page of my own", "Some words of my own.", "But whosoever drinketh", "John 4:14", "Words a friend said to me.", "A friend", "A heading", "A line done", "Words set apart."]) {
      expect(out).toContain(s);
    }
    expect(out).toContain('data-hl-color="blue"');
  });

  it("is headed by its day and the Church's day", () => {
    expect(out).toContain("Sunday, November 8, 2026");
    expect(out).toContain("Synaxis of the Holy Archangel Michael");
  });

  it("is a reader's page made with Purify, with Report, and never claims the library's mark", () => {
    expect(out).toContain("A reader&#x27;s page, made with Purify");
    expect(out).toContain(">Report<");
    expect(out).not.toContain("Quoted from Purify");
    // The library's words go as a quote, cited by their page.
    expect(out).toContain("Lord, have mercy.");
    expect(out).toContain("Morning Prayers");
  });
});

// Build 95, note 6, part 3 (his yes of 2026-11-13 about 20:47 UTC): the shared
// page follows the app's page. Scripture is a raised card with its place at
// its head; a quote stays on the page, never raised and never boxed; the cover
// stands at the page's head, rounded, cut from high in the frame. Until then
// the website drew a verse and a quote as two bordered boxes alike, the verse's
// place at its foot, and the cover edge to edge on a phone, cut through the
// middle of the icon.
describe("a shared page, drawn as the app draws a page (build 95 note 6, part 3)", () => {
  const out = render(shared);
  /** The opening tag of the figure that holds `text`. */
  const figureOf = (html: string, text: string) => {
    const at = html.indexOf(text);
    const open = html.lastIndexOf("<figure", at);
    return html.slice(open, html.indexOf(">", open) + 1);
  };

  it("Scripture is a raised card, its place at its head and in the reading face", () => {
    const verse = figureOf(out, "But whosoever drinketh");
    expect(verse).toContain("theology-tray");
    expect(verse).not.toMatch(/\bborder\b/);
    expect(out.indexOf("John 4:14")).toBeLessThan(out.indexOf("But whosoever drinketh"));
    expect(out).toMatch(/font-serif text-\[17px\] font-semibold[^"]*"[^>]*>(?:<svg[\s\S]*?<\/svg>)?<span class="min-w-0">John 4:14</);
  });

  it("a quote, the reader's own or the library's (a plain quote here), is never raised and never boxed", () => {
    for (const text of ["Words a friend said to me.", "Lord, have mercy."]) {
      const quote = figureOf(out, text);
      expect(quote).toContain("data-shared-quote");
      expect(quote).not.toContain("theology-tray");
      expect(quote).not.toMatch(/\bborder\b|rounded-/);
    }
    expect(out).toMatch(/ps-\[23px\] italic[^>]*>Words a friend said to me\./);
  });

  it("a card whose words were not had keeps its place and the way to the verse", () => {
    const html = render({ ...shared, verses: {} });
    const verse = figureOf(html, "John 4:14");
    expect(verse).toContain("theology-tray");
    expect(html).toContain("Open to read");
    expect(html).not.toMatch(/<blockquote[^>]*><\/blockquote>/);
  });

  it("the cover stands at the page's head, rounded, cut where an icon's faces are", () => {
    const cover = COVERS[0];
    const html = render({ ...shared, page: { ...shared.page, cover: cover.id } });
    // The picture itself, not the preload React writes for it at the head.
    const img = html.indexOf(`<img src="${cover.src}"`);
    expect(img).toBeGreaterThan(-1);
    const figure = figureOf(html, `<img src="${cover.src}"`);
    expect(figure).toContain("data-shared-cover");
    expect(figure).not.toContain("-mx-5");
    expect(html.slice(img)).toMatch(/^<img[^>]*class="[^"]*rounded-\[18px\][^"]*object-\[50%_22%\][^"]*"/);
    expect(img).toBeLessThan(html.indexOf("A page of my own"));
  });
});
