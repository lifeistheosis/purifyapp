// The ad's cut, stage 1: scenes 1 and 2 of the eight (../AD.md), and the one
// new thing between them, the phone that moves from scene to scene.
//
// Nothing of the app is drawn: each piece is found in the app's own page (the
// native export of main 6700c2e65, which is what the stores serve) by what it
// is, and take.mjs moves it. No word is written here: each scene's words are
// the first cut's own (../scenes.mjs), read from the store pictures' lines and
// the drop.
//
// A scene:
//   words     the first cut's scene whose title, lines and sub it wears
//   stand     how the phone stands: "front" or "side", as the store pictures stand that screen
//   lead      the film shows the bare screen this long before the pieces are let go
//   name      { attribute: selector }: a container named once, so its pieces can be found by what they are
//   pieces    the screen's pieces, in the order they arrive (below)
//   leave     for a scene that is followed: the screen empties `after` its last piece has rested,
//             each piece in `for` seconds, `each` after the one before, the house curve run backward
//   restAfter for the last scene: how long the built screen is left
//
// A piece:
//   pick   how it is found in the app's page
//   from   the side of the screen it comes in from ("above", "below", "start", "end"), or "near":
//          it is already carried in by the piece that holds it, and settles its last few pixels (`by`)
//   at     seconds after the pieces are let go
//   for    how long it travels, on the house curve
//   each   when `pick` finds several (`count` of them), how long after the one before each sets off
//   size   how small it starts (1 when not given)
//   why    the reason, for the page

export const SCENES = [
  {
    id: "today",
    words: "today",
    stand: "front",
    lead: 0.3,
    leave: { after: 0.25, for: 0.42, each: 0.03 },
    pieces: [
      { name: "the top bar", pick: "header[data-tab-topbar]", from: "above", at: 0, for: 0.7, why: "The screen's name comes first, so everything after it is read as Today." },
      { name: "the top bar's buttons", pick: "header[data-tab-topbar] [data-tab-actions] > *", from: "near", by: -34, at: 0.2, each: 0.07, count: 3, for: 0.55, why: "Plus, search and the bell drop into their places one after another: the buttons he asked to see move." },
      { name: "the day's card", pick: "header[data-day-lead]", from: "below", at: 0.12, for: 0.95, size: 0.94, why: "Today is now one card for the day, so it rises first and whole, the Nativity Fast's night at its head." },
      { name: "the day's line", pick: "header[data-day-lead] > div > p", from: "start", at: 0.56, for: 0.75, why: "The date and the feast, from the reading side, once the card is nearly at rest." },
      { name: "the saint's picture", pick: "header[data-day-lead] > div > div:nth-of-type(1) > span", from: "start", at: 0.66, for: 0.85, size: 0.8, why: "St Nicholas arrives before his name, as an icon is seen before it is read." },
      { name: "the saint's name", pick: "header[data-day-lead] > div > div:nth-of-type(1) > div", from: "end", at: 0.74, for: 0.85, why: "His name comes from the other side and meets his picture." },
      { name: "Morning prayers", pick: "header[data-day-lead] > div > div:nth-of-type(2) > div", from: "start", at: 0.94, for: 0.8, why: "The hour's prayer is named from the reading side." },
      { name: "Begin", pick: "header[data-day-lead] a[data-pray-hour]", from: "end", at: 1.02, for: 0.8, why: "The day's one bright button comes from the other side and lands under its name, so the eye ends on it." },
      { name: "Hymns of the feast", pick: 'header[data-day-lead] a[href$="#hymns"]', from: "near", by: 18, at: 1.5, for: 0.5, why: "The quiet second button settles last under the bright one." },
      { name: "the verse of the day", pick: "[data-route-content] article", from: "below", at: 1.2, for: 0.95, size: 0.94, why: "The next card comes to rest under the tab bar, which says there is more below." },
      { name: "the tab bar", pick: "nav[data-tab-bar]", from: "below", at: 1.42, for: 0.75, why: "The way round the app arrives last and closes the screen." },
      { name: "the five tabs", pick: "nav[data-tab-bar] li", from: "near", by: 30, at: 1.64, each: 0.06, count: 5, for: 0.5, why: "Today, Bible, Discover, Prayers, You: each steps up into the bar in turn." },
    ],
  },
  {
    id: "journal",
    words: "journal",
    stand: "side",
    lead: 0.05,
    restAfter: 1.5,
    pieces: [
      { name: "the top bar", pick: "[data-mobile-topbar]", from: "above", at: 0, for: 0.65, why: "Back and search come first, so the screen is read as a page inside the app." },
      { name: "the cross", pick: "[data-route-content] section header > svg", from: "near", by: -18, at: 0.2, for: 0.5, why: "The page's own small cross sets down at its head." },
      { name: "the page's name", pick: "[data-route-content] section header > h1", from: "start", at: 0.2, for: 0.75, why: "Your journal, from the reading side." },
      { name: "the page's line", pick: "[data-route-content] section header > p", from: "end", at: 0.28, for: 0.8, why: "What the journal is, in the app's own words, from the other side to meet its name." },
      { name: "the rule", pick: "[data-route-content] section header > span", from: "near", by: 10, at: 0.62, for: 0.45, why: "The short rule closes the heading before the day arrives." },
      { name: "the day's page", pick: "[data-journal-today]", from: "below", at: 0.42, for: 0.9, size: 0.94, why: "The scene's point: the journal goes by the Church's day, so the day's card has the longest travel." },
      { name: "the day's readings", pick: "[data-journal-today] li", from: "end", at: 0.92, each: 0.1, count: 2, for: 0.75, why: "The Epistle and the Gospel slide into the card one after the other, each with its pen: where a page begins." },
      { name: "Nothing written yet", pick: "[data-journal-empty]", from: "below", at: 0.78, for: 0.9, size: 0.94, why: "A new reader's journal is empty and says so; it rises after the day's page." },
      { name: "Write", pick: "[data-journal-write]", from: "below", at: 1.08, for: 0.8, why: "The page's one bright button, last of the page's own pieces, so the eye ends on it." },
      { name: "the tab bar", pick: "nav[data-tab-bar]", from: "below", at: 1.2, for: 0.7, why: "The way round the app closes the screen, as in scene 1." },
      { name: "the five tabs", pick: "nav[data-tab-bar] li", from: "near", by: 30, at: 1.4, each: 0.06, count: 5, for: 0.5, why: "The same five steps, so the two scenes read as one app." },
    ],
  },
];

/** When a scene's last piece has come to rest, in seconds after its pieces are let go. */
export const builtAt = (scene) => Math.max(...scene.pieces.map((p) => p.at + p.for + (p.each ?? 0) * ((p.count ?? 1) - 1)));
/** When a scene's last piece has left, in seconds after they begin to leave. */
export const leftAt = (scene) => scene.leave.for + scene.leave.each * (scene.pieces.filter((p) => p.from !== "near").length - 1);

/**
 * The moving phone: the one new thing. Between two scenes the phone itself travels from the way the first screen
 * stands to the way the next one stands, in one move that begins as the first screen starts to empty and ends as
 * the next is being built. One move, one way: it never goes past where it comes to rest and never comes back.
 *   starts   seconds after the first scene's pieces begin to leave
 *   for      how long it travels
 * The two stands are the store pictures' own (../../store/make.mjs): "front" upright and whole, "side" turned
 * 25 degrees. The side stand is the most the phone ever turns.
 */
export const MOVE = { starts: 0.05, for: 1.3 };

/** The film's length is what the two scenes and the move come to; compose.mjs works it out and holds it near seven seconds. */
export const ABOUT = 7;
