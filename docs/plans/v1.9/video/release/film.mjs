#!/usr/bin/env node
// The 1.9 release film, cut to the track he chose (2026-11-20: "time it to the
// audio not video"). The stage is board.mjs's; this is the film's clock and
// its shots, frame by frame, then one H.264 file with no sound stream.
//
//   node docs/plans/v1.9/video/release/film.mjs --times     the cuts against the track's beats
//   node docs/plans/v1.9/video/release/film.mjs --sheet     the middle of every shot, to look at
//   node docs/plans/v1.9/video/release/film.mjs --at 7.4    one frame, full size
//   node docs/plans/v1.9/video/release/film.mjs --check     checkMock at the middle of every shot
//   node docs/plans/v1.9/video/release/film.mjs             every frame, then the file (--fresh renders all again)
//   node docs/plans/v1.9/video/release/film.mjs --encode    the file from the frames already rendered
//
// The file is silent. The track is not Purify's and is not in the repository:
// the film is only cut to its beats, which are written here as numbers.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PHONE, ROOT, checkMock, dir, launch, sharp } from "../lib.mjs";
import { DROP, SCENES as FIRST_CUT } from "../scenes.mjs";
import { openStage, picture, takeOf } from "./board.mjs";

const FPS = 60;
const fail = (text) => {
  throw new Error(text);
};

// ── The track, by measure (docs/handoffs/ad-cinematic.md) ────────────────

/** About 99 beats a minute: the downbeats lie on an even grid of bars from the first one. */
const FIRST = 2.19;
const BAR = 2.43;
const BEAT = BAR / 4;
/** Bar n (1 is the first downbeat), and beats after it. */
const bar = (n, beats = 0) => Math.round((FIRST + (n - 1) * BAR + beats * BEAT) * FPS) / FPS;
const BREAK = Math.round(10.7 * FPS) / FPS; // the bass falls away here, until bar 5
// The track ends at about 20.3 seconds. What follows it in the file he sent (a loud hit at 20.34) is TikTok's own
// outro, not the music (his word, 2026-11-21: "The TikTok outro is pretty much like supposed to be cropped out of the
// audio"). So the film's last cut is on the track's last downbeat, bar 8, and the music is faded out before 20.3.
export const MUSIC_ENDS = 20.3;
const END = 21.4;

// ── The words: none is written here ──────────────────────────────────────

const point = (id) => DROP.points.find((p) => p.id === id) ?? fail(`the drop has no point "${id}"`);
const first = (id) => FIRST_CUT.find((x) => x.id === id) ?? fail(`the first cut has no scene "${id}"`);
/** A title, and where it breaks: the lines must join back into the words they were read from. */
const title = (words, lines, from) => {
  if (lines.join(" ") !== words) fail(`"${lines.join(" / ")}" does not join into "${words}"`);
  if (/[–—]/.test(words)) fail(`a dash in place of words: ${words}`);
  return { words, lines, from };
};
const WORDS = {
  release: { words: String(DROP.release), from: "the drop's release" },
  today: title(first("today").title, first("today").lines, "the store picture's line for Today"),
  verse: title(point("verse").name, ["Every verse,", "opened"], "the drop's point `verse`, its name"),
  journal: title(point("journal").name, ["Your journal,", "by the Church's day"], "the drop's point `journal`, its name"),
  bibles: title(point("bibles").name, ["Seven more", "Bibles"], "the drop's point `bibles`, its name"),
  free: { words: point("journal").text.includes("Free for everyone.") ? "Free for everyone." : fail("the drop's point `journal` does not say it"), from: "the drop's point `journal`, its text" },
  here: title(first("open").title, first("open").lines, "the drop's caption, its first sentence"),
};

// ── Motion ───────────────────────────────────────────────────────────────

/** The house curve, cubic-bezier(0.22, 1, 0.36, 1): app/globals.css, --ease-house. */
function house(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bez = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, x1, x2) < u) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, y1, y2);
}
/** The house curve for a thing that sets off from rest: the same curve, entered gently. It never passes its end. */
const glide = (u) => house(u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/**
 * For the two slow reveals of the opening (his word: "a better slower but smoother reveal for the logo and the 1.9"):
 * it sets off gently, travels evenly and comes to rest gently, with no rush at either end. The house curve does most
 * of its travel in its first third, which is what made the first uncovering read as quick.
 */
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const lerp = (a, b, u) => a + (b - a) * u;
/** Every number of `a` moved toward the same number of `b`; what is not a number is `a`'s. */
function between(a, b, u) {
  if (typeof a === "number" && typeof b === "number") return lerp(a, b, u);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => between(v, b[i], u));
  if (a && b && typeof a === "object" && typeof b === "object") return Object.fromEntries(Object.keys(a).map((k) => [k, k in b ? between(a[k], b[k], u) : a[k]]));
  return a;
}

const [BH] = [PHONE.height + 12];
const SIDE_MOST = { ry: 25, rx: 7, rz: 1.2 };
/**
 * A close shot: the phone stood so that the app's own point (ax, ay) is at the film's `at`, k of the film's pixels to
 * one of the app's, turned `turn` parts of the side stand (1 is the store pictures' side stand, -1 the same the other way).
 */
function close(ax, ay, k, turn, more = {}, at = [540, 960]) {
  const ry = -SIDE_MOST.ry * turn;
  return { x: at[0] - (ax - PHONE.width / 2) * k * Math.cos((ry * Math.PI) / 180), y: at[1] - (ay - PHONE.height / 2) * k, k, ry, rx: SIDE_MOST.rx * Math.abs(turn), rz: SIDE_MOST.rz * turn, ...more };
}
/** The whole phone standing on the ground: where its foot is, so the ground can give its light back. */
const foot = (p) => Math.round(p.y + (BH * p.k) / 2 + 12);

// ── The shots ────────────────────────────────────────────────────────────
//
// A shot begins with a hard cut on the track. Between `from` and `to` everything that is a number moves: slowly and
// evenly when the camera is only drifting ("even"), or on the house curve when the move is the event ("house").
//   screen   the take that plays on the phone from the cut: [take, mark, seconds after it]; `hold` keeps it still,
//            `rate` plays it faster (the Bibles' list was drawn up slowly, so that it is sharp)
//   card     a full-frame title, its lines arriving one after the other on the house curve
//   why      the reason, for the page

const wide = (x, y, k, turn, more = {}) => ({ x, y, k, ry: -SIDE_MOST.ry * turn, rx: SIDE_MOST.rx * Math.abs(turn), rz: SIDE_MOST.rz * turn, ...more });
const behind = (x, y, k, turn) => wide(x, y, k, turn, { dark: [0.5, "far"], blur: 26, dim: 0.62 });
const CARD = { y: 760, size: 104 };

export const SHOTS = [
  {
    name: "Out of the dark",
    at: 0,
    move: "smooth",
    from: { pool: [540, 900, 1000, 900, 0.2], mark: [900, 330, 0.96, 3.1] },
    to: { pool: [540, 900, 760, 620, 0.17], mark: [900, 330, 0.96, 1] },
    span: 2.19,
    uncover: [2.1, 158, 0.36, 54],
    why: "The first frame is never black (his word: \"make the intro revealing and high retention (uncovering effect)\"). It opens so near the mark that it is only bright shapes under a dark that is already drawing off them. The dark draws off slowly and evenly through the whole of the track's sparse opening, with a deep soft edge, as the camera pulls back at the same even pace (his word: \"a better slower but smoother reveal\"): the mark is whole only as the first downbeat arrives.",
  },
  {
    name: "The release, by its number",
    at: bar(1),
    move: "even",
    from: { pool: [540, 980, 900, 520, 0.1], mark: [468, 120, 0.9], big: WORDS.release.words, bigScale: 1 },
    to: { pool: [620, 1300, 900, 420, 0.2], mark: [468, 120, 0.9], big: WORDS.release.words, bigScale: 1.035 },
    uncover: [1.8, 12, 0.42, 54],
    smooth: true,
    why: "The first downbeat is the first drop. The number is there, full frame, under the dark, and from the beat the dark draws off it upward, slowly and evenly, for most of the bar: its foot first, its head last. Through the bar the light sinks toward where the phone will stand, so the next cut is handed its light.",
  },
  {
    name: "The phone comes out of the dark",
    at: bar(2),
    move: "even",
    screen: ["today", "go", -0.25],
    from: { phone: wide(600, 1120, 0.9, 0.96, { dark: [0.92, "far"], sheen: [0.72, 0.3] }), pool: [640, 1530, 860, 220, 0.2] },
    to: { phone: wide(580, 1070, 1.1, 0.96, { dark: [0.5, "far"], sheen: [0.6, 0.34] }), pool: [640, 1560, 940, 240, 0.36] },
    ground: true,
    uncover: [1.5, 100, 0.2],
    why: "The third uncovering, and the slowest: the dark draws sideways off the whole picture and then off the glass, so the phone is found a part at a time while Today builds itself on the screen by the app's own pieces. One whole bar, the camera moving in.",
  },
  {
    name: "Today's card",
    at: bar(3),
    move: "even",
    screen: ["today", "go", 2.2],
    from: { phone: behind(560, 1080, 1.5, 0.96), pool: [600, 1300, 900, 500, 0.1] },
    to: { phone: behind(540, 1060, 1.58, 0.96), pool: [600, 1300, 900, 500, 0.1] },
    card: { ...CARD, lines: WORDS.today.lines },
    why: "The track lifts into this downbeat, and the first chapter's words take the whole frame for one beat.",
  },
  {
    name: "Close: St Nicholas",
    at: bar(3, 1),
    move: "even",
    screen: ["today", "go", 0.74],
    from: { phone: close(140, 392, 3.3, -0.85, { soft: ["top", 0.36, 6], dark: [0.3, "top"], sheen: [0.3, 0.5] }), pool: [300, 800, 900, 700, 0.12] },
    to: { phone: close(146, 396, 3.5, -0.85, { soft: ["top", 0.36, 6], dark: [0.3, "top"], sheen: [0.36, 0.5] }), pool: [300, 800, 900, 700, 0.12] },
    why: "On the next beat the frame is filled: the day's saint and his name sliding in from either side, on a phone turned to the light.",
  },
  {
    name: "Close: Begin",
    at: bar(3, 2),
    move: "even",
    screen: ["today", "go", 1.06],
    from: { phone: close(206, 560, 3.1, 0.8, { soft: ["top", 0.5, 7], dark: [0.36, "top"], sheen: [0.6, 0.66] }), pool: [760, 1000, 900, 700, 0.12] },
    to: { phone: close(212, 566, 3.3, 0.8, { soft: ["top", 0.5, 7], dark: [0.36, "top"], sheen: [0.56, 0.66] }), pool: [760, 1000, 900, 700, 0.12] },
    why: "The day's one bright button arrives in its own shot, the phone turned the other way so the two close shots answer each other.",
  },
  {
    name: "Today, whole",
    at: bar(3, 3),
    move: "even",
    screen: ["today", "go", 1.7],
    from: { phone: wide(520, 1010, 1.34, -0.9, { dark: [0.3, "far"], sheen: [0.3, 0.3] }), pool: [460, 1640, 940, 240, 0.34] },
    to: { phone: wide(530, 1000, 1.4, -0.9, { dark: [0.26, "far"], sheen: [0.34, 0.3] }), pool: [460, 1640, 940, 240, 0.34] },
    ground: true,
    why: "The beat that closes the bar gives the screen back whole, as its tab bar steps into place.",
  },
  {
    name: "The verse's card",
    at: bar(4),
    move: "even",
    screen: ["verse", "tools", -1.2],
    hold: true,
    from: { phone: behind(540, 1080, 1.5, -0.9), pool: [500, 1300, 900, 500, 0.1] },
    to: { phone: behind(556, 1060, 1.58, -0.9), pool: [500, 1300, 900, 500, 0.1] },
    card: { ...CARD, lines: WORDS.verse.lines },
    why: "The second chapter, on the same beat of its bar as the first, so the film has a pulse.",
  },
  {
    name: "Close: the verse, opened",
    at: bar(4, 1),
    move: "even",
    screen: ["verse", "tools", -0.3],
    from: { phone: close(206, 350, 2.6, -0.7, { soft: ["top", 0.3, 5], dark: [0.3, "top"], sheen: [0.4, 0.6] }), pool: [300, 1000, 900, 700, 0.12] },
    to: { phone: close(206, 340, 2.74, -0.7, { soft: ["top", 0.3, 5], dark: [0.3, "top"], sheen: [0.44, 0.6] }), pool: [300, 1000, 900, 700, 0.12] },
    why: "John 1:1 held, and its tools rising to meet the finger: the gesture this release teaches, in one beat.",
  },
  {
    name: "The journal's card, in the break",
    at: BREAK,
    move: "even",
    screen: ["journal", "go", 2.4],
    hold: true,
    from: { phone: behind(540, 1120, 1.46, 1), pool: [520, 1300, 900, 500, 0.08] },
    to: { phone: behind(560, 1090, 1.6, 1), pool: [520, 1300, 900, 500, 0.12] },
    card: { ...CARD, lines: WORDS.journal.lines },
    slow: true,
    why: "The bass falls away for two beats, and the film takes that breath for the release's head: the journal's own name, held longer than any other card.",
  },
  {
    name: "Close: the day's page",
    at: bar(5),
    move: "even",
    screen: ["journal", "go", 0.3],
    from: { phone: close(206, 330, 2.5, 1, { soft: ["bottom", 0.4, 5], dark: [0.34, "bottom"], sheen: [0.6, 0.3] }, [560, 800]), pool: [700, 800, 900, 700, 0.12] },
    to: { phone: close(206, 360, 2.64, 1, { soft: ["bottom", 0.4, 5], dark: [0.34, "bottom"], sheen: [0.56, 0.34] }, [560, 800]), pool: [700, 800, 900, 700, 0.12] },
    why: "The bass comes back on this downbeat and the journal builds itself on it: its name, and the day's page rising under it.",
  },
  {
    name: "Close: a pen for each reading",
    at: bar(5, 2),
    move: "even",
    screen: ["journal", "go", 1.2],
    from: { phone: close(215, 468, 3.3, 1, { soft: ["top", 0.4, 6], dark: [0.36, "top"], sheen: [0.6, 0.55] }), pool: [700, 1000, 900, 700, 0.12] },
    to: { phone: close(222, 472, 3.5, 1, { soft: ["top", 0.4, 6], dark: [0.36, "top"], sheen: [0.54, 0.55] }), pool: [700, 1000, 900, 700, 0.12] },
    why: "The journal's point, seen large: the day's Epistle and Gospel, each with a pen to begin a page.",
  },
  {
    name: "The Bibles' card",
    at: bar(6),
    move: "even",
    screen: ["bibles", "list", 0.9],
    hold: true,
    from: { phone: behind(540, 1080, 1.5, -0.9), pool: [500, 1300, 900, 500, 0.1] },
    to: { phone: behind(556, 1060, 1.58, -0.9), pool: [500, 1300, 900, 500, 0.1] },
    card: { ...CARD, lines: WORDS.bibles.lines },
    why: "The fourth chapter's words, one beat.",
  },
  {
    name: "Close: the Bibles, drawn up",
    at: bar(6, 1),
    move: "even",
    screen: ["bibles", "list", 1.2],
    rate: 3,
    from: { phone: close(206, 470, 2.5, -0.8, { soft: ["top", 0.3, 5], dark: [0.3, "top"], sheen: [0.36, 0.6] }), pool: [300, 1000, 900, 700, 0.12] },
    to: { phone: close(206, 480, 2.7, -0.8, { soft: ["top", 0.3, 5], dark: [0.3, "top"], sheen: [0.42, 0.6] }), pool: [300, 1000, 900, 700, 0.12] },
    why: "The list itself is the proof: each Bible in its own script, passing under the finger for three beats, the longest look in the film's second half.",
  },
  {
    name: "Again: St Nicholas",
    at: bar(7),
    move: "even",
    screen: ["today", "go", 2.4],
    hold: true,
    from: { phone: close(170, 400, 3.7, 0.7, { soft: ["bottom", 0.4, 6], sheen: [0.6, 0.45] }), pool: [760, 900, 900, 700, 0.13] },
    to: { phone: close(176, 400, 3.86, 0.7, { soft: ["bottom", 0.4, 6], sheen: [0.56, 0.45] }), pool: [760, 900, 900, 700, 0.13] },
    why: "The track lifts into its fullest bar and the film answers with its fastest cuts: two chapters again, one to a beat, each nearer than before.",
  },
  {
    name: "Again: the verse",
    at: bar(7, 1),
    move: "even",
    screen: ["verse", "highlight", 0.5],
    hold: true,
    from: { phone: close(206, 322, 3.0, -0.8, { soft: ["bottom", 0.4, 6], sheen: [0.4, 0.4] }), pool: [300, 900, 900, 700, 0.13] },
    to: { phone: close(206, 322, 3.14, -0.8, { soft: ["bottom", 0.4, 6], sheen: [0.44, 0.4] }), pool: [300, 900, 900, 700, 0.13] },
    why: "The verse with its highlight landed.",
  },
  {
    name: "The journal, whole, and the promise",
    at: bar(7, 2),
    move: "house",
    screen: ["journal", "go", 2.4],
    hold: true,
    from: { phone: wide(600, 1160, 1.34, 1, { dark: [0.3, "far"], sheen: [0.7, 0.28] }), pool: [650, 1720, 940, 240, 0.36] },
    to: { phone: wide(600, 1130, 1.2, 1, { dark: [0.3, "far"], sheen: [0.7, 0.28] }), pool: [650, 1672, 940, 240, 0.36] },
    ground: true,
    card: { y: 300, size: 104, lines: [], sub: WORDS.free.words },
    why: "The fast run ends half way through its bar: the camera draws back at once, on the house curve, to the whole phone standing in the dark with its light on the ground, and the three words that matter most in this release.",
  },
  {
    name: "The end card",
    at: bar(8),
    move: "house",
    from: { pool: [540, 860, 820, 620, 0.17], mark: [690, 250, 0.96, 1.03] },
    to: { pool: [540, 860, 820, 620, 0.17], mark: [690, 250, 0.96, 1] },
    span: 0.9,
    card: { y: 960, size: 124, lines: WORDS.here.lines },
    why: "The track's last downbeat is the cut to the end card: the mark, and the first sentence of the drop's caption, clean, with nothing flashing. The music runs one more second under it and is gone, and the card is held.",
  },
];
SHOTS.forEach((s, i) => {
  s.until = i + 1 < SHOTS.length ? SHOTS[i + 1].at : END;
  if (s.until - s.at < 0.3) fail(`the shot "${s.name}" is shorter than 0.3 seconds`);
  for (const p of [s.from.phone, s.to.phone]) {
    if (!p) continue;
    if (Math.abs(p.ry) > SIDE_MOST.ry + 1e-6 || Math.abs(p.rx) > SIDE_MOST.rx + 1e-6 || Math.abs(p.rz) > SIDE_MOST.rz + 1e-6) fail(`"${s.name}": the phone turns more than the store pictures' side stand`);
    if (p.k > takeOf(s.screen[0]).sharp + 1e-9) fail(`"${s.name}": nearer than the takes were filmed`);
  }
});
// No more than three cuts in any second: fast, never a flicker.
SHOTS.forEach((s, i) => {
  if (SHOTS.filter((x) => x.at >= s.at && x.at < s.at + 1).length > 3) fail(`more than three cuts in the second after ${s.at.toFixed(2)}s`);
  void i;
});
const TOTAL = END;
const FRAMES = Math.round(TOTAL * FPS);

/** The film at one moment, as the stage wears it. */
function stateAt(t) {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].at <= t + 1e-9) i++;
  const s = SHOTS[i];
  const into = t - s.at;
  const span = s.span ?? s.until - s.at;
  const u = s.move === "house" ? house(into / span) : s.move === "glide" ? glide(into / span) : s.move === "smooth" ? smooth(into / span) : Math.min(1, into / span);
  const f = between(s.from, s.to, u);
  f.shot = i;
  if (s.lands) {
    // The number lands on the downbeat: it is there at once, a little large, and settles on the house curve.
    f.bigScale *= 1 + 0.07 * (1 - house(into / s.lands));
  }
  if (f.phone && s.ground) f.floor = foot(f.phone);
  if (s.screen) {
    const [id, mark, after] = s.screen;
    f.src = picture([id, mark, Math.min(after + (s.hold ? 0 : into * (s.rate ?? 1)), takeOf(id).seconds - takeOf(id).marks.find((m) => m.name === mark).t - 0.02)]);
  }
  if (s.card) {
    const each = s.slow ? 0.16 : 0.07;
    const takes = s.slow ? 0.7 : 0.34;
    f.title = { ...s.card, in: s.card.lines.map((_, n) => house((into - n * each) / takes)), subIn: house(into / 0.4) };
  }
  // The light does not answer the track (his word, 2026-11-21: "I want you to not time the glow to the beat. I want it
  // to be purely clean transitions."): it never swells on a hit. Only the cuts are on the beat.
  // The uncovering: the dark is already part way off at the cut, and draws off the rest on the house curve.
  if (s.uncover) f.cover = [s.uncover[2] + (1 - s.uncover[2]) * (s.move === "smooth" || s.smooth ? smooth : s.move === "glide" ? glide : house)(into / s.uncover[0]), s.uncover[1], s.uncover[3] ?? 22];
  // The film never opens on black (a feed decides on the first frame); it goes back to black at its end.
  f.black = house((t - (TOTAL - 0.45)) / 0.4);
  return f;
}

// ── The work ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};
const HOME = dir("release", "film");
const FRAME_DIR = dir("release", "film", "frames");
const FILE = path.join(HOME, "purify-1.9-release-film.mp4");
const frameFile = (n) => path.join(FRAME_DIR, `v${String(n).padStart(5, "0")}.jpg`);
const middle = (s) => Math.round(((s.at + s.until) / 2) * FPS) / FPS;

function encode() {
  for (let n = 0; n < FRAMES; n++) if (!fs.existsSync(frameFile(n))) fail(`frame ${n} is not rendered`);
  const common = ["-framerate", String(FPS), "-i", path.join(FRAME_DIR, "v%05d.jpg"), "-frames:v", String(FRAMES),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-tune", "film",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-an"];
  const kbps = 7000;
  const log = path.join(HOME, "x264-pass");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "1", "-passlogfile", log, "-f", "null", "/dev/null"], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "2", "-passlogfile", log, "-movflags", "+faststart", FILE], { stdio: "inherit" });
  const bytes = fs.statSync(FILE).size;
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration", "-of", "json", FILE]).toString());
  const v = info.streams[0];
  const record = { file: path.relative(ROOT, FILE), bytes, megabytes: Number((bytes / 1048576).toFixed(2)), seconds: Number(Number(info.format.duration).toFixed(2)), codec: `${v.codec_name} ${v.profile}`, size: [v.width, v.height], fps: v.r_frame_rate, pixels: v.pix_fmt, frames: Number(v.nb_frames), sound: info.streams.length > 1 ? "has a sound stream" : "none" };
  if (record.sound !== "none") fail("the file has a sound stream");
  if (Math.abs(record.seconds - TOTAL) > 0.02) fail(`the file is ${record.seconds}s, not ${TOTAL}`);
  record.export = process.env.VIDEO_EXPORT ?? fail("say which commit the export in out/ was cut from: VIDEO_EXPORT=<commit>");
  record.cuts = SHOTS.map((s) => ({ at: s.at, name: s.name }));
  fs.writeFileSync(path.join(HOME, "video.json"), JSON.stringify(record, null, 1));
  return record;
}

export { WORDS, TOTAL };

if (import.meta.url === `file://${process.argv[1]}`) {
  if (flag("times")) {
    console.log(JSON.stringify({ total: TOTAL, frames: FRAMES, beat: BEAT, cuts: SHOTS.map((s) => [s.at.toFixed(3), (s.until - s.at).toFixed(2), s.name]) }, null, 1));
    process.exit(0);
  }
  if (flag("encode")) {
    console.log(JSON.stringify(encode()));
    process.exit(0);
  }
  const browser = await launch();
  const stage = await openStage(browser);
  if (flag("at")) {
    const t = Number(flag("at"));
    await stage.wear(stateAt(t));
    const file = path.join(dir("release", "film", "stills"), `at-${t.toFixed(2)}.png`);
    fs.writeFileSync(file, await stage.shoot());
    console.log(file);
  } else if (flag("sheet")) {
    // The middle of every shot, or with --span a-b, twelve moments of that part.
    const times = flag("span") ? Array.from({ length: 12 }, (_, n) => lerp(...String(flag("span")).split("-").map(Number), n / 11)) : SHOTS.map(middle);
    const stills = [];
    for (const t of times) {
      await stage.wear(stateAt(t));
      stills.push(await sharp(await stage.shoot()).resize(270).toBuffer());
    }
    const cols = Math.min(stills.length, 7);
    const file = path.join(dir("release", "film", "stills"), flag("span") ? `sheet-${flag("span")}.jpg` : "sheet.jpg");
    await sharp({ create: { width: cols * 276, height: Math.ceil(stills.length / cols) * 486, channels: 3, background: "#666" } })
      .composite(stills.map((input, n) => ({ input, left: (n % cols) * 276 + 3, top: Math.floor(n / cols) * 486 + 3 })))
      .jpeg({ quality: 78 })
      .toFile(file);
    console.log(file);
  } else if (flag("check")) {
    const results = [];
    for (const s of SHOTS) {
      const t = middle(s);
      await stage.wear(stateAt(t));
      const result = await checkMock(stage.page, "[data-stage]");
      const failures = [...new Set(result.failures.map((x) => `${x.check}${x.palette ? ` (${x.palette})` : ""}: ${x.what}: ${x.detail}`))];
      results.push({ shot: s.name, at: t, pass: failures.length === 0, failures, allowed: result.allowed });
      console.log(`${failures.length ? "NO  " : "ok  "} ${s.name} (${t.toFixed(2)}s)${failures.length ? `\n      ${failures.slice(0, 8).join("\n      ")}` : ""}`);
    }
    fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
    process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
  } else {
    const started = Date.now();
    const [from, to] = flag("part") ? String(flag("part")).split("-").map(Number) : [0, FRAMES];
    let made = 0;
    for (let n = from; n < to; n++) {
      if (!flag("fresh") && fs.existsSync(frameFile(n))) continue;
      await stage.wear(stateAt(n / FPS));
      fs.writeFileSync(frameFile(n), await stage.shoot("jpeg"));
      made++;
    }
    console.log(`  ${made} frames (${from} to ${to} of ${FRAMES}), ${Math.round((Date.now() - started) / 1000)}s`);
    if (!flag("part")) console.log(JSON.stringify(encode()));
  }
  await browser.close();
}
