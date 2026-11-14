// A council's plate given its real picture where one is allowed and dropped
// where not (his "all recs", 2026-11-13 about 14:29 UTC; the gate's positive 3,
// docs/1.9-build/notes/gate-2/positive-3-council-door.jpg).
//
// The door to a council's books (components/councils/DocumentsDoor.tsx) shows
// its first three as a small fan of covers. A local council has no picture
// History may show (lib/councils/page.ts, councilEvent), and each of its books
// stood in the fan as the room's plate, a cover's shape with only its ground,
// which read as an empty picture. Now only a book with its real picture stands
// in the fan, and a door with none is its words alone. Drawn from the shelves
// the council page hands the door (app/(app)/councils/[slug]/page.tsx).

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k, tn: (k: string, n: number) => `${k}:${n}`, locale: "en" }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children) }));

import { councilBooks, shelfSize } from "@/lib/councils/books";
import { getCouncil } from "@/lib/councils/councils";

async function door(slug: string): Promise<string> {
  const { DocumentsDoor } = await import("@/components/councils/DocumentsDoor");
  const c = getCouncil(slug)!;
  const books = councilBooks(c, true);
  const shelf = shelfSize(books);
  // As the council page hands it over.
  const fan = books.slice(0, 3).map((b) => ({ src: b.cover?.src, focusY: b.cover?.focusY, crop: b.cover?.crop }));
  return renderToStaticMarkup(createElement(DocumentsDoor, { href: `/reading/councils/${slug}`, books: shelf.books, minutes: shelf.minutes, fan }));
}

const covers = (html: string) => (html.match(/class="dark-island relative block overflow-hidden rounded-\[4px\]/g) ?? []).length;
const PLATE = "radial-gradient(85% 55% at 50% 40%";

describe("the door to a council's books", () => {
  it("drops a local council's plates, and is its words alone when no book has a picture", async () => {
    for (const slug of ["laodicea", "gangra", "ancyra-314", "antioch-268", "jerusalem-1672"]) {
      const html = await door(slug);
      expect(html, slug).toContain("study.councils.readDocuments");
      expect(covers(html), slug).toBe(0);
      expect(html, slug).not.toContain("h-[58px] w-[78px]");
      expect(html, slug).not.toContain(PLATE);
    }
  });

  it("keeps a book's real picture among plates dropped: Carthage 256's third book, Cyprian's, stands alone in front", async () => {
    const html = await door("carthage-256");
    expect(covers(html)).toBe(1);
    expect(html).toContain('class="absolute bottom-0 start-[20px]"');
    expect(html).not.toContain("start-[2px]");
    expect(html).not.toContain(PLATE);
  });

  it("keeps the seven's fans whole, each a window onto the council's icon", async () => {
    for (const slug of ["first-nicaea", "chalcedon", "second-nicaea"]) {
      const html = await door(slug);
      expect(covers(html), slug).toBe(slug === "second-nicaea" ? 2 : 3);
      expect(html, slug).toContain("<picture");
    }
  });
});
