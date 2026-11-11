// The edit frames (scripts/promo/README.md, "Edits"): stills for a fast-cut
// edit, the owner's word of 2026-11-08: go all in on visuals, the subject in
// the middle of the screen, no phone, the words on the screen as if zoomed in,
// and what catches the eye is the icons, the photography, the map and the
// animations (the saint web, the music player, history on the map). Every
// word sits in the middle; a year always at the centre at one size, so the
// years switch in place like a counter. Real screens from edit-capture.mjs
// zoomed in, the app's own public-domain art from public/ with its credit,
// the house fonts. Light is a soft pool, never rays (CLAUDE.md).
//
// Drawn in PROMO/edit/html: ../cap and ../art are PROMO/edit's, ../../fonts PROMO's.

const PAPER = "#f4f1ea";
const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

const CSS = `
@font-face { font-family: "Lora"; src: url(../../fonts/lora.woff2) format("woff2"); font-weight: 400 700; }
@font-face { font-family: "DM Sans"; src: url(../../fonts/dmsans.woff2) format("woff2"); font-weight: 100 1000; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
.frame { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #050505; -webkit-font-smoothing: antialiased; }
.abs { position: absolute; }
.grain { position: absolute; inset: 0; pointer-events: none; background-image: ${NOISE}; background-size: 300px; opacity: .085; mix-blend-mode: overlay; }
.vig { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(78% 52% at 50% 48%, rgba(0,0,0,0) 42%, rgba(0,0,0,.88) 100%); }
.label { position: absolute; left: 0; right: 0; text-align: center; font: 600 25px/1.2 "DM Sans"; letter-spacing: .34em; text-transform: uppercase; color: rgba(244,241,234,.80); }
.head { position: absolute; left: 40px; right: 40px; text-align: center; margin: 0; font-family: "Lora"; font-weight: 600; text-transform: uppercase; letter-spacing: .045em; line-height: 1.02; color: ${PAPER};
  text-shadow: 0 0 26px rgba(255,238,214,.38), 0 0 90px rgba(255,238,214,.20); }
.num { position: absolute; left: 0; right: 0; text-align: center; font-family: "Lora"; font-weight: 600; letter-spacing: -.02em; line-height: .86; color: ${PAPER};
  text-shadow: 0 0 34px rgba(255,238,214,.40), 0 0 120px rgba(255,238,214,.22); }
.echo { color: transparent; -webkit-text-stroke: 2px rgba(244,241,234,.20); text-shadow: none; }
.credit { position: absolute; left: 60px; right: 60px; bottom: 54px; text-align: center; font: 400 17px/1.35 "DM Sans"; color: rgba(244,241,234,.52); }
.ring { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
.dot { position: absolute; border-radius: 50%; background: #fff6e8; pointer-events: none; }
`;

// A seeded random, so a frame is the same every time.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Dust in the light: small warm motes gathered around a point. */
function dust(seed, n, cx, cy, spread) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * spread;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 1.25;
    const s = 1.5 + r() * 4, o = 0.12 + r() * 0.5, b = r() * 1.6;
    out += `<span class="dot" data-m="dust" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;opacity:${o.toFixed(2)};filter:blur(${b.toFixed(1)}px)"></span>`;
  }
  return out;
}

/** Thin rings around the subject, as the atlas and the player ring their own. */
const rings = (cx, cy, radii, alpha = 0.2) =>
  radii.map((r, i) => `<div class="ring" data-m="ring" style="left:${cx}px;top:${cy}px;width:${r * 2}px;height:${r * 2}px;border:${i === 0 ? 2 : 1.5}px solid rgba(244,241,234,${(alpha * (1 - i * 0.22)).toFixed(2)})"></div>`).join("");

/** A warm pool of light. */
const glow = (cx, cy, w, h, alpha = 0.16) =>
  `<div class="abs" data-m="bg" style="inset:0;background:radial-gradient(${w}px ${h}px at ${cx}px ${cy}px, rgba(255,236,206,${alpha}), rgba(255,236,206,0) 70%)"></div>`;

/** A thin anamorphic streak through the subject. */
const flare = (cy, alpha = 0.5) =>
  `<div class="abs" data-m="flare" style="left:-200px;right:-200px;top:${cy - 2}px;height:4px;background:radial-gradient(closest-side, rgba(255,246,232,${alpha}), rgba(255,246,232,0));filter:blur(1.5px);mix-blend-mode:screen"></div>
   <div class="abs" data-m="flare" style="left:-100px;right:-100px;top:${cy - 40}px;height:80px;background:radial-gradient(closest-side, rgba(255,240,220,${alpha * 0.25}), rgba(255,240,220,0));filter:blur(8px);mix-blend-mode:screen"></div>`;

/** A real screen zoomed in: the capture's CSS point (x, y) lands on the frame's (fx, fy). */
const screen = (file, { x, y, fx, fy, scale, mask, style = "" }) =>
  `<div class="abs" data-m="screen" style="inset:0;${mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : ""}${style}"><img src="../cap/${file}" alt="" style="position:absolute;width:${390 * scale}px;left:${fx - x * scale}px;top:${fy - y * scale}px"></div>`;

/** A blurred, enlarged copy of a picture behind it, filling the frame. */
const ground = (src, { brightness = 0.32, blur = 60, pos = "50% 40%" } = {}) =>
  `<div class="abs" data-m="bg" style="inset:-160px;background:url(../art/${src}) ${pos}/cover;filter:blur(${blur}px) brightness(${brightness}) saturate(1.15)"></div>`;

/** A picture in the middle, with a soft edge into the dark. */
const art = (src, { cx, cy, w, h, pos = "50% 50%", radius = 0, feather = true, style = "" }) =>
  `<div class="abs" data-m="art" style="left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;border-radius:${radius}px;overflow:hidden;background:url(../art/${src}) ${pos}/cover;${feather ? "-webkit-mask-image:radial-gradient(closest-side, #000 72%, transparent 100%);mask-image:radial-gradient(closest-side, #000 72%, transparent 100%);" : ""}${style}"></div>`;

const head = (top, size, text) => `<h1 class="head" data-m="h1" style="top:${top}px;font-size:${size}px">${text}</h1>`;
const label = (top, text) => `<div class="label" data-m="eyebrow" style="top:${top}px">${text}</div>`;
const credit = (text) => `<div class="credit" data-m="caption">${text}</div>`;
// Everything a reader reads sits in the middle of the screen (the owner,
// 2026-11-08: "ensure it retains in the middle ... more lower rather than at
// the top"). A year is always in the same place, the screen's centre, at the
// same size, so the years switch in place from frame to frame like a counter.
const NUM = { y: 960, size: 420 };

/** The year, at the centre, with its echoes above and below as it rolls. */
const numeral = (text, words) =>
  !words ? "" : `
  <div class="num echo" data-m="echo" style="top:${NUM.y - NUM.size * 0.43 - NUM.size * 0.88}px;font-size:${NUM.size}px">${text}</div>
  <div class="num" data-m="h1" style="top:${NUM.y - NUM.size * 0.43}px;font-size:${NUM.size}px">${text}</div>
  <div class="num echo" data-m="echo" style="top:${NUM.y - NUM.size * 0.43 + NUM.size * 0.88}px;font-size:${NUM.size}px">${text}</div>`;

/** A heading and its label, the heading centred on cy, the label just above it. */
const block = (cy, { eyebrow, text, size, lines }) => {
  const h = lines * size * 1.02;
  return `${eyebrow ? label(cy - h / 2 - 52, eyebrow) : ""}${head(cy - h / 2, size, text)}`;
};

/** A dark band behind words set over a picture. */
const shade = (y0, y1, alpha = 0.86) =>
  `<div class="abs" style="left:0;right:0;top:${y0}px;height:${y1 - y0}px;background:linear-gradient(180deg, rgba(5,5,5,0), rgba(5,5,5,${alpha}) 38%, rgba(5,5,5,${alpha}) 62%, rgba(5,5,5,0))"></div>`;

/** A soft dark pool behind a year set over a picture. */
const pool = (alpha = 0.7) =>
  `<div class="abs" style="inset:0;background:radial-gradient(520px 300px at 540px ${NUM.y}px, rgba(5,5,5,${alpha}), rgba(5,5,5,0) 100%)"></div>`;

const yearLabel = (text) => label(NUM.y + NUM.size * 0.5 + 16, text);

const MAP_MASK = (fy0, fy1) => `linear-gradient(180deg, transparent ${fy0}px, #000 ${fy0 + 150}px, #000 ${fy1 - 150}px, transparent ${fy1}px)`;
const MAP_LIGHT = "filter:brightness(1.55) contrast(1.12);";
// The atlas's map is CSS 155 to 560 in its capture: the year above it, the sheet below.
const mapSpan = (y, fy, scale) => [fy + (155 - y) * scale, fy + (560 - y) * scale];

export const EDITS = [
  {
    id: "e01-saint-web",
    name: "The saint web",
    html: (w) => {
      const fy = w ? 700 : 960, s = w ? 2.25 : 3.0;
      return `
<div class="frame">
  ${glow(540, fy, 760, 900, 0.14)}
  ${screen("web-john-chrysostom.png", { x: 195, y: 403, fx: 540, fy, scale: s, mask: `radial-gradient(${560 * s / 3}px ${720 * s / 3}px at 540px ${fy}px, #000 66%, transparent 100%)` })}
  ${rings(540, fy, [178 * s / 3, 560 * s / 3, 700 * s / 3], 0.15)}
  ${dust(11, 70, 540, fy, 560)}
  <div class="vig"></div>
  ${w ? `${shade(1110, 1580, 0.84)}${block(1345, { eyebrow: "The saint web", text: "The saints,<br>connected.", size: 100, lines: 2 })}` : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e02-year-33",
    name: "33, Pentecost",
    year: "33",
    html: (w) => {
      const fy = NUM.y, [t, b] = mapSpan(422, fy, 4.0);
      return `
<div class="frame">
  ${screen("hatlas-33.png", { x: 194, y: 422, fx: 540, fy, scale: 4.0, mask: MAP_MASK(Math.max(t, 0), b), style: MAP_LIGHT })}
  ${w ? `<div class="abs" style="inset:0;background:radial-gradient(600px 200px at 720px ${fy}px, rgba(8,8,9,.97) 62%, rgba(8,8,9,0) 100%)"></div>` : ""}
  ${glow(540, fy, 560, 460, 0.14)}
  ${rings(540, fy, [120, 250, 400], 0.2)}
  ${dust(23, 45, 540, fy, 560)}
  <div class="vig"></div>
  ${numeral("33", w)}
  ${w ? yearLabel("Pentecost · Jerusalem") : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e03-where-it-happened",
    name: "Where it happened",
    html: (w) => {
      const fy = w ? 1270 : 960, s = 2.9, [t, b] = mapSpan(375, fy, s);
      return `
<div class="frame">
  ${screen("hatlas-64-early.png", { x: 205, y: 375, fx: 540, fy, scale: s, mask: MAP_MASK(t, b), style: MAP_LIGHT })}
  ${glow(540, fy, 700, 460, 0.1)}
  ${flare(fy + (330 - 375) * s, 0.35)}
  ${dust(37, 55, 540, fy, 560)}
  <div class="vig"></div>
  ${w ? block(960, { eyebrow: "Rome · Antioch · Jerusalem", text: "Where it<br>happened.", size: 112, lines: 2 }) : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e04-year-325",
    name: "325, Nicaea",
    year: "325",
    html: (w) => {
      const fy = NUM.y, s = 4.0, [t, b] = mapSpan(359, fy, s);
      return `
<div class="frame">
  ${screen("catlas-325.png", { x: 168, y: 359, fx: 540, fy, scale: s, mask: MAP_MASK(Math.max(t, 0), b), style: MAP_LIGHT })}
  ${w ? `<div class="abs" style="inset:0;background:radial-gradient(700px 280px at 760px ${fy + 30}px, rgba(8,8,9,.97) 62%, rgba(8,8,9,0) 100%)"></div>` : ""}
  ${glow(540, fy, 560, 460, 0.14)}
  ${rings(540, fy, [120, 250, 400], 0.2)}
  ${dust(41, 45, 540, fy, 560)}
  <div class="vig"></div>
  ${numeral("325", w)}
  ${w ? yearLabel("First Council of Nicaea") : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e05-chant-words",
    name: "The chant, word by word",
    html: (w) => `
<div class="frame">
  ${ground("david.v1.jpg", { brightness: 0.34, blur: 70, pos: "50% 30%" })}
  ${glow(540, 960, 700, 600, 0.12)}
  ${screen("chant-4200.png", { x: 195, y: 457, fx: 662, fy: 960, scale: 3.4, mask: "linear-gradient(180deg, transparent 818px, #000 860px, #000 1360px, transparent 1540px)", style: "mix-blend-mode:screen;" })}
  <div class="abs" data-m="art" style="left:${540 - 120}px;top:${560 - 120}px;width:240px;height:240px;border-radius:50%;background:url(../art/david.v1.jpg) 50% 35%/cover;box-shadow:0 0 0 2px rgba(244,241,234,.5),0 0 60px rgba(255,236,206,.35),0 30px 90px rgba(0,0,0,.6)"></div>
  ${rings(540, 560, [160, 215], 0.18)}
  ${dust(53, 50, 540, 960, 560)}
  <div class="vig"></div>
  ${w ? label(736, "Psalm 135 · Byzantine chant") : ""}
  <div class="grain" data-m="grain"></div>
</div>`,
  },
  {
    id: "e06-now-playing",
    name: "Now playing",
    html: (w) => {
      const r = 330, cy = w ? 700 : 820, lit = 0.28, rr = r + 32, c = 2 * Math.PI * rr;
      const ty = w ? 1370 : 1360;
      return `
<div class="frame">
  ${ground("david.v1.jpg", { brightness: 0.3, blur: 80 })}
  ${glow(540, cy, 700, 700, 0.14)}
  <div class="abs" data-m="art" style="left:${540 - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:url(../art/david.v1.jpg) 50% 40%/cover;box-shadow:0 40px 140px rgba(0,0,0,.7)"></div>
  <svg class="abs" data-m="ring" style="left:${540 - rr - 30}px;top:${cy - rr - 30}px" width="${(rr + 30) * 2}" height="${(rr + 30) * 2}">
    <circle cx="${rr + 30}" cy="${rr + 30}" r="${rr}" fill="none" stroke="rgba(244,241,234,.18)" stroke-width="5"/>
    <circle cx="${rr + 30}" cy="${rr + 30}" r="${rr}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * lit).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${rr + 30} ${rr + 30})" style="filter:drop-shadow(0 0 12px rgba(255,255,255,.75)) drop-shadow(0 0 34px rgba(255,240,220,.45))"/>
  </svg>
  ${screen("nowplaying.png", { x: 195, y: 722, fx: 540, fy: ty, scale: 2.0, mask: `linear-gradient(180deg, transparent ${ty - 82}px, #000 ${ty - 58}px, #000 ${ty + 58}px, transparent ${ty + 82}px)`, style: "mix-blend-mode:screen;" })}
  ${dust(67, 60, 540, cy, 600)}
  <div class="vig" style="background:radial-gradient(80% 54% at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,.86) 100%)"></div>
  ${w ? `${block(1170, { eyebrow: "Now playing", text: "Psalm 135", size: 80, lines: 1 })}
  ${label(1236, "Eikona · Byzantine chant")}` : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e07-pray-without-ceasing",
    name: "Pray without ceasing",
    html: (w) => `
<div class="frame">
  ${ground("prayers.v4.jpg", { brightness: 0.26, pos: "50% 25%" })}
  ${glow(540, w ? 760 : 960, 760, 760, 0.16)}
  ${art("prayers.v4.jpg", { cx: 540, cy: w ? 780 : 960, w: w ? 820 : 900, h: w ? 864 : 948, pos: "50% 30%" })}
  ${dust(71, 60, 540, 900, 600)}
  <div class="vig"></div>
  ${w ? `${shade(1040, 1560, 0.84)}${block(1300, { eyebrow: "1 Thessalonians 5:17", text: "Pray without<br>ceasing.", size: 98, lines: 2 })}` : ""}
  ${credit("Christ Pantocrator, St Catherine's Monastery, Sinai · 6th century · Public domain")}
  <div class="grain" data-m="grain"></div>
</div>`,
  },
  {
    id: "e08-golden-mouth",
    name: "Golden-Mouth",
    html: (w) => `
<div class="frame">
  ${ground("chrysostom-at-constantinople.v1.jpg", { brightness: 0.3, pos: "50% 30%" })}
  ${glow(540, w ? 760 : 960, 800, 800, 0.15)}
  ${art("chrysostom-at-constantinople.v1.jpg", { cx: 540, cy: w ? 780 : 960, w: w ? 880 : 960, h: w ? 880 : 960, pos: "50% 22%" })}
  ${dust(83, 60, 540, 900, 600)}
  <div class="vig"></div>
  ${w ? `${shade(1040, 1580, 0.84)}${block(1310, { eyebrow: "St John Chrysostom", text: "Golden-<br>Mouth.", size: 116, lines: 2 })}` : ""}
  ${credit("Mosaic of St John Chrysostom, Hagia Sophia · late 9th century · Public domain")}
  <div class="grain" data-m="grain"></div>
</div>`,
  },
  {
    id: "e09-the-saints",
    name: "The saints",
    html: (w) => {
      const tiles = ["arsenius-the-great.jpg", "pentecost.v1.jpg", "hilarion-the-great.jpg", "photius-the-great.v2.jpg",
        "moses-the-black.v2.jpg", "fathers-of-sinai.jpg", "great-schism-1054.v1.jpg", "pachomius-the-great.jpg",
        "cyril-of-jerusalem.v2.jpg", "justinian-the-great.v2.jpg", "john-chrysostom.v2.jpg", "seven-sleepers-of-ephesus.jpg",
        "job-of-pochaev.jpg", "maccabean-martyrs.jpg", "prayers.v4.jpg", "macarius-the-great.jpg",
        "chrysostom-at-constantinople.v1.jpg", "arsenius-the-great.jpg", "moses-the-black.v2.jpg", "hilarion-the-great.jpg"];
      const cols = 4, tw = 300, th = 380, gap = 26;
      const gw = cols * tw + (cols - 1) * gap, gh = 5 * th + 4 * gap;
      const cy = w ? 820 : 980;
      const cells = tiles.map((t, i) => {
        const x = (i % cols) * (tw + gap), y = Math.floor(i / cols) * (th + gap);
        const hero = i === 10;
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:${tw}px;height:${th}px;border-radius:22px;background:url(../art/${t}) 50% 30%/cover;${hero ? "box-shadow:0 0 0 3px rgba(255,246,232,.9),0 0 60px rgba(255,236,206,.55),0 0 160px rgba(255,236,206,.35);" : "filter:brightness(.62) saturate(.9);"}"></div>`;
      }).join("");
      return `
<div class="frame">
  ${glow(540, cy, 800, 900, 0.12)}
  <div class="abs" data-m="art" style="left:${540 - gw / 2}px;top:${cy - gh / 2}px;width:${gw}px;height:${gh}px;transform:perspective(2200px) rotateX(16deg) rotateZ(-7deg) scale(1.02);transform-origin:50% 50%">${cells}</div>
  ${dust(97, 70, 540, cy, 620)}
  <div class="vig" style="background:radial-gradient(70% 46% at 50% ${w ? 43 : 50}%, rgba(0,0,0,0) 36%, rgba(0,0,0,.92) 100%)"></div>
  ${w ? `${shade(1060, 1600, 0.86)}${block(1320, { eyebrow: "Lives and writings", text: "The saints.", size: 124, lines: 1 })}` : ""}
  ${credit("Icons and mosaics from Purify's library · Public domain")}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  {
    id: "e10-year-330",
    name: "330, Constantinople",
    year: "330",
    html: (w) => `
<div class="frame">
  ${ground("foundation-of-constantinople.v1.jpg", { brightness: 0.28 })}
  ${glow(540, w ? 640 : 960, 800, 600, 0.14)}
  ${art("foundation-of-constantinople.v1.jpg", { cx: 540, cy: w ? 620 : 960, w: 1180, h: 736, pos: "50% 50%" })}
  ${dust(101, 60, 540, 900, 600)}
  <div class="vig"></div>
  ${w ? pool(0.72) : ""}
  ${numeral("330", w)}
  ${w ? yearLabel("The dedication of Constantinople") : ""}
  ${credit("The southwestern entrance mosaic, Hagia Sophia · about 1000 · Public domain")}
  <div class="grain" data-m="grain"></div>
</div>`,
  },
  {
    id: "e11-year-1917",
    name: "1917, Moscow",
    year: "1917",
    html: (w) => `
<div class="frame">
  ${ground("bolshevik-persecution.v1.jpg", { brightness: 0.26 })}
  ${art("bolshevik-persecution.v1.jpg", { cx: 540, cy: w ? 620 : 960, w: 1240, h: 698, style: "filter:grayscale(1) contrast(1.08) brightness(.92)" })}
  ${glow(540, w ? 640 : 960, 800, 520, 0.08)}
  ${dust(113, 50, 540, 900, 600)}
  <div class="vig"></div>
  ${w ? pool(0.72) : ""}
  ${numeral("1917", w)}
  ${w ? yearLabel("The Local Council · Moscow") : ""}
  ${credit("The Local Council of the Russian Orthodox Church, Moscow · 1917 · Public domain")}
  <div class="grain" data-m="grain" style="opacity:.12"></div>
</div>`,
  },
  {
    id: "e12-in-the-beginning",
    name: "In the beginning",
    html: (w) => `
<div class="frame">
  <div class="abs" data-m="bg" style="inset:-200px;background:url(../art/bible.jpg) 50% 50%/auto 140%;transform:rotate(-8deg);filter:brightness(.36) sepia(.3) contrast(1.1)"></div>
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(60% 40% at 50% 50%, rgba(5,5,5,.25), rgba(5,5,5,.9) 100%)"></div>
  ${flare(960, 0.3)}
  ${dust(127, 70, 540, 960, 620)}
  <div class="vig"></div>
  ${w ? `${block(960, { text: "In the<br>beginning<br>was the<br>Word.", size: 132, lines: 4 })}
  ${label(960 + 4 * 132 * 1.02 / 2 + 40, "John 1:1")}` : ""}
  ${credit("Codex Sinaiticus · 4th century · Public domain")}
  <div class="grain" data-m="grain"></div>
</div>`,
  },
  {
    id: "e13-two-thousand-years",
    name: "2,000 years, every place lit",
    html: (w) => {
      const fy = w ? 1180 : 960, s = 5.0;
      return `
<div class="frame">
  ${screen("door.png", { x: 258, y: 508, fx: 540, fy, scale: s, mask: `linear-gradient(180deg, transparent ${fy + (386 - 508) * s}px, #000 ${fy + (386 - 508) * s + 160}px, #000 ${fy + (604 - 508) * s - 160}px, transparent ${fy + (604 - 508) * s}px)`, style: MAP_LIGHT })}
  ${glow(540, fy, 700, 520, 0.1)}
  ${rings(540, fy, [120, 260, 420], 0.14)}
  ${dust(139, 60, 540, fy, 600)}
  <div class="vig"></div>
  ${w ? `${pool(0.55)}${block(960, { eyebrow: "Every event sourced", text: "2,000 years.", size: 124, lines: 1 })}` : ""}
  <div class="grain" data-m="grain"></div>
</div>`;
    },
  },
  // A fourteenth frame, Toward the Nativity, stood here: Today's Nativity Fast
  // card close on its star (made 2026-11-09, at f88395ad7). It is in the Vault
  // on the SSM board and is not drawn again: its subject is the four-point
  // sparkle the app drew on that card, out by the owner's word of 2026-11-11
  // (CLAUDE.md, "No sparkle star").
];

// Pictures drawn as backgrounds are loaded as images too, so the page waits for them.
export const editPage = (body) => {
  const pics = [...new Set([...body.matchAll(/url\(\.\.\/art\/([^)]+)\)/g)].map((m) => m[1]))];
  const preload = pics.map((p) => `<img src="../art/${p}" alt="" style="position:absolute;width:1px;height:1px;opacity:0">`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}${preload}</body></html>`;
};

