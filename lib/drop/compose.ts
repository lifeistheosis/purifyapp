/**
 * The first draft of every piece a drop has, written from its points.
 *
 * A release's story is told once, in the drop's points. This file turns them
 * into the same pieces every time, so that no release goes out with a store
 * text and no Discord post, or a card set and no caption: the list below is
 * the list. `node scripts/drop.mjs draft` adds whatever piece a drop lacks and
 * fills whatever has no words.
 *
 * A DRAFT IS NEVER THE LAST WORD. A piece somebody has written is never
 * overwritten: drafts fill blanks and nothing else. They are plain on purpose,
 * the points set out in each place's own shape, for a person to tune.
 *
 * Pure: no file is read here.
 */

import type { Entry } from "@/lib/whatsNew/entries";
import { UPDATE_CATEGORIES } from "@/lib/whatsNew/updateHierarchy";

import { CHANNELS, MOMENTS, hasOwnWords, length, type Drop, type Piece, type Point } from "./kit";

const bullets = (lines: string[]) => lines.map((line) => `• ${line}`).join("\n");

/** "1.5, 1.5.1 and 1.5.2" */
export function listOf(words: string[]): string {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** A point as Discord and the Community post write it. */
const marked = (pt: Point, bold: boolean) => (bold ? `${pt.emoji} **${pt.name}.** ${pt.text}` : `${pt.emoji} ${pt.name}. ${pt.text}`);

/**
 * Every line of every note the drop covers, as one note: the plain lines
 * first, then the six categories in the order the What's New page uses.
 * Written out fresh each time, so it cannot fall behind the notes.
 */
export function wholeNote(drop: Drop, entries: Pick<Entry, "version" | "items">[]): string {
  const plain: string[] = [];
  const filed = new Map<string, string[]>();
  for (const version of drop.covers) {
    for (const item of entries.find((e) => e.version === version)?.items ?? []) {
      if (typeof item === "string") plain.push(item);
      else filed.set(item.category, [...(filed.get(item.category) ?? []), item.text]);
    }
  }
  const blocks = [
    `Purify ${drop.release}: everything in it\n${drop.covers.length > 1 ? `${listOf(drop.covers)} together.` : drop.name}`,
  ];
  if (plain.length) blocks.push(`WHAT IS NEW\n${bullets(plain)}`);
  for (const category of UPDATE_CATEGORIES) {
    const lines = filed.get(category.id);
    if (lines?.length) blocks.push(`${category.emoji} ${category.label.toUpperCase()}\n${bullets(lines)}`);
  }
  blocks.push(drop.closing);
  return blocks.join("\n\n");
}

/** As many lines as fit under a limit, between a head and a foot that always stay. */
function fitted(head: string, lines: string[], foot: string, limit: number): string {
  const kept: string[] = [];
  for (const line of lines) {
    const next = [head, bullets([...kept, line]), foot].join("\n\n");
    if (length(next) > limit) break;
    kept.push(line);
  }
  return [head, bullets(kept), foot].join("\n\n");
}

/** Every piece a drop has, drafted from its points, in the order it goes out. */
export function standardPieces(drop: Drop): Piece[] {
  const R = drop.release;
  const everywhere = drop.points.filter((p) => p.needs !== "apps");
  const inApps = drop.points.filter((p) => p.needs === "apps");
  const { android, ios } = drop.builds;
  const tags = drop.hashtags.slice(0, 5).join(" ");
  const first = (n: number) => drop.points.slice(0, n);

  const notes: Piece[] = drop.covers.map((version) => ({
    id: `note-${version}`,
    channel: "note",
    moment: "ready",
    title: `The ${version} note`,
    who: "owner",
    text: "Accept it in Admin, Patch notes. Until the notes are accepted, What's New shows the release before this one, and there is no release email to send.",
  }));

  const pieces: Piece[] = [
    ...notes,
    {
      id: "step-pull-notes",
      channel: "step",
      moment: "ready",
      title: "Bring the accepted notes back into the app",
      who: "us",
      text: "After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.",
    },
    {
      id: "notes-all",
      channel: "notes-all",
      moment: "ready",
      title: `Everything in ${R}, in one note`,
      note: "Written out from the notes themselves each time the kit is made.",
    },
    {
      id: "play-whats-new",
      channel: "play",
      moment: "submit",
      title: "What's new, for Google Play",
      text: fitted(`Purify ${R}: ${drop.name}.`, drop.points.map((p) => p.short), drop.closing, CHANNELS.play.limit ?? 500),
    },
    {
      id: "appstore-whats-new",
      channel: "appstore",
      moment: "submit",
      title: "What's New in This Version, for the App Store",
      text: [
        `Purify ${R}: ${drop.name}.`,
        drop.line,
        ...drop.points.map((p) => `${p.name.toUpperCase()}\n${p.text}`),
        ...(drop.also.length ? [`ALSO\n${bullets(drop.also.map((a) => a.text))}`] : []),
        drop.closing,
      ].join("\n\n"),
    },
    {
      id: "appstore-promo",
      channel: "appstore-promo",
      moment: "submit",
      title: "Promotional text, for the App Store",
      text: drop.line,
      note: "This one can be changed at any time without a new review.",
    },
    {
      id: "step-submit",
      channel: "step",
      moment: "submit",
      title: "Submit both builds for review",
      who: "owner",
      text: `Android build ${android.build} in Play Console, iOS build ${ios.build} in App Store Connect.`,
    },
    {
      id: "board",
      channel: "board",
      moment: "web",
      title: "The board message above the notes",
      subject: `${R} is here`,
      text: [...first(4).map((p) => `${p.name}: ${p.short.charAt(0).toLowerCase()}${p.short.slice(1)}.`), "The full note is below."].join("\n"),
      note: "Eyebrow: This week at Purify. The first line is the headline, the rest is the body.",
    },
    {
      id: "discord-announcement",
      channel: "discord",
      moment: "web",
      title: "The announcement",
      text: [
        `**Purify ${R} is here** 🕯️`,
        drop.line,
        everywhere.map((p) => marked(p, true)).join("\n"),
        drop.closing,
        `Read the whole note: ${drop.links.whatsNew}`,
        [`The iPhone, iPad and Android apps get ${R} once the stores approve the new builds. We will say so here when they do.`, ...inApps.map((p) => marked(p, true))].join("\n"),
      ].join("\n\n"),
    },
    {
      id: "discord-short",
      channel: "discord",
      moment: "web",
      title: "The short one",
      where: "Discord, #general or a ping",
      text: `Purify ${R} is live on the web: ${listOf(first(4).map((p) => p.short.charAt(0).toLowerCase() + p.short.slice(1)))}. The apps follow once the stores approve. ${drop.links.whatsNew}`,
    },
    {
      id: "community-post",
      channel: "community",
      moment: "web",
      title: "Purify's own post in Community",
      subject: `Purify ${R} is here`,
      text: [drop.line, drop.points.map((p) => marked(p, false)).join("\n"), drop.closing, "Tell us what you find, and what breaks. We read everything."].join("\n\n"),
    },
    {
      id: "step-update-prompt",
      channel: "step",
      moment: "stores",
      title: "Tell installed apps there is a newer build",
      who: "us",
      text: `When a store shows ${drop.version}: its number goes into lib/appUpdate/release.ts (Android ${android.build}, iOS ${ios.build}), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.`,
    },
    {
      id: "discord-stores",
      channel: "discord",
      moment: "stores",
      title: "In the stores",
      text: [
        `**Purify ${R} is in the App Store and on Google Play** 📱`,
        `Update Purify to get it inside the app:\n${bullets(first(4).map((p) => p.short))}`,
        ...(inApps.length ? [inApps.map((p) => marked(p, true)).join("\n")] : []),
        `App Store: ${drop.links.appStore}\nGoogle Play: ${drop.links.play}`,
      ].join("\n\n"),
      note: "If one store approves first, post for that store alone and name it.",
    },
    {
      id: "email-release",
      channel: "email",
      moment: "stores",
      title: "The release email",
      text: "Its words are in lib/whatsNew/releaseEmail.ts, so the email that is read is the email that is sent. Read it first: node scripts/release.mjs email. Send it from Admin, Email, in place of that week's Sunday email.",
      note: "It needs the release's note accepted. Before a store has the build it describes things a reader in the app cannot open yet.",
    },
    {
      id: "letter",
      channel: "letter",
      moment: "stores",
      title: "A letter to people who should hear it from you",
      subject: `Purify ${R} is out`,
      text: [
        "[Name],",
        `Purify ${R} is out, on purifyapp.net and in the stores. ${drop.line}`,
        `What is new, briefly:\n${first(4).map((p) => `- ${p.name}. ${p.text}`).join("\n")}`,
        drop.closing,
        "If anything in Purify is wrong, or could serve you better, tell us. We read everything.",
        "Edgar, the Purify Team\npurifyapp.net",
      ].join("\n\n"),
    },
    {
      id: "cards",
      channel: "cards",
      moment: "stores",
      title: "The release cards",
      waits: "the card set has not been made yet (purify-ads, the social team)",
    },
    {
      id: "instagram-caption",
      channel: "instagram",
      moment: "stores",
      title: "The caption for the cards, on Instagram",
      text: `Purify ${R} is here. ${first(4).map((p) => `${p.name}.`).join(" ")} ${drop.closing} Find Purify: Orthodox Hub on the App Store and on Google Play. ${tags}`.trim(),
    },
    {
      id: "tiktok-caption",
      channel: "tiktok",
      moment: "stores",
      title: "The caption for the cards, on TikTok",
      text: `Purify ${R} is here: ${listOf(first(3).map((p) => p.short.charAt(0).toLowerCase() + p.short.slice(1)))}. Find Purify: Orthodox Hub. ${tags}`.trim(),
    },
    {
      id: "push",
      channel: "push",
      moment: "after",
      title: "A notification to every reader",
      subject: "A word from Purify",
      text: "There is something new to read.",
      note: "Opens /whats-new. A notification may carry no digits, so it cannot name the version. Send yourself one first.",
    },
    {
      id: "discord-try",
      channel: "discord",
      moment: "after",
      title: "Try this first",
      where: "Discord, a thread under the announcement",
      text: [`Three things to try in ${R}:`, first(3).map((p, i) => `${i + 1}. ${p.name}. ${p.text}`).join("\n"), "Tell us what you find, and what breaks. We read everything."].join("\n\n"),
    },
  ];
  return pieces;
}

/**
 * Adds every standard piece a drop lacks, and fills every piece that has no
 * words. Never touches a piece that has words, was sent, or waits.
 */
export function fillDrafts(drop: Drop): { drop: Drop; added: string[]; filled: string[] } {
  const added: string[] = [];
  const filled: string[] = [];
  const mine = new Map(drop.pieces.map((p) => [p.id, p]));
  const pieces = [...drop.pieces];
  for (const draft of standardPieces(drop)) {
    const piece = mine.get(draft.id);
    if (!piece) {
      pieces.push(draft);
      added.push(draft.id);
    } else if (hasOwnWords(piece) && !piece.text && draft.text && !piece.waits && !piece.sent) {
      piece.text = draft.text;
      if (!piece.subject && draft.subject) piece.subject = draft.subject;
      filled.push(piece.id);
    }
  }
  // In the order they go out. A stable sort: within a moment, the drop's own order stands.
  const order = (p: Piece) => MOMENTS.indexOf(p.moment);
  const sorted = pieces.map((p, i) => ({ p, i })).sort((a, b) => order(a.p) - order(b.p) || a.i - b.i).map((x) => x.p);
  return { drop: { ...drop, pieces: sorted }, added, filled };
}
