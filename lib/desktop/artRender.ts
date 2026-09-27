import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import type { ArtParams } from "@/lib/desktop/artParams";
import type { SeasonColor } from "@/lib/desktop/presenceModes";
import { getSaint } from "@/lib/saints/saints";

// The pictures the desktop app shows on Discord, drawn to the approved
// design (26 September 2026): a portrait, head and shoulders, with the
// reading bar along its foot; under Plus custom, a frame in the church
// season's color and an optional gold rule inside it. The small picture is a
// disc of the season's color with the Orthodox cross.
//
// Discord shows the large picture as a square, whatever it is sent, so a
// standing icon is cropped from the top: the face and the halo stay.

const SIZE = 512;
const BADGE = 128;

/** The approved design's colors, at 76px scaled to 512. */
const FRAME: Record<SeasonColor, string> = {
  gold: "#b8892f",
  purple: "#5b2d86",
  crimson: "#8a1f2f",
  green: "#2f6d3e",
  blue: "#2b5f93",
  white: "#cfc4a6",
};
const BAR: Record<SeasonColor, string> = {
  gold: "#f0d48a",
  purple: "#c7a3ef",
  crimson: "#ef9aa6",
  green: "#9bd9ad",
  blue: "#a3cbf2",
  white: "#fffaf0",
};
const DISC: Record<SeasonColor, string> = { ...FRAME, white: "#f6f1e3" };
const DISC_INK: Record<SeasonColor, string> = {
  gold: "#fbeec5",
  purple: "#f3d68c",
  crimson: "#f3d68c",
  green: "#f3d68c",
  blue: "#f3d68c",
  white: "#8a6420",
};
const GOLD_RULE = "#e6c886";
const GROUND = "#15120e";

export class UnknownSaintError extends Error {}

async function publicFile(rel: string): Promise<Buffer> {
  // `rel` always comes from the registry or a constant, never the query.
  return fs.readFile(path.join(process.cwd(), "public", rel.replace(/^\/+/, "")));
}

function badgeSvg(season: SeasonColor): string {
  const ink = DISC_INK[season];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE}" height="${BADGE}" viewBox="0 0 24 24">
<circle cx="12" cy="12" r="12" fill="${DISC[season]}"/>
<g fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" transform="translate(12 12) scale(0.62) translate(-12 -12)">
<path d="M12 2.5v19"/><path d="M9.5 5.5h5"/><path d="M6.5 9.5h11"/><path d="M9 17.5l6-2"/>
</g></svg>`;
}

function barSvg(inset: number, inner: number, progress: number, fill: string, gradient: boolean): string {
  const trackX = inset + 40;
  const trackW = inner - 80;
  const trackY = inset + inner - 40 - 26;
  const fillW = Math.round((trackW * progress) / 100);
  const fillPaint = gradient ? "url(#g)" : fill;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
<defs>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0b0a" stop-opacity="0"/><stop offset="1" stop-color="#0c0b0a" stop-opacity="0.82"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8892f"/><stop offset="1" stop-color="#e6c886"/></linearGradient>
</defs>
<rect x="${inset}" y="${inset + inner - 160}" width="${inner}" height="160" fill="url(#s)"/>
<rect x="${trackX}" y="${trackY}" width="${trackW}" height="26" rx="13" fill="#efe8dc" fill-opacity="0.3"/>
${fillW > 0 ? `<rect x="${trackX}" y="${trackY}" width="${Math.max(fillW, 26)}" height="26" rx="13" fill="${fillPaint}"/>` : ""}
</svg>`;
}

/** The picture as bytes, with its content type. */
export async function renderArt(
  params: ArtParams,
  load: (rel: string) => Promise<Buffer> = publicFile,
): Promise<{ body: Buffer; type: string }> {
  if (params.kind === "badge") {
    const body = await sharp(Buffer.from(badgeSvg(params.season))).png().toBuffer();
    return { body, type: "image/png" };
  }

  let iconRel = "/icon-512.png";
  if (params.saint) {
    const saint = getSaint(params.saint);
    if (!saint) throw new UnknownSaintError(params.saint);
    if (saint.iconUrl) iconRel = saint.iconUrl;
  }
  const isPortrait = iconRel !== "/icon-512.png";

  const frame = params.season ? 20 : 0;
  const rule = params.season && params.gilded ? 8 : 0;
  const inset = frame + rule;
  const inner = SIZE - 2 * inset;

  const portrait = await sharp(await load(iconRel))
    .resize(inner, inner, { fit: "cover", position: isPortrait ? "north" : "centre" })
    .toBuffer();

  const layers: sharp.OverlayOptions[] = [];
  if (rule) {
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect x="${frame}" y="${frame}" width="${SIZE - 2 * frame}" height="${SIZE - 2 * frame}" fill="${GOLD_RULE}"/></svg>`,
      ),
      top: 0,
      left: 0,
    });
  }
  layers.push({ input: portrait, top: inset, left: inset });
  if (typeof params.progress === "number") {
    const plain = !params.season;
    layers.push({
      input: Buffer.from(barSvg(inset, inner, params.progress, plain ? "" : BAR[params.season!], plain)),
      top: 0,
      left: 0,
    });
  }

  const body = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: params.season ? FRAME[params.season] : GROUND },
  })
    .composite(layers)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  return { body, type: "image/jpeg" };
}
