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
  /** One line after them. */
  closing: string;
};

export const RELEASE_EMAIL: ReleaseEmail = {
  version: "1.7",
  // Three real 1.7 screens: Today, Discover and John 1 read aloud, framed as
  // 1.6's were. The picture is the website's alone: scripts/native-build.mjs
  // leaves every release email's picture out of the apps' export.
  picture: {
    src: "/whats-new/1.7/email.jpg",
    width: 960,
    height: 600,
    alt: "Purify 1.7 on a phone: Today with the Verse of the Day first, Discover with a picture on every tile, and John 1 read aloud with the verse being read lit.",
  },
  intro: "1.7 rebuilds almost every page to be calmer and simpler on your phone. Here is what is new.",
  points: [
    {
      emoji: "✨",
      name: "A calmer Purify",
      text: "One top bar on every tab, new Today, Discover and You screens, and quieter pages across the app.",
    },
    {
      emoji: "🔥",
      name: "Your streak, in view",
      text: "A flame and your count beside Premium on every tab, and a flame that grows the longer you keep it.",
    },
    {
      emoji: "📖",
      name: "A cleaner Scripture screen",
      text: "Before you read for every book, paragraphs, the minutes left in a chapter, and John 1 read aloud to you.",
    },
    {
      emoji: "🎵",
      name: "Chants",
      text: "In the Kitchen's place on Discover, with the words lit as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.",
    },
    {
      emoji: "🙏",
      name: "Prayers that read like lyrics",
      text: "Every prayer flows down the page line by line, and Pray with plays a chant on a loop while you pray.",
    },
    {
      emoji: "📚",
      name: "A reading room on a stage",
      text: "The day's book on a stage, the Church Fathers as posters by theme and by tradition, and eight collections for how you feel.",
    },
    {
      emoji: "🕯️",
      name: "Those I pray for",
      text: "Your family, your departed and the names you add from the prayer wall, inside the prayers you choose.",
    },
    {
      emoji: "🔗",
      name: "Every quotation with its source",
      text: "A saint's words, a Father's comment or a line of Scripture shows where it comes from, and opens there.",
    },
    {
      emoji: "📜",
      name: "Orthodox History",
      text: "One quiet timeline, and twenty events written in full from their sources, each with a picture, in English for now.",
    },
  ],
  closing: "The Scriptures, the saints, the prayers and the calendar stay free.",
};
