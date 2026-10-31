"use client";

// Words as a picture: the drawing.
//
// A reader who wants to send a verse to someone could copy its words or its
// link. Neither is what people send each other: they send pictures. This
// draws one on the phone, from the words already on the screen, with no
// server and no network: the icons and the cross are files in the bundle,
// and a reader's own photo is read where it is and drawn there, never sent
// anywhere.
//
// Where each part goes is ./verseCard.ts (planPicture), in the look, the
// words and the size the reader chose (components/share/PictureSheet.tsx).
// paintPicture is plain canvas calls, so a test can watch them on a stand-in
// context; the rest is what only a page has: its fonts, its pictures and a
// canvas to paint on.

import {
  CROSS_ASPECT,
  DEFAULT_STYLE,
  FLOWER_PLATES,
  FONTS,
  FOOT,
  GROUND,
  INK,
  LIGHT_GROUND,
  QUOTE_STYLE,
  YOURS,
  planPicture,
  planQuote,
  type Align,
  type FlowerPlate,
  type Font,
  type Look,
  type Measure,
  type Measures,
  type PicturePlan,
  type PictureStyle,
  type PictureWords,
  type QuoteFace,
  type QuoteFont,
  type QuoteLook,
  type QuoteMeasure,
  type QuotePicture,
  type QuotePlan,
  type QuoteRun,
  type QuoteSubject,
  type Tone,
} from "./verseCard";

/** The name the callers have always used: any words with a line under them. */
export type VerseCardInput = PictureWords;

/** A picture ready to draw, with its own size. */
export type LoadedImage = { source: CanvasImageSource; width: number; height: number };

/** The two families the picture is set in, as this page's own stacks. */
export type Faces = { serif: string; sans: string };

/** The look's picture (an icon, a photo) and the cross, when the plan has them. */
export type PictureImages = { look: LoadedImage | null; mark: LoadedImage | null };

/** The mark over the words: the app's own three-bar cross, a file in the bundle. */
export const MARK_SRC = "/purify-cross-mark.png";

/** The picture file of a look that has one. */
export function lookSrc(look: Look): string | null {
  return look.kind === "icon" || look.kind === "picture" ? look.src || null : null;
}

/** Fill a box with a picture, cropped around its focus, never stretched. */
function cover(ctx: CanvasRenderingContext2D, image: LoadedImage, x: number, y: number, w: number, h: number, focus: readonly [number, number]): void {
  if (!image.width || !image.height) return;
  const s = Math.max(w / image.width, h / image.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(image.source, (image.width - sw) * focus[0], (image.height - sh) * focus[1], sw, sh, x, y, w, h);
}

/** The light of round 10's card: a soft white from the top centre, 60% wide and 45% deep. */
function paintLight(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rx = 0.6 * w;
  ctx.save();
  ctx.translate(w / 2, 0);
  ctx.scale(1, (0.45 * h) / rx);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  glow.addColorStop(0.7, "rgba(255, 255, 255, 0)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-rx, 0, 2 * rx, rx);
  ctx.restore();
}

/** The horizon's stars, where the design put them, on a picture 330 wide. */
const STARS = Array.from({ length: 30 }, (_, i) => ({
  x: ((i * 97) % 330) / 330,
  y: ((i * 53) % 411) / 587,
  r: i % 7 === 0 ? 1.2 : 0.6,
  a: 0.2 + (i % 5) * 0.1,
}));

/** The horizon: stars, then a world's edge low in the picture with the light along it. */
function paintHorizon(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
  const unit = w / 330;
  // Never thinner than half a pixel of what is drawn, so a small tile keeps its stars.
  const least = 0.5 / scale;
  ctx.fillStyle = "#ffffff";
  for (const star of STARS) {
    ctx.globalAlpha = star.a;
    ctx.beginPath();
    ctx.arc(star.x * w, star.y * h, Math.max(star.r * unit, least), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const edge = 0.84 * h;
  // The light along the edge: an ellipse 72% wide, softened by a width of w/28.
  const soft = w / 28;
  const reach = 0.36 * w + 2 * soft;
  ctx.save();
  ctx.translate(w / 2, edge);
  ctx.scale(1, (0.04 * h + 2 * soft) / reach);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  glow.addColorStop(0.6, "rgba(255, 255, 255, 0.1)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, reach, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The world, and its edge lit brightest in the middle.
  const radius = 1.6 * w;
  const cy = edge + radius;
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.arc(w / 2, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  const line = ctx.createLinearGradient(0, 0, w, 0);
  line.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  line.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  line.addColorStop(1, "rgba(255, 255, 255, 0.12)");
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.2 * unit, least);
  ctx.beginPath();
  ctx.arc(w / 2, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * A look's ground. An icon fills the box down to `icon.bottom` and fades
 * into the ground from `icon.fadeFrom` (in a tile it fills the tile). A
 * picture fills the whole box under a shade dark enough for the words.
 */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  look: Look,
  w: number,
  h: number,
  image: LoadedImage | null,
  scale: number,
  { icon = null, tile = false }: { icon?: { bottom: number; fadeFrom: number } | null; tile?: boolean } = {},
): void {
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.kind === "light" ? LIGHT_GROUND : GROUND;
  ctx.fillRect(0, 0, w, h);
  if (look.kind === "light") paintLight(ctx, w, h);
  else if (look.kind === "horizon") paintHorizon(ctx, w, h, scale);
  else if (look.kind === "icon") {
    const bottom = icon?.bottom ?? h;
    if (image) cover(ctx, image, 0, 0, w, bottom, look.focus);
    if (icon) {
      const fade = ctx.createLinearGradient(0, icon.fadeFrom, 0, bottom);
      fade.addColorStop(0, "rgba(10, 10, 10, 0)");
      fade.addColorStop(1, GROUND);
      ctx.fillStyle = fade;
      ctx.fillRect(0, icon.fadeFrom, w, bottom - icon.fadeFrom + 1);
    }
  } else if (look.kind === "picture") {
    if (image) cover(ctx, image, 0, 0, w, h, look.focus);
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, `rgba(10, 10, 10, ${tile ? 0.2 : 0.55})`);
    shade.addColorStop(0.45, `rgba(10, 10, 10, ${tile ? 0.3 : 0.78})`);
    shade.addColorStop(1, `rgba(10, 10, 10, ${tile ? 0.4 : 0.9})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * The three-bar cross as lines, as components/ui/icons/Cross.tsx draws it,
 * should its file not load: the main bar starts at `left`, the upright's top
 * at `top`.
 */
function strokeCross(ctx: CanvasRenderingContext2D, left: number, top: number, height: number, color: string = INK): void {
  const s = height / 19;
  const x0 = left - 5.5 * s;
  const y0 = top - 2.5 * s;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x0 + x1 * s, y0 + y1 * s);
    ctx.lineTo(x0 + x2 * s, y0 + y2 * s);
    ctx.stroke();
  };
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6 * s;
  ctx.lineCap = "round";
  line(12, 2.5, 12, 21.5);
  line(8.5, 6, 15.5, 6);
  line(5.5, 9.5, 18.5, 9.5);
  line(8, 14, 16, 16.5);
}

/**
 * A line in spaced letters (the reference, the foot), drawn one letter at a
 * time: canvas letter spacing is not everywhere yet. A script whose letters
 * join (Arabic) would come apart that way, so it is set whole.
 */
function spacedLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: Align): void {
  if (!tracking || /[؀-ۿݐ-ݿ]/.test(text)) {
    ctx.textAlign = align === "left" ? "left" : "center";
    ctx.fillText(text, x, y);
    return;
  }
  ctx.textAlign = "left";
  const letters = [...text];
  const total = letters.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + tracking * (letters.length - 1);
  let at = align === "left" ? x : x - total / 2;
  for (const ch of letters) {
    ctx.fillText(ch, at, y);
    at += ctx.measureText(ch).width + tracking;
  }
}

/**
 * Paint a plan on a context `scale` times the picture's size: the ground,
 * the cross, the words, the rule, the reference and its note, and the name
 * at the foot.
 */
export function paintPicture(ctx: CanvasRenderingContext2D, plan: PicturePlan, faces: Faces, images: PictureImages, scale = 1): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintGround(ctx, plan.look, plan.width, plan.height, images.look, scale, { icon: plan.icon });
  ctx.textBaseline = "alphabetic";

  // The cross, lit with a soft white.
  if (plan.mark) {
    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
    // A shadow is measured on the canvas, not in the picture's units.
    ctx.shadowBlur = 18 * scale;
    const h = plan.mark.height;
    if (images.mark) {
      const w = (h * images.mark.width) / images.mark.height;
      ctx.drawImage(images.mark.source, plan.align === "left" ? plan.x : plan.x - w / 2, plan.mark.top, w, h);
    } else {
      strokeCross(ctx, plan.align === "left" ? plan.x : plan.x - (6.5 / 19) * h, plan.mark.top, h);
    }
    ctx.restore();
  }

  // The words, each line centred in its line's height, as a page sets it.
  const face = FONTS[plan.words.font];
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.font = `${face.weight} ${plan.words.size}px ${face.face === "serif" ? faces.serif : faces.sans}`;
  ctx.textAlign = plan.align === "left" ? "left" : "center";
  const { lines, lineHeight, size, top } = plan.words;
  lines.forEach((line, i) => ctx.fillText(line, plan.x, top + i * lineHeight + lineHeight / 2 + size * 0.35));

  // A short rule, then the reference in spaced capitals, then its note.
  if (plan.rule) {
    ctx.globalAlpha = 0.7;
    ctx.fillRect(plan.align === "left" ? plan.x : plan.x - plan.rule.width / 2, plan.rule.top, plan.rule.width, plan.rule.height);
  }
  const reference = plan.reference;
  if (reference) {
    ctx.globalAlpha = 0.75;
    ctx.font = `700 ${reference.size}px ${faces.sans}`;
    reference.lines.forEach((line, i) =>
      spacedLine(ctx, line, plan.x, reference.baseline + i * reference.lineHeight, reference.size * reference.tracking, plan.align),
    );
  }
  const note = plan.note;
  if (note) {
    ctx.globalAlpha = 0.55;
    ctx.font = `500 ${note.size}px ${faces.sans}`;
    ctx.textAlign = plan.align === "left" ? "left" : "center";
    note.lines.forEach((line, i) => ctx.fillText(line, plan.x, note.baseline + i * note.lineHeight));
  }

  // The name at the foot, always in the middle.
  ctx.globalAlpha = 0.6;
  ctx.font = `600 ${plan.foot.size}px ${faces.sans}`;
  spacedLine(ctx, plan.foot.text, plan.width / 2, plan.foot.baseline, plan.foot.size * plan.foot.tracking, "center");
  ctx.globalAlpha = 1;
}

/**
 * A look's tile in the sheet, `size` across: its ground with two short
 * lines for the words; an icon whole; a photo under a light shade.
 */
export function paintTile(ctx: CanvasRenderingContext2D, look: Look, size: number, image: LoadedImage | null, scale: number): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (look.kind === "icon") {
    ctx.globalAlpha = 1;
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, size, size);
    if (image) cover(ctx, image, 0, 0, size, size, look.focus);
    return;
  }
  paintGround(ctx, look, size, size, image, scale, { tile: true });
  ctx.fillStyle = INK;
  const bar = Math.max(size * 0.04, 1 / scale);
  ctx.globalAlpha = 0.7;
  ctx.fillRect(size * 0.26, size * 0.44, size * 0.48, bar);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(size * 0.32, size * 0.44 + bar + size * 0.06, size * 0.36, bar);
  ctx.globalAlpha = 1;
}

/**
 * The font stack a class of text uses on this page, read off the page so the
 * picture is set in the same faces the reader is looking at, other scripts
 * included (the serif stack carries Greek, Cyrillic, Arabic, Georgian).
 */
function stack(variable: "--font-serif" | "--font-sans"): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = `var(${variable})`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || (variable === "--font-serif" ? "Georgia, serif" : "system-ui, sans-serif");
}

/** Widths as this page sets each part, measured on a canvas of its own. */
function measuresOn(ctx: CanvasRenderingContext2D, faces: Faces, font: Font): Measures {
  const face = FONTS[font] ?? FONTS.serif;
  const family = face.face === "serif" ? faces.serif : faces.sans;
  let set = "";
  const setFont = (css: string) => {
    if (css !== set) ctx.font = css;
    set = css;
  };
  const words: Measure = (text, size) => {
    setFont(`${face.weight} ${size}px ${family}`);
    return ctx.measureText(text).width;
  };
  // Letter by letter, as the reference is drawn.
  const reference: Measure = (text, size) => {
    setFont(`700 ${size}px ${faces.sans}`);
    let width = 0;
    for (const ch of text) width += ctx.measureText(ch).width;
    return width;
  };
  const note: Measure = (text, size) => {
    setFont(`500 ${size}px ${faces.sans}`);
    return ctx.measureText(text).width;
  };
  return { words, reference, note };
}

const pictures = new Map<string, Promise<LoadedImage | null>>();

/** A picture from the bundle, decoded once and kept for the next drawing. Null if it will not load. */
export function loadPicture(src: string): Promise<LoadedImage | null> {
  let loading = pictures.get(src);
  if (!loading) {
    loading = new Promise<LoadedImage | null>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      // A picture the apps ask of the website (a Father's portrait under
      // /covers/, lib/media/streamed.ts) is another origin: asked for
      // without credentials, which the website allows the apps, so the
      // canvas it is drawn on can still be saved.
      if (/^https?:\/\//.test(src)) img.crossOrigin = "anonymous";
      img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => {
        pictures.delete(src);
        resolve(null);
      };
      img.src = src;
    });
    pictures.set(src, loading);
  }
  return loading;
}

/**
 * The reader's own photo, read on the phone (turned the way the camera held
 * it). It is never sent anywhere: it is drawn here, into the picture.
 */
export async function readPhoto(file: Blob): Promise<LoadedImage | null> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
  } catch {
    // A format the bitmap reader will not take: the image element may.
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  } finally {
    // A decoded image keeps its pixels; the address is not needed again.
    URL.revokeObjectURL(url);
  }
}

/** A picture planned, its fonts loaded and its pictures decoded: ready to paint at any scale. */
export type PreparedPicture = { plan: PicturePlan; faces: Faces; images: PictureImages };

/**
 * Get a picture ready: wait for the faces it uses, plan it, and load the
 * look's picture and the cross. Null when the words do not fit this look and
 * size whole, or there is no page to draw on.
 */
export async function preparePicture(
  input: PictureWords,
  style: PictureStyle = DEFAULT_STYLE,
  { photo = null }: { photo?: LoadedImage | null } = {},
): Promise<PreparedPicture | null> {
  if (typeof document === "undefined") return null;
  const faces: Faces = { serif: stack("--font-serif"), sans: stack("--font-sans") };
  const face = FONTS[style.font] ?? FONTS.serif;
  // The faces are on the page already; this waits for the weights used here.
  try {
    await Promise.all([
      document.fonts.load(`${face.weight} 60px ${face.face === "serif" ? faces.serif : faces.sans}`, input.text.slice(0, 160) || "A"),
      document.fonts.load(`700 36px ${faces.sans}`, input.reference || "A"),
      document.fonts.load(`600 34px ${faces.sans}`, FOOT.text),
      ...(input.note ? [document.fonts.load(`500 25px ${faces.sans}`, input.note)] : []),
    ]);
  } catch {
    // A face that will not load falls back down its stack.
  }
  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) return null;
  const plan = planPicture(input, style, measuresOn(scratch, faces, style.font));
  if (!plan) return null;
  const src = lookSrc(plan.look);
  const [look, mark] = await Promise.all([
    plan.look.id === YOURS.id ? Promise.resolve(photo) : src ? loadPicture(src) : Promise.resolve(null),
    plan.mark ? loadPicture(MARK_SRC) : Promise.resolve(null),
  ]);
  // The reader's own look with no photo is a picture of nothing.
  if (plan.look.id === YOURS.id && !look) return null;
  return { plan, faces, images: { look, mark } };
}

/** Paint a prepared picture on a canvas, `scale` times its size (the sheet's preview is smaller). */
export function paintPrepared(canvas: HTMLCanvasElement, prepared: PreparedPicture, scale = 1): boolean {
  canvas.width = Math.round(prepared.plan.width * scale);
  canvas.height = Math.round(prepared.plan.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  paintPicture(ctx, prepared.plan, prepared.faces, prepared.images, scale);
  return true;
}

/**
 * Draw the words onto a canvas in a style. Returns false, and draws nothing,
 * when they are too long to set whole in it.
 */
export async function drawVerseCard(
  canvas: HTMLCanvasElement,
  input: VerseCardInput,
  style: PictureStyle = DEFAULT_STYLE,
  options: { photo?: LoadedImage | null; scale?: number } = {},
): Promise<boolean> {
  const prepared = await preparePicture(input, style, options);
  return prepared ? paintPrepared(canvas, prepared, options.scale ?? 1) : false;
}

/** The words as a PNG, or null when it cannot be made (too long, or no canvas here). */
export async function renderVerseCard(
  input: VerseCardInput,
  style: PictureStyle = DEFAULT_STYLE,
  options: { photo?: LoadedImage | null } = {},
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  if (!(await drawVerseCard(canvas, input, style, options))) return null;
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

// ---------------------------------------------------------------------------
// A quote's picture: a saint's words, a council's, a saying (round 3, r3-11
// and r3-11b; the plan is ./verseCard.ts, planQuote). Painted with the calls
// every phone's web view has: drawImage, gradients, clips, blend modes
// (multiply, lighter, saturation, color, soft-light), destination-in masks
// and shadowBlur. No canvas filter anywhere, since a filter is not in every
// web view: his silver is a saturation blend, a look's cast a colour blend,
// every fade a mask. The fire and the planet's soft light are shapes whose
// blur alone is drawn: the shape is set far above the picture and its shadow
// is cast down into it.

/** A canvas of its own to draw a part on, at the picture's scale; and what tests stand in for. */
export type PaintEnv = {
  layer: (w: number, h: number, scale: number) => { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null;
};

const BROWSER: PaintEnv = {
  layer(w, h, scale) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    return { canvas, ctx };
  },
};

/** His face once it has loaded, the flowers of the look, and the cross. */
export type QuoteImages = { face: LoadedImage | null; mark: LoadedImage | null; flowers: Partial<Record<FlowerPlate, LoadedImage | null>> };

const rgba = (c: readonly [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/** A soft light drawn with a shadow: measured on the canvas, so it is scaled with it. */
function glowOn(ctx: CanvasRenderingContext2D, color: string, px: number, scale: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = px * scale;
}

/** The same numbers every time: a ground's stars and embers are where the sheet drew them. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: readonly [number, string][], op?: GlobalCompositeOperation): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.save();
  if (op) ctx.globalCompositeOperation = op;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

function vertical(ctx: CanvasRenderingContext2D, w: number, h: number, stops: readonly [number, string][]): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, inner: number): void {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * inner, w / 2, h / 2, r);
  g.addColorStop(0, "rgba(0, 0, 0, 0)");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A paper: its colour from top to foot, a light from above, and the edges a breath darker. */
function paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number, paper: NonNullable<QuoteLook["paper"]>): void {
  vertical(ctx, w, h, [
    [0, paper.top],
    [1, paper.bottom],
  ]);
  radial(ctx, w / 2, -h * 0.12, h * 0.95, [
    [0, `rgba(255, 255, 255, ${paper.light})`],
    [1, "rgba(255, 255, 255, 0)"],
  ]);
  vignette(ctx, w, h, "rgba(70, 60, 52, 0.12)", 0.5);
  if (paper.bloom) {
    // Blush: a rose bloom low on the right, a white one high on the left.
    radial(ctx, w * 0.95, h * 0.95, w * 0.8, [
      [0, "rgba(236, 160, 184, 0.32)"],
      [1, "rgba(236, 160, 184, 0)"],
    ]);
    radial(ctx, w * 0.05, h * 0.1, w * 0.6, [
      [0, "rgba(255, 255, 255, 0.4)"],
      [1, "rgba(255, 255, 255, 0)"],
    ]);
  }
}

/** The sky before sunrise: blue going to lilac, rose and peach, the light low and white, a few soft clouds. */
function paintDawn(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  vertical(ctx, w, h, [
    [0, "#7d95c1"],
    [0.36, "#b6b1d3"],
    [0.6, "#e6c3cf"],
    [0.82, "#f5d4ca"],
    [1, "#fbe3d6"],
  ]);
  radial(ctx, w * 0.5, h, w * 0.8, [
    [0, "rgba(255, 253, 248, 0.95)"],
    [0.3, "rgba(255, 240, 234, 0.55)"],
    [1, "rgba(255, 236, 228, 0)"],
  ]);
  const rnd = seeded(7);
  for (let i = 0; i < 6; i++) {
    const y = h * (0.25 + rnd() * 0.45);
    const x = w * rnd();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.13);
    const r = w * (0.25 + rnd() * 0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.12 + rnd() * 0.12})`);
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
}

/**
 * Purify's horizon (the brand's backdrop, purify-ads BRAND.md): a planet's lit
 * edge at night, brightest at its crest, faint stars above it. `crest` is
 * where the edge stands, as a share of the height.
 */
function paintSpace(ctx: CanvasRenderingContext2D, w: number, h: number, crest: number, scale: number): void {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const R = w * 0.86;
  const cx = w / 2;
  const cy = h * crest + R;
  const edgeY = (x: number) => cy - Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx)));
  const rnd = seeded(11);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 0.6 + rnd() * 1.5;
    const a = 0.18 + rnd() * 0.55;
    if (y > edgeY(x) - 30) continue;
    ctx.save();
    if (i % 11 === 0) glowOn(ctx, `rgba(255, 255, 255, ${a})`, 7, scale);
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The haze over the edge: a ring set far above the picture, its blur cast down onto the edge.
  const off = h * 3;
  const blurRing = (lineWidth: number, color: string, blur: number) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * scale;
    ctx.shadowOffsetY = off * scale;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy - off, R, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  blurRing(70, "rgba(255, 255, 255, 0.2)", 80);
  ctx.save();
  ctx.translate(cx, h * crest + 8);
  ctx.scale(1, 0.2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.36);
  g.addColorStop(0, "rgba(255, 255, 255, 0.26)");
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(-w * 0.36, -w * 0.36, w * 0.72, w * 0.72);
  ctx.restore();
  blurRing(8, "rgba(217, 217, 217, 0.55)", 14);
  const body = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
  body.addColorStop(0, "#000000");
  body.addColorStop(1, "#0e0e0e");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const edge = ctx.createLinearGradient(cx - w * 0.52, 0, cx + w * 0.52, 0);
  edge.addColorStop(0, "rgba(166, 166, 166, 0.2)");
  edge.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  edge.addColorStop(1, "rgba(166, 166, 166, 0.2)");
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  vignette(ctx, w, h, "rgba(0, 0, 0, 0.6)", 0.58);
}

/**
 * Fire: the flame's own light from below. The flames are soft shapes whose
 * blur alone is drawn, in three layers of light added together, and embers
 * rise through the dark; the top is kept dark for the words.
 */
function paintFire(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
  ctx.fillStyle = "#080403";
  ctx.fillRect(0, 0, w, h);
  radial(ctx, w * 0.5, h * 1.1, h * 0.9, [
    [0, "rgba(255, 130, 45, 0.55)"],
    [0.32, "rgba(210, 60, 20, 0.34)"],
    [0.65, "rgba(110, 22, 8, 0.12)"],
    [1, "rgba(0, 0, 0, 0)"],
  ]);
  const rnd = seeded(29);
  const off = h * 3;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const layers = [
    { n: 8, hMin: 0.13, hMax: 0.22, wMin: 0.07, wMax: 0.11, color: "rgba(205, 55, 18, 0.75)", blur: 46 },
    { n: 11, hMin: 0.08, hMax: 0.15, wMin: 0.045, wMax: 0.08, color: "rgba(255, 115, 30, 0.8)", blur: 30 },
    { n: 10, hMin: 0.04, hMax: 0.08, wMin: 0.03, wMax: 0.05, color: "rgba(255, 205, 130, 0.85)", blur: 18 },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.n; i++) {
      const x = (i + 0.5) * (w / layer.n) + (rnd() - 0.5) * (w / layer.n) * 0.8;
      const fh = h * (layer.hMin + rnd() * (layer.hMax - layer.hMin));
      const fw = w * (layer.wMin + rnd() * (layer.wMax - layer.wMin));
      const lean = (rnd() - 0.5) * fw * 1.6;
      const y0 = h + 10 - off;
      ctx.save();
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = layer.blur * scale;
      ctx.shadowOffsetY = off * scale;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(x - fw, y0);
      ctx.bezierCurveTo(x - fw, y0 - fh * 0.45, x + lean - fw * 0.25, y0 - fh * 0.72, x + lean, y0 - fh);
      ctx.bezierCurveTo(x + lean + fw * 0.25, y0 - fh * 0.72, x + fw, y0 - fh * 0.45, x + fw, y0);
      ctx.fill();
      ctx.restore();
    }
  }
  for (let i = 0; i < 150; i++) {
    const y = h - Math.pow(rnd(), 1.6) * h * 0.98;
    const x = rnd() * w;
    const r = 0.9 + rnd() * 2.6;
    const a = 0.22 + 0.7 * (y / h) * rnd();
    const color = `rgba(255, ${120 + Math.round(rnd() * 100)}, ${30 + Math.round(rnd() * 50)}, ${a})`;
    glowOn(ctx, color, 6 + rnd() * 12, scale);
    ctx.fillStyle = color;
    if (i % 6 === 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = r * 0.9;
      ctx.lineCap = "round";
      const len = 8 + rnd() * 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * len * 0.5, y - len);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  vertical(ctx, w, h * 0.45, [
    [0, "rgba(0, 0, 0, 0.6)"],
    [1, "rgba(0, 0, 0, 0)"],
  ]);
}

/** A look's ground, under everything. The planet's edge stands a little lower on the Page. */
export function paintQuoteGround(ctx: CanvasRenderingContext2D, look: QuoteLook, w: number, h: number, layout: QuotePlan["layout"], scale: number): void {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (look.ground === "space") paintSpace(ctx, w, h, layout === "page" ? 0.86 : 0.83, scale);
  else if (look.ground === "fire") paintFire(ctx, w, h, scale);
  else if (look.ground === "dawn") paintDawn(ctx, w, h);
  else if (look.ground === "paper" && look.paper) paintPaper(ctx, w, h, look.paper);
  else {
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Fill a box with a picture, cut so its point `f` sits at `t` where it can. */
function drawAt(ctx: CanvasRenderingContext2D, image: LoadedImage, box: { x: number; y: number; w: number; h: number }, f: readonly [number, number], t: readonly [number, number]): void {
  if (!image.width || !image.height) return;
  const k = Math.max(box.w / image.width, box.h / image.height);
  const sw = box.w / k;
  const sh = box.h / k;
  const sx = Math.max(0, Math.min(image.width - sw, f[0] * image.width - (t[0] - box.x) / k));
  const sy = Math.max(0, Math.min(image.height - sh, f[1] * image.height - (t[1] - box.y) / k));
  ctx.drawImage(image.source, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
}

/** A picture's tone with no filter: silver by a saturation blend, a cast by a colour blend or a soft light. */
function tone(ctx: CanvasRenderingContext2D, w: number, h: number, t: Tone | undefined): void {
  if (!t) return;
  if (t.silver) {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
  }
  if (t.grade) {
    ctx.globalCompositeOperation = t.blend ?? "color";
    ctx.globalAlpha = t.gradeAlpha ?? 0.3;
    ctx.fillStyle = t.grade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = "source-over";
}

/** Keep a layer only where the gradient is opaque: a fade that works into any ground, light or dark. */
function mask(ctx: CanvasRenderingContext2D, g: CanvasGradient, w: number, h: number): void {
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

/** The Portrait's column: his face at `faceX`, the icon's own light on it, toned by the look, fading toward the words, the top and the foot. */
function portraitLayer(env: PaintEnv, image: LoadedImage, plan: QuotePlan, point: readonly [number, number], scale: number): CanvasImageSource | null {
  const p = plan.portrait;
  if (!p) return null;
  const { width: w } = p;
  const h = plan.height;
  const layer = env.layer(w, h, scale);
  if (!layer) return null;
  const x = layer.ctx;
  const look = plan.look;
  drawAt(x, image, { x: 0, y: 0, w, h }, point, [p.faceX, h * point[1]]);
  const fy = h * point[1];
  if (look.dark) {
    // The rest of him going quiet round his face.
    const vg = x.createRadialGradient(p.faceX, fy, w * 0.16, p.faceX, fy, w * 1.3);
    vg.addColorStop(0, "rgba(0, 0, 0, 0)");
    vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    x.fillStyle = vg;
    x.fillRect(0, 0, w, h);
  }
  x.save();
  x.globalCompositeOperation = "soft-light";
  const light = x.createRadialGradient(p.faceX, fy, 0, p.faceX, fy, w * 0.5);
  light.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  light.addColorStop(1, "rgba(255, 255, 255, 0)");
  x.fillStyle = light;
  x.fillRect(0, 0, w, h);
  x.restore();
  tone(x, w, h, look.portrait);
  // Into the ground toward the words, and at the top and the foot: never a word on him.
  const inner = p.side === "left" ? w : 0;
  const reach = w * 0.62;
  const across = p.side === "left" ? x.createLinearGradient(inner, 0, inner - reach, 0) : x.createLinearGradient(inner, 0, inner + reach, 0);
  across.addColorStop(0, "rgba(0, 0, 0, 0)");
  across.addColorStop(0.14, "rgba(0, 0, 0, 0)");
  across.addColorStop(0.5, "rgba(0, 0, 0, 0.42)");
  across.addColorStop(1, "rgba(0, 0, 0, 1)");
  mask(x, across, w, h);
  const down = x.createLinearGradient(0, 0, 0, h);
  down.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  down.addColorStop(0.15, "rgba(0, 0, 0, 1)");
  down.addColorStop(h / plan.width > 1.5 ? 0.6 : 0.56, "rgba(0, 0, 0, 1)");
  down.addColorStop(0.86, "rgba(0, 0, 0, 0.12)");
  down.addColorStop(1, "rgba(0, 0, 0, 0)");
  mask(x, down, w, h);
  return layer.canvas;
}

/** The faint grain over the whole picture: noise, 240 square, laid in by a soft light. */
let NOISE: CanvasImageSource | null = null;
function grain(ctx: CanvasRenderingContext2D, env: PaintEnv, w: number, h: number, amount: number): void {
  if (!amount) return;
  if (!NOISE) {
    const layer = env.layer(240, 240, 1);
    if (!layer || typeof layer.ctx.createImageData !== "function") return;
    const data = layer.ctx.createImageData(240, 240);
    if (!data?.data) return;
    let s = 11;
    for (let i = 0; i < data.data.length; i += 4) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const v = s >>> 24;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    layer.ctx.putImageData(data, 0, 0);
    NOISE = layer.canvas;
  }
  const pattern = ctx.createPattern(NOISE, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The app's cross in a look's own ink, made once for each ink. */
const tinted = new Map<string, CanvasImageSource>();
function crossIn(env: PaintEnv, mark: LoadedImage, color: string): CanvasImageSource | null {
  const key = `${mark.width}x${mark.height}:${color}`;
  const kept = tinted.get(key);
  if (kept) return kept;
  const layer = env.layer(mark.width, mark.height, 1);
  if (!layer) return null;
  layer.ctx.drawImage(mark.source, 0, 0, mark.width, mark.height);
  layer.ctx.globalCompositeOperation = "source-in";
  layer.ctx.fillStyle = color;
  layer.ctx.fillRect(0, 0, mark.width, mark.height);
  tinted.set(key, layer.canvas);
  return layer.canvas;
}

/** The cross, `h` tall, its middle at `cx`, in an ink and lit, or drawn as lines should its file not load. */
function drawCross(ctx: CanvasRenderingContext2D, env: PaintEnv, mark: LoadedImage | null, cx: number, top: number, h: number, color: string, glow: string | null | undefined, px: number, scale: number): void {
  const w = h * CROSS_ASPECT;
  ctx.save();
  if (glow) glowOn(ctx, glow, px, scale);
  const source = mark ? crossIn(env, mark, color) : null;
  if (source) ctx.drawImage(source, cx - w / 2, top, w, h);
  else strokeCross(ctx, cx - (6.5 / 19) * h, top, h, color);
  ctx.restore();
}

/** A face of type as a canvas font. */
function cssFont(font: QuoteFont, faces: Faces): string {
  return `${font.italic ? "italic " : ""}${font.weight} ${Math.round(font.size * 10) / 10}px ${font.family === "serif" ? faces.serif : faces.sans}`;
}

/** A run of type from its left edge: letter by letter when it is spaced. */
function setRun(ctx: CanvasRenderingContext2D, run: QuoteRun): void {
  ctx.textAlign = "left";
  if (!run.track) {
    ctx.fillText(run.text, run.x, run.y);
    return;
  }
  let at = run.x;
  for (const ch of run.text) {
    ctx.fillText(ch, at, run.y);
    at += ctx.measureText(ch).width + run.track;
  }
}

/** Each run's ink, by what it is. */
function inkFor(plan: QuotePlan, run: QuoteRun): string {
  const look = plan.look;
  switch (run.role) {
    case "words":
      return rgba(look.ink, plan.layout === "page" ? Math.min(1, look.body + 0.02) : look.body);
    case "lit":
      return look.lit;
    case "head":
      return rgba(look.ink, plan.layout === "page" ? 0.58 : 0.62);
    case "name":
      return rgba(look.ink, plan.layout === "portrait" ? 0.96 : 0.95);
    case "byline":
      return rgba(look.ink, 0.6);
    case "source":
      return rgba(look.ink, 0.46);
    case "mark":
      return rgba(look.ink, 0.42);
    case "initial":
      return look.dark ? "#ffffff" : rgba(look.ink, 1);
  }
}

/** Purify App at the foot: in the frame's gap on the Portrait, else where every picture is signed; lit from behind over the fire. */
function paintFoot(ctx: CanvasRenderingContext2D, plan: QuotePlan, faces: Faces, scale: number): void {
  const { foot, look } = plan;
  const run: QuoteRun = { text: foot.text, x: foot.x, y: foot.y, font: { family: "sans", weight: 600, size: foot.size }, track: foot.track, role: "byline" };
  ctx.save();
  ctx.font = cssFont(run.font, faces);
  if (look.footGlow) {
    glowOn(ctx, look.footGlow, 26, scale);
    ctx.fillStyle = rgba(look.ink, 0.9);
    setRun(ctx, run);
    glowOn(ctx, look.footGlow, 10, scale);
  }
  ctx.fillStyle = rgba(look.ink, look.footGlow ? (foot.framed ? 0.92 : 0.85) : foot.framed ? 0.62 : 0.6);
  setRun(ctx, run);
  ctx.restore();
}

/** The Seal: struck metal, the brand's eclipse, metal lit by embers, or wax; his face in silver at its heart, or the cross; his name round its edge from a cross at the top. */
function paintSeal(ctx: CanvasRenderingContext2D, env: PaintEnv, plan: QuotePlan, faces: Faces, images: QuoteImages, picture: QuotePicture | null, scale: number): void {
  const seal = plan.seal;
  if (!seal) return;
  const { cx, cy, r: R } = seal;
  const look = plan.look;
  const kind = look.seal.kind;
  const ink = (a: number) => (kind === "wax" ? `rgba(255, 250, 246, ${a})` : `rgba(244, 244, 242, ${a})`);
  ctx.save();
  if (kind === "eclipse") {
    // Purify's eclipse: a dark disc ringed by its own white light.
    const off = 4000;
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    ctx.shadowBlur = R * 0.5 * scale;
    ctx.shadowOffsetY = off * scale;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = R * 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy - off, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#020202";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    const rim = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    rim.addColorStop(0, "rgba(255, 255, 255, 1)");
    rim.addColorStop(0.55, "rgba(217, 217, 217, 0.45)");
    rim.addColorStop(1, "rgba(166, 166, 166, 0.22)");
    ctx.strokeStyle = rim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "wax") {
    // Wax in the look's own colour, pressed: its rim raised, a soft shadow under it.
    ctx.shadowColor = "rgba(40, 20, 20, 0.35)";
    ctx.shadowBlur = R * 0.22 * scale;
    ctx.shadowOffsetY = R * 0.06 * scale;
    ctx.fillStyle = look.seal.wax ?? "#1e1e21";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    const sheen = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    sheen.addColorStop(0.55, "rgba(255, 255, 255, 0.04)");
    sheen.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Metal, struck: lit by the embers on Fire.
    const ember = kind === "ember";
    glowOn(ctx, ember ? "rgba(255, 120, 40, 0.55)" : "rgba(255, 255, 255, 0.22)", R * 0.45, scale);
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.05);
    body.addColorStop(0, ember ? "#3a2018" : "#2c2c30");
    body.addColorStop(0.6, ember ? "#1c0f0b" : "#18181b");
    body.addColorStop(1, ember ? "#0f0806" : "#0f0f11");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    if (ember) {
      const rim = ctx.createLinearGradient(0, cy + R, 0, cy - R);
      rim.addColorStop(0, "rgba(255, 150, 60, 0.95)");
      rim.addColorStop(0.5, "rgba(255, 110, 40, 0.35)");
      rim.addColorStop(1, "rgba(255, 110, 40, 0.1)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  const ring = (radius: number, a: number, lineWidth: number) => {
    ctx.strokeStyle = ink(a);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  };
  if (kind !== "eclipse") ring(R - 1.5, kind === "wax" ? 0.35 : 0.6, 3);
  ring(R * 0.93, 0.18, 1.5);
  ring(R * 0.705, kind === "wax" ? 0.5 : 0.42, 2.5);

  // The heart: his face struck in silver, or the cross where there is no picture of him.
  const r = R * 0.69;
  const face = images.face;
  if (face && picture) {
    const layer = env.layer(2 * r, 2 * r, scale);
    if (layer) {
      const x = layer.ctx;
      const [fx, fy, sideShare] = picture.seal ?? [picture.point[0], picture.point[1], 0.4];
      const side = Math.min(face.width, face.height, sideShare * face.width);
      const sx = Math.max(0, Math.min(face.width - side, fx * face.width - side / 2));
      const sy = Math.max(0, Math.min(face.height - side, fy * face.height - side / 2));
      x.drawImage(face.source, sx, sy, side, side, 0, 0, 2 * r, 2 * r);
      if (kind === "wax") tone(x, 2 * r, 2 * r, { silver: true, grade: look.seal.wax, gradeAlpha: 0.75 });
      else if (kind === "ember") tone(x, 2 * r, 2 * r, { grade: "rgba(255,150,80,1)", gradeAlpha: 0.35, blend: "soft-light" });
      else tone(x, 2 * r, 2 * r, { silver: true });
      const edge = x.createRadialGradient(r, r, r * 0.55, r, r, r);
      edge.addColorStop(0, "rgba(0, 0, 0, 1)");
      edge.addColorStop(1, "rgba(0, 0, 0, 0.55)");
      mask(x, edge, 2 * r, 2 * r);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      if (kind === "eclipse") ctx.globalAlpha = 0.85;
      ctx.drawImage(layer.canvas, cx - r, cy - r, 2 * r, 2 * r);
      ctx.restore();
    }
  } else {
    const color = kind === "wax" ? "rgba(255, 250, 246, 0.95)" : "#f4f4f2";
    drawCross(ctx, env, images.mark, cx, cy - r * 0.56, r * 1.12, color, kind === "wax" ? null : "rgba(255, 255, 255, 0.6)", R * 0.2, scale);
  }

  // His name round the edge, from a cross at the top, spread to fill the ring.
  const band = (R * 0.705 + R * 0.93) / 2;
  const chars = [...seal.ring];
  const crossH = (R * 0.93 - R * 0.705) * 0.62;
  const fontAt = (size: number) => cssFont({ family: "sans", weight: 700, size }, faces);
  const layout = (size: number) => {
    ctx.font = fontAt(size);
    const rad = band - size * 0.34;
    const sum = chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0);
    const span = (crossH * 0.62 + size * 1.6) / rad;
    return { rad, span, track: ((Math.PI * 2 - span) * rad - sum) / Math.max(1, chars.length) };
  };
  let size = R * 0.118;
  let spread = layout(size);
  for (let i = 0; i < 10 && spread.track < size * 0.12; i++) spread = layout((size *= 0.93));
  for (let i = 0; i < 10 && spread.track > size * 0.95 && size * 1.05 <= R * 0.135; i++) spread = layout((size *= 1.05));
  ctx.font = fontAt(size);
  ctx.fillStyle = ink(0.84);
  ctx.textAlign = "left";
  let a = -Math.PI / 2 + spread.span / 2 + spread.track / 2 / spread.rad;
  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    const mid = a + w / 2 / spread.rad;
    ctx.save();
    ctx.translate(cx + spread.rad * Math.cos(mid), cy + spread.rad * Math.sin(mid));
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillText(ch, -w / 2, 0);
    ctx.restore();
    a += (w + spread.track) / spread.rad;
  }
  drawCross(ctx, env, images.mark, cx, cy - band - crossH / 2, crossH, kind === "wax" ? "rgba(255, 250, 246, 0.95)" : "#f4f4f2", null, 0, scale);
}

/**
 * Paint a quote's plan on a context `scale` times the picture's size: the
 * ground, his portrait, the flowers, the grain, the frame, the plate, the
 * cross, the seal, the words with the one lit, and the name at the foot.
 */
export function paintQuote(
  ctx: CanvasRenderingContext2D,
  plan: QuotePlan,
  faces: Faces,
  images: QuoteImages,
  picture: QuotePicture | null,
  scale = 1,
  env: PaintEnv = BROWSER,
): void {
  const { width: W, height: H, look } = plan;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = "alphabetic";
  paintQuoteGround(ctx, look, W, H, plan.layout, scale);

  // A: his portrait, fading into the ground before a word begins.
  if (plan.portrait && images.face && picture) {
    const layer = portraitLayer(env, images.face, plan, picture.point, scale);
    if (layer) ctx.drawImage(layer, plan.portrait.x, 0, plan.portrait.width, H);
  }

  // The flowers, multiplied into a light ground so their paper vanishes.
  for (const f of plan.flowers) {
    const image = images.flowers[f.plate];
    if (!image) continue;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.translate(f.cx, f.cy);
    ctx.rotate(f.rotate);
    ctx.drawImage(image.source, -f.width / 2, -f.height / 2, f.width, f.height);
    ctx.restore();
  }
  grain(ctx, env, W, H, look.grain);

  // A: the hairline frame, open at its foot for the name.
  if (plan.frame) {
    const { inset: m, gap } = plan.frame;
    ctx.save();
    ctx.strokeStyle = look.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - gap, H - m);
    ctx.lineTo(m, H - m);
    ctx.lineTo(m, m);
    ctx.lineTo(W - m, m);
    ctx.lineTo(W - m, H - m);
    ctx.lineTo(W / 2 + gap, H - m);
    ctx.stroke();
    ctx.restore();
  }

  // B: the plate, the picture whole in its mount.
  if (plan.plate && images.face) {
    const p = plan.plate;
    const layer = env.layer(p.width, p.height, scale);
    ctx.save();
    ctx.shadowColor = look.dark ? (look.plateGlow ?? "rgba(0, 0, 0, 0.7)") : "rgba(60, 40, 30, 0.25)";
    ctx.shadowBlur = (look.dark ? 54 : 34) * scale;
    ctx.shadowOffsetY = (look.plateGlow ? 0 : 18) * scale;
    ctx.fillStyle = "#000000";
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.restore();
    if (layer) {
      layer.ctx.drawImage(images.face.source, 0, 0, p.width, p.height);
      tone(layer.ctx, p.width, p.height, look.plate);
      ctx.drawImage(layer.canvas, p.x, p.y, p.width, p.height);
    } else ctx.drawImage(images.face.source, p.x, p.y, p.width, p.height);
    const o = W * 0.014;
    ctx.strokeStyle = rgba(look.ink, look.dark ? 0.28 : 0.3);
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - o, p.y - o, p.width + 2 * o, p.height + 2 * o);
  }

  // The cross: the Portrait's between two hairlines, or the Page's where the plate would be.
  if (plan.cross) {
    const c = plan.cross;
    drawCross(ctx, env, images.mark, c.cx, c.top, c.height, look.cross, look.crossGlow, c.glow, scale);
    ctx.fillStyle = look.rule;
    for (const line of c.hairlines) ctx.fillRect(line.x, line.y, line.width, 2);
  }
  ctx.fillStyle = look.rule;
  for (const rule of plan.rules) ctx.fillRect(rule.x, rule.y, rule.width, rule.height);

  paintSeal(ctx, env, plan, faces, images, picture, scale);

  // The words, the one lit word with its halo, and the furniture round them.
  for (const run of plan.runs) {
    ctx.save();
    ctx.font = cssFont(run.font, faces);
    ctx.fillStyle = inkFor(plan, run);
    if (run.role === "lit" && look.litGlow) {
      glowOn(ctx, look.litGlow, plan.litGlow, scale);
      setRun(ctx, run);
      glowOn(ctx, look.litGlow, plan.litGlow * 0.35, scale);
    }
    setRun(ctx, run);
    ctx.restore();
  }
  paintFoot(ctx, plan, faces, scale);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/** Widths and a letter's ink as this page sets each face, measured on a canvas of its own. */
function quoteMeasureOn(ctx: CanvasRenderingContext2D, faces: Faces): QuoteMeasure {
  let set = "";
  const setFace = (font: QuoteFont) => {
    const css = cssFont(font, faces);
    if (css !== set) ctx.font = css;
    set = css;
  };
  return {
    width: (font, text) => {
      setFace(font);
      return ctx.measureText(text).width;
    },
    ink: (font, text) => {
      setFace(font);
      const m = ctx.measureText(text);
      return {
        ascent: m.actualBoundingBoxAscent || font.size * 0.7,
        left: m.actualBoundingBoxLeft || 0,
        right: m.actualBoundingBoxRight || m.width,
      };
    },
  };
}

/** A picture asked of the website gets this long before the carried one is drawn in its place; it goes on loading for the next drawing. */
const FACE_WAIT_MS = 4000;

function within<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    void promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

/** His face: the cover, or with no signal the picture the app carries, with where the face is in whichever came. */
async function loadFace(face: QuoteFace | null | undefined): Promise<{ image: LoadedImage; picture: QuotePicture } | null> {
  if (!face) return null;
  const cover = await within(loadPicture(face.src), FACE_WAIT_MS);
  if (cover) return { image: cover, picture: { width: cover.width, height: cover.height, point: face.point, looks: face.looks, seal: face.seal } };
  if (face.fallback) {
    const carried = await loadPicture(face.fallback.src);
    if (carried) return { image: carried, picture: { width: carried.width, height: carried.height, point: face.fallback.point, looks: face.fallback.looks } };
  }
  return null;
}

/** Every face of type a quote's picture is set in, waited for before it is planned. */
const QUOTE_WEIGHTS: readonly QuoteFont[] = [
  { family: "serif", weight: 400, size: 60 },
  { family: "serif", weight: 500, size: 60 },
  { family: "serif", weight: 600, size: 60 },
  { family: "serif", weight: 500, italic: true, size: 60 },
  { family: "sans", weight: 400, size: 60 },
  { family: "sans", weight: 500, size: 60 },
  { family: "sans", weight: 600, size: 60 },
  { family: "sans", weight: 700, size: 60 },
  { family: "sans", weight: 800, size: 60 },
];

/** A quote's picture planned, its faces loaded and its pictures decoded: ready to paint at any scale. */
export type PreparedQuote = { plan: QuotePlan; faces: Faces; images: QuoteImages; picture: QuotePicture | null };

/**
 * Get a quote's picture ready: wait for the faces, load his face (the cover,
 * or the carried picture with no signal), plan it in the layout and the
 * look, and load the cross and the look's flowers. Null when the words do
 * not fit whole, or there is no page to draw on.
 */
export async function prepareQuote(input: PictureWords, subject: QuoteSubject, style: PictureStyle = QUOTE_STYLE): Promise<PreparedQuote | null> {
  if (typeof document === "undefined") return null;
  const faces: Faces = { serif: stack("--font-serif"), sans: stack("--font-sans") };
  try {
    const sample = `${input.text.slice(0, 80)}${subject.name}“”†·` || "A";
    await Promise.all(QUOTE_WEIGHTS.map((font) => document.fonts.load(cssFont(font, faces), sample)));
  } catch {
    // A face that will not load falls back down its stack.
  }
  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) return null;
  const face = await loadFace(subject.face);
  const picture = face?.picture ?? null;
  const plan = planQuote(input, subject, style, quoteMeasureOn(scratch, faces), picture);
  if (!plan) return null;
  const plates = [...new Set(plan.flowers.map((f) => f.plate))];
  const [mark, ...loaded] = await Promise.all([loadPicture(MARK_SRC), ...plates.map((p) => loadPicture(FLOWER_PLATES[p].src))]);
  const flowers: QuoteImages["flowers"] = {};
  plates.forEach((p, i) => (flowers[p] = loaded[i]));
  return { plan, faces, images: { face: face?.image ?? null, mark, flowers }, picture };
}

/** Paint a prepared quote on a canvas, `scale` times its size, or into a box `height` tall (a tile cut at its foot). */
export function paintPreparedQuote(canvas: HTMLCanvasElement, prepared: PreparedQuote, scale = 1, height?: number): boolean {
  canvas.width = Math.round(prepared.plan.width * scale);
  canvas.height = Math.round((height ?? prepared.plan.height) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  paintQuote(ctx, prepared.plan, prepared.faces, prepared.images, prepared.picture, scale);
  return true;
}

/** A quote's picture as a PNG, or null when it cannot be made (too long, or no canvas here). */
export async function renderQuoteCard(input: PictureWords, subject: QuoteSubject, style: PictureStyle = QUOTE_STYLE): Promise<Blob | null> {
  const prepared = await prepareQuote(input, subject, style);
  if (!prepared) return null;
  const canvas = document.createElement("canvas");
  if (!paintPreparedQuote(canvas, prepared)) return null;
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** The plate a look's swatch shows: a rose for the roses, the lavender, the olive. */
export function swatchPlate(look: QuoteLook): FlowerPlate | null {
  return look.flowers === "roses" ? "rose-centifolia" : look.flowers === "lavender" ? "lavender" : look.flowers === "olive" ? "olive" : null;
}

/** A look's swatch in the sheet, `size` across: its ground, and its flowers where it has them. The sheet rounds it. */
export function paintQuoteSwatch(ctx: CanvasRenderingContext2D, look: QuoteLook, size: number, pixels: number, flower: LoadedImage | null): void {
  const W = 1080;
  const scale = (size * pixels) / W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintQuoteGround(ctx, look, W, W, "seal", scale);
  if (look.flowers && flower) {
    const w = look.flowers === "lavender" ? W * 0.45 : W * 0.8;
    const h = (w * flower.height) / flower.width;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(flower.source, W / 2 - w / 2, W * 0.5 - h * 0.35, w, h);
    ctx.restore();
  }
}
