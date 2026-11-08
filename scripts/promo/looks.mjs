// The seven looks of the promo (scripts/promo/README.md), shared by the stills
// (frames.mjs) and the clips (motion.mjs). Each draws a real screen from
// capture.mjs in a phone, with the house fonts and colours and the app's own
// art, its credit beside it. Every look comes with words and clean; every
// part a clip moves carries data-m. The words are held by
// lib/marketing/__tests__/promoLooks.test.ts: plain, no dashes, true of the
// app as it is.
import fs from "node:fs";
import path from "node:path";
import { PROMO } from "./lib.mjs";

// The day the screens were taken (capture.mjs writes it), as Today shows it.
const TAKEN = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PROMO, "screens", "meta.json"), "utf8")).day;
  } catch {
    return null;
  }
})();
const DAY = TAKEN ? new Date(`${TAKEN}T12:00:00`) : new Date();
const DAY_LINE = `${DAY.toLocaleDateString("en-US", { weekday: "long" })} · ${DAY.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
const DAY_NUMBER = String(DAY.getDate());

const PAPER = "#f4f1ea";
const PARCHMENT = "#f1e8d4";
const RUBRIC = "#b3261e";
const INK = "#2a231c";

const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .95 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

const BASE = `
@font-face { font-family: "Lora"; src: url(../fonts/lora.woff2) format("woff2"); font-weight: 400 700; }
@font-face { font-family: "DM Sans"; src: url(../fonts/dmsans.woff2) format("woff2"); font-weight: 100 1000; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
.frame { position: relative; width: 1080px; height: 1920px; overflow: hidden; -webkit-font-smoothing: antialiased; }
.abs { position: absolute; }
.grain { position: absolute; inset: 0; pointer-events: none; background-image: ${NOISE}; background-size: 320px; }
.phone { position: absolute; border-radius: 80px; border: 5px solid transparent; padding: 9px;
  background: linear-gradient(#060607, #060607) padding-box, linear-gradient(150deg, #6a6a72 0%, #2c2c31 28%, #121215 58%, #3d3d44 100%) border-box;
  box-shadow: 0 80px 150px rgba(0,0,0,.66), 0 22px 44px rgba(0,0,0,.42); }
.phone.ti { background: linear-gradient(#08080a, #08080a) padding-box, linear-gradient(150deg, #f4f0e8 0%, #cdc6b9 30%, #9d968a 64%, #ddd7cc 100%) border-box; }
.phone .screen { position: relative; border-radius: 66px; overflow: hidden; }
.phone .screen img { display: block; width: 100%; }
.phone .screen .end { position: absolute; left: 0; right: 0; bottom: 0; height: 0.68%; }
.phone .screen::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(118deg, rgba(255,255,255,.075) 0%, rgba(255,255,255,0) 36%); }
.lockup { position: absolute; display: flex; align-items: center; gap: 16px; font: 600 40px/1 "DM Sans"; letter-spacing: -.01em; }
.lockup img { height: 48px; }
.eyebrow { font: 600 26px/1 "DM Sans"; letter-spacing: .22em; text-transform: uppercase; }
h1 { margin: 0; font-family: "Lora"; font-weight: 600; letter-spacing: -.012em; }
`;

const DARK_SCREEN = "#0f0f12";
const LIGHT_SCREEN = "#f0e7d3";
const phone = (src, { width, left, top, transform = "", style = "", light = false, ti = false, m = "phone" }) =>
  `<div class="phone${ti ? " ti" : ""}" data-m="${m}" style="width:${width}px;left:${left}px;top:${top}px;${transform ? `transform:${transform};` : ""}${style}"><div class="screen"><img src="../screens/${src}" alt=""><div class="end" style="background:${light ? LIGHT_SCREEN : DARK_SCREEN}"></div></div></div>`;

const lockup = ({ left, right, bottom, color = PAPER, dark = false, center = false }) =>
  `<div class="lockup" data-m="lockup" style="${center ? "left:0;right:0;justify-content:center;" : ""}${left !== undefined ? `left:${left}px;` : ""}${right !== undefined ? `right:${right}px;` : ""}bottom:${bottom}px;color:${color}"><img src="../art/purify-cross-mark.png" alt="" style="${dark ? "filter:brightness(0);opacity:.86;" : ""}">Purify</div>`;

export const LOOKS = [
  {
    id: "1-night-sanctuary",
    name: "Night sanctuary",
    html: (words) => `
<div class="frame" style="background:#060607">
  <div class="abs" data-m="bg" style="inset:0;background:
    radial-gradient(56% 34% at 50% ${words ? 50 : 44}%, rgba(255,243,226,.17), rgba(255,243,226,0) 72%),
    radial-gradient(80% 26% at 50% 104%, rgba(255,243,226,.07), rgba(255,243,226,0) 70%)"></div>
  ${words ? `
  <div class="abs eyebrow" data-m="eyebrow" style="top:168px;left:0;right:0;text-align:center;color:rgba(244,241,234,.72)">The Bible in Purify</div>
  <h1 class="abs" data-m="h1" style="top:222px;left:60px;right:60px;text-align:center;font-size:80px;line-height:1.1;color:${PAPER}">Scripture, with the<br>Fathers beside it.</h1>` : ""}
  ${phone("bible-john-1-dark.png", { width: 600, left: 240, top: words ? 500 : 327, transform: "rotate(-3deg)" })}
  <div class="grain" data-m="grain" style="opacity:.075;mix-blend-mode:overlay"></div>
  ${words ? lockup({ center: true, bottom: 70 }) : ""}
</div>`,
  },
  {
    id: "2-manuscript",
    name: "Manuscript",
    html: (words) => `
<div class="frame" style="background:${PARCHMENT}">
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(120% 90% at 40% 30%, rgba(255,250,238,.55) 0%, rgba(255,250,238,0) 55%), radial-gradient(140% 110% at 50% 50%, rgba(0,0,0,0) 60%, rgba(96,66,30,.20) 100%)"></div>
  <div class="grain" data-m="grain" style="opacity:.16;mix-blend-mode:multiply;filter:sepia(1)"></div>
  ${words ? `
  <div class="abs eyebrow" data-m="eyebrow" style="top:150px;left:96px;color:${RUBRIC}">Psalm 22:1 · Brenton</div>
  <p class="abs" data-m="h1" style="margin:0;top:206px;left:92px;width:900px;font:500 104px/1.1 Lora;letter-spacing:-.015em;color:${INK}"><span style="color:${RUBRIC}">T</span>he Lord tends me<br>as a shepherd, and<br>I shall want<br>nothing.</p>
  <div class="abs" data-m="rule" style="top:702px;left:98px;width:120px;height:3px;background:${RUBRIC}"></div>
  <div class="abs" data-m="sub" style="top:736px;left:98px;width:900px;font:400 34px/1.4 'DM Sans';color:#5a4e44">Prayer, Scripture and the saints, in one quiet place.</div>` : ""}
  ${phone("bible-psalm-22-light.png", { width: words ? 540 : 600, left: words ? 470 : 240, top: words ? 856 : 327, transform: words ? "rotate(3deg)" : "rotate(-2deg)", light: true, ti: true, style: "box-shadow:0 60px 120px rgba(70,46,18,.40), 0 18px 36px rgba(70,46,18,.26);" })}
  ${words ? lockup({ left: 98, bottom: 92, color: INK, dark: true }) : ""}
</div>`,
  },
  {
    id: "3-mosaic",
    name: "Mosaic",
    html: (words) => {
      const m = words ? { top: 96, w: 300, h: 372 } : { top: 150, w: 420, h: 520 };
      const cap = m.top + m.h + 36;
      return `
<div class="frame" style="background:#0b0a09">
  <img class="abs" data-m="bg" src="../art/john-chrysostom.v2.jpg" alt="" style="left:-160px;top:-160px;width:1400px;height:2240px;object-fit:cover;object-position:50% 28%;filter:blur(38px) brightness(.30) saturate(1.05)">
  <div class="abs" data-m="bg" style="inset:0;background:linear-gradient(180deg, rgba(8,8,9,.42) 0%, rgba(8,8,9,.20) 24%, rgba(8,8,9,.64) 50%, rgba(8,8,9,.97) 80%)"></div>
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(46% 22% at 50% ${m.top + m.h / 2}px, rgba(255,243,226,.10), rgba(255,243,226,0) 70%)"></div>
  <div class="abs" data-m="art" style="top:${m.top}px;left:50%;transform:translateX(-50%);width:${m.w}px;height:${m.h}px;border-radius:${m.w}px ${m.w}px 18px 18px;overflow:hidden;box-shadow:0 34px 90px rgba(0,0,0,.62);outline:1.5px solid rgba(244,241,234,.28);outline-offset:10px">
    <img src="../art/john-chrysostom.v2.jpg" alt="" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%">
  </div>
  <div class="abs" data-m="caption" style="top:${cap}px;left:60px;right:60px;text-align:center;font:400 19px/1.35 'DM Sans';letter-spacing:.01em;color:rgba(244,241,234,.64)">Mosaic of St John Chrysostom, Hosios Loukas, early 11th century · Public domain</div>
  ${words ? `
  <h1 class="abs" data-m="h1" style="top:${cap + 64}px;left:60px;right:60px;text-align:center;font-size:76px;line-height:1.1;color:${PAPER}">The Fathers, in<br>their own words.</h1>
  <div class="abs" data-m="sub" style="top:${cap + 254}px;left:0;right:0;text-align:center;font:500 32px/1 'DM Sans';letter-spacing:.04em;color:rgba(244,241,234,.80)">Verbatim. Cited. Public domain.</div>` : ""}
  ${phone("chrysostom-ephesians.png", { width: words ? 540 : 600, left: words ? 270 : 240, top: words ? cap + 338 : cap + 92 })}
  <div class="abs" data-m="fade" style="left:0;right:0;bottom:0;height:320px;background:linear-gradient(180deg, rgba(11,10,9,0), rgba(11,10,9,.95) 86%)"></div>
  <div class="grain" data-m="grain" style="opacity:.07;mix-blend-mode:overlay"></div>
</div>`;
    },
  },
  {
    id: "4-kinetic-type",
    name: "Kinetic type",
    html: (words) => `
<div class="frame" style="background:#000">
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(48% 30% at ${words ? 70 : 50}% ${words ? 74 : 50}%, rgba(255,255,255,.075), rgba(255,255,255,0) 70%)"></div>
  ${words ? `
  <div class="abs" data-m="h1" style="left:48px;top:90px;font:600 450px/0.92 Lora;letter-spacing:-.045em;color:${PAPER}">Pray.</div>
  <div class="abs" data-m="rule" style="left:72px;top:592px;width:120px;height:3px;background:${PAPER}"></div>
  <div class="abs" data-m="sub" style="left:72px;top:632px;width:600px;font:400 40px/1.35 'DM Sans';color:rgba(244,241,234,.80)">The prayers of the day,<br>from waking to sleep.</div>` : ""}
  ${phone("prayers-morning-clean.png", { width: words ? 540 : 600, left: words ? 444 : 240, top: words ? 830 : 327, transform: words ? "rotate(6deg)" : "" })}
  ${words ? lockup({ left: 72, bottom: 84 }) : ""}
</div>`,
  },
  {
    id: "5-churchs-day",
    name: "The Church's day",
    html: (words) => `
<div class="frame" style="background:radial-gradient(120% 70% at 50% 0%, #1d1d23 0%, #0c0c0f 62%)">
  ${words ? `<div class="abs" data-m="numeral" style="right:-30px;top:-150px;font:600 ${DAY_NUMBER.length > 1 ? 760 : 1180}px/1 Lora;letter-spacing:-.06em;color:rgba(244,241,234,.045)">${DAY_NUMBER}</div>` : ""}
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(50% 26% at 50% ${words ? 46 : 30}%, rgba(255,255,255,.07), rgba(255,255,255,0) 70%)"></div>
  ${words ? `
  <div class="abs eyebrow" data-m="eyebrow" style="top:150px;left:0;right:0;text-align:center;color:rgba(244,241,234,.72)">${DAY_LINE}</div>
  <h1 class="abs" data-m="h1" style="top:204px;left:60px;right:60px;text-align:center;font-size:84px;line-height:1.08;color:${PAPER}">Every day of the<br>Church's year.</h1>` : ""}
  ${phone("today-kept.png", { width: 600, left: 240, top: words ? 520 : 327 })}
  ${words ? lockup({ center: true, bottom: 46 }) : ""}
</div>`,
  },
  {
    id: "6-product-shot",
    name: "Product shot",
    html: (words) => {
      const y = words ? 0 : -110;
      return `
<div class="frame" style="background:linear-gradient(180deg, #0f0f12 0%, #18181d 55%, #09090b 100%)">
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(56% 30% at 50% ${words ? 62 : 52}%, rgba(255,255,255,.08), rgba(255,255,255,0) 72%)"></div>
  ${words ? `
  <h1 class="abs" data-m="h1" style="top:150px;left:60px;right:60px;text-align:center;font-size:86px;line-height:1.06;color:${PAPER}">Prayer. Scripture.<br>The saints.</h1>
  <div class="abs" data-m="sub" style="top:372px;left:0;right:0;text-align:center;font:400 34px/1 'DM Sans';color:rgba(244,241,234,.74)">Free to download on iPhone and Android.</div>` : ""}
  ${phone("saints.png", { width: 470, left: 6, top: 660 + y, transform: "perspective(2400px) rotateY(24deg) rotateZ(-2deg) scale(.88)", style: "filter:brightness(.8);z-index:1", m: "side" })}
  ${phone("calendar.png", { width: 470, left: 604, top: 660 + y, transform: "perspective(2400px) rotateY(-24deg) rotateZ(2deg) scale(.88)", style: "filter:brightness(.8);z-index:1", m: "side" })}
  ${phone("bible-psalm-22-light.png", { width: 540, left: 270, top: 540 + y, light: true, style: "z-index:2" })}
  ${words ? lockup({ center: true, bottom: 60 }) : ""}
</div>`;
    },
  },
  {
    id: "7-close-up",
    name: "Close-up",
    html: (words) => {
      // John 1 at 6x, 3.2 CSS px to the app's px: the red verses up close, tilted away.
      const s = 3.2;
      const top = (words ? 250 : 420) - 255 * s;
      return `
<div class="frame" style="background:#0f0f12">
  <img class="abs" data-m="screen" src="../screens/john-1-dark-6x.png" alt="" style="width:${390 * s}px;left:${50 - 20 * s}px;top:${top}px;transform:perspective(2000px) rotateX(14deg) rotateZ(-4deg);transform-origin:50% ${255 * s + 500}px">
  <div class="abs" data-m="fade" style="left:0;right:0;top:0;height:${words ? 300 : 400}px;background:linear-gradient(180deg, #0f0f12 ${words ? 52 : 45}%, rgba(15,15,18,0))"></div>
  <div class="abs" data-m="fade" style="left:0;right:0;bottom:0;top:${words ? 1240 : 1500}px;background:linear-gradient(180deg, rgba(15,15,18,0) 0, #0f0f12 ${words ? 170 : 340}px)"></div>
  <div class="abs" data-m="bg" style="inset:0;background:radial-gradient(90% 60% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)"></div>
  ${words ? `
  <h1 class="abs" data-m="h1" style="top:1424px;left:72px;right:72px;font-size:88px;line-height:1.06;color:${PAPER}">Read with<br>the Fathers.</h1>
  <div class="abs" data-m="sub" style="top:1636px;left:72px;width:820px;font:400 36px/1.4 'DM Sans';color:rgba(244,241,234,.78)">Tap a red verse number<br>for the Fathers' commentary.</div>` : ""}
  <div class="grain" data-m="grain" style="opacity:.06;mix-blend-mode:overlay"></div>
  ${words ? lockup({ left: 72, bottom: 84 }) : ""}
</div>`;
    },
  },
];

export const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head><body>${body}</body></html>`;

