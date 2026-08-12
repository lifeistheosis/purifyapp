// The four icons of prayer that crossfade behind the contemplative panel on
// /prayers.
//
// Extracted out of components/prayers/PrayerSlideshow.tsx so that
// lib/saints/__tests__/iconRights.test.ts can read them. These four files live
// in public/saints/icons/ alongside the saint icons but belong to no saint, so
// the rights registry has to know about them or its completeness check would
// report four files it cannot account for. A node-environment test cannot
// import a "use client" component, hence a plain data module.
//
// ALT TEXT IS CHECKED AGAINST THE IMAGE ITSELF, NOT AGAINST THE FILENAME.
// These four were misaligned by one position until 2026-07-25: frame 0 was
// described as the cave prostration (it is the Agony, inscribed Ἡ ΑΓΩΝΙΑ) and
// frame 2 as the Agony (it is the Prodigal Son). That is the incident behind
// the rule in docs/licensing/icon-provenance.md: open the file and look at it.

export type SlideshowFrame = { src: string; alt: string };

export const SLIDESHOW_FRAMES: SlideshowFrame[] = [
  {
    src: "/saints/icons/praying2.jpg",
    alt: "The Agony in the Garden, Christ kneeling at the rock in Gethsemane.",
  },
  {
    src: "/saints/icons/praying.jpg",
    alt: "An Orthodox monk in prostration before the icon of Christ in his cave.",
  },
  {
    src: "/saints/icons/praying3.jpg",
    alt: "The father running to receive the Prodigal Son, with the fatted calf and the music of the feast.",
  },
  {
    src: "/saints/icons/icon4.jpg",
    alt: "The father embracing the Prodigal Son, the swine and the far country behind him.",
  },
];
