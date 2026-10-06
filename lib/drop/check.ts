/**
 * The rules a drop is held to. docs/DROP.md lists them by the same numbers.
 *
 * Four layers, each catching what the one before it cannot: what is said,
 * where it goes, the order it goes in, and the books. An "error" refuses the
 * drop (lib/drop/__tests__/currentDrop.test.ts fails with it, and so
 * `npm run test:unit` does). A "warn" is for a person to read: it may be
 * right, and only they can tell.
 *
 * WHAT THIS CANNOT DO. It can prove a point is in a note, and it cannot prove
 * the note is true: docs/RELEASE.md holds that, by hand, when the note is
 * written. It can refuse a word, and it cannot read a sentence. So a drop
 * that passes here has still to be read by someone before it is sent.
 *
 * Pure: it is handed the notes and the release email, and reads no file.
 */

import { checkNotificationCopy } from "@/lib/push/doctrine";
import type { Entry } from "@/lib/whatsNew/entries";
import type { ReleaseEmail } from "@/lib/whatsNew/releaseEmail";

import { CHANNELS, MOMENTS, hasOwnWords, length, pasted, pieceState, releaseOf, type Drop, type Piece } from "./kit";

export type Finding = {
  level: "error" | "warn";
  /** The rule, by its number in docs/DROP.md. */
  rule: string;
  /** The piece or the point it is about, or "the drop". */
  where: string;
  says: string;
};

export type DropContext = {
  /** Every note, as data/changelog/entries.json has them. */
  entries: Pick<Entry, "version" | "kind" | "blurb" | "items">[];
  /** lib/whatsNew/releaseEmail.ts, when there is one to compare. */
  email?: Pick<ReleaseEmail, "version" | "points"> | null;
};

const EM_DASH = String.fromCharCode(0x2014);
const EMOJI = /\p{Extended_Pictographic}/u;
const LINK = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:net|com|org|app)\b/i;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const NUMBER = /\d+(?:[.,]\d+)*%?/g;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A clock put on the reader. The same words lib/push/doctrine.ts and the brand book refuse. */
const URGENCY = [
  "act now",
  "don't miss",
  "dont miss",
  "ending soon",
  "final chance",
  "hurry",
  "last chance",
  "limited time",
  "only today",
  "today only",
  "while you can",
];

/** Purify is a team, and its words are a person's (the public voice). */
const NOT_OUR_VOICE = [
  "i'm solo",
  "solo developer",
  "solo dev",
  "one-man",
  "ai-made",
  "ai made",
  "made by ai",
  "built by ai",
  "ai-generated",
  "ai generated",
  "written by ai",
];

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, word: string) => new RegExp(`\\b${escape(word)}\\b`, "i").test(text);
const quote = (text: string) => (length(text) > 60 ? `${[...text].slice(0, 57).join("")}...` : text);

/** Everything a note says, as one text to look a claim up in. */
function noteWords(entry: DropContext["entries"][number]): string {
  return [entry.kind, entry.blurb, ...entry.items.map((it) => (typeof it === "string" ? it : it.text))].join("\n");
}

/** Layer 1: the writing rules every sentence is held to, wherever it goes. */
function writing(text: string): { rule: string; says: string }[] {
  const out: { rule: string; says: string }[] = [];
  const low = text.toLowerCase();
  if (text.includes(EM_DASH)) out.push({ rule: "D1.3", says: "carries an em dash" });
  if (text.replace(/https?:\/\/\S+/g, "").includes("!")) out.push({ rule: "D1.3", says: "carries an exclamation mark" });
  for (const phrase of URGENCY) if (low.includes(phrase)) out.push({ rule: "D1.3", says: `puts a clock on the reader: "${phrase}"` });
  for (const phrase of NOT_OUR_VOICE) if (low.includes(phrase)) out.push({ rule: "D1.4", says: `is not our voice: "${phrase}"` });
  return out;
}

function checkPoints(drop: Drop, ctx: DropContext, add: (f: Finding) => void) {
  const notes = new Map(ctx.entries.map((e) => [e.version, noteWords(e)]));
  const found = (where: string, from: { version: string; has: string }) => {
    if (!drop.covers.includes(from.version)) {
      add({ level: "error", rule: "D1.1", where, says: `names ${from.version}, a note this drop does not cover` });
      return;
    }
    const words = notes.get(from.version);
    if (!words) add({ level: "error", rule: "D1.1", where, says: `names ${from.version}, and there is no such note` });
    else if (!from.has.trim() || !words.includes(from.has)) {
      add({ level: "error", rule: "D1.1", where, says: `the ${from.version} note does not say "${quote(from.has)}"` });
    }
  };

  if (drop.points.length > 10) add({ level: "error", rule: "D1.1", where: "the drop", says: `${drop.points.length} points: ten at most, or it is the changelog again` });
  const seen = new Set<string>();
  for (const pt of drop.points) {
    const where = `point ${pt.id}`;
    if (seen.has(pt.id)) add({ level: "error", rule: "D3.3", where, says: "this id is used twice" });
    seen.add(pt.id);
    if (!pt.emoji.trim()) add({ level: "error", rule: "D1.1", where, says: "has no mark" });
    if (!pt.name || length(pt.name) > 40) add({ level: "error", rule: "D1.1", where, says: `its name is ${length(pt.name)} characters: 40 at most` });
    if (/[.:!?]$/.test(pt.name)) add({ level: "error", rule: "D1.1", where, says: "its name ends in punctuation: the layout adds the full stop" });
    if (length(pt.text) > 230) add({ level: "error", rule: "D1.1", where, says: `its line is ${length(pt.text)} characters: 230 at most` });
    if (!/\.$/.test(pt.text)) add({ level: "error", rule: "D1.1", where, says: "its line does not end in a full stop" });
    if (!pt.short || length(pt.short) > 60) add({ level: "error", rule: "D1.1", where, says: `its short form is ${length(pt.short)} characters: 60 at most` });
    if (/\.$/.test(pt.short)) add({ level: "error", rule: "D1.1", where, says: "its short form ends in a full stop: a list adds its own" });
    if (!pt.from.length) add({ level: "error", rule: "D1.1", where, says: "names no note that says it" });
    for (const from of pt.from) found(where, from);
    for (const w of writing(`${pt.name}. ${pt.text} ${pt.short}`)) add({ level: "error", where, ...w });
  }
  drop.also.forEach((line, i) => {
    const where = `also ${i + 1}`;
    found(where, line.from);
    for (const w of writing(line.text)) add({ level: "error", where, ...w });
  });
}

function checkPiece(drop: Drop, piece: Piece, add: (f: Finding) => void) {
  const where = piece.id;
  const channel = CHANNELS[piece.channel];
  if (!channel) {
    add({ level: "error", rule: "D3.3", where, says: `"${piece.channel}" is not a place a drop goes` });
    return;
  }
  if (!MOMENTS.includes(piece.moment)) add({ level: "error", rule: "D3.3", where, says: `"${piece.moment}" is not a moment of a drop` });
  if (!piece.title) add({ level: "error", rule: "D3.3", where, says: "has no title" });

  const text = piece.text ?? "";
  const whole = pasted(piece);

  for (const w of writing(whole)) add({ level: "error", where, ...w });

  // A step or a note may name a dark thing in order to say "leave it out".
  if (channel.paste) {
    const low = whole.toLowerCase();
    for (const never of drop.never) {
      if (low.includes(never.word.toLowerCase())) add({ level: "error", rule: "D1.2", where, says: `says "${never.word}": ${never.why}` });
    }
  }

  if (hasOwnWords(piece) && !text && !piece.waits) add({ level: "warn", rule: "D3.3", where, says: "has no words yet" });
  if ((piece.channel === "cards" || piece.channel === "video") && !piece.madeIn && !piece.waits) {
    add({ level: "error", rule: "D4.2", where, says: "names no piece in purify-ads that holds its files, and nothing it waits for" });
  }

  // Layer 2: the place.
  if (channel.limit && length(text) > channel.limit) {
    add({ level: "error", rule: "D2.1", where, says: `${length(text)} characters, and ${channel.name} holds ${channel.limit}` });
  }
  if (channel.subjectLimit && piece.subject && length(piece.subject) > channel.subjectLimit) {
    add({ level: "error", rule: "D2.1", where, says: `its title line is ${length(piece.subject)} characters, and the place holds ${channel.subjectLimit}` });
  }
  if (channel.firstLine && length(text.split("\n")[0] ?? "") > channel.firstLine) {
    add({ level: "error", rule: "D2.1", where, says: `its first line is over ${channel.firstLine} characters: that line is the title` });
  }
  if (channel.paste) {
    if (!channel.emoji && EMOJI.test(whole)) add({ level: "error", rule: "D2.2", where, says: `${channel.name} takes no emoji` });
    if (!channel.links && LINK.test(whole)) add({ level: "error", rule: "D2.2", where, says: `${channel.name} takes no link: it cannot be tapped there` });
    if (channel.hashtags !== undefined) {
      const tags = whole.match(HASHTAG) ?? [];
      if (tags.length > channel.hashtags) add({ level: "error", rule: "D2.2", where, says: `${tags.length} hashtags: ${channel.hashtags} at most` });
    }
    if (channel.oneParagraph && /\n/.test(text.trim())) add({ level: "error", rule: "D2.2", where, says: "has a line break: this place ends the input at one" });
    for (const word of channel.forbid ?? []) {
      if (hasWord(whole, word)) add({ level: "error", rule: "D2.2", where, says: `names "${word}", and ${channel.name} refuses another platform's name` });
    }
    if (channel.figures) {
      const allowed = new Set(drop.figures.map((f) => f.figure));
      const strangers = [...new Set(whole.replace(HASHTAG, "").match(NUMBER) ?? [])].filter((n) => !allowed.has(n));
      if (strangers.length) add({ level: "warn", rule: "D1.5", where, says: `carries ${strangers.join(", ")}: a number that ages, unless it is listed in the drop's figures with its source` });
    }
  }
  if (piece.channel === "push") {
    if (!piece.subject) add({ level: "error", rule: "D2.3", where, says: "a notification needs a title" });
    for (const v of checkNotificationCopy({ title: piece.subject ?? "", body: text })) {
      add({ level: "error", rule: "D2.3", where, says: `the notification rules refuse it (${v.clause}): ${v.reason}` });
    }
  }

  // Layer 3: the order.
  if (piece.sent) {
    const own = drop.notes.find((n) => n.version === drop.release);
    if (piece.waits) add({ level: "error", rule: "D3.1", where, says: `is marked sent while it still waits: ${piece.waits}` });
    if (!DAY.test(piece.sent.on)) add({ level: "error", rule: "D3.2", where, says: `was sent on "${piece.sent.on}": write the day as 2026-10-05` });
    if (!piece.sent.by) add({ level: "error", rule: "D3.2", where, says: "does not say who sent it" });
    else if (!/^(owner|edgar)$/i.test(piece.sent.by) && !piece.sent.words) {
      add({ level: "error", rule: "D3.2", where, says: `was sent by ${piece.sent.by} with none of the owner's words on record` });
    }
    if (piece.sent.early && !piece.sent.words) {
      add({ level: "error", rule: "D3.2", where, says: "was sent ahead of its moment with none of the owner's words on record" });
    }
    if (piece.moment !== "ready" && piece.moment !== "submit" && own?.state !== "accepted") {
      add({ level: "error", rule: "D3.1", where, says: `went out before the ${drop.release} note was accepted: until then What's New shows the release before` });
    }
    if (piece.moment === "stores" || piece.moment === "after") {
      const served = piece.store ? drop.builds[piece.store].served : drop.builds.android.served || drop.builds.ios.served;
      // The order is the owner's to break. When he does, the record says so in
      // his words, and the line stays in every check as a warning: until a
      // store has the build, the piece describes something the apps lack.
      if (!served && piece.sent.early && piece.sent.words) {
        add({ level: "warn", rule: "D3.1", where, says: `went out before a store was serving the build, on the owner's word: ${piece.sent.early}` });
      } else if (!served) {
        add({ level: "error", rule: "D3.1", where, says: "went out before a store was serving the build it describes" });
      }
    }
  }
}

/** Every finding for a drop, errors first. An empty list is a drop that may go out once it has been read. */
export function checkDrop(drop: Drop, ctx: DropContext): Finding[] {
  const out: Finding[] = [];
  const add = (f: Finding) => out.push(f);

  // Layer 4: the books. What the drop is, and that it speaks for whole notes.
  if (releaseOf(drop.version) !== drop.release) add({ level: "error", rule: "D4.1", where: "the drop", says: `${drop.version} is not a build of ${drop.release}` });
  if (!drop.covers.includes(drop.version)) add({ level: "error", rule: "D4.1", where: "the drop", says: `does not cover ${drop.version}, the build it carries` });
  const known = new Set(ctx.entries.map((e) => e.version));
  for (const v of drop.covers) {
    if (!known.has(v)) add({ level: "error", rule: "D4.1", where: "the drop", says: `covers ${v}, and there is no such note` });
    if (releaseOf(v) !== drop.release) add({ level: "error", rule: "D4.1", where: "the drop", says: `covers ${v}, which is not part of ${drop.release}` });
    if (!drop.notes.some((n) => n.version === v)) add({ level: "error", rule: "D4.1", where: "the drop", says: `does not say where the ${v} note stands` });
  }
  for (const e of ctx.entries) {
    if (releaseOf(e.version) === drop.release && !drop.covers.includes(e.version)) {
      add({ level: "warn", rule: "D4.1", where: "the drop", says: `there is a ${e.version} note and the drop does not cover it` });
    }
  }
  for (const [store, b] of Object.entries(drop.builds)) {
    if (b.served && !DAY.test(b.served)) add({ level: "error", rule: "D3.2", where: "the drop", says: `${store} is served since "${b.served}": write the day as 2026-10-05` });
  }

  checkPoints(drop, ctx, add);

  // The release email is written in code, where the send route reads it. The
  // drop does not copy it: it holds it to the same points, word for word.
  if (ctx.email) {
    const mine = drop.points.filter((p) => p.email);
    if (ctx.email.version !== drop.release) {
      add({ level: "warn", rule: "D2.4", where: "email", says: `the release email is still ${ctx.email.version}'s: ${drop.release} would send its note's blurb in place of points` });
    } else {
      // A point that sells is in the file and not in the letter, which goes
      // to every account as news (lib/whatsNew/releaseEmail.ts).
      const theirs = ctx.email.points.filter((p) => !p.sells);
      if (mine.length !== theirs.length) add({ level: "error", rule: "D2.4", where: "email", says: `the release email has ${theirs.length} points and the drop marks ${mine.length} for it` });
      mine.forEach((pt, i) => {
        const other = theirs[i];
        if (other && (other.emoji !== pt.emoji || other.name !== pt.name || other.text !== pt.text)) {
          add({ level: "error", rule: "D2.4", where: `point ${pt.id}`, says: `the release email says it differently: "${quote(`${other.name}. ${other.text}`)}"` });
        }
      });
    }
  }

  const ids = new Set<string>();
  for (const piece of drop.pieces) {
    if (ids.has(piece.id)) add({ level: "error", rule: "D3.3", where: piece.id, says: "this id is used twice" });
    ids.add(piece.id);
    checkPiece(drop, piece, add);
  }

  return [...out.filter((f) => f.level === "error"), ...out.filter((f) => f.level === "warn")];
}

/** The count of pieces in each state, for a line of summary. */
export function tally(drop: Drop): Record<ReturnType<typeof pieceState>, number> {
  const out = { sent: 0, waits: 0, ready: 0, empty: 0 };
  for (const piece of drop.pieces) out[pieceState(piece)] += 1;
  return out;
}
