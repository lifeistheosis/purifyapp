// What the release email says, written with each release that sends one.
//
// The email is a short letter and not the note: the release's name, one
// picture, a handful of points that go straight to what is new, and one
// button to /whats-new, where the lines are read (the owner, 2026-10-04, on
// seeing the 1.5 note set out in full: "a little too much", then "multiple
// bullet points that get straight to the point").
//
// THE RULE: every point is something the published note already says. This
// file adds no claim of its own, so nothing here may be dark in production
// (AGENTS.md, release ritual 4). English, like every email Purify sends.
//
// A release that writes nothing here still sends a letter: the note's blurb
// in place of the points (lib/email/templates/contentBodies.ts). So `version`
// may trail the release; it is never borrowed by a later one.

export type ReleaseEmail = {
  version: string;
  /**
   * The picture the letter opens with, under public/. A JPEG, because Outlook
   * draws no WebP, at twice the letter's 480px. The alt text is a sentence in
   * its own right: many readers see only that.
   */
  picture: { src: string; alt: string; width: number; height: number } | null;
  /** One line before the points. */
  intro: string;
  /**
   * What is new, at most ten. `name` without its full stop. A point may carry
   * a screenshot of the thing itself (scripts/release-pictures.mjs takes it
   * from the live site): a JPEG under public/, twice as wide as it is drawn.
   *
   * A PICTURE OF COMMUNITY SHOWS PEOPLE. It may show Purify's own account,
   * and a reader who said yes. Never anyone else's name, picture, prayer
   * request or words: an email goes to every reader who turned the list on.
   */
  points: {
    emoji: string;
    name: string;
    text: string;
    picture?: { src: string; alt: string; width: number; height: number };
    /**
     * This point sells something: a membership, a shop offer. From 1.5 the
     * letter goes to every account as news of the app (the owner, 2026-10-06:
     * "that's just updates to the application"), so a point that sells is
     * left out of it. It stays here for the places that may carry it, which
     * the drop names (docs/plans/v<release>/drop.json).
     */
    sells?: boolean;
  }[];
  /**
   * The news of an earlier release whose own letter never went, in one line
   * after the points (his item 71: 1.8's letter was never sent, so 1.9's
   * carries it). Its words are that release's note's, and it never names a
   * release later than this one.
   */
  earlier?: { version: string; line: string } | null;
  /** One line after them. */
  closing: string;
};

export const RELEASE_EMAIL: ReleaseEmail = {
  version: "1.9",
  // The picture is taken from the live site once 1.9 is out
  // (scripts/release-pictures.mjs, docs/plans/v1.9/pictures.json); until
  // then the letter goes without one.
  picture: null,
  intro: "1.9 is for keeping what you read. Here is what is new.",
  points: [
    {
      emoji: "📓",
      name: "Your journal, by the Church's day",
      text: "Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.",
    },
    {
      emoji: "📖",
      name: "Every verse, opened",
      text: "Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.",
    },
    {
      emoji: "🌍",
      name: "Six more Bibles",
      text: "The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.",
    },
    {
      emoji: "🔎",
      name: "Study a verse, in Purify Plus",
      text: "Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.",
    },
    {
      emoji: "🗓️",
      name: "New reading plans, in Purify Plus",
      text: "John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.",
    },
    {
      emoji: "☦️",
      name: "The Creed by council",
      text: "The Symbol of Faith article by article, with the words the Council of Constantinople added lit.",
    },
    {
      emoji: "📜",
      name: "Church history on Today",
      text: "On the days an event of Orthodox History fell, it is on Today under the saint of the day.",
    },
  ],
  // 1.8's letter never went (his item 71, 2026-11-10), so 1.9's carries its
  // news in a line, in the words of the 1.8 note.
  earlier: {
    version: "1.8",
    line: "Missed 1.8? It reads the whole New Testament aloud, verse by verse, and Toward the Nativity walks the forty days of the Nativity Fast with the Fathers, a day at a time.",
  },
  closing: "The Scriptures, the saints, the prayers and the calendar stay free.",
};
