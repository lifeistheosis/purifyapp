// The picture on each answer of "What are you looking for?" (1.8): the
// owner's pick B of round 14, picture cards numbered in tap order
// (Homebase/boards/purify-master/variants/14-onboarding.png, his word of
// 2026-10-27). Pure, so the map is tested directly
// (lib/onboarding/__tests__/pictures.test.ts).
//
// One map for every answer, so a new picture is a one-line change: its row.
// None of the four answers has a saint or a book of its own, so each has a
// slot named for the picture the owner is making for it in Gemini
// (boards/purify-master/r18/GEMINI-IMAGES.md, section 3: 4:5, no saint, icon
// or person drawn by AI). A final picture goes in public/onboarding/ under its
// slot's name, as a WebP: `src: "/onboarding/onboarding-rule.webp"`.
//
// Until then each slot holds a stand-in: a public-domain icon the app already
// carries, its source and licence recorded where the app first used it (named
// on each row), opened and looked at in this card's 4:5 crop before it was
// chosen. None of them is new to the app. Each is one the apps carry in their
// own bundle, because onboarding is a first open, maybe with no signal: the
// folders the apps fetch from the website (scripts/native-build.mjs) drew two
// broken cards in the export of 2026-10-28.

import type { Intent } from "./space";

/** The four slots the owner's pictures are named for. */
export const PICTURE_SLOTS = ["onboarding-rule", "onboarding-study", "onboarding-quiet", "onboarding-liturgy"] as const;
export type PictureSlot = (typeof PICTURE_SLOTS)[number];

export type AnswerPicture = {
  /** The slot the owner's own picture for this answer is named for. */
  slot: PictureSlot;
  /** The picture drawn now, a path under public/. */
  src: string;
  /** Where the card's 4:5 crop sits (CSS object-position). */
  focus: string;
};

export const ANSWER_PICTURES: Readonly<Record<Intent, AnswerPicture>> = {
  // Stand-in: St Gregory Palamas, the teacher of stillness, his icon on his
  // own page (lib/saints/iconRights.ts). Not History's larger copy: the apps
  // ask the website for History's pictures, and a first open may have no
  // signal.
  quiet: { slot: "onboarding-quiet", src: "/saints/icons/gregory-palamas.jpg", focus: "50% 30%" },
  // Stand-in: the Mystical Supper, Kirillo-Belozersky Monastery, 1497
  // (docs/licensing/SECTION_MEDIA.md; Theology's "The Mysteries and worship").
  liturgy: { slot: "onboarding-liturgy", src: "/theology/subjects/mystical-supper.jpg", focus: "50% 50%" },
  // Stand-in: St Prochorus writing the Gospel of John, E. Lambardos, 1602,
  // in the black and white the Plus paywall carries (docs/licensing/
  // COVER_ICONS.md). Not the colour cover: the apps ask the website for the
  // reading room's covers.
  study: { slot: "onboarding-study", src: "/premium/scribe.v1.webp", focus: "50% 50%" },
  // Stand-in: Christ Pantocrator of Sinai, 6th century, the picture Prayers
  // wears (docs/licensing/SECTION_MEDIA.md, lib/media/sections.ts).
  prayer: { slot: "onboarding-rule", src: "/sections/prayers.v3.jpg", focus: "50% 50%" },
};
