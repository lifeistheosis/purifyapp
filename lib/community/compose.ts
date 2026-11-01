// Making a post in Community (1.8): the owner's pick of r3-24, "B, a page of
// its own" (Homebase/boards/purify-master/variants/r3-24-compose.html; his
// note 69 of build 86, "So I want this create a post screen revamped").
//
// Writing gets a page over everything, built like the saint's page he locked:
// the kind's picture fading in at the head, doors under it that switch what
// is below, the words with no box, and who will read it beside Post at the
// thumb (components/community/ComposePage.tsx). The folded row stays in the
// feed and opens it.
//
// It keeps all four ways in, and this file is what each one opens on:
//   - the feed: its field opens a discussion (a question on the Ask a Priest
//     tab), its Share a line opens Share a line;
//   - a parish group: the same, with two doors, and the post goes to the
//     group;
//   - Start a conversation under a Bible chapter (/community?about=john/3):
//     a discussion about that chapter, the chapter's own cover at the head;
//   - the Ask a Priest tab: a question, under the Three Hierarchs, sent as
//     Ask. Questions to clergy stay public, as before: the owner's default,
//     told to him with the sheet and not refused.
//
// Pure, so the tests can hold the four ways in without a screen.

import { readAloudCover } from "@/lib/readAloud/covers";
import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";

/** What is being written: a discussion, a question to clergy, or a shared line. */
export type ComposeKind = "discussion" | "question" | "share";

/** How the page was asked to open. */
export type ComposeWay =
  /** The folded row's field. */
  | { from: "field" }
  /** The folded row's Share a line. */
  | { from: "share" }
  /** Start a conversation under a Bible chapter: "john/3". */
  | { from: "chapter"; chapter: string };

/** Where the feed under it is: a parish group's thread, the Ask a Priest tab. */
export type ComposeFeed = { inGroup: boolean; asking: boolean };

/** What the page opens on. */
export type ComposeOpening = { kind: ComposeKind; chapter: string | null };

export function composeOpening(way: ComposeWay, feed: ComposeFeed): ComposeOpening {
  if (way.from === "share") return { kind: "share", chapter: null };
  if (way.from === "chapter") return { kind: "discussion", chapter: way.chapter };
  // A group's thread has no Ask a Priest: questions go to the whole Community.
  return { kind: feed.asking && !feed.inGroup ? "question" : "discussion", chapter: null };
}

/** The doors, in the sheet's order. A group has two: Discussion and Share a line. */
export function composeKinds(inGroup: boolean): ComposeKind[] {
  return inGroup ? ["discussion", "share"] : ["discussion", "question", "share"];
}

/** A kind the doors offer here: a question asked for in a group is a discussion. */
export function composeKindIn(kind: ComposeKind, inGroup: boolean): ComposeKind {
  return composeKinds(inGroup).includes(kind) ? kind : "discussion";
}

/** Each kind's name on its door, by catalog key: every one the composer already had. */
export const COMPOSE_KIND_KEYS: Record<ComposeKind, string> = {
  discussion: "community.discussion",
  question: "community.askAPriest",
  share: "community.shareALine",
};

/**
 * The pictures at the head. Every one is in the apps already: Pentecost is
 * Community's own (COMMUNITY_PICTURE, components/community/CommunityHead.tsx),
 * the Three Hierarchs are the Prayers' icon of them, and St Prochorus writing
 * (Lambardos, 1602) is the paywall's. A chapter's cover is the read-aloud
 * cover of its book, which the apps ask of the website, with the manuscript
 * plate they carry when there is no signal.
 */
export const COMPOSE_PICTURES = {
  discussion: "/discover/tiles/chat.webp",
  question: "/icons/prayer/three-hierarchs.v2.jpg",
  share: "/premium/scribe.v1.webp",
} as const;

export type ComposeHead = {
  /** The picture's address, and the one to show if it cannot load. */
  picture: string;
  fallback: string | null;
  /** Where the picture is held in the head: the sheet's own crops. */
  position: string;
  /** The head's title, by catalog key. */
  titleKey: string;
};

/**
 * The head for a kind. A discussion about a chapter wears the chapter's cover
 * in place of Pentecost (the sheet's default, built as drawn); a question and
 * a shared line keep their own icons, so a reader always knows where the
 * words are going.
 */
export function composeHead(kind: ComposeKind, at: { inGroup: boolean; chapter: string | null }): ComposeHead {
  if (kind === "share") {
    return { picture: COMPOSE_PICTURES.share, fallback: null, position: "50% 22%", titleKey: "community.shareALine" };
  }
  if (kind === "question") {
    return { picture: COMPOSE_PICTURES.question, fallback: null, position: "50% 14%", titleKey: "community.askAPriest" };
  }
  const titleKey = at.inGroup ? "community.composeTitleGroup" : "community.composeTitle";
  if (at.chapter) return { ...composeCover(at.chapter), position: "50% 22%", titleKey };
  return { picture: COMPOSE_PICTURES.discussion, fallback: null, position: "50% 30%", titleKey };
}

/**
 * A chapter's cover: its book's read-aloud cover, the saint or prophet the
 * book is his (lib/readAloud/covers.ts), asked of the website in the apps,
 * and the manuscript plate they carry when it cannot come.
 */
export function composeCover(chapter: string): { picture: string; fallback: string } {
  const cover = readAloudCover(chapter.split("/")[0]);
  return { picture: cover.src, fallback: cover.fallback };
}

/** Who will read it, beside Post: the whole Community, or the group alone. */
export function composeAudience(inGroup: boolean): { key: string; mark: "globe" | "church" } {
  return inGroup
    ? { key: "community.postingToGroup", mark: "church" }
    : { key: "community.postingPublicly", mark: "globe" };
}

/** What Post says: Ask, for a question to clergy. */
export function composeSendKey(kind: ComposeKind): string {
  return kind === "question" ? "community.askSend" : "community.post";
}

/** Whether a post is about a chapter: a discussion or a question can be, a shared line carries its own. */
export function composeAbout(kind: ComposeKind, chapter: string | null): string | null {
  return kind === "share" ? null : chapter;
}

/** Where a gathered line is from, as it is printed under it. */
export function shareSource(item: FlorilegiumItem): string {
  if (item.kind === "scripture") return item.reference;
  return item.work ? `${item.author}, ${item.work}` : item.author;
}

/**
 * The locator the server needs to rebuild this quotation from our own
 * library, or null when it cannot be traced.
 *
 * Scripture always resolves: the item carries book, chapter and verse.
 * A Father resolves only when we can name the WORK, which means parsing the
 * work slug out of the deep link, since `item.work` is a printed title
 * ("On the Incarnation") and the loader needs a slug.
 *
 * Null means the line cannot be verified against the work it claims, and the
 * page refuses to share it rather than asking the server to take the text on
 * trust. That is the whole point: see lib/community/verifyQuote.ts.
 */
export function shareLocator(
  item: FlorilegiumItem,
):
  | { kind: "scripture"; book: string; chapter: number; verse: number }
  | { kind: "father"; saintSlug: string; work: string; quoteText: string }
  | null {
  if (item.kind === "scripture") {
    return {
      kind: "scripture",
      book: item.book,
      chapter: item.chapter,
      verse: item.verse,
    };
  }
  const m = item.href?.match(/^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)/);
  if (!m) return null;
  return { kind: "father", saintSlug: m[1], work: m[2], quoteText: item.text };
}

/**
 * The line a shared post carries: the one the reader picked, while it is
 * still in their Florilegium, and until they pick one the newest they
 * gathered, as the sheet draws the page opening.
 */
export function lineToShare(gathered: readonly FlorilegiumItem[], pickedId: string | null): FlorilegiumItem | null {
  return (pickedId ? gathered.find((i) => i.id === pickedId) : undefined) ?? gathered[0] ?? null;
}
