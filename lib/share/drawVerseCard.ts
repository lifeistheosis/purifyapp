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
  DEFAULT_STYLE,
  FONTS,
  FOOT,
  GROUND,
  INK,
  LIGHT_GROUND,
  YOURS,
  planPicture,
  type Align,
  type Font,
  type Look,
  type Measure,
  type Measures,
  type PicturePlan,
  type PictureStyle,
  type PictureWords,
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
function strokeCross(ctx: CanvasRenderingContext2D, left: number, top: number, height: number): void {
  const s = height / 19;
  const x0 = left - 5.5 * s;
  const y0 = top - 2.5 * s;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x0 + x1 * s, y0 + y1 * s);
    ctx.lineTo(x0 + x2 * s, y0 + y2 * s);
    ctx.stroke();
  };
  ctx.strokeStyle = INK;
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
