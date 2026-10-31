// "Are you a priest, a deacon, or a layman?": the clergy's questions in the
// welcome flow (1.8.x, the owner's note 54 of 2026-10-31). His words: "ensure
// that on the onboarding section, there's a section that says, are you a
// priest, deacon, or layman? This is usually for when they click that they're
// baptized ... And if they do pick that they are a priest or deacon, it asks
// them what jurisdiction ... But if they're in the US, ensure there's a unique
// screen for US priests and deacons where it has a search for the parishes in
// America, and they could pick any in America."
//
//   role          asked of the baptized Orthodox only (level "practicing"); a
//                 catechumen or an inquirer never sees it, and a skip carries
//                 on as a layman
//   where         a priest or deacon: the country they serve in
//   jurisdiction  in the United States, the jurisdictions of the Assembly of
//                 Canonical Orthodox Bishops; elsewhere the local Churches,
//                 the country's own first where the Churches agree whose it is
//   parish        in the United States only: a search of the parishes there
//
// Answering priest or deacon never shows a mark. The answers stay on the
// device and leave it only inside a request for the clergy seal, which the
// team verifies by hand in the admin (app/api/profile/clergy, Users, "Waiting
// on you"); ./clergyRequest.ts sends it. They are never counted and never
// copied to the account's space (./accountSync.ts).
//
// Pure, so every rule is tested directly (lib/onboarding/__tests__/clergy.test.ts).

import { CLERGY_EVIDENCE_MAX, CLERGY_TEXT_MAX } from "@/lib/profile/clergy";
import { normalize } from "@/lib/search/match";

import type { Level } from "./space";

export type Role = "priest" | "deacon" | "layman";
export const ROLES: readonly Role[] = ["priest", "deacon", "layman"];
export type ClergyRole = Exclude<Role, "layman">;

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** A priest or a deacon: the answers that go on to where they serve. */
export function isClergyRole(role: Role | null | undefined): role is ClergyRole {
  return role === "priest" || role === "deacon";
}

/** Only the baptized Orthodox are asked. Catechumens and inquirers never see the question. */
export function asksClergy(level: Level | null): boolean {
  return level === "practicing";
}

/** The clergy's own screens, after the role question. */
export type ClergyStep = "clergyWhere" | "clergyJurisdiction" | "clergyParish";
export const CLERGY_STEPS: readonly ClergyStep[] = ["clergyWhere", "clergyJurisdiction", "clergyParish"];

export function isClergyStep(v: string): v is ClergyStep {
  return (CLERGY_STEPS as readonly string[]).includes(v);
}

/**
 * The screens that follow the role question, in order. A layman, or a reader
 * who has not answered, goes straight on. A priest or deacon is asked where
 * they serve and their jurisdiction, and in the United States their parish
 * too; until a country is chosen the parish is not in the list, so the line
 * of steps grows only once the answer asks for it.
 */
export function clergySteps(role: Role | null, country: string | null): ClergyStep[] {
  if (!isClergyRole(role)) return [];
  return country === "US" ? ["clergyWhere", "clergyJurisdiction", "clergyParish"] : ["clergyWhere", "clergyJurisdiction"];
}

// --- Where they serve ------------------------------------------------------

/**
 * The countries a reader can serve in: ISO 3166-1 alpha-2, every code that
 * names a place where people live (the uninhabited ones, Antarctica and the
 * like, are left out). Each is shown in the reader's own language by the
 * device (Intl.DisplayNames), so no name is written here or in a catalog.
 */
export const COUNTRIES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
];

export function isCountry(v: unknown): v is string {
  return typeof v === "string" && COUNTRIES.includes(v);
}

/**
 * Names countries in a language, from the device. Falls back to English and
 * then to the code itself on a device too old to name places (Intl.DisplayNames
 * is in every browser Purify's apps run in: iOS 15 and Android's WebView).
 */
export function countryNamer(locale: string): (code: string) => string {
  const namers: Intl.DisplayNames[] = [];
  for (const lang of [locale, "en"]) {
    try {
      namers.push(new Intl.DisplayNames([lang], { type: "region" }));
    } catch {
      /* this device cannot name places in this language */
    }
  }
  return (code) => {
    for (const n of namers) {
      try {
        const name = n.of(code);
        if (name && name !== code) return name;
      } catch {
        /* not a code this device knows */
      }
    }
    return code;
  };
}

/** One country's name in a language. */
export function countryName(code: string, locale: string): string {
  return countryNamer(locale)(code);
}

/** The region a device's language names ("el-GR" is Greece), if it is one of ours. */
export function deviceRegion(languages: readonly string[]): string | null {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).maximize().region;
      if (region && isCountry(region)) return region;
    } catch {
      /* not a language tag */
    }
  }
  return null;
}

/**
 * The countries in the order the list shows them: the United States first,
 * where most of Purify's clergy are and where the parish search is, then the
 * country the device's language points to, then every country by its name in
 * the reader's language. `suggested` is the head of the list; `rest` follows.
 */
export function countryOrder(
  locale: string,
  region: string | null,
): { suggested: string[]; rest: string[] } {
  const suggested = ["US", ...(region && region !== "US" ? [region] : [])];
  const collator = new Intl.Collator(locale);
  const nameOf = countryNamer(locale);
  const rest = COUNTRIES.filter((c) => !suggested.includes(c))
    .map((c) => ({ c, name: nameOf(c) }))
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((x) => x.c);
  return { suggested, rest };
}

/** Short names readers type for a country that no language's name begins with. */
const COUNTRY_ALIASES: Readonly<Record<string, string>> = { usa: "US", uk: "GB" };

/**
 * The countries a search finds, in the order given: by the name in the
 * reader's language or in English, anywhere in it, accents aside, or by the
 * code ("US", "USA").
 */
export function findCountries(order: readonly string[], query: string, locale: string): string[] {
  const q = normalize(query.trim());
  if (!q) return [...order];
  const local = countryNamer(locale);
  const english = countryNamer("en");
  return order.filter(
    (c) =>
      c.toLowerCase() === q ||
      COUNTRY_ALIASES[q] === c ||
      normalize(local(c)).includes(q) ||
      normalize(english(c)).includes(q),
  );
}

// --- The local Churches ----------------------------------------------------

/**
 * The local Churches a priest or deacon outside the United States can name,
 * and the Mother Churches the Assembly's list in the United States is grouped
 * under. Named as the Assembly names the Mother Churches ("Patriarchate of
 * Serbia") and, for the rest, as each Church is commonly called in English.
 * The fourteen Churches every canonical Church recognises, and the Orthodox
 * Church in America, which has dioceses in Canada and Mexico and is a member
 * of the Assembly. A body not on the list is named under "Another
 * jurisdiction" and read by the team. WHICH BODIES ARE LISTED IS THE OWNER'S
 * JUDGEMENT, as on /parishes (lib/parishes/finders.ts).
 */
export type ChurchId =
  | "constantinople"
  | "alexandria"
  | "antioch"
  | "jerusalem"
  | "moscow"
  | "serbia"
  | "romania"
  | "bulgaria"
  | "georgia"
  | "cyprus"
  | "greece"
  | "poland"
  | "albania"
  | "czechSlovakia"
  | "oca";

export const CHURCHES: readonly ChurchId[] = [
  "constantinople",
  "alexandria",
  "antioch",
  "jerusalem",
  "moscow",
  "serbia",
  "romania",
  "bulgaria",
  "georgia",
  "cyprus",
  "greece",
  "poland",
  "albania",
  "czechSlovakia",
  "oca",
];

export function isChurch(v: unknown): v is ChurchId {
  return typeof v === "string" && (CHURCHES as readonly string[]).includes(v);
}

/** The catalog key a Church's name is drawn from (computed, so this file's test holds it to every catalog). */
export function churchKey(id: ChurchId): string {
  return `onboard.church.${id}`;
}

/** Each Church's name in English, as the team reads it in the request. en.json says the same (held by the test). */
export const CHURCH_NAME: Readonly<Record<ChurchId, string>> = {
  constantinople: "Ecumenical Patriarchate",
  alexandria: "Patriarchate of Alexandria",
  antioch: "Patriarchate of Antioch",
  jerusalem: "Patriarchate of Jerusalem",
  moscow: "Patriarchate of Moscow",
  serbia: "Patriarchate of Serbia",
  romania: "Patriarchate of Romania",
  bulgaria: "Patriarchate of Bulgaria",
  georgia: "Patriarchate of Georgia",
  cyprus: "Church of Cyprus",
  greece: "Church of Greece",
  poland: "Church of Poland",
  albania: "Church of Albania",
  czechSlovakia: "Church of the Czech Lands and Slovakia",
  oca: "Orthodox Church in America",
};

/**
 * The local Church of a country, put first in its list, only where the
 * canonical Churches agree whose country it is: each Church's own land, and
 * Finland, whose autonomous Church is under the Ecumenical Patriarchate.
 * Where two Churches claim a country (Ukraine, Moldova, Estonia, North
 * Macedonia, the Gulf) or it is the diaspora (Canada, Western Europe,
 * Australia), no Church is put first and the list is in alphabetical order.
 */
export const LOCAL_CHURCH: Readonly<Record<string, ChurchId>> = {
  TR: "constantinople",
  FI: "constantinople",
  EG: "alexandria",
  SY: "antioch",
  LB: "antioch",
  IL: "jerusalem",
  PS: "jerusalem",
  JO: "jerusalem",
  RU: "moscow",
  BY: "moscow",
  RS: "serbia",
  ME: "serbia",
  BA: "serbia",
  RO: "romania",
  BG: "bulgaria",
  GE: "georgia",
  CY: "cyprus",
  GR: "greece",
  PL: "poland",
  AL: "albania",
  CZ: "czechSlovakia",
  SK: "czechSlovakia",
};

/**
 * The Churches in the order the list shows them outside the United States:
 * the country's own first where it has one, then the rest by their names in
 * the reader's language, so the order says nothing about rank.
 */
export function churchOrder(
  country: string | null,
  nameOf: (id: ChurchId) => string,
  locale: string,
): { local: ChurchId | null; rest: ChurchId[] } {
  const local = country ? (LOCAL_CHURCH[country] ?? null) : null;
  const collator = new Intl.Collator(locale);
  const rest = CHURCHES.filter((c) => c !== local).sort((a, b) => collator.compare(nameOf(a), nameOf(b)));
  return { local, rest };
}

// --- The jurisdictions in the United States --------------------------------

/**
 * The page the list below was read from, and when. Every jurisdiction on it,
 * in its order, under its Mother Church, named as it names them.
 */
export const ASSEMBLY_LIST = {
  url: "https://www.assemblyofbishops.org/directories/jurisdictions",
  readOn: "2026-10-31",
} as const;

export type UsJurisdiction = {
  id: string;
  /** As the Assembly's list writes it. A proper name, shown as it is in every language, as /parishes shows them. */
  name: string;
  /** The heading it is listed under. */
  mother: ChurchId;
  /** Its name in the request where the name alone does not say whose it is. */
  request?: string;
};

export const US_JURISDICTIONS: readonly UsJurisdiction[] = [
  { id: "goa", name: "Greek Orthodox Archdiocese of America", mother: "constantinople" },
  { id: "acrod", name: "American Carpatho-Russian Orthodox Diocese of the USA", mother: "constantinople" },
  { id: "uocusa", name: "Ukrainian Orthodox Church of the USA", mother: "constantinople" },
  { id: "albanian", name: "Albanian Orthodox Diocese", mother: "constantinople", request: "Albanian Orthodox Diocese (Ecumenical Patriarchate)" },
  { id: "antiochian", name: "Antiochian Orthodox Christian Archdiocese of North America", mother: "antioch" },
  { id: "mospat", name: "The Moscow Patriarchal Parishes in the USA", mother: "moscow" },
  { id: "rocor", name: "Russian Orthodox Church Outside of Russia", mother: "moscow" },
  {
    id: "serbian-new-gracanica",
    name: "Diocese of New Gracanica-Midwestern America",
    mother: "serbia",
    request: "Diocese of New Gracanica-Midwestern America (Patriarchate of Serbia)",
  },
  { id: "serbian-western", name: "Diocese of Western America", mother: "serbia", request: "Diocese of Western America (Patriarchate of Serbia)" },
  { id: "serbian-eastern", name: "Diocese of Eastern America", mother: "serbia", request: "Diocese of Eastern America (Patriarchate of Serbia)" },
  { id: "romanian", name: "Romanian Orthodox Metropolia of the Americas", mother: "romania" },
  { id: "bulgarian", name: "Bulgarian Eastern Orthodox Diocese of the USA, Canada, and Australia", mother: "bulgaria" },
  { id: "georgian", name: "Georgian Apostolic Orthodox Church in North America", mother: "georgia" },
  { id: "oca", name: "Orthodox Church in America", mother: "oca" },
];

export function usJurisdiction(id: string | null | undefined): UsJurisdiction | null {
  return US_JURISDICTIONS.find((j) => j.id === id) ?? null;
}

/** The list grouped under its Mother Churches, in the Assembly's order. */
export function usJurisdictionGroups(): { mother: ChurchId; jurisdictions: UsJurisdiction[] }[] {
  const groups: { mother: ChurchId; jurisdictions: UsJurisdiction[] }[] = [];
  for (const j of US_JURISDICTIONS) {
    const last = groups[groups.length - 1];
    if (last && last.mother === j.mother) last.jurisdictions.push(j);
    else groups.push({ mother: j.mother, jurisdictions: [j] });
  }
  return groups;
}

// --- The answers -----------------------------------------------------------

/** "Another jurisdiction": the reader names it. */
export const OTHER = "other";

/**
 * A parish picked from the list (its name and place kept as picked, and
 * whether the list was the SAMPLE), or typed in: a name, and its city and
 * state in one line.
 */
export type ParishAnswer =
  | { kind: "listed"; id: string; name: string; city: string; state: string; sample: boolean }
  | { kind: "typed"; name: string; place: string };

export type ClergyAnswers = {
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  /** A US jurisdiction's id in the United States, a ChurchId elsewhere, or OTHER. */
  jurisdiction: string | null;
  /** The jurisdiction's name, as typed, when it is OTHER. */
  otherJurisdiction: string;
  /** In the United States only. */
  parish: ParishAnswer | null;
};

export const NO_ANSWERS: ClergyAnswers = { country: null, jurisdiction: null, otherJurisdiction: "", parish: null };

/** The longest a typed name may be: the request's own limit (lib/profile/clergy.ts). */
export const TYPED_MAX = CLERGY_TEXT_MAX;

/** Whether a jurisdiction answer fits the country it was given for. */
export function jurisdictionFits(country: string | null, jurisdiction: string | null): boolean {
  if (!jurisdiction || !country) return false;
  if (jurisdiction === OTHER) return true;
  return country === "US" ? usJurisdiction(jurisdiction) !== null : isChurch(jurisdiction);
}

/** A typed text that says something: two letters or more once trimmed. */
const says = (s: string | null | undefined) => typeof s === "string" && s.trim().length >= 2;

/** Whether the parish answer is enough to send: a listed parish, or a typed name. */
export function parishGiven(parish: ParishAnswer | null): boolean {
  if (!parish) return false;
  return parish.kind === "listed" ? Boolean(parish.id) : says(parish.name);
}

/**
 * Everything a request needs: a country, a jurisdiction that fits it (named,
 * when it is another), and in the United States a parish.
 */
export function clergyComplete(role: Role | null, a: ClergyAnswers): boolean {
  if (!isClergyRole(role) || !isCountry(a.country)) return false;
  if (!jurisdictionFits(a.country, a.jurisdiction)) return false;
  if (a.jurisdiction === OTHER && !says(a.otherJurisdiction)) return false;
  if (a.country === "US" && !parishGiven(a.parish)) return false;
  return true;
}

/** The answers read back from storage: what is not an answer is dropped. */
export function parseClergyAnswers(raw: string | null): ClergyAnswers {
  if (!raw) return NO_ANSWERS;
  try {
    const r = JSON.parse(raw) as Partial<Record<keyof ClergyAnswers, unknown>>;
    const country = isCountry(r.country) ? r.country : null;
    const jurisdiction = typeof r.jurisdiction === "string" && jurisdictionFits(country, r.jurisdiction) ? r.jurisdiction : null;
    const otherJurisdiction = typeof r.otherJurisdiction === "string" ? r.otherJurisdiction.slice(0, TYPED_MAX) : "";
    let parish: ParishAnswer | null = null;
    const p = r.parish as Record<string, unknown> | null | undefined;
    if (country === "US" && p && typeof p === "object") {
      if (p.kind === "listed" && typeof p.id === "string" && typeof p.name === "string" && typeof p.city === "string" && typeof p.state === "string") {
        parish = { kind: "listed", id: p.id, name: p.name, city: p.city, state: p.state, sample: p.sample !== false };
      } else if (p.kind === "typed" && typeof p.name === "string") {
        parish = { kind: "typed", name: p.name.slice(0, TYPED_MAX), place: typeof p.place === "string" ? p.place.slice(0, TYPED_MAX) : "" };
      }
    }
    return { country, jurisdiction, otherJurisdiction, parish };
  } catch {
    return NO_ANSWERS;
  }
}

// --- The request -----------------------------------------------------------

/** The body /api/profile/clergy takes. It asks; only the team can grant. */
export type ClergyRequestBody = { rank: ClergyRole; jurisdiction: string; parish: string | null; evidence: string };

/** Cut to a length, on a word where it can, with an ellipsis. */
export function fit(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

/** "St. Nicholas Cathedral, Washington, DC", cut on the name so the place always shows. */
export function parishLine(parish: ParishAnswer, max = TYPED_MAX): string {
  const place = parish.kind === "listed" ? `${parish.city}, ${parish.state}` : parish.place.replace(/\s+/g, " ").trim();
  const name = parish.name.replace(/\s+/g, " ").trim();
  if (!place) return fit(name, max);
  const room = max - place.length - 2;
  if (room < 12) return fit(`${name}, ${place}`, max);
  return `${fit(name, room)}, ${place}`;
}

/**
 * The request, in English for the team, who read it in the admin (Users,
 * "Waiting on you"): the rank, the jurisdiction and the parish in the
 * request's own fields, and where it came from in "How to check", with the
 * country, which the request has no field for.
 */
export function clergyRequestBody(role: ClergyRole, a: ClergyAnswers, opts: { countryEn: string }): ClergyRequestBody {
  const us = a.country === "US";
  const other = a.jurisdiction === OTHER;
  const jurisdiction = other
    ? fit(a.otherJurisdiction, TYPED_MAX)
    : us
      ? (() => {
          const j = usJurisdiction(a.jurisdiction);
          return j ? (j.request ?? j.name) : "";
        })()
      : isChurch(a.jurisdiction)
        ? CHURCH_NAME[a.jurisdiction]
        : "";
  const parish = us && a.parish ? parishLine(a.parish) : null;
  const notes = [
    "Asked in the welcome questions (onboarding).",
    `Country they serve in: ${opts.countryEn}.`,
    other ? "Jurisdiction typed in by them, not from the list." : null,
    us && a.parish
      ? a.parish.kind === "listed"
        ? `Parish picked from Purify's list${a.parish.sample ? " (the SAMPLE list)" : ""}.`
        : "Parish typed in by them, not from the list."
      : null,
    "They gave no way to check: look them up in the jurisdiction's own directory, or write to them.",
  ].filter((n): n is string => n !== null);
  return { rank: role, jurisdiction, parish, evidence: fit(notes.join(" "), CLERGY_EVIDENCE_MAX) };
}
