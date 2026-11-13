// The 1.9 video, scene by scene: what is shown, the words over it, where the
// picture stands and moves, and why (README.md has the reasons in full; the
// artifact page prints `why` beside each scene).
//
// No word is written here. Every title and line is read from the drop
// (../drop.json), from the store pictures' own lines (../store/results.json)
// or from the app's own labels (lib/i18n/messages/en.json), and `lines` only
// says where a title breaks. compose.mjs refuses a scene whose lines do not
// join back into the words they were read from, a word the drop may never
// say, and an em dash.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const fail = (text) => {
  throw new Error(text);
};

export const DROP = read("docs/plans/v1.9/drop.json");
const STORE = read("docs/plans/v1.9/store/results.json");
const APP = read("lib/i18n/messages/en.json");

const point = (id) => DROP.points.find((p) => p.id === id) ?? fail(`the drop has no point "${id}"`);
const caption = DROP.pieces.find((p) => p.id === "instagram-caption")?.text ?? fail("the drop has no caption");
/** A sentence of the drop's caption, by how it begins; it must be there, word for word. */
const sentence = (start) => caption.match(new RegExp(`${start}[^.]*\\.`))?.[0] ?? fail(`the caption has no sentence that begins "${start}"`);
/** A sentence of a point's own text. */
const said = (id, words) => (point(id).text.includes(words) ? words : fail(`the drop's point "${id}" does not say "${words}"`));
/** The line a store picture carries. */
const storeLine = (shot) => STORE.pictures.find((p) => p.shot === shot)?.caption ?? fail(`the store pictures have no "${shot}"`);
/** One of the app's own labels. */
const label = (key) => APP[key] ?? fail(`the app has no label ${key}`);

// Where the picture of the screen stands. `k` is the film's pixels to one of
// the app's; the app's point (206, fy) is put at the film's (540, Y).
/** Set down under the words, the whole screen in view, as the Play pictures stand it. */
export const set = () => ({ k: 1.66, fy: 0, Y: 492 });
/** Moved in close on a part of the screen: `fy` is the app's own y at the middle of what is looked at. */
export const near = (fy, k = 2.3) => ({ k, fy, Y: 1180 });
/** Edge to edge. */
export const full = (fy) => ({ k: 2.622, fy, Y: 1180 });

/**
 * The scenes, in order. For a scene of the app:
 *   take, from     the take it is cut from, and where: [mark, seconds after it] (a scene that joins has no `from`)
 *   seconds        how long it runs (the next scene begins 0.45s before it ends)
 *   cuts           [[seconds into the scene, [mark, offset]], ...]: the film jumps on to a later moment of its take
 *   cam            [[seconds into the scene, pose, seconds the move takes], ...]
 *   title, lines   the words, and where the title breaks
 *   sub            a smaller line under it
 *   keep           true: the words of the scene before stay as they are
 *   join           true: the same take going on from the scene before, with no change of picture; only the words change
 *   hold           true: the scene may rest on its take's last picture
 */
export const SCENES = [
  {
    id: "open",
    words: true,
    seconds: 2.5,
    title: sentence(`Purify ${DROP.release} is here`),
    lines: ["Purify 1.9", "is here."],
    sub: null,
    from: "the drop's caption, its first sentence",
    shows: "The app's cross and the release's name, over the hill of the store pictures.",
    why: "It opens the way the store pictures and the cards open, so the video reads as the same release at a glance. Two and a half seconds, because a feed decides in three.",
  },
  {
    id: "today",
    take: "today",
    from: ["start", 0.15],
    seconds: 3.5,
    cam: [[0, set()], [2.4, near(350, 2.1), 1.3]],
    title: storeLine("today"),
    lines: ["The day's saint,", "fast and readings"],
    from_words: "the store pictures' first line",
    shows: "Today on the feast of St Nicholas, drawn up under a finger to the Nativity Fast's night: day 22 of 40, the star a little higher.",
    why: "Today is what a reader meets first, and in the fast it carries the night. The picture moves in as the page is drawn up, so the night card is read and not just passed.",
  },
  {
    id: "journal",
    take: "journal",
    from: ["start", 0.15],
    seconds: 4.7,
    cam: [[0, set()], [1.25, near(560, 2.0), 0.8], [2.35, near(370, 2.1), 0.8], [3.7, near(330, 2.2), 0.8]],
    hold: true,
    title: point("journal").name,
    lines: ["Your journal,", "by the Church's day"],
    sub: said("journal", "Free for everyone."),
    from_words: "the drop's point \"journal\": its name, and its last sentence",
    shows: "A tap on You, a tap on Your journal, the day's page with a pen by each reading, and the pen by the Gospel: a page begun.",
    why: "The journal is 1.9's lead, so it comes first and gets the longest look. Three real taps show the way in, and the page transitions and the sheet rising are the app's own.",
  },
  {
    id: "verse",
    take: "verse",
    from: ["tools", -1.55],
    seconds: 3.75,
    cam: [[0, near(330, 2.1)], [2.0, near(420, 2.0), 0.8]],
    title: point("verse").name,
    lines: ["Every verse,", "opened"],
    sub: point("verse").short,
    from_words: "the drop's point \"verse\": its name and its short form",
    shows: "A finger held on John 1:1, its tools opening, and a highlight chosen.",
    why: "The hold is the gesture the release teaches, so the finger is shown resting and the sheet answers it. The highlight is the one result a viewer sees land on the verse.",
  },
  {
    id: "study",
    take: "verse",
    seconds: 3.6,
    cam: [[0, near(420, 2.0)], [1.2, near(520, 2.0), 0.8], [2.9, near(440, 2.1), 0.9]],
    join: true,
    title: point("study").name,
    lines: ["Study a verse,", "in Purify Plus"],
    from_words: "the drop's point \"study\": its name",
    shows: "Study tapped, and the verse's study sheet as a reader with no Plus meets it: the Greek and the commentary open, each Plus part under its own mark.",
    why: "Plus is named in the title and marked on the screen by the app itself, so nothing here is promised to every reader. It follows the verse without a break because it is the same sheet.",
  },
  {
    id: "bibles",
    take: "bibles",
    from: ["list", -0.45],
    seconds: 4.4,
    cuts: [[2.75, ["further", -0.08]]],
    cam: [[0, near(330, 2.0)], [1.3, near(560, 2.05), 0.8], [3.9, near(480, 2.05), 1.0]],
    title: point("bibles").short,
    lines: ["Six more Bibles", "to download"],
    from_words: "the drop's point \"bibles\": its short form",
    shows: "The translations list opened from the chapter's head and drawn up through the Russian, the Greek, the Serbian, the Arabic and the Spanish.",
    why: "The list itself is the proof: each Bible in its own script, with its size and its download mark. The picture stays on the sheet so the names can be read as they pass.",
  },
  {
    id: "calendar",
    take: "saints",
    from: ["start", 0.2],
    seconds: 3.6,
    cam: [[0, set()], [1.0, near(300, 2.0), 0.8], [3.0, near(480, 2.1), 0.9]],
    title: storeLine("calendar"),
    lines: ["Every feast", "and every fast"],
    from_words: "the store pictures' seventh line",
    shows: "The calendar turned back to November, the 23rd tapped, and the day drawn up to its fast and its saints.",
    why: "November's saints had their pages written for 1.9, and the calendar is how a reader reaches them. Two taps and one pull, with each day's fast mark in view on the way.",
  },
  {
    id: "saint",
    take: "saints",
    seconds: 4.8,
    cam: [[0, near(480, 2.1)], [1.6, near(300, 2.1), 0.9], [3.4, near(400, 2.15), 0.9]],
    join: true,
    title: storeLine("saint"),
    lines: ["The lives", "of the saints"],
    from_words: "the store pictures' sixth line",
    shows: "St Amphilochius of Iconium tapped on his day, his picture carried into his page, then Web: the saints he stood with at Constantinople.",
    why: "A card carrying its picture into its page is the house's own motion, and the web is the app's most alive screen. He is a November saint, and every picture in his web is clear of the heritage list.",
  },
  {
    id: "xenia",
    take: "xenia",
    from: ["start", 0.4],
    seconds: 3.0,
    cam: [[0, near(300, 2.2)], [2.8, near(330, 2.3), 2.4]],
    keep: true,
    title: storeLine("saint"),
    lines: ["The lives", "of the saints"],
    from_words: "the store pictures' sixth line, kept from the scene before",
    shows: "St Xenia of St Petersburg's page, her life drawn up.",
    why: "Her page was refined for 1.9 at his word. It has no picture yet (the permission is awaited), so the picture stands close on her name and the opening of her life, where the page is strongest.",
  },
  {
    id: "fathers",
    take: "fathers",
    from: ["work", -1.5],
    seconds: 4.7,
    cam: [[0, near(560, 2.0)], [2.3, near(330, 2.05), 0.9], [4.4, near(420, 2.2), 1.2]],
    title: storeLine("reading"),
    lines: ["The Fathers,", "read in full"],
    from_words: "the store pictures' eighth line",
    shows: "St Athanasius's writings, On the Incarnation tapped, its cover carried into the work, and the work drawn up.",
    why: "The books are shown as a reader opens one: the cover travels from the list into the page. St Athanasius, because the reading room's front page shows a cover on the heritage list and his do not.",
  },
  {
    id: "creed",
    take: "creed",
    from: ["creed", -0.75],
    seconds: 3.9,
    cam: [[0, near(360, 2.0)], [2.2, near(400, 2.25), 1.0]],
    title: point("creed").name,
    lines: ["The Creed", "by council"],
    from_words: "the drop's point \"creed\": its name",
    shows: "Theology, The Creed line by line tapped, and the Symbol drawn up with the words Constantinople added lit.",
    why: "The lit words are the whole idea of the page, and they read at once when the picture is close. It stands for the councils without showing the First Council's cover, which is on the heritage list.",
  },
  {
    id: "looks",
    take: "looks",
    from: ["black", -0.7],
    seconds: 4.1,
    cuts: [[2.5, ["the looks drawn up", -0.1]]],
    cam: [[0, near(330, 2.0)], [3.2, near(430, 2.05), 1.0]],
    title: label("ui.readingMode"),
    lines: ["Reading mode"],
    from_words: "the app's own label for the page (ui.readingMode)",
    shows: "Reading mode: True black chosen with a tap, then the looks drawn up, the Plus sets under the app's own Purify Plus mark.",
    why: "A look changing under a finger is the clearest effect in the app. Only a free look is chosen; the Plus looks are seen as the page lists them, marked, and never worn.",
  },
  {
    id: "close",
    words: true,
    seconds: 3.6,
    title: DROP.closing,
    lines: ["The Scriptures, the saints,", "the prayers and the calendar", "stay free."],
    sub: sentence("Find Purify"),
    from: "the drop's closing, and the caption's last sentence",
    shows: "The drop's closing line and where to find the app, over the hill, with the app's cross.",
    why: "The last thing said is the promise that the library stays free, in the drop's own words, then the two stores by name. No price, no badge and no call to hurry.",
  },
];

/** How long one scene runs over the next. */
export const OVER = 0.45;
