"use client";

// A verse as a picture: the drawing.
//
// A reader who wants to send a verse to someone could copy its words or its
// link. Neither is what people send each other: they send pictures. This
// draws one, on the phone, from the verse already on the screen, with no
// server and no network.
//
// The look is the app's own and deliberately plain: a black ground with no
// tint, the verse in the reading serif, the reference under a short rule, the
// three-bar cross and the name. Nothing is cut: a verse too long to set whole
// is not offered as a picture at all (./verseCard.ts, fitVerse).

import { CARD, VERSE_BOX, fitVerse, type Measure } from "./verseCard";

export type VerseCardInput = {
  /** The verse, whole, as the reader sees it. */
  text: string;
  /** Where it is from, as the reader sees it: "John 3:16". */
  reference: string;
};

const GROUND = "#0a0a0a";
const INK = "#f4f4f2";

/** The mark above the verse, the reference under it, the name at the foot. */
const MARK = { height: 60, gapBelow: 76 };
const REFERENCE = { gapAbove: 52, rule: 2, ruleWidth: 72, gapBelowRule: 44, size: 31, tracking: 5 };
const FOOT = { nameSize: 42, siteSize: 26 };

/**
 * The font stack a class of text uses on this page, read off the page so the
 * picture is set in the same faces the reader is looking at, other scripts
 * included (the serif stack carries Greek, Cyrillic, Arabic, Georgian).
 */
function stack(variable: "--font-serif" | "--font-sans" | "--font-display-serif"): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = `var(${variable})`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || "Georgia, serif";
}

/** Text with its letters spaced out, drawn one by one: canvas letter spacing is not everywhere yet. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): number {
  let at = x;
  for (const ch of text) {
    ctx.fillText(ch, at, y);
    at += ctx.measureText(ch).width + tracking;
  }
  return at - tracking - x;
}

/** The three-bar cross, as components/ui/icons/Cross.tsx draws it, at any height. */
function cross(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
  const s = height / 19; // the mark's upright runs 19 of its 24 units
  const left = x - 5.5 * s; // so the main bar's left end sits on the margin
  const top = y - 2.5 * s;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(left + x1 * s, top + y1 * s);
    ctx.lineTo(left + x2 * s, top + y2 * s);
    ctx.stroke();
  };
  ctx.lineWidth = 1.6 * s;
  ctx.lineCap = "round";
  line(12, 2.5, 12, 21.5);
  line(8.5, 6, 15.5, 6);
  line(5.5, 9.5, 18.5, 9.5);
  line(8, 14, 16, 16.5);
}

/**
 * Draw the verse onto a canvas of the card's size. Returns false, and draws
 * nothing, when the verse is too long to set whole.
 */
export async function drawVerseCard(canvas: HTMLCanvasElement, input: VerseCardInput): Promise<boolean> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = CARD.width;
  canvas.height = CARD.height;

  const serif = stack("--font-serif");
  const sans = stack("--font-sans");
  const display = stack("--font-display-serif");
  const verseFont = (size: number) => `500 ${size}px ${serif}`;
  const referenceFont = `600 ${REFERENCE.size}px ${sans}`;
  const nameFont = `400 ${FOOT.nameSize}px ${display}`;
  const siteFont = `500 ${FOOT.siteSize}px ${sans}`;

  // The faces are on the page already; this waits for the weights used here.
  try {
    await Promise.all([
      document.fonts.load(verseFont(60), input.text),
      document.fonts.load(referenceFont, input.reference),
      document.fonts.load(nameFont, "Purify"),
      document.fonts.load(siteFont, "purifyapp.net"),
    ]);
  } catch {
    // A face that will not load falls back down its stack.
  }

  const measure: Measure = (text, size) => {
    ctx.font = verseFont(size);
    return ctx.measureText(text).width;
  };
  const fit = fitVerse(input.text, measure, VERSE_BOX);
  if (!fit) return false;

  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // The mark.
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.72;
  cross(ctx, CARD.margin, CARD.top, MARK.height);
  ctx.globalAlpha = 1;

  // The verse and its reference are one group, centred in the space between
  // the mark and the foot, so a short verse does not hang from the top.
  const referenceBlock = REFERENCE.gapAbove + REFERENCE.rule + REFERENCE.gapBelowRule + REFERENCE.size;
  const regionTop = CARD.top + MARK.height + MARK.gapBelow;
  const regionBottom = regionTop + VERSE_BOX.height + referenceBlock;
  const groupHeight = fit.height + referenceBlock;
  let y = regionTop + Math.max(0, (regionBottom - regionTop - groupHeight) / 2);

  ctx.fillStyle = INK;
  ctx.font = verseFont(fit.size);
  const ascent = Math.round(fit.size * 0.8);
  for (const [i, line] of fit.lines.entries()) {
    ctx.fillText(line, CARD.margin, y + ascent + i * fit.lineHeight);
  }
  y += fit.height + REFERENCE.gapAbove;

  ctx.globalAlpha = 0.4;
  ctx.fillRect(CARD.margin, y, REFERENCE.ruleWidth, REFERENCE.rule);
  ctx.globalAlpha = 0.82;
  y += REFERENCE.rule + REFERENCE.gapBelowRule + REFERENCE.size * 0.74;
  ctx.font = referenceFont;
  spaced(ctx, input.reference.toUpperCase(), CARD.margin, y, REFERENCE.tracking);

  // The foot: the name on the left, where to find it on the right.
  const footY = CARD.height - CARD.bottom;
  ctx.globalAlpha = 0.94;
  ctx.font = nameFont;
  ctx.fillText("Purify", CARD.margin, footY);
  ctx.globalAlpha = 0.46;
  ctx.font = siteFont;
  ctx.textAlign = "right";
  ctx.fillText("purifyapp.net", CARD.width - CARD.margin, footY);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
  return true;
}

/** The verse as a PNG, or null when it cannot be made (too long, or no canvas here). */
export async function renderVerseCard(input: VerseCardInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  if (!(await drawVerseCard(canvas, input))) return null;
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
