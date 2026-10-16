import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { BookWalkClient } from "@/components/walkthrough/BookWalkClient";
import { ChapterWalkClient } from "@/components/walkthrough/ChapterWalkClient";
import { WalkthroughsHub } from "@/components/walkthrough/WalkthroughsHub";
import { getMessages } from "@/lib/i18n";
import { BOOK_CHAPTERS, getChapterWalk, movementOf } from "@/lib/walkthroughs";
import { JOB } from "@/lib/walkthroughs/job";

// What the server writes for the walkthroughs (1.7): the HTML the website sends
// and the apps' static export carries. The reader's walk lives on the device,
// so before it is read the hub shows the walk as new, the book page offers
// Begin, and a chapter is its verses with each note's name under its verse,
// then the three steps. In every language the words are the reader's and
// never a raw key; the walk's own words are English for now.

const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

type ProviderProps = Parameters<typeof MessagesProvider>[0];

function render(node: React.ReactElement, code: string): string {
  return renderToString(createElement(MessagesProvider, { locale: code, messages: getMessages(code) } as ProviderProps, node));
}

const verses = (n: number) =>
  (JSON.parse(fs.readFileSync(path.join(process.cwd(), `data/bible/job/${n}.json`), "utf8")) as { verses: { n: number; text: string }[] }).verses;

describe("the server's first drawing of a walk", () => {
  it("of the hub is its name, its line, and the walk as a cover row", () => {
    for (const code of ["en", "el", "ar"]) {
      const words = getMessages(code);
      const out = render(
        createElement(WalkthroughsHub, {
          books: [{ book: "job", title: JOB.title, intro: JOB.intro, total: BOOK_CHAPTERS.job, cover: JOB.cover }],
        }),
        code,
      );
      expect(out, code).toContain('id="walk-hub-title"');
      expect(out, code).toContain(html(words["walk.hubTitle"]));
      expect(out, code).toContain('href="/walkthroughs/job"');
      expect(out, code).toContain(html(JOB.title));
      // A walk not yet begun: its length and that it is free, in plain words.
      expect(out, code).toContain(html(words["walk.free"]));
      expect(out, code).toContain(`src="${JOB.cover}"`);
      expect(out, code).not.toMatch(/walk\.[a-zA-Z]/);
    }
  });

  it("of a book is its cover, its name, Begin, and every chapter in its movements", () => {
    const words = getMessages("en");
    const out = render(
      createElement(BookWalkClient, {
        meta: {
          book: "job",
          title: JOB.title,
          intro: JOB.intro,
          total: BOOK_CHAPTERS.job,
          cover: JOB.cover,
          chapters: JOB.chapters.map((c) => ({ n: c.n, title: c.title })),
          movements: JOB.movements,
        },
      }),
      "en",
    );
    expect(out).toContain('id="walk-book-title"');
    expect(out).toContain(`src="${JOB.cover}"`);
    expect(out).toContain(html(words["walk.begin"]));
    expect(out).toContain('href="/walkthroughs/job/1"');
    for (const c of JOB.chapters) expect(out, `chapter ${c.n}`).toContain(`href="/walkthroughs/job/${c.n}"`);
    for (const m of JOB.movements) expect(out, m.id).toContain(html(m.title));
    // The first chapter is the one to walk next.
    expect(out).toContain(html(words["walk.upNext"]));
    expect(out).not.toMatch(/walk\.[a-zA-Z]/);
    expect(out).not.toMatch(/<svg[^>]*viewBox="0 0 (360|320)/);
  });

  it("of a chapter is its verses, each note's name under its verse, then the steps", () => {
    for (const code of ["en", "ru"]) {
      const words = getMessages(code);
      const n = 1;
      const walk = getChapterWalk("job", n)!;
      const out = render(
        createElement(ChapterWalkClient, {
          meta: {
            book: "job",
            bookName: JOB.bookName,
            title: JOB.title,
            fatherSource: JOB.fatherSource,
            movementTitle: movementOf(JOB, n)?.title ?? "",
            total: BOOK_CHAPTERS.job,
            movements: JOB.movements,
            chapters: JOB.chapters.map((c) => ({ n: c.n, title: c.title })),
          },
          walk,
          verses: verses(n),
          prev: null,
          next: 2,
        }),
        code,
      );
      expect(out, code).toContain('id="walk-chapter-title"');
      expect(out, code).toContain(html(walk.title));
      expect(out, code).toContain(html(words["walk.chapterOf"].replace("{n}", "1").replace("{total}", "42")));
      expect(out, code).toContain("data-walk-progress=");
      // Every verse, and every note's way in sitting inside its own verse.
      for (const v of verses(n)) expect(out, `${code} v${v.n}`).toContain(`id="v${v.n}"`);
      for (const card of walk.cards) {
        const at = out.indexOf(`id="v${card.verse}"`);
        const door = out.indexOf(`data-walk-note="${card.id}"`);
        const nextVerse = out.indexOf(`id="v${card.verse + 1}"`);
        expect(door, card.id).toBeGreaterThan(at);
        if (nextVerse > -1) expect(door, card.id).toBeLessThan(nextVerse);
      }
      // No note is open, and none rises by itself.
      expect(out, code).not.toContain('role="dialog"');
      // Then the steps, after the text.
      expect(out.indexOf(html(words["walk.synthesisTitle"])), code).toBeGreaterThan(out.indexOf(`id="v${verses(n).length}"`));
      expect(out, code).toContain(html(words["walk.orderTitle"]));
      expect(out, code).toContain('href="/walkthroughs/job/2"');
      expect(out, code).not.toMatch(/walk\.[a-zA-Z]/);
    }
  });
});
