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
