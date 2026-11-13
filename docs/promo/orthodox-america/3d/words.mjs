// Every word and figure the sample puts on screen. The scene (shot.js) draws
// from here and render.mjs --check holds each figure to ../facts.mjs, so a
// number is typed once and stands on the source the first film checked.

export const FPS = 30;
export const SECONDS = 10;

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
