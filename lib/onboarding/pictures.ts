// The picture on each answer of "What are you looking for?" (1.8): the
// owner's pick B of round 14, picture cards numbered in tap order
// (Homebase/boards/purify-master/variants/14-onboarding.png, his word of
// 2026-10-27). Pure, so the map is tested directly
// (lib/onboarding/__tests__/pictures.test.ts).
//
// One map for every answer, so a new picture is a one-line change: its row.
//
// The seven answers added from the mockup on 2026-10-28 each have a saint, a
// book or a place of their own in the app, and wear the picture that place
// wears in Discover, as the mockup drew them (the owner's list for Gemini,
// boards/purify-master/r18/GEMINI-IMAGES.md section 3: an answer with a saint
// or a book of its own keeps that, and no AI draws an icon). Each work, its
// source and licence are in docs/licensing/SECTION_MEDIA.md.
//
// The four the app had have none of their own, so each has a slot named for
// the picture the owner is making for it in Gemini (the same section: 4:5, no
// saint, icon or person drawn by AI). A final picture goes in
// public/onboarding/ under its slot's name, as a WebP:
// `src: "/onboarding/onboarding-rule.webp"`. Until then each slot holds a
// stand-in: a public-domain icon the app already carries, its source and
// licence recorded where the app first used it (named on each row).
//
// Every picture was opened and looked at in the card's crop before it was
// chosen, and is one the apps carry in their own bundle: onboarding is a first
// open, maybe with no signal, and the folders the apps fetch from the website
// (scripts/native-build.mjs) drew two broken cards in the export of
// 2026-10-28.

import type { Intent } from "./space";

/** The four slots the owner's pictures are named for. */
export const PICTURE_SLOTS = ["onboarding-rule", "onboarding-study", "onboarding-quiet", "onboarding-liturgy"] as const;
export type PictureSlot = (typeof PICTURE_SLOTS)[number];

export type AnswerPicture = {
  /** The slot the owner's own picture for this answer is named for, where one is being made. */
  slot?: PictureSlot;
  /** The picture drawn now, a path under public/. */
  src: string;
  /** Where the card's crop sits (CSS object-position). */
  focus: string;
};

export const ANSWER_PICTURES: Readonly<Record<Intent, AnswerPicture>> = {
  // The Three Hierarchs, Discover's Saints; the crop lifted to their faces.
  saints: { src: "/discover/tiles/saints.webp", focus: "50% 20%" },
  // The open Gospel in Christ's hand, the Vysotsky range: Discover's Reading,
  // the reading room the Fathers are read in.
  fathers: { src: "/discover/tiles/reading.v2.webp", focus: "50% 50%" },
  // Codex Sinaiticus, Matthew 6, the Bible's own picture (sections/bible.jpg).
  // Not Christ's face, as the mockup drew it: A rule of prayer wears that.
  gospels: { src: "/sections/bible.jpg", focus: "50% 50%" },
  // The fathers along the foot of the Triumph of Orthodoxy, Discover's Councils.
  councils: { src: "/discover/tiles/councils.v2.webp", focus: "50% 15%" },
  // The same icon's upper half, Discover's History.
  history: { src: "/discover/tiles/history.v2.webp", focus: "50% 30%" },
  // Rublev's Holy Trinity, Discover's Theology.
  beliefs: { src: "/discover/tiles/theology.v2.webp", focus: "50% 30%" },
  // Stand-in: the Mystical Supper, Kirillo-Belozersky Monastery, 1497
  // (docs/licensing/SECTION_MEDIA.md; Theology's "The Mysteries and worship").
  liturgy: { slot: "onboarding-liturgy", src: "/theology/subjects/mystical-supper.jpg", focus: "50% 50%" },
  // The Menologion of Basil II, a feast of the Lord, Discover's Calendar.
  feasts: { src: "/discover/tiles/calendar.v2.webp", focus: "50% 25%" },
  // Stand-in: Christ Pantocrator of Sinai, 6th century, the picture Prayers
  // wears (docs/licensing/SECTION_MEDIA.md, lib/media/sections.ts).
  prayer: { slot: "onboarding-rule", src: "/sections/prayers.v4.jpg", focus: "50% 40%" },
  // Stand-in: St Gregory Palamas, the teacher of stillness, his icon on his
  // own page (lib/saints/iconRights.ts). Not History's larger copy: the apps
  // ask the website for History's pictures, and a first open may have no
  // signal.
  quiet: { slot: "onboarding-quiet", src: "/saints/icons/gregory-palamas.jpg", focus: "50% 20%" },
  // Stand-in: St Prochorus writing the Gospel of John, E. Lambardos, 1602,
  // in the black and white the Plus paywall carries (docs/licensing/
  // COVER_ICONS.md). Not the colour cover: the apps ask the website for the
  // reading room's covers. The last card runs the width of the screen, so
  // the crop sits on his face.
  study: { slot: "onboarding-study", src: "/premium/scribe.v1.webp", focus: "50% 25%" },
};
