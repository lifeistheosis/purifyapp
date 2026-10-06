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
  }[];
  /** One line after them. */
  closing: string;
};

export const RELEASE_EMAIL: ReleaseEmail = {
  version: "1.5",
  picture: {
    src: "/whats-new/1.5/email.jpg",
    width: 960,
    height: 600,
    alt: "Genesis 1 in Purify, with the Septuagint's Greek beside the English.",
  },
  intro: "The largest release since Purify opened. Here is what is new.",
  points: [
    {
      emoji: "🔥",
      name: "Keep a streak",
      text: "Pray or read each day, and a red flame counts the days you have kept.",
    },
    {
      emoji: "📖",
      name: "The Greek Old Testament",
      text: "The Septuagint's Greek beside the English in 805 chapters. Tap a word and its English lights up.",
    },
    {
      emoji: "🚶",
      name: "Walking with Job",
      text: "A guided walk through all 42 chapters, with St. Gregory the Great beside you.",
    },
    {
      emoji: "👥",
      name: "Community has profiles",
      text: "Every reader has a profile and an @handle. Follow readers, mention them, and wish them many years on their name day.",
      // Purify's own profile, the official account, as a phone shows it.
      picture: {
        src: "/whats-new/1.5/email-profile.jpg",
        width: 600,
        height: 916,
        alt: "The Purify account's profile: a banner, a framed picture, badges, a patron saint and a favorite verse.",
      },
    },
    {
      emoji: "🙏",
      name: "The prayer wall and Ask a Priest",
      text: "Ask for prayers, pray for others, and put a question to verified clergy.",
    },
    {
      emoji: "💬",
      name: "More ways to join in",
      text: "Amen, Praying and Glory to God beside the like, a thread for the feast of the day, and a conversation under every Bible chapter.",
    },
    {
      emoji: "🛡️",
      name: "A safer room",
      text: "A word filter, a spam filter, mute, and moderators who can step in from their phones.",
    },
    {
      emoji: "✨",
      name: "Better with Plus",
      text: "Profiles come alive: a banner that moves, a theme in two colors, frames for your picture, effects like incense and gold dust, and a color for your name. Plus also adds cross-references, a journal and reading plans.",
    },
    {
      emoji: "🛒",
      name: "The shop, redrawn",
      text: "The prayer corner set takes 15% off, and three pieces or more take 10% off.",
    },
    // 1.5.1 and 1.5.2 refined 1.5 before any store had a 1.5 build, so the
    // build a reader gets as "1.5" is 1.5.2. The letter says what those two
    // patches did in one point; every word of it is in their notes. It is
    // short on purpose: with it the letter is one word inside the length its
    // test allows. The drop (docs/plans/v1.5/drop.json) holds this point to
    // this wording.
    {
      emoji: "📱",
      name: "Lighter on your phone",
      text: "Lighter apps, and pages that open at the top. Hold a verse to copy it.",
    },
  ],
  closing: "The Scriptures, the saints, the prayers and the calendar stay free.",
};
