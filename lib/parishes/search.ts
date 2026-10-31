// Searching the parishes of the United States (./usParishes.ts) by name,
// city or state, as the clergy's parish screen in the welcome questions does
// (components/onboarding/ClergySteps.tsx). Pure and offline: the list is on
// the device, and nothing typed here leaves it.
//
// Every word typed must be found: "nicholas chicago" is St. Nicholas in
// Chicago. A word is found at the start of a word of the name, the city, the
// state's name or its postal code ("IL", "Illinois"), and failing that inside
// the name or the city. "Saint" and "St." are the same word, as are "Saints",
// "Sts." and "Ss.". The best answers come first: a name that begins with what
// was typed, then a state asked for by its code, then the rest; among equals,
// the reader's own jurisdiction first, then by state, city and name.

import { normalize } from "@/lib/search/match";

import type { UsParish } from "./usParishes";

/** The states and the places the Postal Service codes like them, by code. */
export const US_STATES: Readonly<Record<string, string>> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  PR: "Puerto Rico",
  GU: "Guam",
  VI: "U.S. Virgin Islands",
  AS: "American Samoa",
  MP: "Northern Mariana Islands",
};

/** "Chicago, IL": a parish's place as a row and a request write it. */
export function placeLine(p: { city: string; state: string }): string {
  return `${p.city}, ${p.state}`;
}

/** A list this short is shown whole before anything is typed (the sample is). */
export const SHOW_ALL_UNDER = 40;

/** At most this many answers are drawn. */
export const PARISH_LIMIT = 50;

const SAME_WORD: Readonly<Record<string, string>> = { saint: "st", saints: "ss", sts: "ss" };

/** Lower case, accents and punctuation gone, "Saint" as "st": the words a field or a query is made of. */
export function words(s: string): string[] {
  return normalize(s)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => SAME_WORD[w] ?? w);
}

/** How well one typed word is found in a parish. Lower is better; -1 is not found. */
function wordScore(word: string, p: UsParish, fields: { name: string[]; city: string[]; state: string[] }): number {
  if (word.length === 2 && word === p.state.toLowerCase()) return 0;
  const starts = (ws: string[]) => ws.some((w) => w.startsWith(word));
  if (starts(fields.name)) return 1;
  if (starts(fields.city)) return 1;
  if (starts(fields.state)) return 2;
  const inside = (ws: string[]) => ws.join(" ").includes(word);
  if (inside(fields.name) || inside(fields.city)) return 3;
  return -1;
}

function byPlace(prefer: string | null | undefined) {
  return (a: UsParish, b: UsParish) =>
    (a.jurisdiction === prefer ? 0 : 1) - (b.jurisdiction === prefer ? 0 : 1) ||
    a.state.localeCompare(b.state) ||
    a.city.localeCompare(b.city) ||
    a.name.localeCompare(b.name);
}

/**
 * The parishes a search finds, best first. With nothing typed, a short list
 * (the sample) is shown whole and a long one shows nothing until a word is
 * typed. `prefer` is the reader's jurisdiction, whose parishes lead among
 * equals.
 */
export function searchParishes(
  parishes: readonly UsParish[],
  query: string,
  opts: { prefer?: string | null; limit?: number } = {},
): UsParish[] {
  const limit = opts.limit ?? PARISH_LIMIT;
  const typed = words(query);
  if (!typed.length) return parishes.length <= SHOW_ALL_UNDER ? [...parishes].sort(byPlace(opts.prefer)).slice(0, limit) : [];
  const nameStart = typed.join(" ");
  const scored: { p: UsParish; s: number }[] = [];
  for (const p of parishes) {
    const fields = { name: words(p.name), city: words(p.city), state: words(US_STATES[p.state] ?? p.state) };
    let total = 0;
    let found = true;
    for (const w of typed) {
      const s = wordScore(w, p, fields);
      if (s < 0) {
        found = false;
        break;
      }
      total += s;
    }
    if (!found) continue;
    // A name that begins with everything typed is the answer meant.
    if (fields.name.join(" ").startsWith(nameStart)) total -= typed.length;
    scored.push({ p, s: total });
  }
  const place = byPlace(opts.prefer);
  scored.sort((a, b) => a.s - b.s || place(a.p, b.p));
  return scored.slice(0, Math.max(0, limit)).map((x) => x.p);
}
