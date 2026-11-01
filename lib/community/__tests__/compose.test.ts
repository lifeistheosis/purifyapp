// Making a post in Community, a page of its own (1.8): the owner's pick of
// r3-24, "B, a page of its own" (his note 69 of build 86, "So I want this
// create a post screen revamped"). The open form left the feed for a page
// over everything, built like the saint's page he locked: the kind's picture
// fading in at the head, the kinds as a saint's page's doors, the words with
// no box, and who reads it beside Post at the thumb, riding the keyboard.
//
// What a reader would notice if this broke: a way in that no longer opens
// (the feed's field, a parish group, Start a conversation under a chapter,
// the Ask a Priest tab), a post sent to the wrong place (a group's post in
// the public feed, a chapter's conversation not about it), a question sent
// as a discussion, Post under the keyboard, the page moving as the keyboard
// comes, or the draft lost to a stray close.
//
// This reads the rules in lib/community/compose.ts and the source; how the
// built app draws the page, and that nothing moves as the keyboard comes, is
// the export walk's section 47.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COMMUNITY_PICTURE } from "@/components/community/CommunityHead";
import {
  COMPOSE_KIND_KEYS,
  COMPOSE_PICTURES,
  composeAbout,
  composeAudience,
  composeCover,
  composeHead,
  composeKindIn,
  composeKinds,
  composeOpening,
  composeSendKey,
  lineToShare,
  shareLocator,
  shareSource,
  type ComposeKind,
} from "@/lib/community/compose";
import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { COVER_PLATE } from "@/lib/readAloud/covers";

const ROOT = path.join(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old form is not read as the form. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const page = code("components/community/ComposePage.tsx");
const client = code("components/community/CommunityClient.tsx");

const FEED = { inGroup: false, asking: false };
const LANGS = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];
const catalogs = LANGS.map((l) => [l, JSON.parse(read(`lib/i18n/messages/${l}.json`)) as Record<string, string>] as const);

describe("the four ways in", () => {
  it("the feed: its field opens a discussion for the whole Community, and Share a line opens Share a line", () => {
    const opened = composeOpening({ from: "field" }, FEED);
    expect(opened).toEqual({ kind: "discussion", chapter: null });
    expect(composeKinds(false)).toEqual(["discussion", "question", "share"]);
    expect(composeHead("discussion", { inGroup: false, chapter: null })).toEqual({
      picture: COMMUNITY_PICTURE,
      fallback: null,
      position: "50% 30%",
      titleKey: "community.composeTitle",
    });
    expect(composeAudience(false)).toEqual({ key: "community.postingPublicly", mark: "globe" });
    expect(composeSendKey("discussion")).toBe("community.post");

    expect(composeOpening({ from: "share" }, FEED)).toEqual({ kind: "share", chapter: null });
    const share = composeHead("share", { inGroup: false, chapter: null });
    expect(share.picture).toBe("/premium/scribe.v1.webp");
    expect(share.titleKey).toBe("community.shareALine");

    // The folded row stays in the feed and opens the page from each, inside
    // the tap, so the page can hand its field the focus there.
    expect(client).toContain('<div data-composer="">');
    expect(client).toMatch(/data-compose-open="field"\s+onClick=\{\(\) => flushSync\(\(\) => show\(\{ from: "field" \}\)\)\}/);
    expect(client).toMatch(/data-compose-open="share"\s+onClick=\{\(\) => flushSync\(\(\) => show\(\{ from: "share" \}\)\)\}/);
    expect(client).toContain("composeOpening(way, { inGroup: groupId !== null, asking })");
    expect(client).toMatch(/<ComposePage\s+open=\{open\}\s+request=\{request\}/);
    // The old form is gone from the feed: no title field or body in a card above the posts.
    expect(client).not.toContain('t("community.bodyPlaceholder")');
    expect(client).not.toContain("setExpanded(");
  });

  it("a parish group: two doors and the group's own words, and the post goes to the group", () => {
    const opened = composeOpening({ from: "field" }, { inGroup: true, asking: false });
    expect(opened).toEqual({ kind: "discussion", chapter: null });
    expect(composeKinds(true)).toEqual(["discussion", "share"]);
    expect(composeHead("discussion", { inGroup: true, chapter: null }).titleKey).toBe("community.composeTitleGroup");
    expect(composeAudience(true)).toEqual({ key: "community.postingToGroup", mark: "church" });
    // A group's thread has no Ask a Priest: questions go to the whole Community.
    expect(composeOpening({ from: "field" }, { inGroup: true, asking: true }).kind).toBe("discussion");
    expect(composeKindIn("question", true)).toBe("discussion");
    expect(composeKindIn("share", true)).toBe("share");
    // Both kinds of post carry the group: the one way the route learns it.
    expect(page.match(/groupId,\s*confirmFiltered/g)).toHaveLength(2);
    expect(client).toMatch(/<Composer\s+me=\{me\}\s+groupId=\{groupId\}/);
  });

  it("Start a conversation under a chapter: a discussion about it, the chapter's own cover at its head", () => {
    expect(composeOpening({ from: "chapter", chapter: "john/3" }, FEED)).toEqual({ kind: "discussion", chapter: "john/3" });
    // St John's cover, which the apps ask of the website, and the plate they carry without a signal.
    const head = composeHead("discussion", { inGroup: false, chapter: "john/3" });
    expect(head.picture).toBe("/covers/john.v1.jpg");
    expect(head.fallback).toBe(COVER_PLATE);
    expect(head.titleKey).toBe("community.composeTitle");
    expect(composeCover("john/3")).toEqual({ picture: "/covers/john.v1.jpg", fallback: COVER_PLATE });
    // A book with no figure of its own wears the plate.
    expect(composeCover("jude/1").picture).toBe(COVER_PLATE);
    // A question keeps its own icon; the chapter is still what it is about. A
    // shared line carries its own place, so it is about no chapter.
    expect(composeHead("question", { inGroup: false, chapter: "john/3" }).picture).toBe(COMPOSE_PICTURES.question);
    expect(composeAbout("question", "john/3")).toBe("john/3");
    expect(composeAbout("discussion", "john/3")).toBe("john/3");
    expect(composeAbout("share", "john/3")).toBeNull();
    // The way in itself: the chapter's link, Community reading it, the page opening on it, the post about it.
    expect(code("components/bible/ChapterDiscussions.tsx")).toContain("href={`/community?about=${encodeURIComponent(ref)}#conversations`}");
    expect(client).toContain('const chapter = validChapterRef(url.searchParams.get("about"));');
    expect(client).toMatch(/if \(about && about !== aboutSeen\) \{\s*setAboutSeen\(about\);\s*show\(\{ from: "chapter", chapter: about \}\);/);
    expect(page).toContain("chapterRef: about,");
  });

  it("the Ask a Priest tab: a question under the Three Hierarchs, sent as Ask, and public as before", () => {
    expect(composeOpening({ from: "field" }, { inGroup: false, asking: true })).toEqual({ kind: "question", chapter: null });
    const head = composeHead("question", { inGroup: false, chapter: null });
    expect(head.picture).toBe("/icons/prayer/three-hierarchs.v2.jpg");
    expect(head.titleKey).toBe("community.askAPriest");
    expect(composeSendKey("question")).toBe("community.askSend");
    // Questions to clergy stay public: the owner's default, told and not refused.
    expect(composeAudience(false).key).toBe("community.postingPublicly");
    // The tab is what says so, and a question is sent as one.
    expect(client).toContain('asking={filter === "questions"}');
    expect(page).toContain('category: kind === "question" ? "question" : null,');
    // Its note to the reader, in its own light, under the seal.
    expect(page).toMatch(/data-compose-note="" className="community-clergy-answer /);
    expect(page).toContain('t("community.askNote")');
  });
});

describe("the page", () => {
  it("is over everything, as a profile is: the feed held still, the tab bar aside, closed by Android's back", () => {
    expect(page).toContain("createPortal(");
    expect(page).toMatch(/className="compose-page fixed inset-0 z-\[80\] bg-night"/);
    expect(page).toMatch(/lockBodyScroll\(\);\s*setOverlayOpen\(true\);/);
    expect(page).toMatch(/unlockBodyScroll\(\);\s*setOverlayOpen\(false\);/);
    expect(page).toContain("useAndroidBack(open && !askFiltered, onClose);");
    expect(page).toMatch(/role="dialog"\s+aria-modal="true"\s+aria-labelledby="compose-title"/);
    // Tab goes round the page, never out to the feed behind it.
    expect(page).toContain("focusablesIn(rootRef.current)");
  });

  it("is as tall as what the keyboard leaves, so only the foot moves as it comes", () => {
    expect(page).toContain("const frame = useVisibleFrame();");
    expect(page).toContain("style={frame ? { top: frame.top, height: frame.height } : undefined}");
    // The words scroll in the middle; the foot, who reads it and Post, is the column's last part.
    const scroll = page.indexOf('data-compose-scroll=""');
    const foot = page.indexOf('data-compose-foot=""');
    expect(scroll).toBeGreaterThan(-1);
    expect(foot).toBeGreaterThan(scroll);
    expect(page).toMatch(/className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"/);
    expect(page).toMatch(/compose-foot relative z-10 shrink-0/);
    // Over the keyboard there is no home bar to clear.
    expect(page).toContain('!keyboard && "safe-pb-edge pb-[env(safe-area-inset-bottom,0px)]"');
    // Nothing else asks after the keyboard: the page does not fold or scroll
    // as it comes. The first words fold it, from the doors' own place.
    expect(page.match(/\bkeyboard\b/g)).toHaveLength(2);
    expect(page).toMatch(/const by = doors\.getBoundingClientRect\(\)\.bottom - /);
    expect(page).toMatch(/if \(!open \|\| !writing \|\| was \|\| folded/);
  });

  it("keeps the draft when it is closed", () => {
    // Closing only puts the page away; the words are the page's own and stay.
    expect(client).toContain("const closePage = useCallback(() => setOpen(false), []);");
    expect(client).toContain("onClose={closePage}");
    expect(page).toMatch(/if \(!open \|\| typeof document === "undefined"\) return null;/);
    // Only a post sent clears them.
    expect(page).toMatch(/if \(res\.ok\) \{\s*setTitle\(""\);\s*setBody\(""\);/);
  });

  it("draws the kinds as a saint's page's doors, never pills", () => {
    const shared = 'from "@/components/ui/doors"';
    expect(page).toContain(shared);
    expect(code("components/saints/SaintDoors.tsx")).toContain(shared);
    const doors = code("components/ui/doors.ts");
    expect(doors).toMatch(/export const DOOR =\s*"tap-press flex h-\[74px\]/);
    expect(doors).not.toMatch(/export const DOOR =[^;]*rounded-pill/);
    expect(page).toContain("aria-pressed={k === kind}");
    expect(page).toContain('className={cn(DOOR, "compose-door", k === kind ? cn(DOOR_ON, "compose-lit") : DOOR_OFF)}');
    // The slim row under the bar is a copy for the eye and the finger.
    expect(page).toMatch(/ref=\{stripRef\}\s+aria-hidden/);
  });

  it("wears Community's own head: the kind's picture fading in under its shade", () => {
    expect(page).toContain('<span key={head.picture} className="community-head-img absolute inset-0">');
    expect(page).toContain('<span className="community-head-shade absolute inset-0" />');
    expect(COMPOSE_PICTURES.discussion).toBe(COMMUNITY_PICTURE);
    // No new pictures: each is in the apps already.
    for (const src of Object.values(COMPOSE_PICTURES)) expect(fs.existsSync(path.join(ROOT, "public", src)), src).toBe(true);
  });

  it("shows a shared line as the card it becomes in the feed", () => {
    for (const cls of ["rounded-[18px] border border-paper/[0.11] px-4 pb-3 pt-4 text-center", "community-quote-mark mx-auto mb-2.5 block text-paper"]) {
      expect(client, cls).toContain(cls);
      expect(page, cls).toContain(cls);
    }
    expect(page).toContain('"whitespace-pre-line font-serif text-[17px] font-medium leading-[1.5] text-paper"');
  });

  it("lights what is chosen white, and on Parchment the plain ink", () => {
    expect(css).toMatch(/\.compose-lit \{\s*box-shadow: 0 0 0 1px rgb\(255 255 255 \/ 0\.3\), 0 0 24px rgb\(255 255 255 \/ 0\.26\);/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] :is\(\.compose-lit, [^)]*\) \{\s*box-shadow: none;/);
    // The page's own chrome has no gold: only the reader's Plus frame may wear it.
    expect(page).not.toMatch(/gold|amber|yellow|premium/i);
    expect(page).toContain("decoration={decoration}");
  });

  it("moves only on Purify's motion switch", () => {
    expect(css).toMatch(/\.compose-page \{\s*animation: compose-in var\(--duration-base\) var\(--ease-house\) backwards;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.compose-page \{\s*animation: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.compose-fold,\s*:where\(\[data-motion="reduce"\]\) \[data-folded\] \.compose-fold \{\s*transition: none;/);
    expect(page).toContain("behavior: scrollBehavior()");
    // Beside Community's own CSS, not at the end of the file.
    const raw = read("app/globals.css");
    const at = raw.indexOf("/* ── Making a post: a page of its own (1.8)");
    expect(at).toBeGreaterThan(raw.indexOf("/* ── Community: Pray together and Talk together (1.8)"));
    expect(at).toBeLessThan(raw.indexOf("/* Route entrance."));
  });

  it("has every word it asks for in all 21 languages, beside its feature's own", () => {
    const keys = new Set<string>([
      ...Object.values(COMPOSE_KIND_KEYS),
      ...(["discussion", "question", "share"] as ComposeKind[]).flatMap((k) => [
        composeHead(k, { inGroup: false, chapter: null }).titleKey,
        composeHead(k, { inGroup: true, chapter: null }).titleKey,
        composeSendKey(k),
      ]),
      composeAudience(false).key,
      composeAudience(true).key,
      "community.composeKinds",
      "community.yourFlorilegium",
    ]);
    for (const [lang, messages] of catalogs) {
      for (const key of keys) expect(messages[key], `${lang} ${key}`).toBeTruthy();
      // Translated, not the English copied.
      if (lang !== "en") expect(messages["community.composeKinds"], lang).not.toBe("Kind of post");
      // The head says what the folded row asks, without its dots.
      expect(`${messages["community.composeTitle"]}…`, lang).toBe(messages["community.composePrompt"]);
      expect(`${messages["community.composeTitleGroup"]}…`, lang).toBe(messages["community.composePromptGroup"]);
      const order = Object.keys(messages);
      expect(order.indexOf("community.composeTitle"), lang).toBe(order.indexOf("community.composePromptGroup") + 1);
      expect(order.indexOf("community.yourFlorilegium"), lang).toBe(order.indexOf("community.moreInFlorilegium") + 1);
    }
  });
});

describe("the walk", () => {
  it("opens the page the four ways on the built app, and watches the keyboard come", () => {
    const walk = read("scripts/export-walk.mjs");
    const at = walk.indexOf("await section(47, async () => {");
    expect(at).toBeGreaterThan(-1);
    const section = walk.slice(at, walk.indexOf("\n});", at));
    for (const way of ['[data-compose-open="field"]', '[data-compose-open="share"]', '[data-feed-tab="questions"]', "/community/#group-", 'a[href*="about=john"]']) {
      expect(section, way).toContain(way);
    }
    expect(section).toContain("nothing moves as the keyboard comes");
    expect(section).toContain("window.__keyboard(px)");
  });
});

describe("a shared line", () => {
  const john: FlorilegiumItem = {
    id: "a",
    addedAt: 2,
    kind: "scripture",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    reference: "John 3:16",
    book: "john",
    chapter: 3,
    verse: 16,
  };
  const athanasius: FlorilegiumItem = {
    id: "b",
    addedAt: 1,
    kind: "father",
    text: "He was made man that we might be made God.",
    author: "St. Athanasius the Great",
    work: "On the Incarnation",
    href: "/saints/athanasius-the-great/on-the-incarnation#s54",
  };

  it("is the one picked, and until one is, the newest gathered, as the sheet draws it", () => {
    expect(lineToShare([john, athanasius], null)).toBe(john);
    expect(lineToShare([john, athanasius], "b")).toBe(athanasius);
    // A pick no longer in the Florilegium gives way to the newest.
    expect(lineToShare([john], "b")).toBe(john);
    expect(lineToShare([], null)).toBeNull();
  });

  it("is sent as where it is from, never as its words, and printed with its source", () => {
    expect(shareLocator(john)).toEqual({ kind: "scripture", book: "john", chapter: 3, verse: 16 });
    expect(shareLocator(athanasius)).toEqual({
      kind: "father",
      saintSlug: "athanasius-the-great",
      work: "on-the-incarnation",
      quoteText: athanasius.text,
    });
    // A Father's line with no way back to its work cannot be verified, so it is refused.
    expect(shareLocator({ ...athanasius, href: undefined })).toBeNull();
    expect(shareSource(john)).toBe("John 3:16");
    expect(shareSource(athanasius)).toBe("St. Athanasius the Great, On the Incarnation");
  });
});
