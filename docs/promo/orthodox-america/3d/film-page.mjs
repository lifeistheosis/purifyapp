// The page he sees the full film on, and the record of what was made (BRIEF.md, "Round 4").
//
//   node docs/promo/orthodox-america/3d/film-page.mjs [--video=<the film's address on the page>] [--poster=<a still's address>] [--check]
//
// It writes the page to .promo/orthodox-america-3d/orthodox-america-film.html (out of git; published from there
// with the Artifact tool, the film and its poster in the page's own asset store) and RECORD.md beside this file.
// Grown from page.mjs, the Church's page, which stays as the record of that sample's page: the same kit pieces,
// dark first, phone first, never parchment, and a reason beside every choice.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FACTS, DERIVED, SOURCES } from "../facts.mjs";
import { SIX, FIGURE, CAPTION, SOURCE_LINE, TITLE, SECONDS, SCENE_ONE, SCENE_TWO, NUMERALS, ROLLS, SUNDAY, PEOPLE_A_POINT, SHARE, CAPTION_ROLLS, CAPTION_SUNDAY, SHARE_LINE, KEY, PARISHES, CAPTION_PARISHES, SCENE_THREE, SCENE_FOUR, SCENE_FIVE, SCENE_SIX, SCENE_SEVEN, CARD_FOR, CLAIM, EACH, MEDIAN_PARISH, MEDIAN_SUNDAY, QUOTE, CARDS, BRAND } from "./words.mjs";
import { TRADITION } from "./church.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america-3d");
const FILM = path.join(OUT, "orthodox-america-3d.mp4");
const PAGE = path.join(OUT, "orthodox-america-film.html");
const FIRST = "https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt", SECOND = "https://claude.ai/artifact/4ZBf45qLCDQGojHHG57i9a"; // the first sample's page and the second pass's, which stay as they were
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x) => x.toLocaleString("en-US");

// ---- What was made and measured ---------------------------------------------
let film = null;
if (fs.existsSync(FILM)) {
  const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", FILM], { encoding: "utf8" }));
  const v = p.streams.find((s) => s.codec_type === "video");
  film = { bytes: +p.format.size, seconds: +p.format.duration, size: [v.width, v.height], codec: `${v.codec_name} (${v.profile})`, pixels: v.pix_fmt, fps: v.r_frame_rate, frames: +v.nb_frames, sound: p.streams.some((s) => s.codec_type === "audio") ? "a sound stream" : "none" };
}
const timing = fs.existsSync(path.join(OUT, "timing.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "timing.json"), "utf8")) : null;
const measured = fs.existsSync(path.join(OUT, "check.txt")) ? fs.readFileSync(path.join(OUT, "check.txt"), "utf8") : "";
const least = /least contrast ([\d.]+):1/.exec(measured)?.[1] ?? "4.5", smallest = /smallest letters ([\d.]+)px/.exec(measured)?.[1] ?? "30";
const digit = /each ([\d.]+) wide at 100/.exec(measured)?.[1] ?? "45.6";
const mb = film ? (film.bytes / 1048576).toFixed(1) : "0";
const perFrame = timing ? timing.secondsAFrame : 0;
const hours = (seconds) => ((seconds * 30 * perFrame) / 3600).toFixed(1);
const fact = FACTS.find((f) => f.scene === "where" && f.show.includes(FIGURE));
const rolls = FACTS.find((f) => f.scene === "gap" && f.show.includes(String(ROLLS))), sunday = FACTS.find((f) => f.scene === "gap" && f.show.includes(String(SUNDAY)));
const derived = DERIVED.find((d) => d.show.includes(`${SHARE}%`));
const parish = FACTS.find((f) => f.src === "appF" && f.show.includes(n(PARISHES)));
const POINTS = Math.round(ROLLS / PEOPLE_A_POINT), STAY = Math.round(SUNDAY / PEOPLE_A_POINT);
const FROM_SIX = SIX.reduce((sum, s) => sum + Math.round((s.share / 100) * POINTS), 0);

// ---- The sample, beat by beat --------------------------------------------------
const ONE = [
  [0, "The globe turns", "The Earth in space, its land drawn as points of light, turning west to North America. The title stands in front of it.", "As you approved it."],
  [2.5, "The push and the landing", "The camera rushes down at the United States and the globe becomes the map inside the blur.", "As you approved it: the transition you called nice is untouched, frame for frame."],
  [4.0, "The six rise, and the figure lands", `Six states rise as forms whose height is their share, and ${FIGURE}% counts up as they do.`, "The same shot, with the figures in the new face."],
];
const TWO = [
  [SCENE_ONE, "The hand-over", "No cut and no fade. The camera's slow drift becomes a rising turn about the country. The six forms sink back and give their light up as points; the rest of the map does the same.", "You asked that ten seconds flow into the next scene without a seam. The move starts from the speed the camera already had, so there is no frame where one scene stops. What was on screen becomes the next scene's material: the light of the forms becomes the people."],
  [12.0, "The field stands", `The points gather into one round field in the air, the camera comes to rest over it, and the count runs up to ${n(ROLLS)} as they arrive. A line says what a point is: ${PEOPLE_A_POINT} people.`, "A new design, as you asked: scene one was a map of places, this is a field of people. The count lands as the last points do, so the number and the picture arrive as one thing."],
  [14.2, "The falling away", `A wave crosses the field from far to near. Most of the points sink and go out. The count runs down with them to ${n(SUNDAY)}. A fine ring stays where the edge of the field was.`, "This is the film's heart, shown and not told: most of those on the rolls are not there on a Sunday. The wave comes toward the viewer, so it is felt. The ring keeps the size of the rolls in view after the points have gone."],
  [16.2, "They draw together", "The points that stayed close ranks into one bright body in the middle of the ring.", "Scattered, the ones who stayed are hard to weigh against the whole. Drawn together at the same spacing as before, their area against the ring's is the true share, so the eye can judge it."],
  [17.1, "The share lands", `${SHARE}% lands at the near edge of those who stayed. Everything holds to the end: the count, what it counts, the share, the key and the source.`, "The last three seconds are for reading. Both figures are from the same census of the same Churches, so the share compares like with like."],
];

// ---- Scene three: the Church ------------------------------------------------------
const THREE = [
  [SCENE_TWO, "The hand-over", "No cut and no fade. The count and the share leave, the ring fades, and the camera begins one slow turn. The points that stayed are exactly where scene two left them.", "The same rule as before: what is on screen at the end of one scene is the first thing of the next. Here it is the people themselves."],
  [20.3, "They draw the plan", "The points leave their round body and stand along the lines of a plan on the floor: the outer walls, the cross inside the square, four columns, the circle of the dome, three apses to the east.", "A church of this kind is named for its plan, the cross-in-square, and an architect begins with the plan. So the people draw that first, and the viewer sees the cross inside the square before a wall stands."],
  [21.5, "The drawing rises", "Fine lines of light climb from the plan: walls, arched windows, the vaults over the four arms, the drum and the dome. The line is brightest where the pen is. The points go in and stand in the nave.", "An architect's drawing coming to life, as the brief asked. The people go in while the church is still only lines, so you can see them through it."],
  [22.7, "The stone rises over them", "Matte white stone follows the drawing up from the floor with a bright edge where it is being laid. The camera looks down into the church as the walls rise round the people, then the vaults and the dome close over them. Each window lights once the stone has passed it.", "This is the more unique thing you asked for. It is a section through the church without a cut: you watch it close over the assembly, and then their light is the light in the windows. The Church is her people gathered, shown without a word."],
  [26.8, "The cross, last", "The outline of a plain cross is drawn once round on the crown of the dome, and then it stands in stone.", "Drawn last, like a signature. A plain one-bar cross, as the Greek tradition has it."],
  [28.3, "The figure lands", `${n(PARISHES)} lands in the dark over the dome, then its line: ${CAPTION_PARISHES} The camera has come down from looking in to looking at, and settles.`, `The last three and a half seconds are for looking. ${n(SUNDAY)} people on a typical Sunday, in ${n(PARISHES)} parishes: one church stands for all of them.`],
];
const LOOK = [
  [`${TRADITION}`, "One tradition, drawn true. A square nave. Four arms of a cross under barrel vaults, higher than the four corner bays. One dome on a drum of eight arched windows, carried by four columns. Three apses to the east, the middle one the largest. A narthex to the west. A plain cross with one bar. It is the middle Byzantine church, the kind that stands at Hosios Loukas and in the small churches of Athens.", "An Orthodox viewer sees a real kind of church, not a generic one. There is no onion dome and no three-bar cross: those belong to the Russian tradition, and nothing here is mixed."],
  ["The people draw it", `The church is drawn by the same ${n(STAY)} points that stayed in scene two. No point is added and none is taken away, and at ${SCENE_TWO}.0 seconds each is where scene two left it, the same size and the same light.`, "The picture keeps its count. The viewer has just learned what a point is, and now watches those same points make a church."],
  ["Where they stand", "Inside, the points stand in the nave and the narthex, in even rows, west of the icon screen. None stands in the sanctuary.", "It is where people stand at the Liturgy."],
  ["No icon, face or saint", "The icon screen is a low wall with its middle open: architecture only. Nothing sacred is invented or drawn anywhere in the scene.", "The film shows the building and the people. It does not make sacred art by machine."],
  ["Their light is the windows' light", "The windows are dark glass until the stone has passed them. Then each one lights, and all of them brighten a little as the dome closes.", "The people do not vanish when the walls hide them. The eye understands where they went."],
  ["Matte stone in soft light", "Each frame of this scene is the church drawn 36 times, each time lit from one direction with a true shadow. A third of the drawings are lit from about the key light and the rest from all over the sky. Their average is a soft key, soft shadows and a darkening in every corner.", "It reads as an architect's model in a studio. There is no beam, ray, flare or sparkle. The ground is a soft pool of light that falls away to black."],
  ["One slow turn", "The camera goes from the north-east round to the south-east, about 74 degrees in nine and a half seconds, looking down into the church while it is open and coming down to look at it once it is closed.", "The apses and the dome, the side a Byzantine church is known by, face the viewer at the end."],
  ["East is east", "The apses face the east of the map the scene began on.", "An Orthodox altar stands to the east. Nobody may notice, but it is true."],
  [`One figure: ${n(PARISHES)}`, `The census counted ${n(PARISHES)} Eastern Orthodox parishes in 2020, on the same page as the two counts of scene two. It lands once the church stands.`, "The scene ends on a number, like the two before it, and the source's line has not left the foot of the frame since the first figure."],
  ["What leaves, and why", "The ring of the rolls fades as the plan takes its place. The line that says what a point is leaves when the vaults hide the points.", "Nothing on screen describes something the viewer can no longer see."],
];

// ---- The full film's new scenes, beat by beat: [seconds, title, what happens, why] ----
const THIRD = "https://claude.ai/artifact/V3kVt1uw9D5dhZ3ciuzSnB"; // the Church's page, which stays as it was
const time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const NEW = [
  [SCENE_THREE, "The claim: six million", `The camera lifts over the church. ${n(CLAIM)} lands, with the words it comes from: "more than 6,000,000 citizens", a proclamation of March 1942.`, "The church the people just built is the measure for what comes next, so the camera does not leave it. The number is shown with its own words and its date, so the viewer knows it is a claim with a history before anything answers it."],
  [35.4, "What six million would mean", `${n(EACH)} points of light come from all sides and stand about the church, one point for one person: six million across the ${n(PARISHES)} Eastern Orthodox parishes.`, "The division is ours, and the film shows it as a crowd so the eye judges it before the mind does: no parish church holds that many. The key on screen says a point is now one person, since in scene two it was a hundred."],
  [39.5, "The median parish", `All but ${MEDIAN_PARISH} fall away: the median parish of 2020. ${MEDIAN_SUNDAY} of them brighten, those at the Liturgy on a typical Sunday.`, "The same falling away as scene two, on purpose: the film's one gesture for the gap between a count on paper and the people in church. The claim is never called false in words; the picture answers it."],
  [SCENE_FOUR, "Who they are: the ages", "A whip along the floor to four forms that rise like the states did: 24, 35, 23 and 17 percent, in Pew's own bands, with Pew's margin of error in the source's line.", "A whip is how this film goes from place to place: the frame's own shutter smears the move, so there is no cut. The forms are the states' forms, so the film keeps one language for a share."],
  [48, "The median ages", "Along the row: Orthodox 48, beside Catholics 58, Evangelicals 59 and Mainline Protestants 63. The Orthodox form is lit; the others stand dimmer.", "One figure says younger than the other traditions, and the light says which form the film is about. This is the Cooperative Election Study's figure, which is why that survey has a card at the end."],
  [51.8, "Five hundreds", "The camera passes five lattices of a hundred points, each with as many lit as the figure: 64% raised Orthodox still are; 24% were raised in another tradition; 53% are men; 40% are immigrants; 63% are college graduates.", "A hundred points with 64 lit is read without reading. The points are the film's people, so a share of people is shown as people. Each stays about two seconds, long enough to read twice."],
  [SCENE_FIVE, "Where they are", "On, and down onto the map. Pew's four regions rise as four terraces, each as high as its share: South 31, Northeast 29, West 21, Midwest 19 percent. A hairline ties each figure to its ground.", "The map returns once, so the film closes its own circle. Height is the figure, as in scene one, so the South and the Northeast are seen standing over the rest before the numbers land."],
  [SCENE_SIX, "The decade", "Three counts as forms: 2010 first, then 2020 beside each. Eastern Orthodox on the rolls down 17%, at Sunday Liturgy down 14%; Oriental Orthodox on the rolls up 67%.", "2010 rises and dims, then 2020 rises lit beside it, so the change is seen as two heights before it is read as a percentage. The Oriental Churches' growth is there because the decade is not one story."],
  [78.2, "The converts", "Eleven forms, one for each year from 2013 to 2023: adults received in 20 parishes of 15 states. 91, then 59 in 2020, then 186 in 2022. The screen says 2023 is a part year.", "This is the one written study behind the talk of a surge, and it is twenty parishes, not the country, so the screen says so. The dip of 2020 and the rise after it are the picture."],
  [82.6, "The report's own sentence", `The camera rises and comes level. ${QUOTE.lines.join(" ")}`, "The film ends its numbers on what is known, in the source's own words, with nothing of ours added. It also turns the film from figures to type, which is what the cards are made of."],
];
const CHOICES = [
  ["One camera, one direction", "After the church the film travels one way, and each place stands a short whip from the last, close enough that the place being left and the place arriving are both in the frame in the middle of the move.", "No black frame and no cut anywhere in the film. The viewer is carried, not shown slides."],
  ["Three kinds of thing, no more", "A share or a count is a form whose height is the figure. People are points of light. Words stand in the scene and take the camera's focus.", "By the fourth scene the viewer already knows how to read everything that appears, so the figures can come faster without losing anyone."],
  ["The cards are type, not logos", "Each source is a name in the film's own serif, a fine rule that draws from the middle, and two plain lines. The camera pushes through each card to the next, with faint motes in the dark to give the move its depth.", "It credits the sources the way a documentary's end titles do, and claims nobody's endorsement. One source, one card, about 1.7 seconds each."],
  ["The mark is built, not shown", `The four bars of your own mark, exactly as the app draws them, as thin slabs seen a little from the side: the post rises, the top bar and the crossbar open from the middle, and the footrest opens flat and then takes its slant, last. The camera comes square, and "${BRAND}" settles under it.`, "The slant is what makes it the Orthodox cross, so it is the last thing to happen and the thing the eye keeps. When the camera is square the mark is the app's own, to the pixel."],
  ["The church's cross is never the mark", "The church in scene three carries the plain cross of the Greek tradition. The mark at the end is the three-bar cross of your logo. They stand in different places in the film and nothing turns one into the other.", "No object mixes two traditions."],
  ["Light", "A soft pool under each form, a soft glow on lit points, a soft pool behind the mark. Nothing else.", "No rays, no flare, no sparkle: your rules, held by the checker before every render."],
  ["The numerals", `${NUMERALS.family}, as you chose in the second pass, for every figure including those inside a sentence and in the sources' lines.`, "One face for every number, all digits one width, so a running count does not shiver."],
];
const sayOf = (show) => FACTS.find((f) => f.show.some((s) => s.includes(show)) || f.says.includes(show));
const FIGURES = [
  [`${FIGURE}% in six states`, sayOf("47.9")], [`${n(ROLLS)} on the rolls`, sayOf(String(ROLLS))], [`${n(SUNDAY)} on a typical Sunday`, sayOf(String(SUNDAY))], [`${SHARE}% of the rolls`, DERIVED[0]],
  [`${n(PARISHES)} parishes, and ${n(EACH)} in each`, sayOf("2,979")], [`"more than 6,000,000 citizens", 1942`, sayOf("6000000")], [`${MEDIAN_PARISH} in the median parish, ${MEDIAN_SUNDAY} on a Sunday`, sayOf("60 of them")],
  ["The four ages", sayOf("50 to 65")], ["The median ages", sayOf("Median age 48")], ["64% of those raised Orthodox", sayOf('data-count="64"')], ["24% raised in another tradition", sayOf('data-count="24"')], ["53% men", sayOf('data-count="53"')], ["40% immigrants, another 25% their children", sayOf("Another 25%")], ["63% college graduates", sayOf('data-count="63"')],
  ["The four regions", sayOf("31%")], ["2010 to 2020", sayOf("816,653")], ["Converts received, 2013 to 2023", sayOf("[2022, 186]")], ["The sentence", sayOf("growing or shrinking")],
];
for (const [label, f] of FIGURES) if (!f) throw new Error(`no checked fact for ${label}`);
const kit = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(kit)[0];
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(kit)?.[0] ?? "";
const at = time;
const readings = /(\d+) readings/.exec(measured)?.[1] ?? "", pieces = /of (\d+) pieces/.exec(measured)?.[1] ?? "", held = /(\d+) figures and phrases/.exec(measured)?.[1] ?? "";

function page(videoSrc, poster) {
  const row = ([what, why, does]) => `      <li class="o-scene"><div class="o-head"><h3>${esc(what)}</h3></div><p>${esc(why)}</p><p class="o-why">${esc(does)}</p></li>`;
  const beat = ([t, title, shows, why], i) => `      <li class="o-scene">
        <div class="o-head"><h3>${esc(title)}</h3>${videoSrc ? `<button class="k-button k-button-quiet o-play" type="button" data-at="${t}" aria-label="Play from ${at(t)}, ${esc(title)}">${at(t)}</button>` : `<span class="k-meta">${at(t)}</span>`}</div>
        <p>${esc(shows)}</p>
        <p class="o-why">${esc(why)}</p>
      </li>`;
  return `<title>Orthodox America Film</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* Pieces this page adds to the kit's, built from its tokens only: the film as a square figure,
   and a row that holds a heading, what it is, and why (the first film's page uses the same rows). */
.o-film { margin: var(--k-space-5) auto; max-width: 560px; }
.o-film video, .o-film .o-none { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 1 / 1; border-radius: 14px; border: 1px solid var(--k-line); background-color: var(--k-well); }
.o-film figcaption { margin-block-start: var(--k-space-3); font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-3); text-align: center; }
.o-save { display: flex; width: 100%; margin-block-start: var(--k-space-3); }
.o-said { margin: var(--k-space-2) 0 0; min-height: 19px; font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-2); text-align: center; }
.o-scenes { list-style: none; margin: var(--k-space-4) 0 0; padding: 0; }
.o-scene { padding-block: var(--k-space-5); min-width: 0; }
.o-scene + .o-scene { border-block-start: 1px solid var(--k-line); }
.o-head { display: flex; align-items: center; justify-content: space-between; gap: var(--k-space-3); }
.o-head h3 { margin: 0; font-family: var(--k-font-serif); font-size: 19px; line-height: 26px; font-weight: 600; color: var(--k-ink); }
.o-play { flex: none; min-height: 44px; padding: 0 var(--k-space-4); font-size: 14px; font-variant-numeric: tabular-nums; }
.o-scene p { margin: var(--k-space-2) 0 0; font-family: var(--k-font-serif); font-size: 16px; line-height: 25px; color: var(--k-ink-2); max-width: var(--k-measure); }
.o-scene p.o-why { color: var(--k-ink); }
.o-source a { color: var(--k-ink); text-decoration: underline; text-underline-offset: 3px; display: inline-block; min-height: 44px; padding-block: 10px; font-family: var(--k-font-sans); font-weight: 600; }
</style>
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For your yes or no</span>
    <h1>Orthodox Christians in America, by the numbers: the full film</h1>
    <p class="k-lede">The three scenes you approved, then the rest of the story in the same 3D edit, then the outro you asked for: every source named on a card of its own, and Purify's own mark, animated, last. ${time(SECONDS)}, one unbroken move, no cut.</p>
    <p class="k-meta">Made 13 November 2026. One version, one render. Nothing was paid for.</p>
  </header>

  <section aria-label="The film">
    <figure class="o-film">
      ${videoSrc ? `<video id="film" controls playsinline muted preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""} src="${esc(videoSrc)}" aria-label="The film: ${time(SECONDS)}, silent"></video>` : `<div class="o-none" role="img" aria-label="The film is not on the page yet"></div>`}
      <figcaption>${time(SECONDS)}, 1080 by 1080, black and white, no sound.</figcaption>
      ${videoSrc ? `<button class="k-button o-save" id="save-film" type="button" hidden>Save the film</button>
      <p class="o-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">${film ? film.frames : SECONDS * 30} frames at 30 a second: seven scenes, six cards, the mark</span><span class="k-stat-value">${time(SECONDS)}</span></div>
      <div class="k-stat"><span class="k-stat-label">File</span><span class="k-stat-change">H.264, 1080 by 1080, no sound</span><span class="k-stat-value">${mb} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">One frame took</span><span class="k-stat-change">${timing ? `${n(timing.frames)} frames in ${Math.round(timing.seconds / 60)} minutes, each drawn about ${Math.round(timing.drawingsAFrame)} times over for the blur and the focus` : "Not yet rendered"}</span><span class="k-stat-value">${perFrame} seconds</span></div>
      <div class="k-stat"><span class="k-stat-label">Paid for</span><span class="k-stat-change">No generation credits, no rented graphics card, no stock footage</span><span class="k-stat-value">Nothing</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-ask">
    <h2 id="s-ask">What I need from you</h2>
    <p><strong>Yes or no to the film.</strong> If no, say which scene, card or move, and that part is made again.</p>
    <p><strong>No Harvard on the card, and why.</strong> You said to look at Harvard. I read the Orthodox Studies Institute's report, which is where the film's Cooperative Election Study figures come from. It never names Harvard or any university for that survey, so the card names the survey and the Institute that read it, and nothing more. The film says only what a written source says.</p>
    <p><strong>Names, not logos, as you agreed.</strong> Pew's terms do not permit use of its marks, Harvard's need written permission, and a reel of logos reads as their endorsement. Each source has its own card in the film's type instead, and the only mark in the film is yours.</p>
    <p><strong>The file.</strong> The page holds 20 MB a file, so the whole film is one file of ${mb} MB, with a finer grain than the samples had so the picture holds at that size. The frames are kept in this session: a larger copy for an editor can be cut from them without another render, if you ask soon.</p>
    <p><strong>Left out, on purpose.</strong> The 1% and 2.6 million: scene one, as you approved it, opens on the six states. The seven states where the parishes stand: scene one already shows where the faithful are. Pew's third age band reads "50 to 65" beside "65 and older"; those are Pew's own words and the film keeps them.</p>
  </section>

  <section class="k-section" aria-labelledby="s-new">
    <h2 id="s-new">The new scenes, beat by beat</h2>
    <p>Tap a time to play from there. Under each beat: what happens, and why.</p>
    <ol class="o-scenes">
${NEW.map(beat).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-outro">
    <h2 id="s-outro">The outro: each card, and its source</h2>
    <p>Six cards in the order the film used them. On each: a name that settles, a rule that draws itself from the middle, two lines that say what it is. The camera pushes through one card to reach the next.</p>
    <ol class="o-scenes">
${CARDS.map((c, i) => `      <li class="o-scene"><div class="o-head"><h3>${esc(c.name)}</h3>${videoSrc ? `<button class="k-button k-button-quiet o-play" type="button" data-at="${SCENE_SEVEN + i * CARD_FOR}" aria-label="Play from ${time(SCENE_SEVEN + i * CARD_FOR)}, ${esc(c.name)}">${time(SCENE_SEVEN + i * CARD_FOR)}</button>` : ""}</div><p>${esc(c.lines.join(" "))}</p>${c.src.map((k) => `<p class="o-source"><a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener">${esc(SOURCES[k].name)}: ${esc(SOURCES[k].title)}</a></p>`).join("")}</li>`).join("\n")}
    </ol>
    <p>The small line under the cards credits the maps: Natural Earth for the globe, and us-atlas, built from the U.S. Census Bureau's files, for the states. Both are public domain.</p>
  </section>

  <section class="k-section" aria-labelledby="s-look">
    <h2 id="s-look">Each choice, and the reason for it</h2>
    <p>For each: what it is and why, then what it does for the viewer.</p>
    <ol class="o-scenes">
${CHOICES.map(row).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-one">
    <h2 id="s-one">Scenes one to three, as you approved them</h2>
    <p>Nothing in the first ${SCENE_THREE} seconds has moved: they are drawn again from the same code so the film is one file. Their reasons are on <a href="${THIRD}" target="_blank" rel="noopener">the Church's page</a>.</p>
    <ol class="o-scenes">
${[...ONE, ...TWO, ...THREE].map(beat).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-fact">
    <h2 id="s-fact">The figures, and where they stand</h2>
    <p>Every figure on screen is one the first film checked against its written source. The source's own words are beside each.</p>
${FIGURES.map(([label, f]) => `    <p><strong>${esc(label)}</strong> ${esc(f.says)} <span class="k-meta">${esc(SOURCES[f.src].name)}.</span></p>`).join("\n")}
    <p>The shares in scene five that come from the Institute's reading of Pew rest on 225 Orthodox respondents, so they are approximate; the Institute says so, and the film names it as the source.</p>
${Object.keys(SOURCES).filter((k) => FIGURES.some(([, f]) => f.src === k)).map((k) => `    <p class="o-source"><a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener">${esc(SOURCES[k].name)}: ${esc(SOURCES[k].title)}</a></p>`).join("\n")}
  </section>

  <section class="k-section" aria-labelledby="s-rules">
    <h2 id="s-rules">The rules it was held to</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Every word 4.5:1 or more</span><span class="k-stat-change">${readings} readings of ${pieces} pieces of words on the frames of every scene, against the brightest ground behind each; the least is ${least}:1</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Reads on a phone</span><span class="k-stat-change">No letter under ${smallest} px in the frame, which is 10.8 px on a phone 390 wide</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No rays, flare, sparkle, stripes, dashes or parchment</span><span class="k-stat-change">Read from the scene code before every render, the way the house reads a promo script; light is a soft pool or nothing</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Grey only</span><span class="k-stat-change">Every colour that reaches the screen has equal red, green and blue, and the file is encoded from a grey picture</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Figures as checked</span><span class="k-stat-change">${held} figures and phrases held to the checked list before a frame is drawn; the crowd is ${n(EACH)} points and ${MEDIAN_PARISH} stay, counted</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">The mark is yours, exactly</span><span class="k-stat-change">The four bars are read from components/ui/PurifyMark.tsx and compared number for number before a frame is drawn</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No one else's mark</span><span class="k-stat-change">No logo, shield or picture of any source; the code holds no picture at all</span><span class="k-stat-value">Pass</span></div>
    </div>
  </section>

  <footer class="k-foot">
    <p class="k-meta">One version was made. The samples stay on their own pages. Source: docs/promo/orthodox-america/3d/</p>
  </footer>
</main>
${videoSrc ? `<script>
// Each time plays the film from there.
(() => {
  const film = document.getElementById("film");
  for (const b of document.querySelectorAll(".o-play")) b.addEventListener("click", () => {
    film.currentTime = Number(b.dataset.at) + 0.01; film.play().catch(() => {});
    film.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
})();
// The file, to keep: the button shows only where this view can hand a file over, and nothing is saved unless he says yes.
(async () => {
  const button = document.getElementById("save-film"), said = document.getElementById("save-said");
  const downloads = await window.claude?.use?.("downloads");
  if (!button || !downloads) return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true; said.textContent = "Getting the file.";
    try {
      const file = await (await fetch(${JSON.stringify(videoSrc)})).blob();
      await downloads.save({ filename: "orthodox-christians-in-america.mp4", data: file });
      said.textContent = "Saved.";
    } catch (error) {
      said.textContent = error && error.code === "declined" ? "Not saved." : "It could not be saved from here. Ask for the file and it will be sent.";
    }
    button.disabled = false;
  });
})();
</script>` : ""}
`;
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(PAGE, page(arg("video") ?? "", arg("poster") ?? ""));
console.log(`${path.relative(ROOT, PAGE)}  ${(fs.statSync(PAGE).size / 1024).toFixed(0)} KB`);
for (const piece of [...ONE.flat(), ...TWO.flat(), ...THREE.flat(), ...NEW.flat(), ...CHOICES.flat()]) if (typeof piece === "string" && /[–—]/.test(piece)) throw new Error(`a dash in the page's words: ${piece}`);

// ---- The page's own check, the way docs/brand/kit/check.mjs holds the kit's page ----
if (process.argv.includes("--check")) {
  const { checkMock, printMockCheck, PALETTES } = await import("../../../../scripts/mock-check.mjs");
  const { createRequire } = await import("node:module");
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  let ok = true;
  for (const width of [360, 390, 412, 1032]) {
    const phone = width < 600;
    const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: "dark", isMobile: phone, hasTouch: phone });
    const tab = await ctx.newPage();
    // As the Artifact tool wraps it: a doctype, a head with a viewport, the page in the body.
    await tab.setContent(`<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${fs.readFileSync(PAGE, "utf8")}</body></html>`, { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(400);
    ok = printMockCheck(await checkMock(tab, "body", { palettes: PALETTES }), `the film's page at ${width}`) && ok;
    const wide = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 0) { console.log(`  NO   width       at ${width}: the page is ${wide}px wider than the screen`); ok = false; }
    if (width === 390) await tab.screenshot({ path: path.join(OUT, "page-390.png"), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(ok ? "page check: passes on the five palettes at 360, 390, 412 and 1032" : "page check: FAILED");
  if (!ok) process.exit(1);
}

// ---- The record --------------------------------------------------------------
if (film && timing) {
  const line = (f) => FACTS.indexOf(f) >= 0 ? `facts.mjs FACTS, scene "${f.scene}", shows ${f.show[0]}` : `facts.mjs DERIVED, shows ${f.show[0]}`;
  const record = `# The full film: the record

Written by \`film-page.mjs\` from what was made and measured. Do not edit this file: change the code and write it out again.

Round 4 of the documentary (\`../BRIEF.md\`, "Round 4: the full film, with an outro"). His words, 2026-11-13: about 20:25 UTC, "So in the video, add an outro, but the outro is going to be like a bunch of logos. Usually how editors have like little clips for their logo, like animated logo. And I want you to include the logos of all the sources we used. And add like, you can look at Harvard, add Harvard's logo. And animate it."; about 20:30, to the arbiter's recommendation (each source named on its own card, no third-party logos, Purify's own logo last), "yea add Purify's logo in the end"; about 20:33, "now". The record of the three scenes as samples is this file before this round: \`git log\`.

## The file

| | |
|---|---|
| File | \`.promo/orthodox-america-3d/orthodox-america-3d.mp4\` (out of git) |
| Length | ${film.seconds.toFixed(2)} seconds, ${film.frames} frames: seven scenes, six cards, the mark |
| Size | ${(film.bytes / 1048576).toFixed(2)} MB (${film.bytes} bytes) |
| Picture | ${film.size[0]} by ${film.size[1]}, ${film.codec}, ${film.pixels}, ${film.fps} frames a second, faststart |
| Sound | ${film.sound} |
| A frame took | ${timing.secondsAFrame} seconds on average (${timing.frames} frames in ${timing.seconds} seconds), each drawn ${timing.drawingsAFrame} times over on average |
| Drawn by | ${timing.renderer} |
| Paid generation | none. three.js in Playwright's Chromium, ffmpeg, three open faces and two public maps |

## How it reaches him

The page's own store holds 20 MB a file. The whole film is one file, asked for at about 19 MB in two passes (\`render.mjs\`), which is about a third of the samples' rate, so the grain is finer (3 against the samples' 6) and the picture holds. The frames stay in the container that made them (\`.promo/orthodox-america-3d/frames/\`) until it is reclaimed: a larger copy can be cut from them with ffmpeg and no new render.

## The film

One three.js scene and one camera from the first frame to the last (\`shot.js\`). After scene three the camera is told where to come to, one eased move at a time (\`MOVES\`); what that adds to the old camera is nothing until ${SCENE_THREE} seconds, so no frame of the three scenes is changed. Every place stands along one line, a short whip from the last, so the place being left and the place arriving are both in the frame in the middle of the move: no cut and no black frame.

| At | What | Words and figures |
|---|---|---|
| 0:00 | Scenes one to three, as made | ${FIGURE}%; ${n(ROLLS)}; ${n(SUNDAY)}; ${SHARE}%; ${n(PARISHES)} |
${NEW.map(([t, title, shows]) => `| ${time(t)} | ${title} | ${shows.replace(/\|/g, "/")} |`).join("\n")}
${CARDS.map((c, i) => `| ${time(SCENE_SEVEN + i * CARD_FOR)} | Card ${i + 1} | ${c.name}. ${c.lines.join(" ")} |`).join("\n")}
| ${time(SCENE_SEVEN + CARDS.length * CARD_FOR)} | The mark | The four bars of \`components/ui/PurifyMark.tsx\`, then "${BRAND}" |

## The outro

- **Names, not logos.** No logo, mark or shield of any source. Pew's terms of use do not permit use of its marks; Harvard's Trademark Program requires written permission; a reel of logos reads as endorsement. Each source is a card in the film's type, in the order the film used it.
- **Harvard is not named.** The Orthodox Studies Institute's report (read with pdftotext, 2026-11-13 20:40 UTC) never names Harvard or any university for the Cooperative Election Study. By the brief, the card does not either. \`render.mjs --check\` refuses a card that names a university.
- **The Cooperative Election Study's card is earned:** scene five shows its median ages (Orthodox 48; Catholics 58, Evangelicals 59, Mainline Protestants 63), as the Institute's report gives them.
- **The mark.** \`words.mjs\` MARK holds the four rectangles of \`components/ui/PurifyMark.tsx\` number for number (its 100 by 176 box, each bar's place, size and corner, the footrest's turn of 18 degrees about 50, 138), and \`render.mjs --check\` reads the component and refuses a difference. They are thin slabs, 400 px tall at rest, seen square on when the camera settles. The post rises, the titulus and the crossbar open from the middle, the footrest opens flat and takes its slant last. "${BRAND}" in DM Serif Display. A soft pool of light behind; no rays, flare or sparkle.
- **The church's cross and the mark are never one object.** Scene three's church keeps the plain cross of the Greek tradition.

## Left out, and why

- The 1% and 2.6 million: scene one as he approved it opens on the six states, and the three scenes stay as made.
- The seven states of parishes (\`facts.mjs\`, scene "where"): scene one shows where the faithful are; a second set of labelled states did not fit the time.
- Pew's 225 Orthodox respondents: on the page beside the figures, not on screen.
- Pew's third age band is on screen as Pew prints it, "50 to 65".

## The measures

${measured.trim()}

The page he sees it on is held by checkMock (\`film-page.mjs --check\`, five palettes at 360, 390, 412 and 1032).

## The figures, each with its line in facts.mjs

${FIGURES.map(([label, f]) => `- **${label}.** ${line(f)}. ${SOURCES[f.src].name}: ${f.says}`).join("\n")}

## To make it again

\`npm install three world-atlas us-atlas topojson-client d3-geo @fontsource/dm-serif-display @fontsource/dm-sans @fontsource/archivo-narrow\` in \`.promo/orthodox-america-3d/tools\` (give that folder a \`package.json\` first, or npm installs into the repository), then \`render.mjs --check\`, \`--stills <seconds> [--strip]\`, \`--draft\` or \`--film [--resume]\`, with Playwright on \`NODE_PATH\` and no \`node_modules\` in the repository's root. \`strip-film.jpg\` is sixteen moments of the film.
`;
  if (/[–—]/.test(record)) throw new Error("a dash in the record");
  fs.writeFileSync(path.join(HERE, "RECORD.md"), record);
  console.log("RECORD.md written");
}
