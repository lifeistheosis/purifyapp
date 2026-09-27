// The current release's highlights, as the top of /whats-new shows them: a
// headline, and a pill per feature that opens a picture of it.
//
// Added 2026-09-27 at the owner's ask, after the 1.4 announcement image went
// out with these pills on it: tapping one should show what it looks like.
// Every picture is a real screenshot of the live site or app, framed, in
// public/whats-new/<version>/. The Discord one is the desktop app's own
// Settings preview, the exact card the status is built from. Replace the
// set with each release that has something to show; strings are catalog keys.

export type HighlightId = "windows" | "discord" | "ipad" | "prayer" | "saint";

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
  version: "1.4",
  eyebrow: "whatsnew.highlights.eyebrow",
  title: "whatsnew.highlights.title",
  sub: "whatsnew.highlights.sub",
  items: [
    {
      id: "windows",
      label: "whatsnew.highlights.windows.label",
      caption: "whatsnew.highlights.windows.caption",
      image: { src: "/whats-new/1.4/windows.webp", width: 1600, height: 1053 },
      accent: true,
    },
    {
      id: "discord",
      label: "settings.discord",
      caption: "whatsnew.highlights.discord.caption",
      image: { src: "/whats-new/1.4/discord.webp", width: 1079, height: 416 },
    },
    {
      id: "ipad",
      label: "whatsnew.highlights.ipad.label",
      caption: "whatsnew.highlights.ipad.caption",
      image: { src: "/whats-new/1.4/ipad.webp", width: 840, height: 1212 },
    },
    {
      id: "prayer",
      label: "whatsnew.highlights.prayer.label",
      caption: "whatsnew.highlights.prayer.caption",
      image: { src: "/whats-new/1.4/prayer.webp", width: 1600, height: 1003 },
    },
    {
      id: "saint",
      label: "whatsnew.highlights.saint.label",
      caption: "whatsnew.highlights.saint.caption",
      image: { src: "/whats-new/1.4/saint.webp", width: 1600, height: 703 },
    },
  ] satisfies Highlight[],
};
