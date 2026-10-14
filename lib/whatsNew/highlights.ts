// The current release's highlights, as the top of /whats-new shows them: a
// headline, and a pill per feature that opens a picture of it.
//
// Added 2026-09-27 at the owner's ask, after the 1.4 announcement image went
// out with these pills on it: tapping one should show what it looks like.
// Every picture is a real screenshot of the live site or app, framed, in
// public/whats-new/<version>/. Replace the set with each release that has
// something to show; strings are catalog keys. The 1.6 set, Foundation, is
// pictures of the 1.6 Android export: the five tabs, one Settings, the
// Church's readings, one search and the way in for someone new.

export type HighlightId = "tabs" | "settings" | "readings" | "search" | "start";

export type Highlight = {
  id: HighlightId;
  /** Catalog key for the pill and the popup's heading. */
  label: string;
  /** Catalog key for the line under the picture. */
  caption: string;
  image: { src: string; width: number; height: number };
  /** Drawn in gold, the release's headline feature. */
  accent?: boolean;
};

export const RELEASE_HIGHLIGHTS = {
  version: "1.6",
  eyebrow: "whatsnew.highlights.eyebrow",
  title: "whatsnew.highlights.title",
  sub: "whatsnew.highlights.sub",
  items: [
    {
      id: "tabs",
      label: "whatsnew.highlights.tabs.label",
      caption: "whatsnew.highlights.tabs.caption",
      image: { src: "/whats-new/1.6/tabs.webp", width: 1600, height: 1000 },
      accent: true,
    },
    {
      id: "settings",
      label: "whatsnew.highlights.settings.label",
      caption: "whatsnew.highlights.settings.caption",
      image: { src: "/whats-new/1.6/settings.webp", width: 1600, height: 1000 },
    },
    {
      id: "readings",
      label: "whatsnew.highlights.readings.label",
      caption: "whatsnew.highlights.readings.caption",
      image: { src: "/whats-new/1.6/readings.webp", width: 1600, height: 1000 },
    },
    {
      id: "search",
      label: "whatsnew.highlights.search.label",
      caption: "whatsnew.highlights.search.caption",
      image: { src: "/whats-new/1.6/search.webp", width: 1600, height: 1000 },
    },
    {
      id: "start",
      label: "whatsnew.highlights.start.label",
      caption: "whatsnew.highlights.start.caption",
      image: { src: "/whats-new/1.6/start.webp", width: 1600, height: 1000 },
    },
  ] satisfies Highlight[],
};
