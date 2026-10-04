// The current release's highlights, as the top of /whats-new shows them: a
// headline, and a pill per feature that opens a picture of it.
//
// Added 2026-09-27 at the owner's ask, after the 1.4 announcement image went
// out with these pills on it: tapping one should show what it looks like.
// Every picture is a real screenshot of the live site or app, framed, in
// public/whats-new/<version>/. Replace the set with each release that has
// something to show; strings are catalog keys. The 1.5 set pictures no
// Community screen and no streak: the first shows other readers, the second
// needs an account to draw.

export type HighlightId = "greek" | "job" | "shop" | "kitchen" | "saints";

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
  version: "1.5",
  eyebrow: "whatsnew.highlights.eyebrow",
  title: "whatsnew.highlights.title",
  sub: "whatsnew.highlights.sub",
  items: [
    {
      id: "greek",
      label: "whatsnew.highlights.greek.label",
      caption: "whatsnew.highlights.greek.caption",
      image: { src: "/whats-new/1.5/greek.webp", width: 1600, height: 1000 },
      accent: true,
    },
    {
      id: "job",
      label: "whatsnew.highlights.job.label",
      caption: "whatsnew.highlights.job.caption",
      image: { src: "/whats-new/1.5/job.webp", width: 1600, height: 1000 },
    },
    {
      id: "shop",
      label: "whatsnew.highlights.shop.label",
      caption: "whatsnew.highlights.shop.caption",
      image: { src: "/whats-new/1.5/shop.webp", width: 1600, height: 1000 },
    },
    {
      id: "kitchen",
      label: "kitchen.name",
      caption: "whatsnew.highlights.kitchen.caption",
      image: { src: "/whats-new/1.5/kitchen.webp", width: 1600, height: 1000 },
    },
    {
      id: "saints",
      label: "whatsnew.highlights.saints.label",
      caption: "whatsnew.highlights.saints.caption",
      image: { src: "/whats-new/1.5/saints.webp", width: 1600, height: 1000 },
    },
  ] satisfies Highlight[],
};
