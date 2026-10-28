// The current release's highlights, as the top of /whats-new shows them: a
// headline, and a pill per feature that opens a picture of it.
//
// Added 2026-09-27 at the owner's ask, after the 1.4 announcement image went
// out with these pills on it: tapping one should show what it looks like.
// Every picture is a real screenshot of the live site or app, framed, in
// public/whats-new/<version>/. Replace the set with each release that has
// something to show; strings are catalog keys.
//
// The 1.8 set has its headline and no pills, as 1.7's had: a pill opens a
// real screenshot, taken from the live site, and 1.8's features are live only
// once it is pushed. So the top of What's New says what 1.8 is in words (its
// strings in all 21 languages) and draws no pill. The 1.6 pills and their
// pictures left with the 1.6 set; the 1.6 release email keeps its own picture.

export type Highlight = {
  /** The pill's own name, unique in its set. */
  id: string;
  /** Catalog key for the pill and the popup's heading. */
  label: string;
  /** Catalog key for the line under the picture. */
  caption: string;
  image: { src: string; width: number; height: number };
  /** Drawn in gold, the release's headline feature. */
  accent?: boolean;
};

export const RELEASE_HIGHLIGHTS = {
  version: "1.8",
  eyebrow: "whatsnew.highlights.eyebrow",
  title: "whatsnew.highlights.title",
  sub: "whatsnew.highlights.sub",
  // Written here, after the line above, when they come: the release tools
  // read the pictures from this point on (scripts/lib/release-live.mjs).
  items: [] as Highlight[],
};
