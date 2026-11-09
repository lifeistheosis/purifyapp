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

// ---------------------------------------------------------------- 1.8: the night of the Nativity Fast

// The app's own drawing of the Nativity Fast's night (components/today/NativityStarCard.tsx,
// lib/reading/nativityStar.ts): a field of 350 by 196, the horizon's curve, the star and its halo.
const FIELD_W = 350;
const NIGHT_H = 196;
const STAR_X = 250 / 350;
const starTop = (day, of = 40) => 150 - (Math.min(Math.max(day, 1), of) / of) * 110;
const STAR_PATHS = `<path d="M12 1.5 L13.3 10.7 L22.5 12 L13.3 13.3 L12 22.5 L10.7 13.3 L1.5 12 L10.7 10.7 Z" fill="#fff"/>
  <path d="M12 6.5 L12.8 11.2 L17.5 12 L12.8 12.8 L12 17.5 L11.2 12.8 L6.5 12 L11.2 11.2 Z" fill="#fff" opacity="0.8" transform="rotate(45 12 12)"/>`;

/**
 * The crown of a 1.8 card: the app's night drawn the width of the card, its
 * horizon a little above the card's middle third, and the star standing a
 * little higher on each card of the set, as it does each day of the fast.
 */
function nightCrown(k, n, { top = 30 } = {}) {
  const s = 1080 / FIELD_W;
  const h = NIGHT_H * s;
  // Card k of n is a day of the forty: the first card the first day, the last the fortieth.
  const day = 1 + Math.round(((k - 1) / Math.max(n - 1, 1)) * 39);
  const star = 22 * s;
  const sx = STAR_X * 1080, sy = top + (starTop(day) + 11) * s;
  const halo = 60 * s;
  return `
  <div class="crown" style="top:${top}px;height:${h}px">
    <svg class="abs" style="inset:0" width="1080" height="${h}" viewBox="0 0 ${FIELD_W} ${NIGHT_H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="edge" x1="0" x2="${FIELD_W}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <path d="M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H} Z" fill="var(--ground)"/>
      <path d="M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H}" fill="none" stroke="url(#edge)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="abs dawn" style="left:${sx - 520}px;top:${(173 - 34) * s}px;width:1040px;height:${68 * s}px"></div>
    <div class="abs" style="left:${sx - halo / 2}px;top:${sy - top - halo / 2}px;width:${halo}px;height:${halo}px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(255,255,255,.16) 35%, rgba(255,255,255,0) 70%)"></div>
    <svg class="abs" style="left:${sx - star / 2}px;top:${sy - top - star / 2}px;filter:drop-shadow(0 0 12px rgba(255,255,255,.9))" width="${star}" height="${star}" viewBox="0 0 24 24">${STAR_PATHS}</svg>
  </div>`;
}

export const LOOKS = {
  "1.8": {
    name: "The night of the Nativity Fast",
    // The ground below the horizon is the app's own night; the sky above it a shade lighter.
    css: `
      :root { --ground: #0a0a0c; --sky: #121318; --paper: #f4f1ea; --quiet: rgba(244,241,234,.72); --dim: rgba(244,241,234,.5); }
      .card { background: linear-gradient(180deg, var(--sky) 0, #0d0e12 420px, var(--ground) 640px); }
      .crown { position: absolute; left: 0; width: 1080px; }
      .dawn { background: radial-gradient(closest-side, rgba(255,255,255,.10), rgba(255,255,255,0)); }
    `,
    crown: nightCrown,
    // The horizon's crest stands at this height: the card's content starts below it.
    below: 30 + 173 * (1080 / FIELD_W) + 90,
    features: [
      { point: "listen", eyebrow: "New in the Bible", lean: "read aloud", screen: { file: "cards/cap/listen-john-1.png", x: 0, y: 268, w: 390 } },
      { point: "nativity", eyebrow: "On Today", lean: "Nativity", screen: { file: "edit/cap/nativity-star.png", x: 0, y: 342, w: 390, fade: false } },
      { point: "maps", eyebrow: "New in History and the Councils", lean: "maps", screen: { file: "edit/cap/catlas-325.png", x: 0, y: 242, w: 390 } },
    ],
  },
};
