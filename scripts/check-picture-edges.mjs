#!/usr/bin/env node
// Pictures with white at their edges (1.7.1).
//
// The owner, 2026-10-17, on the Start here and Learn to pray icons: "there's
// no like random whites in the corners and edges", and he made it the rule
// for every picture the app shows. This reads every picture in the folders
// the app draws from and names each one with a light line along a side or a
// light corner: the white of a scan around a worn panel, a frame line, the
// margin of a page.
//
//   node scripts/check-picture-edges.mjs              every folder in FOLDERS
//   node scripts/check-picture-edges.mjs <file|dir>   just these (under public/)
//   --all   print the clean pictures too      --json   one JSON report
//
// It exits 1 while any picture is flagged and is in neither ACCEPTED (looked
// at, and right as it is) nor WAITING (a decision that is the owner's).
//
// How it reads a picture. A light pixel is white, cream or light grey: every
// channel 200 or more, and no two more than 32 apart (so gold is not light,
// and neither is a pale blue sky). Only the light pixels joined to the edge of
// the picture through other light pixels count, so a white robe or a scroll
// inside an icon does not, and the white around a worn panel does, however
// far in it reaches. Then:
//   a side is flagged when its outer two pixel lines are a quarter light;
//   a corner is flagged when its square (a twentieth of the short side, at
//   least 8 pixels) is 15% light.
// A light thing that is the picture's own subject and touches the edge (a
// bishop's white omophorion, a scroll, the page of a printed book) is flagged
// too. Look at it, and if the white is the work and not the scan, list it in
// ACCEPTED with what it is.
//
// The fix: cut inside the worn edge and keep the subject whole, never through
// a head or a face; open the result and look at it; save it under a new name
// (name.v2.jpg), so no cache serves the old picture; point every reference at
// it. A picture the website keeps for older apps (lib/media/streamed.ts) stays
// beside its replacement under its old name, and is listed in ACCEPTED.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));

/** The folders the app draws pictures from, under public/. */
const FOLDERS = [
  "sections", // the section plates and Start here's icon (lib/media/sections.ts)
  "icons/prayer", // the prayer pages' icons, Learn to pray's among them (lib/prayers/icons.ts)
  "discover/tiles", // Discover's tiles (components/mobile/DiscoverMobile.tsx)
  "covers", // the read-aloud covers, with covers/saints and covers/authors (lib/readAloud/covers.ts)
  "history/media", // History's plates (lib/history/events.ts)
  "saints/icons", // the saints' and the Fathers' icons (lib/saints/saints.ts, lib/saints/icons.ts)
  "audio/art", // the anthem's art
  "shop/media", // the shop's product pictures (their addresses are rows in the shop's database)
];

/** Flagged pictures that were looked at and are right as they are: path under public/ -> what the light is. */
const ACCEPTED = {
  // Looked at on 2026-10-17: the light is the work's own.
  "sections/reading.jpg": "the parchment of the Ostromir page; no screen has shown this plate since 1.7",
  "covers/authors/agatho-of-rome.v1.jpg": "the painted white outline of the miniature's ornament band",
  "covers/authors/ignatius-of-antioch.v1.jpg": "his white omophorion, at the foot",
  // Looked at on 2026-11-11, three of build 89 note 3's covers: the light is the work's own.
  "covers/authors/tarasius-of-constantinople.v1.jpg": "his white omophorion with its crosses, at the foot and in the lower corners (as his icon cut from it)",
  "covers/authors/anianus-of-alexandria.v1.jpg": "a white turban at the top right corner, one of the crowd in Cima da Conegliano's painting",
  "covers/feelings/hatred.v1.jpg": "the edge of the next figure's white robe in the fresco, low at the left; a cut clear of it loses St Stephen's name, lettered at the left, and takes in the panel's white and red border at the right",
  "history/media/bolshevik-persecution.v1.jpg": "a photograph of 1917: the windows' light and the council's white cloth",
  "history/media/council-of-florence-decree.jpg": "the decree on its sheet: its seals hang below it on the white of the scan, and a cut would lose them",
  "history/media/council-of-florence-pisanello.jpg": "Pisanello's drawings: the paper is the drawing's own",
  "history/media/council-of-florence-woodcut.v2.jpg": "the woodcut's own paper, where its printed frame is not quite square",
  "history/media/fall-of-constantinople.v1.jpg": "the miniature's painted labels and its pale sky",
  "history/media/first-council-of-constantinople.v1.jpg": "the miniature's losses, bare parchment where the paint has flaked; a cut would lose the book at its foot",
  "history/media/ukrainian-autocephaly-signing.jpg": "a photograph: the white doors of the hall",
  "saints/icons/aemilian-of-cyzicus.jpg": "his white omophorion, at the foot",
  "saints/icons/anatolius-of-constantinople.jpg": "his white omophorion, at the foot",
  // Looked at on 2026-10-31, the owner's picks of round 3 sheet r3-23: the light is the work's own.
  "saints/icons/justinian-the-great.v2.jpg": "the white tesserae of the courtiers' robes beside him, at the left and the foot of the mosaic",
  "saints/icons/cyril-of-jerusalem.v2.jpg": "his white omophorion and the open scroll in his hands, at the foot and the right",
  "saints/icons/photius-the-great.v2.jpg": "the bare parchment the Skylitzes miniature is painted on: its own ground",
  "saints/icons/prophet-samuel.jpg": "the white highlights of the painted ribbons",
  "saints/icons/thaddeus-of-edessa.jpg": "the gold leaf, photographed bright, where it meets the foot",
  "saints/icons/or-of-the-thebaid.jpg": "a drawing on white paper: the white is its ground",
  // Looked at on 2026-11-10, two of the icons cut from their books' covers: the light is the work's own.
  "saints/icons/ignatius-of-antioch.v2.jpg": "his white vestments with their red crosses, at the foot",
  "saints/icons/tarasius-of-constantinople.v2.jpg": "his white omophorion with its crosses, at the foot and in the lower corners",
  "saints/icons/sophronius-of-jerusalem.v2.jpg": "his white vestments with their black crosses, at the foot",
  "saints/icons/theophan-the-recluse.v2.jpg": "the photograph's own pale ground, all round him (a 19th-century photograph, not an icon)",
  "saints/icons/nikodemos-the-hagiorite.v2.jpg": "the engraving's own paper, in the band of letters round its oval, at the top",
  "saints/icons/theophylact-of-ohrid.v2.jpg": "the manuscript page's own cream ground round his halo, his lettered name and his shoulders (a 17th-century miniature on paper)",
  // Looked at on 2026-11-11, December's icons (docs/1.9-build/notes/december-saints.md,
  // push 2b) and one of November's: the light is the work's own. The 1904 prints
  // are cut inside their frame lines, so none of the page is left; what is light
  // at their edges is the print's own ground, stippled in grey and pale where it
  // is sky, and no cut inside it would keep the figure whole.
  // Looked at on 2026-11-11, the prints of November (lib/saints/iconRights.ts): the light is the print's own paper.
  "saints/icons/acindynus-and-companions.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/acepsimas-joseph-and-aithalas.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/galaction-and-episteme.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/patrobas-hermas-linus-gaius-and-philologus.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/martyrs-of-melitene.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/matrona-of-constantinople.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/erastus-olympas-rodion-sosipater-quartus-and-tertius.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/romanus-and-barulas.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/plato-and-romanus.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/proclus-of-constantinople.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/philemon-and-apphia.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/amphilochius-of-iconium.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/paramonus-and-the-370.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/frumentius-of-axum.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/chrysogonus.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/eugenia-of-rome.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/juliana-of-nicomedia.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/lucia-of-syracuse.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/marcellus-of-the-unsleeping-ones.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/philemon-apollonius-and-arrianus.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/sosthenes-apollos-cephas-and-tychicus.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/stephen-of-surozh.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/thyrsus-leucius-and-callinicus.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/sebastian-and-companions.jpg": "a print of 1904: its own stippled ground, pale where it is sky",
  "saints/icons/niphon-of-cyprus.jpg": "a print of 1904: its own stippled ground, and its sky left white at the right",
  "saints/icons/theodore-the-branded.jpg": "the open scroll in his hand, at the foot and the right",
  "saints/icons/nektarios-of-aegina.v2.jpg": "a photograph: the white studio backdrop behind him, its own",
  // Looked at on 2026-11-11, January's icons (docs/1.9-build/notes/january-saints.md,
  // push 2): the January volume's prints of the same Lives of the Saints as December's
  // 1904 prints, cut inside their frame lines the same way, with none of the page and no
  // caption. What is light at their edges is the print's own ground, white where it is
  // sky, and no cut inside it would keep the figure whole.
  "saints/icons/sylvester-of-rome.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/gordius-of-caesarea.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/prophet-malachi.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/polyeuctus-of-melitene.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/theodosius-the-cenobiarch.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/tatiana-of-rome.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/hermylas-and-stratonicus.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/euthymius-the-great.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/apostle-timothy.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/anastasius-the-persian.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/clement-of-ancyra.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  "saints/icons/xenia-of-rome.jpg": "a print of the Lives of the Saints (before 1911): its own ground, white where it is sky",
  // Looked at on 2026-10-31, the Fall of Constantinople's gallery (the owner's note 84): the light is the work's own.
  "history/media/fall-of-constantinople-zonaro-gun.v1.jpg": "Zonaro's painted sky: a white cloud over the banners, at the top left; a cut would lose the banners or the horsemen",
  // Kept on the website for the 1.7 apps, which ask for these by name; 1.7.1
  // shows the .v2 cut beside each.
  "history/media/council-of-jerusalem.v1.jpg": "kept for the 1.7 apps; 1.7.1 shows council-of-jerusalem.v2.jpg",
  "history/media/mission-of-cyril-and-methodius.v1.jpg": "kept for the 1.7 apps; 1.7.1 shows mission-of-cyril-and-methodius.v2.jpg",
  "history/media/philokalia-published.v1.jpg": "kept for the 1.7 apps; 1.7.1 shows philokalia-published.v2.jpg",
  "history/media/council-of-florence-woodcut.jpg": "kept for the 1.7 apps; 1.7.1 shows council-of-florence-woodcut.v2.jpg",
};

/**
 * Flagged pictures whose fix is the owner's call. A product's picture is
 * named by a row in the shop's database, so a new name needs his SQL, and a
 * product photographed on white may be meant that way.
 */
const WAITING = {
  "shop/media/apostle-peter-laminated.jpg": "a white border around the icon",
  "shop/media/archangel-michael-print.jpg": "the icon on the studio's grey",
  "shop/media/christ-pantocrator-mounted.jpg": "the white of the scan around the panel",
  "shop/media/st-john-the-forerunner-mounted.jpg": "the mosaic's pale ground at the foot, left",
  "shop/media/theotokos-of-vladimir-mounted.jpg": "the silver icon on the studio's white",
};

const LIGHT_MIN = 200;
const LIGHT_SPREAD = 32;
const SIDE_LINES = 2;
const SIDE_SHARE = 0.25;
const CORNER_SHARE = 0.15;

const PICTURE = /\.(jpe?g|png|webp)$/i;

function walk(abs) {
  const st = fs.statSync(abs);
  if (st.isFile()) return PICTURE.test(abs) ? [abs] : [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => walk(path.join(abs, e.name)));
}

/** Light pixels joined to the picture's edge through light pixels (4-connected). */
function edgeLight(data, W, H, C) {
  const light = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const r = data[p * C], g = data[p * C + 1], b = data[p * C + 2];
    const lo = Math.min(r, g, b);
    light[p] = lo >= LIGHT_MIN && Math.max(r, g, b) - lo <= LIGHT_SPREAD ? 1 : 0;
  }
  const joined = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0, tail = 0;
  const visit = (p) => {
    if (light[p] && !joined[p]) {
      joined[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < W; x++) { visit(x); visit((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { visit(y * W); visit(y * W + W - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % W, y = (p - x) / W;
    if (x > 0) visit(p - 1);
    if (x < W - 1) visit(p + 1);
    if (y > 0) visit(p - W);
    if (y < H - 1) visit(p + W);
  }
  return joined;
}

function share(mask, W, x0, y0, w, h) {
  let n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) n += mask[y * W + x];
  return n / (w * h);
}

async function readEdges(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const mask = edgeLight(data, W, H, C);
  const L = Math.min(SIDE_LINES, W, H);
  const s = Math.min(W, H, Math.max(8, Math.round(Math.min(W, H) / 20)));
  const sides = {
    top: share(mask, W, 0, 0, W, L),
    bottom: share(mask, W, 0, H - L, W, L),
    left: share(mask, W, 0, 0, L, H),
    right: share(mask, W, W - L, 0, L, H),
  };
  const corners = {
    "top left": share(mask, W, 0, 0, s, s),
    "top right": share(mask, W, W - s, 0, s, s),
    "bottom left": share(mask, W, 0, H - s, s, s),
    "bottom right": share(mask, W, W - s, H - s, s, s),
  };
  const found = [
    ...Object.entries(sides).filter(([, v]) => v >= SIDE_SHARE).map(([k, v]) => `${k} ${Math.round(v * 100)}%`),
    ...Object.entries(corners).filter(([, v]) => v >= CORNER_SHARE).map(([k, v]) => `${k} corner ${Math.round(v * 100)}%`),
  ];
  return { width: W, height: H, found };
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const all = args.includes("--all");
  const targets = args.filter((a) => !a.startsWith("--"));
  const roots = targets.length
    ? targets.map((t) => (path.isAbsolute(t) ? t : fs.existsSync(path.resolve(t)) ? path.resolve(t) : path.join(PUBLIC, t)))
    : FOLDERS.map((f) => path.join(PUBLIC, f));
  const files = roots.filter((r) => fs.existsSync(r)).flatMap(walk);

  const report = [];
  for (const file of files) {
    const inside = path.relative(PUBLIC, file);
    const rel = (inside.startsWith("..") ? file : inside).split(path.sep).join("/");
    const { width, height, found } = await readEdges(file);
    const accepted = found.length ? ACCEPTED[rel] ?? null : null;
    const waiting = found.length ? WAITING[rel] ?? null : null;
    report.push({ file: rel, width, height, found, accepted, waiting });
  }

  const failing = report.filter((r) => r.found.length && !r.accepted && !r.waiting);
  if (json) {
    console.log(JSON.stringify({ checked: report.length, failing: failing.length, pictures: report }, null, 2));
  } else {
    for (const r of report) {
      if (r.found.length) {
        const note = r.accepted ?? r.waiting;
        const tag = r.accepted ? "accepted" : r.waiting ? "waiting" : "WHITE EDGE";
        console.log(`${tag.padEnd(10)} ${r.file}  ${r.width}x${r.height}  ${r.found.join(", ")}${note ? `  (${note})` : ""}`);
      } else if (all) {
        console.log(`${"ok".padEnd(10)} ${r.file}  ${r.width}x${r.height}`);
      }
    }
    const accepted = report.filter((r) => r.accepted).length;
    const waiting = report.filter((r) => r.waiting).length;
    console.log(`\n${report.length} pictures read: ${failing.length} with white at an edge to fix, ${accepted} accepted, ${waiting} waiting on the owner.`);
  }
  process.exitCode = failing.length ? 1 : 0;
}

await main();
