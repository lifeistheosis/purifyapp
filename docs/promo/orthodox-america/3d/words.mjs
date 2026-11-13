// Every word and figure the sample puts on screen. The scene (shot.js) draws
// from here and render.mjs --check holds each figure to ../facts.mjs, so a
// number is typed once and stands on the source the first film checked.

export const FPS = 30;
export const SCENE_ONE = 10; // seconds: the first scene's hold ends here and its drift becomes the move into the second
export const SCENE_TWO = 20; // seconds: the second scene's hold ends here and those who stay begin to draw the church
export const SECONDS = 32;

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
