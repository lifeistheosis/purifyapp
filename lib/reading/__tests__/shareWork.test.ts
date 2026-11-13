// Share every work (1.9, build 95 note 15). His word, 2026-11-13 about 07:50
// UTC, with two screenshots of The Paschal Homily's sheets: "allow every
// single work to be sharable by adding a share button here and here". The
// first was the contents (a work of one section: About this book alone, and
// under it a rule before nothing); the second was ••• (Reader settings,
// Bookmark this section, About this book, Search Purify).
//
// What it holds:
//   the rows       Share in both sheets, on every work of the Fathers and every
//                  council's document: the sheet's own row, the Share mark,
//                  the word every share in the app says, in every language,
//                  reading from the right in Arabic and Urdu
//   its place      in •••, beside the bookmark (both act on the chapter the
//                  sheet names), before the rows that open other sheets; in
//                  the contents, under About this book
//   the rule       a work of one section draws no list, so no border of one
//   what is sent   the work's title and its page on purifyapp.net, at the part
//                  being read from •••: never the app's https://localhost,
//                  never the address bar's query or the reader's paragraph
//   how            the Share plugin in the apps, the Web Share sheet in a
//                  browser, the link copied where there is neither, nothing
//                  copied when the sheet is closed without choosing
//   the preview    the page names itself where its link is pasted: its
//                  title, its page, its own picture (it was Purify's home)
//
// What a reader would notice if this broke: no way to hand a work on; a link
// that opens nothing (localhost) or opens the home page's preview; a sheet
// that ends in a stray line.

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkNow } from "@/lib/saints/workNow";

// The address the store builds are made with (.github/workflows/android-apk.yml).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://purifyapp.net";
});

let nowValue: WorkNow | null = null;
vi.mock("@/lib/saints/workNow", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/saints/workNow")>();
  return { ...real, useWorkNow: () => nowValue };
});

// The real sheet draws through a portal once open, which a render to a string
// has no document for; what is inside it is what is tried here, open or not.
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ title, lead, children, foot }: { title?: ReactNode; lead?: ReactNode; children: ReactNode; foot?: ReactNode }) =>
    createElement("section", { "data-sheet": "" }, createElement("h1", null, title), lead, children, foot),
}));

// The reader's settings are a sheet of their own, not tried here.
vi.mock("@/components/bible/ReaderSettingsMenu", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/bible/ReaderSettingsMenu")>();
  return { ...real, ReaderSettingsSheet: () => null };
});

const shareCalls: unknown[] = [];
vi.mock("@capacitor/share", () => ({
  Share: {
    share: async (opts: unknown) => {
      shareCalls.push(opts);
      return {};
    },
  },
}));

const { MessagesProvider } = await import("@/components/i18n/MessagesProvider");
const { MobileWorkActions } = await import("@/components/saints/MobileWorkActions");
const { WorkContents } = await import("@/components/saints/WorkContents");
const { ShareWorkRow } = await import("@/components/reading/ShareWorkRow");
const { partShare, shareWork, workPlacePath } = await import("@/lib/reading/shareWork");
const { workHref } = await import("@/lib/reading/workHref");
const { workPreviewPicture } = await import("@/lib/reading/cards");
const { PURIFY_CARD, linkPreview } = await import("@/lib/seo/preview");
const { partsOf } = await import("@/lib/saints/parts");
const { getMessages } = await import("@/lib/i18n");
const { LOCALES } = await import("@/lib/i18n/locales");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReturnType<typeof createElement>, lang = "en"): string {
  return renderToStaticMarkup(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, node));
}
const say = (lang: string, key: string) => (getMessages(lang) as Record<string, string>)[key];

/** Each button in the markup: its attributes and its words. */
function buttons(html: string): { attrs: string; inner: string; at: number }[] {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => ({ attrs: m[1], inner: m[2], at: m.index ?? 0 }));
}
const classOf = (attrs: string) => /class="([^"]*)"/.exec(attrs)?.[1] ?? "";
const words = (inner: string) => inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** The Share mark (components/ui/icons/Share.tsx): the arrow's shaft. */
const SHARE_MARK = 'd="M12 15V3.5"';

/** The Conferences, read at its section 102. */
const CASSIAN: WorkNow = {
  saintSlug: "john-cassian",
  saintName: "St. John Cassian",
  workSlug: "conferences",
  workTitle: "The Conferences",
  sectionN: 102,
  sectionTitle: "Conference 10. Chapter 10",
  label: "Conference 5 · 10",
  share: partShare({ title: "The Conferences", page: workHref("john-cassian", "conferences") }, { n: 102, label: "Conference 5 · 10" }),
};
/** The Symbol of the Faith: a council's document, no bookmark. */
const NICAEA: WorkNow = {
  saintSlug: "",
  saintName: "",
  workSlug: "the-symbol-of-the-faith",
  workTitle: "The Symbol of the Faith",
  sectionN: 1,
  sectionTitle: "The Symbol of the Faith",
  label: "The Symbol of the Faith",
  share: partShare({ title: "The Symbol of the Faith", page: "/councils/first-nicaea/the-symbol-of-the-faith" }, null),
};

function moreSheet(now: WorkNow, lang = "en"): string {
  nowValue = now;
  return render(createElement(MobileWorkActions), lang);
}

/** The rows of •••, in order, each by what it is. */
function moreRows(now: WorkNow): string[] {
  const html = moreSheet(now);
  const sheet = html.slice(html.indexOf("data-sheet"));
  const name = (b: { attrs: string; inner: string }) => {
    if (/data-share-work/.test(b.attrs)) return "share";
    const w = words(b.inner);
    if (w.includes(say("en", "bible.readerSettings"))) return "settings";
    if (w.includes(say("en", "saints.bookmarkThisSection"))) return "bookmark";
    if (w === say("en", "bible.aboutThisBook")) return "about";
    if (w === say("en", "search.ariaLabel")) return "search";
    return `other: ${w}`;
  };
  return buttons(sheet).map(name);
}

function contentsSheet(sections: { n: number; title: string }[], title: string, lang = "en"): string {
  const { heads, contents } = partsOf(sections, null, title);
  return render(
    createElement(WorkContents, {
      open: true,
      onClose: () => {},
      title,
      entries: contents,
      heads,
      current: sections[0].n,
      onGo: () => {},
      onAbout: () => {},
      share: partShare({ title, page: workHref("john-chrysostom", "paschal-homily") }, null),
    }),
    lang,
  );
}

afterEach(() => {
  nowValue = null;
  shareCalls.length = 0;
  vi.unstubAllGlobals();
});

describe("Share in ••• (his second screenshot)", () => {
  it("stands beside the bookmark, before the two rows that open other sheets", () => {
    expect(moreRows(CASSIAN)).toEqual(["settings", "bookmark", "share", "about", "search"]);
  });

  it("is there on a council's document too, where there is no bookmark", () => {
    expect(moreRows(NICAEA)).toEqual(["settings", "share", "about", "search"]);
  });

  it("is the sheet's own row, with the Share mark and the word Share, 48px tall", () => {
    const all = buttons(moreSheet(CASSIAN));
    const share = all.find((b) => /data-share-work/.test(b.attrs));
    const about = all.find((b) => words(b.inner) === say("en", "bible.aboutThisBook"));
    expect(share, "no Share row in •••").toBeTruthy();
    expect(classOf(share!.attrs)).toBe(classOf(about!.attrs));
    expect(classOf(share!.attrs)).toContain("min-h-12");
    expect(share!.attrs).toContain('type="button"');
    expect(share!.inner).toContain(SHARE_MARK);
    expect(words(share!.inner)).toBe(say("en", "common.share"));
  });
});

describe("Share in the contents (his first screenshot)", () => {
  it("stands under About this book, the same row, on a work of one section", () => {
    const html = contentsSheet([{ n: 1, title: "The Paschal Homily" }], "The Paschal Homily");
    const rows = buttons(html);
    const about = rows.find((b) => words(b.inner) === say("en", "bible.aboutThisBook"));
    const share = rows.find((b) => /data-share-work/.test(b.attrs));
    expect(about, "no About this book row").toBeTruthy();
    expect(share, "no Share row in the contents").toBeTruthy();
    expect(share!.at).toBeGreaterThan(about!.at);
    expect(classOf(share!.attrs)).toBe(classOf(about!.attrs));
    expect(share!.inner).toContain(SHARE_MARK);
  });

  it("draws no list for a work of one section, so no rule stands under the rows", () => {
    // The empty list was a box with a border and nothing in it: a line under About this book.
    const one = contentsSheet([{ n: 1, title: "The Paschal Homily" }], "The Paschal Homily");
    expect(one).not.toMatch(/<ul/);
    // A work of several sections still lists them.
    const several = contentsSheet(
      [
        { n: 1, title: "Homily 1" },
        { n: 2, title: "Homily 2" },
        { n: 3, title: "Homily 3" },
      ],
      "Homilies",
    );
    expect(several).toMatch(/<ul/);
  });
});

describe("the row in every language", () => {
  it("says Share in the reader's language, from the catalog every share uses", () => {
    for (const { code } of LOCALES) {
      const html = render(createElement(ShareWorkRow, { share: CASSIAN.share, className: "row" }), code);
      const share = buttons(html)[0];
      expect(words(share.inner), code).toBe(say(code, "common.share"));
      expect(say(code, "common.share"), code).toBeTruthy();
    }
  });

  it("reads from the right in Arabic and Urdu as its neighbours do, with nothing fixed to a side", () => {
    for (const code of ["ar", "ur"]) {
      const html = moreSheet(CASSIAN, code);
      const share = buttons(html).find((b) => /data-share-work/.test(b.attrs))!;
      expect(words(share.inner)).toBe(say(code, "common.share"));
      // Start and end, never left and right: the row turns with the page.
      expect(share.inner + share.attrs).not.toMatch(/\b(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
    }
  });
});

describe("what is shared", () => {
  it("from •••: the chapter being read, by the website's own address for it", () => {
    expect(CASSIAN.share).toEqual({ title: "The Conferences", text: "The Conferences, Conference 5 · 10", path: "/saints/john-cassian/conferences#s102" });
    // A work of one part is shared as itself, its title said once.
    expect(partShare({ title: "The Paschal Homily", page: "/saints/john-chrysostom/paschal-homily" }, { n: 1, label: "The Paschal Homily" }).text).toBe("The Paschal Homily");
    expect(NICAEA.share.path).toBe("/councils/first-nicaea/the-symbol-of-the-faith");
    expect(workPlacePath("/saints/a/b", null)).toBe("/saints/a/b");
  });

  it("the readers give ••• the chapter's address only in a text of more than one", () => {
    for (const rel of ["components/saints/WritingReader.tsx", "components/councils/CouncilReader.tsx"]) {
      const src = read(rel);
      expect(src, rel).toMatch(/several \? \{ n: (?:sec|head)\.n, label \} : null/);
      expect(src, rel).toMatch(/share=\{partShare\(\{ title(?:: content\.title)?, page \}, null\)\}/);
    }
  });

  it("is the work's title and its page on purifyapp.net, never the app's localhost or anything of the reader's", async () => {
    // Inside the app on Android: the page is served from https://localhost, with a query and the reader's paragraph.
    const asked: ShareData[] = [];
    vi.stubGlobal("window", { location: { href: "https://localhost/saints/john-cassian/conferences/?from=reading#p-102-4", origin: "https://localhost" } });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0", share: async (data: ShareData) => void asked.push(data) });
    expect(await shareWork(CASSIAN.share)).toBe("shared");
    expect(asked).toEqual([{ title: "The Conferences", text: "The Conferences, Conference 5 · 10", url: "https://purifyapp.net/saints/john-cassian/conferences#s102" }]);
  });

  it("in the apps, asks the Share plugin, the phone's own sheet", async () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true }, location: { href: "https://localhost/", origin: "https://localhost" } });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    expect(await shareWork(NICAEA.share)).toBe("shared");
    expect(shareCalls).toEqual([
      { title: "The Symbol of the Faith", text: "The Symbol of the Faith", url: "https://purifyapp.net/councils/first-nicaea/the-symbol-of-the-faith", dialogTitle: "The Symbol of the Faith" },
    ]);
  });

  it("copies the link where there is no share sheet, and nothing when the sheet is closed without choosing", async () => {
    const copied: string[] = [];
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0", clipboard: { writeText: async (s: string) => void copied.push(s) } });
    expect(await shareWork(CASSIAN.share)).toBe("copied");
    expect(copied).toEqual(["https://purifyapp.net/saints/john-cassian/conferences#s102"]);

    copied.length = 0;
    const closed = Object.assign(new Error("Share canceled"), { name: "AbortError" });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0",
      share: async () => {
        throw closed;
      },
      clipboard: { writeText: async (s: string) => void copied.push(s) },
    });
    expect(await shareWork(CASSIAN.share)).toBe("dismissed");
    expect(copied).toEqual([]);
  });
});

describe("the preview where the link is pasted", () => {
  it("names the page: its title, what it is, its own address, its own picture", () => {
    const picture = workPreviewPicture("john-chrysostom", "paschal-homily");
    expect(picture, "The Paschal Homily has a cover picture").toBeTruthy();
    expect(picture!.url.startsWith("/")).toBe(true);
    const p = linkPreview({ title: "The Paschal Homily, St. John Chrysostom", description: "The brief sermon.", path: "/saints/john-chrysostom/paschal-homily", picture });
    expect(p.alternates).toEqual({ canonical: "/saints/john-chrysostom/paschal-homily" });
    expect(p.openGraph).toMatchObject({ title: "The Paschal Homily, St. John Chrysostom", description: "The brief sermon.", url: "/saints/john-chrysostom/paschal-homily", siteName: "Purify", images: [picture] });
    expect(p.twitter).toMatchObject({ title: "The Paschal Homily, St. John Chrysostom", description: "The brief sermon." });
  });

  it("shows an icon whole beside the words, and gives a wide picture the large card", () => {
    expect(linkPreview({ title: "t", path: "/a", picture: { url: "/i.jpg", width: 600, height: 750 } }).twitter).toMatchObject({ card: "summary" });
    expect(linkPreview({ title: "t", path: "/a", picture: { url: "/i.jpg", width: 1600, height: 900 } }).twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("shows Purify's own card where the page has no picture, as the file is", () => {
    // A page that names its own preview inherits none: 19 works were left with no picture at all.
    const p = linkPreview({ title: "t", path: "/a", picture: null });
    expect(p.openGraph).toMatchObject({ images: [PURIFY_CARD] });
    expect(p.twitter).toMatchObject({ card: "summary_large_image" });
    const png = fs.readFileSync(path.join(ROOT, "app/opengraph-image.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([PURIFY_CARD.width, PURIFY_CARD.height]);
    expect(read("app/opengraph-image.alt.txt").trim()).toBe(PURIFY_CARD.alt);
  });

  it("is written by both pages a work is read on, on the website alone", () => {
    for (const rel of ["app/(app)/saints/[slug]/[work]/page.tsx", "app/(app)/councils/[slug]/[document]/page.tsx"]) {
      const src = read(rel);
      expect(src, rel).toMatch(/IS_STATIC_EXPORT\s*\?\s*\{\}\s*:\s*linkPreview\(/);
    }
  });
});

describe("a rule with nothing after it", () => {
  it("goes from About this book when nothing follows the book's head", () => {
    for (const rel of ["components/reading/BookHeader.tsx", "components/councils/CouncilBookHeader.tsx"]) {
      const head = /<header data-book-header=""[^>]*className="([^"]*)"/.exec(read(rel))?.[1] ?? "";
      expect(head, rel).toContain("border-b");
      expect(head, rel).toContain("last:border-b-0");
    }
  });
});


// The walk of note 15 on 2026-11-13 measured the contents sheet at 390px: its
// chapter grid was seven fixed columns, each button 41.5px wide (23 targets,
// English and Arabic), under the 44px a finger needs (the pre-build gate's
// second rule). The grid now takes as many columns as fit at 44px or more,
// so no width it shows at can make a chapter smaller than that.
describe("the contents sheet's grid of chapters", () => {
  const SHEET = read("components/saints/WorkContents.tsx");
  const lists = [...SHEET.matchAll(/<ul className="([^"]*\bgrid\b[^"]*)"/g)].map((m) => m[1]);

  it("gives every chapter 44px or more at every width, never a fixed count of columns", () => {
    expect(lists.length).toBeGreaterThan(0);
    for (const cls of lists) {
      expect(cls, cls).not.toMatch(/(?:^|\s)grid-cols-\d+(?:\s|$)/);
      const fill = cls.match(/grid-cols-\[repeat\(auto-(?:fill|fit),minmax\((\d+(?:\.\d+)?)(px|rem),1fr\)\)\]/);
      expect(fill, cls).not.toBeNull();
      const min = Number(fill![1]) * (fill![2] === "rem" ? 16 : 1);
      expect(min, cls).toBeGreaterThanOrEqual(44);
    }
  });

  it("keeps each chapter 44px tall", () => {
    expect(SHEET).toMatch(/"h-11 w-full rounded-xl[^"]*"/);
  });
});
