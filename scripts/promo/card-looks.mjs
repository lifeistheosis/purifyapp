// Each release's own look for its cards (cards.mjs). The owner's word
// (2026-11-09): "for every release we will have like a generic card, but I
// want like a unique design for every single version". The base, in
// cards.mjs, keeps the order of the set, the type, the safe box, the mark and
// the closing; a look gives the ground, the colours and the crown: the band
// at the top of every card, where the release's own motif lives.
//
// A look also names its feature cards: which of the drop's points get a card,
// each with its eyebrow, the word its title leans on, and the real screen it
// shows (a capture from edit-capture.mjs or card-capture.mjs, in CSS pixels).
// Every word on a card comes from the drop or from the app; a look adds none
// of its own but the eyebrows.

// ---------------------------------------------------------------- 1.8: in the Vault
//
// 1.8's look, the night of the Nativity Fast with the app's star standing a
// little higher on each card, drew the seven cards in the Vault on the SSM
// board (2026-11-09; the look as it was is at 811953d7d). Its star, drawn
// here and on the Nativity card's screen, is the four-point sparkle the app
// drew on Today, out by the owner's word of 2026-11-11 (CLAUDE.md, "No
// sparkle star"), so the look is not drawn again and `cards.mjs 1.8`
// refuses. The next release's look is made on his word, its mark taken from
// the app's own, never a four-point star (promoLooks.test.ts holds it).

export const LOOKS = {};
