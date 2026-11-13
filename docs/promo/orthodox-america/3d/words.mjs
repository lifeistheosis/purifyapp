// Every word and figure the sample puts on screen. The scene (shot.js) draws
// from here and render.mjs --check holds each figure to ../facts.mjs, so a
// number is typed once and stands on the source the first film checked.

export const FPS = 30;
export const SCENE_ONE = 10; // seconds: the first scene's hold ends here and its drift becomes the move into the second
export const SCENE_TWO = 20; // seconds: the second scene's hold ends here and those who stay begin to draw the church
export const SCENE_THREE = 32; // seconds: the church stands, and the camera lifts from it for the claim
export const SCENE_FOUR = 43; // the claim is answered; a whip to who they are
export const SCENE_FIVE = 62.3; // who they are ends; a whip down to the map for where they are
export const SCENE_SIX = 71; // where they are ends; a whip to what is changing
export const SCENE_SEVEN = 87.5; // the report's own sentence has been read; the push through the sources begins
export const CARD_FOR = 1.7; // each source's card
export const LOGO_FOR = 6.3; // Purify's own mark, last
export const SECONDS = 104;

// One face for every figure in the film (his word, 2026-11-13: "id change the # font").
// Archivo Narrow by Omnibus-Type, SIL Open Font Licence 1.1, from @fontsource/archivo-narrow.
// Its figures are lining and all one width as drawn, with no feature to switch on:
// render.mjs --check measures the ten digits and refuses the face if they differ.
export const NUMERALS = { family: "Archivo Narrow", weight: 600, by: "Omnibus-Type", licence: "SIL Open Font Licence 1.1", from: "@fontsource/archivo-narrow" };

export const TITLE = ["Orthodox Christians in America", "BY THE NUMBERS"];

// U.S. Religion Census 2020, Appendix F, p. 4 (facts.mjs, scene "where"): the
// six states that hold 47.9% of Eastern Orthodox adherents, in the source's order.
// `id` is the state's FIPS code in ../map.json. A form's height is its share.
export const SIX = [
  { id: "06", name: "California", share: 10.9 },
  { id: "36", name: "New York", share: 10.7 },
  { id: "17", name: "Illinois", share: 7.6 },
  { id: "12", name: "Florida", share: 6.4 },
  { id: "34", name: "New Jersey", share: 6.2 },
  { id: "42", name: "Pennsylvania", share: 6.1 },
];
export const FIGURE = "47.9";
export const CAPTION = "of those on Eastern Orthodox rolls live in six states.";
export const SOURCE_LINE = "Source: U.S. Religion Census 2020, Appendix F";

// Scene two, the gap. The same source, p. 3 (facts.mjs, scene "gap"): 675,765
// adherents of Eastern Orthodox parishes and 183,020 regular attendees, 2020.
// The share is the source's own measure ("percentage of adherents who are
// regular attendees"); the division is ours (facts.mjs, DERIVED).
export const ROLLS = 675765;
export const SUNDAY = 183020;
export const PEOPLE_A_POINT = 100; // one point of light stands for this many people
export const SHARE = "27";
export const CAPTION_ROLLS = "on Eastern Orthodox parish rolls.";
export const CAPTION_SUNDAY = "at the Liturgy on a typical Sunday.";
export const SHARE_LINE = "of the rolls";
export const KEY = ["One point of light is ", "100", " people."]; // the figure in the middle takes the numerals' face

// Scene three, the Church. The same source, p. 3 (facts.mjs, scene "six"): "2,014
// Eastern Orthodox and 895 Oriental Orthodox parishes", 2020. The church itself
// is drawn by the 1,830 points of scene two; its form is church.js.
export const PARISHES = 2014;
export const CAPTION_PARISHES = "Eastern Orthodox parishes, 2020.";

// ---- The full film (BRIEF.md, "Round 4"). Every figure below is in ../facts.mjs as the first film checked it.

// Scene four, the six million claim (facts.mjs, scene "six"). 6,000,000 divided by 2,014 is 2,979: the division is
// ours and the film shows it as a crowd, one point of light for one person.
export const CLAIM = 6000000, EACH = 2979, MEDIAN_PARISH = 130, MEDIAN_SUNDAY = 60;
export const CLAIM_LINES = [
  ["\u201Cmore than 6,000,000 citizens\u201D", "From a proclamation of March 1942."],
  ["people in every parish, if six million", "stood in the 2,014 Eastern Orthodox parishes."],
  ["people in the median parish, 2020.", "60 of them at the Liturgy on a typical Sunday."],
];
export const KEY_ONE = ["Here, one point of light is ", "1", " person."];

// Scene five, who they are (facts.mjs, scene "who"). Pew's own age bands, in Pew's words; the Institute's report for the rest.
export const AGES = { head: "The ages of those who call themselves Orthodox", bars: [[24, "18 to 29"], [35, "30 to 49"], [23, "50 to 65"], [17, "65 and older"]] };
export const MEDIAN_AGE = { head: "Median age, by tradition", bars: [[48, "Orthodox"], [58, "Catholics"], [59, "Evangelicals"], [63, "Mainline", "Protestants"]] };
export const HUNDRED = [
  { n: 64, lines: ["of those raised Orthodox", "still call themselves Orthodox."] },
  { n: 24, lines: ["of today's Orthodox were", "raised in another tradition."] },
  { n: 53, lines: ["are men."] },
  { n: 40, lines: ["are immigrants. Another 25%", "are the children of immigrants."] },
  { n: 63, lines: ["are college graduates.", "35% hold a graduate degree."] },
];

// Scene six, where they are (facts.mjs, scene "where"): Pew's four regions, which are the Census Bureau's. `ids` are FIPS codes in ../map.json.
export const REGION_HEAD = "Where those who call themselves Orthodox live";
export const REGIONS = [
  { name: "South", share: 31, ids: ["10", "11", "12", "13", "24", "37", "45", "51", "54", "01", "21", "28", "47", "05", "22", "40", "48"] },
  { name: "Northeast", share: 29, ids: ["09", "23", "25", "33", "44", "50", "34", "36", "42"] },
  { name: "West", share: 21, ids: ["04", "08", "16", "30", "32", "35", "49", "56", "02", "06", "15", "41", "53"] },
  { name: "Midwest", share: 19, ids: ["17", "18", "26", "39", "55", "19", "20", "27", "29", "31", "38", "46"] },
];

// Scene seven, what is changing (facts.mjs, scene "change").
export const DECADE = [
  { lines: ["Eastern Orthodox", "on parish rolls"], was: 816653, is: 675765, change: "down 17%" },
  { lines: ["Eastern Orthodox", "at Sunday Liturgy"], was: 212212, is: 183020, change: "down 14%" },
  { lines: ["Oriental Orthodox", "on parish rolls"], was: 294762, is: 491413, change: "up 67%" },
];
export const CONVERTS = { years: [[2013, 91], [2014, 91], [2015, 86], [2016, 88], [2017, 88], [2018, 90], [2019, 104], [2020, 59], [2021, 100], [2022, 186], [2023, 124]], named: [2013, 2020, 2022],
  head: ["Adults received into the Church each year", "in 20 parishes of 15 states. 2023 is a part year."] };
export const QUOTE = { lines: ["\u201CThere\u2019s no evidence, from these surveys,", "that Orthodoxy in America is either", "growing or shrinking as a share", "of the general US population.\u201D"], by: "American Orthodoxy Today. Orthodox Studies Institute, 2025." };

// The source's line, flat on the glass, by time: [from, to, line].
export const SOURCES_ON = [
  [SCENE_THREE + 1.2, SCENE_FOUR - 0.3, "Sources: orthodoxhistory.org, 2024; U.S. Religion Census 2020"],
  [SCENE_FOUR + 1.0, 47.9, "Source: Pew Research Center, 2023 to 2024. Margin \u00B19.9 points"],
  [48.5, 51.7, "Source: Orthodox Studies Institute, 2025, reading the CES of 2024"],
  [52.3, SCENE_FIVE - 0.2, "Source: Orthodox Studies Institute, 2025, reading Pew\u2019s survey"],
  [SCENE_FIVE + 1.1, SCENE_SIX - 0.3, "Source: Pew Research Center, 2023 to 2024. Margin \u00B19.9 points"],
  [SCENE_SIX + 0.9, 78.1, "Source: A. Krindatch, 2020 Census of Orthodox Christian Churches"],
  [78.9, 82.5, "Source: Orthodox Studies Institute, Converts to Orthodoxy, 2024"],
  [SCENE_SEVEN + 0.9, SCENE_SEVEN + 6 * CARD_FOR - 0.2, "Maps: Natural Earth; us-atlas, from the U.S. Census Bureau\u2019s files"],
];

// The outro: each source named on a card of its own, in the order the film used it. Names as words only: no
// logo, mark or shield of anyone's. The Institute's report does not tie the Cooperative Election Study to a
// university, so its card does not either (BRIEF.md, "Round 4").
export const CARDS = [
  { src: ["appF"], name: "U.S. Religion Census 2020", lines: ["Appendix F: Orthodox Christian Groups,", "by Alexei Krindatch"] },
  { src: ["history"], name: "Matthew Namee", lines: ["How Many Orthodox Christians Are in America?", "orthodoxhistory.org, 2024"] },
  { src: ["census"], name: "Alexei Krindatch", lines: ["The 2020 Census of", "Orthodox Christian Churches"] },
  { src: ["pew"], name: "Pew Research Center", lines: ["Religious Landscape Study,", "2023 to 2024"] },
  { src: ["osi"], name: "Cooperative Election Study", lines: ["2024, as read by the", "Orthodox Studies Institute"] },
  { src: ["osi", "converts"], name: "Orthodox Studies Institute", lines: ["American Orthodoxy Today, 2025", "Converts to Orthodoxy, 2024"] },
];
// Purify's own mark, last: the four bars of components/ui/PurifyMark.tsx in its own 100 by 176 box
// (x, y, width, height, corner, and the footrest's turn about a point), copied number for number.
// render.mjs --check reads that file and refuses the film if these differ from it.
export const MARK = { box: [100, 176], bars: [
  { name: "post", x: 41, y: 2, w: 18, h: 172, rx: 1 },
  { name: "titulus", x: 22, y: 20, w: 56, h: 15, rx: 1 },
  { name: "crossbar", x: 0, y: 55, w: 100, h: 16, rx: 1 },
  { name: "footrest", x: 22, y: 131, w: 56, h: 15, rx: 1, rotate: [18, 50, 138] },
] };
export const BRAND = "Purify";
