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
  version: "1.6",
  picture: {
    src: "/whats-new/1.6/email.jpg",
    width: 960,
    height: 600,
    alt: "Purify 1.6 on a phone: Today, Discover and Prayers, with the five tabs along the bottom.",
  },
  intro: "1.6 is called Foundation: the groundwork for everything after it. Here is what is new.",
  points: [
    {
      emoji: "🧭",
      name: "Five tabs",
      text: "Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.",
    },
    {
      emoji: "⚙️",
      name: "One Settings",
      text: "Profile, account and settings were three places with similar names. Now You has one door.",
    },
    {
      emoji: "📖",
      name: "The Church's own readings",
      text: "The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.",
    },
    {
      emoji: "🔎",
      name: "One search",
      text: "Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.",
    },
    {
      emoji: "🕊️",
      name: "New to the Church",
      text: "Start here walks someone new through seven steps, and Find a parish opens the jurisdictions' own parish directories.",
    },
    {
      emoji: "🖼️",
      name: "Share a verse as a picture",
      text: "From the Verse of the Day card.",
    },
    {
      emoji: "📱",
      name: "Faster, lighter, in your language",
      text: "The phone apps open faster, in your phone's language from the very first screen, and are about a fifth smaller to download.",
    },
    {
      emoji: "🌑",
      name: "True black",
      text: "A free palette for phones with OLED screens.",
    },
  ],
  closing: "The Scriptures, the saints, the prayers and the calendar stay free.",
};
