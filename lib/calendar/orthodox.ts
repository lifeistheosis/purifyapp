// Orthodox liturgical calendar helpers — pure functions, no I/O.
// Used by app/(app)/calendar/page.tsx.
//
// Follows the New (Revised Julian) calendar for FIXED feasts:
//   most canonical Eastern Orthodox jurisdictions use this for everything
//   except Pascha and the Paschal cycle, which both calendars compute
//   from the Julian-based algorithm.
//
// Pascha = the Orthodox date (Meeus's algorithm), converted to Gregorian.

import { SAINTS, getSaint, type Saint } from "@/lib/saints/saints";
import dailyCommemorations from "@/data/calendar/daily-saints.json";
import dailyReadings from "@/data/calendar/daily-readings.json";

// ----- Pascha -----

/**
 * Orthodox Pascha for the given year, as a Date at noon UTC (avoid TZ
 * boundary surprises). Verified against published values for 2020-2030.
 */
export function orthodoxPascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31); // 3=March, 4=April
  const julianDay = ((d + e + 114) % 31) + 1;
  // Julian-to-Gregorian offset: +13 days for years 1900-2099, +14 from
  // 2100-02-28, +15 from 2200-02-28, etc. Hard-coded for the current
  // window since we only need to be right for "now" + a couple years.
  const julianOffset = year < 2100 ? 13 : year < 2200 ? 14 : 15;
  const julianDate = new Date(Date.UTC(year, julianMonth - 1, julianDay, 12));
  julianDate.setUTCDate(julianDate.getUTCDate() + julianOffset);
  return julianDate;
}

// ----- Day helpers (calendar math in UTC noon to dodge DST) -----

export function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDayUtc(a).getTime() - startOfDayUtc(b).getTime()) /
      (24 * 3600 * 1000),
  );
}

function sameDay(a: Date, b: Date): boolean {
  return diffDays(a, b) === 0;
}

function inRangeInclusive(d: Date, start: Date, end: Date): boolean {
  return diffDays(d, start) >= 0 && diffDays(d, end) <= 0;
}

// ----- Fasting -----

export type FastKind =
  | "strict"      // Great Lent, Dormition, Holy Week — no fish/oil/wine
  | "wine-oil"    // Lenten Sundays, etc — wine and oil allowed
  | "fish"        // fast period but fish allowed
  | "fast"        // generic fast (no meat/dairy)
  | "fast-free"   // intentionally no fast
  | "normal";     // no special rule

export type FastingStatus = {
  kind: FastKind;
  /** Short human label for the badge. */
  label: string;
  /** Longer one-line explanation. */
  rule: string;
};

const MONTH_DAYS = (year: number, month: number /* 0-11 */) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * Returns the fasting status for a calendar date according to common
 * Eastern Orthodox practice (Constantinople/Greek tradition). This is a
 * simplified reading suitable for daily orientation — your priest's
 * direction takes precedence for any individual question.
 */
export function fastingStatus(date: Date): FastingStatus {
  const d = startOfDayUtc(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-11
  const day = d.getUTCDate();
  const dow = d.getUTCDay(); // 0 = Sunday

  const pascha = orthodoxPascha(year);
  const cleanMonday = addDays(pascha, -48);
  const holySaturday = addDays(pascha, -1);
  const palmSunday = addDays(pascha, -7);
  const annunciation = new Date(Date.UTC(year, 2, 25, 12)); // Mar 25
  const transfiguration = new Date(Date.UTC(year, 7, 6, 12)); // Aug 6
  const brightWeekEnd = addDays(pascha, 7); // Thomas Sunday eve
  const pentecost = addDays(pascha, 49);
  const allSaintsSunday = addDays(pascha, 56);
  const apostlesFastStart = addDays(allSaintsSunday, 1);
  const apostlesFastEnd = new Date(Date.UTC(year, 5, 28, 12)); // June 28
  const dormitionStart = new Date(Date.UTC(year, 7, 1, 12));
  const dormitionEnd = new Date(Date.UTC(year, 7, 14, 12));
  const nativityStart = new Date(Date.UTC(year, 10, 15, 12));
  const nativityEnd = new Date(Date.UTC(year, 11, 24, 12));
  const christmasFreeStart = new Date(Date.UTC(year, 11, 25, 12));
  const theophanyEve = new Date(Date.UTC(year, 0, 4, 12)); // Jan 4 (free through)
  const publicanFeast = addDays(pascha, -70); // approx Sunday of Publican & Pharisee
  const publicanFreeEnd = addDays(publicanFeast, 7);

  // ----- Fast-free windows -----
  if (
    (month === 0 && day <= 4) ||
    (month === 11 && day >= 25) ||
    inRangeInclusive(d, christmasFreeStart, new Date(Date.UTC(year + 1, 0, 4, 12)))
  ) {
    return {
      kind: "fast-free",
      label: "Fast-free",
      rule: "Twelve Days of Christmas. No fast through Theophany Eve (Jan 4).",
    };
  }
  if (inRangeInclusive(d, pascha, brightWeekEnd)) {
    return {
      kind: "fast-free",
      label: "Bright Week, fast-free",
      rule: "The week of the Resurrection. No fast, even on Wednesday and Friday.",
    };
  }
  if (inRangeInclusive(d, addDays(pentecost, 1), addDays(pentecost, 7))) {
    return {
      kind: "fast-free",
      label: "Trinity Week, fast-free",
      rule: "Week after Pentecost. No fast on Wednesday or Friday.",
    };
  }
  if (inRangeInclusive(d, addDays(publicanFeast, 1), publicanFreeEnd)) {
    return {
      kind: "fast-free",
      label: "Fast-free week",
      rule: "Week after the Sunday of the Publican and the Pharisee.",
    };
  }

  // ----- Great Lent + Holy Week -----
  if (inRangeInclusive(d, cleanMonday, holySaturday)) {
    if (sameDay(d, annunciation) || sameDay(d, palmSunday)) {
      return {
        kind: "fish",
        label: "Lent, fish allowed",
        rule: sameDay(d, palmSunday)
          ? "Palm Sunday. Fish, wine, and oil allowed."
          : "Feast of the Annunciation. Fish, wine, and oil allowed.",
      };
    }
    if (dow === 0 || dow === 6) {
      return {
        kind: "wine-oil",
        label: "Lent, wine and oil",
        rule: "Saturday or Sunday of Great Lent. Wine and oil allowed.",
      };
    }
    return {
      kind: "strict",
      label: "Great Lent, strict",
      rule: "Strict fast. No meat, dairy, fish, wine, or oil.",
    };
  }

  // ----- Dormition Fast -----
  if (inRangeInclusive(d, dormitionStart, dormitionEnd)) {
    if (sameDay(d, transfiguration)) {
      return {
        kind: "fish",
        label: "Transfiguration, fish allowed",
        rule: "Feast of the Transfiguration. Fish, wine, and oil allowed.",
      };
    }
    if (dow === 0 || dow === 6) {
      return {
        kind: "wine-oil",
        label: "Dormition Fast, wine and oil",
        rule: "Saturday or Sunday of the Dormition Fast. Wine and oil allowed.",
      };
    }
    return {
      kind: "strict",
      label: "Dormition Fast, strict",
      rule: "Strict fast. No meat, dairy, fish, wine, or oil.",
    };
  }

  // ----- Nativity Fast -----
  if (inRangeInclusive(d, nativityStart, nativityEnd)) {
    const stricter = day >= 20 && month === 11;
    if (dow === 0 || dow === 6) {
      return {
        kind: "fish",
        label: "Nativity Fast, fish allowed",
        rule: "Saturday or Sunday of the Nativity Fast. Fish, wine, and oil allowed.",
      };
    }
    if (dow === 3 || dow === 5) {
      return {
        kind: "strict",
        label: "Nativity Fast, strict",
        rule: "Wednesday/Friday of the Nativity Fast. No meat, dairy, fish, wine, or oil.",
      };
    }
    return {
      kind: stricter ? "wine-oil" : "fish",
      label: stricter ? "Nativity Fast, wine and oil" : "Nativity Fast, fish allowed",
      rule: stricter
        ? "The final stretch before Nativity (Dec 20 to 24). Wine and oil only on weekdays."
        : "Nativity Fast. Fish allowed on weekdays, except Wednesday and Friday.",
    };
  }

  // ----- Apostles' Fast -----
  if (inRangeInclusive(d, apostlesFastStart, apostlesFastEnd)) {
    if (dow === 0 || dow === 6) {
      return {
        kind: "fish",
        label: "Apostles' Fast, fish allowed",
        rule: "Saturday or Sunday of the Apostles' Fast. Fish, wine, and oil allowed.",
      };
    }
    if (dow === 3 || dow === 5) {
      return {
        kind: "wine-oil",
        label: "Apostles' Fast, wine and oil",
        rule: "Wednesday/Friday of the Apostles' Fast. Wine and oil allowed.",
      };
    }
    return {
      kind: "fish",
      label: "Apostles' Fast, fish allowed",
      rule: "Apostles' Fast. Fish allowed on weekdays.",
    };
  }

  // ----- Year-round weekly Wed/Fri fast -----
  if (dow === 3 || dow === 5) {
    return {
      kind: "wine-oil",
      label: dow === 3 ? "Wednesday fast" : "Friday fast",
      rule: "Wednesday/Friday year-round fast. Wine and oil allowed.",
    };
  }

  return {
    kind: "normal",
    label: "No fast",
    rule: "No fast scheduled for this day.",
  };
}

// ----- Feast / saint of the day -----

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Parses one of our feastDays strings like "January 27" → { month: 0, day: 27 }. */
function parseFeastString(s: string): { month: number; day: number } | null {
  const m = s.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  const monthIdx = MONTHS.findIndex(
    (mo) => mo.toLowerCase() === m[1].toLowerCase(),
  );
  if (monthIdx < 0) return null;
  const day = parseInt(m[2], 10);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return { month: monthIdx, day };
}

// Build once: { "0-27": [john-chrysostom], ... } where key is "month-day".
const FEAST_INDEX: Map<string, Saint[]> = (() => {
  const idx = new Map<string, Saint[]>();
  for (const s of SAINTS) {
    for (const fd of s.feastDays ?? []) {
      const parsed = parseFeastString(fd);
      if (!parsed) continue;
      const key = `${parsed.month}-${parsed.day}`;
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key)!.push(s);
    }
  }
  return idx;
})();

/** All saints in our index commemorated on this calendar date. */
export function feastsOn(date: Date): Saint[] {
  const d = startOfDayUtc(date);
  const key = `${d.getUTCMonth()}-${d.getUTCDate()}`;
  return FEAST_INDEX.get(key) ?? [];
}

// ----- Daily commemorations (the full corpus, ~366 days) -----

export type Commemoration = {
  /** Display name, e.g. "St. Nicholas the Wonderworker of Myra". */
  name: string;
  /** Brief one-line description. */
  note?: string;
  /** "feast" for major Lord/Theotokos feasts and events. Default "saint". */
  kind?: "feast" | "saint";
  /** Slug of a Saint record in our registry. When present, the registry
   *  saint can be looked up and shown with its icon and bio. */
  slug?: string;
  /** Resolved Saint record when `slug` matches an entry in SAINTS. */
  saint?: Saint;
};

// Type the JSON import. The keys are "MM-DD" strings.
const DAILY: Record<string, Commemoration[]> = dailyCommemorations as Record<
  string,
  Commemoration[]
>;

function mmdd(date: Date): string {
  const d = startOfDayUtc(date);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Every commemoration we list for the given calendar date: major feasts,
 * named saints, plus any registry saints whose feast day matches. Items
 * with a `slug` that resolves to a registry saint carry the full Saint
 * record so the UI can show icon + bio.
 */
export function commemorationsOn(date: Date): Commemoration[] {
  const entries = (DAILY[mmdd(date)] ?? []).map((c) => {
    const saint = c.slug ? getSaint(c.slug) ?? undefined : undefined;
    return { ...c, saint };
  });

  // Fold in any registry saints whose feast day matches but are not already
  // in the daily JSON (rare safety net — the JSON should cover the major ones).
  const inJson = new Set(entries.map((e) => e.slug).filter(Boolean));
  for (const s of feastsOn(date)) {
    if (!inJson.has(s.slug)) {
      entries.push({
        name: s.name,
        note: s.epithet,
        slug: s.slug,
        saint: s,
        kind: "saint",
      });
    }
  }
  return entries;
}

// ----- Daily readings (lectionary references) -----

export type ReadingKind = "epistle" | "gospel" | "ot";

export type ReadingRef = {
  kind: ReadingKind;
  /** Bible book slug, matches /bible/<book>/<chapter>. */
  book: string;
  chapter: number;
  /** First verse of the passage (inclusive). */
  from: number;
  /** Last verse of the passage (inclusive). */
  to: number;
  /** Human-readable reference, e.g. "Matthew 11:27-30". */
  label: string;
};

const READINGS: Record<string, ReadingRef[]> = dailyReadings as Record<
  string,
  ReadingRef[]
>;

/**
 * Returns the lectionary references (Epistle and Gospel, occasionally OT)
 * appointed for a given calendar date. Readings are paired thematically with
 * the day's commemoration; major fixed feasts carry their proper Liturgy
 * readings. The full Pascha-relative cycle is not encoded here.
 */
export function readingsOn(date: Date): ReadingRef[] {
  return READINGS[mmdd(date)] ?? [];
}

// ----- Month grid -----

export type MonthCell = {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  /** Registry saints (rich Saint records) commemorated this day. */
  saints: Saint[];
  /** Every commemoration listed for this day (feasts + saints). */
  commemorations: Commemoration[];
  /** Is at least one of the commemorations a major feast? */
  hasFeast: boolean;
  /** Headline commemoration to show in the cell (a major feast if any, else
   *  the first commemoration in the JSON for the day). */
  headline?: Commemoration;
  fast: FastKind;
};

/** Returns 42 cells (6 weeks × 7 days) for the given year/month, Sun first. */
export function monthGrid(year: number, month: number, today: Date): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const startDow = first.getUTCDay(); // 0 = Sun
  const gridStart = addDays(first, -startDow);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const commemorations = commemorationsOn(d);
    const feast = commemorations.find((c) => c.kind === "feast");
    cells.push({
      date: d,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
      isToday: sameDay(d, today),
      saints: feastsOn(d),
      commemorations,
      hasFeast: !!feast,
      headline: feast ?? commemorations[0],
      fast: fastingStatus(d).kind,
    });
  }
  return cells;
}

// ----- Pascha countdown -----

export type PaschaInfo = {
  date: Date;
  daysAway: number;
  /** "Bright Monday", "12 days until Pascha", etc. */
  label: string;
};

export function paschaInfo(today: Date): PaschaInfo {
  const t = startOfDayUtc(today);
  const year = t.getUTCFullYear();
  const thisYear = orthodoxPascha(year);
  const nextYear = orthodoxPascha(year + 1);
  // If this year's Pascha has passed, use next year's.
  const target = diffDays(t, thisYear) <= 0 ? thisYear : nextYear;
  const daysAway = diffDays(target, t);
  let label: string;
  if (daysAway === 0) label = "Pascha is today. Christ is risen!";
  else if (daysAway < 0) label = "Pascha has passed.";
  else if (daysAway === 1) label = "Pascha is tomorrow.";
  else label = `${daysAway} days until Pascha (${formatMonthDay(target)})`;
  return { date: target, daysAway, label };
}

// ----- Formatting -----

export function formatLongDate(d: Date): string {
  const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getUTCDay()
  ];
  return `${dow} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatMonthDay(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

// ----- Liturgical greeting for the home-page eyebrow -----

/**
 * Returns the appropriate Orthodox liturgical greeting for the given
 * date, e.g. "Christ is risen!" during the Paschal season, "Christ is
 * born!" during the Twelve Days of Christmas, "Open to me the doors of
 * repentance" in Great Lent. Falls back to the standard everyday
 * Orthodox greeting in ordinary time.
 */
export function liturgicalGreeting(date: Date): string {
  const d = startOfDayUtc(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const pascha = orthodoxPascha(year);
  const previousPascha = orthodoxPascha(year - 1);
  const ascension = addDays(pascha, 39);
  const pentecost = addDays(pascha, 49);
  const palmSunday = addDays(pascha, -7);
  const cleanMonday = addDays(pascha, -48);

  // Paschal season: from Pascha through Ascension (Greek tradition
  // greets each other this way for forty days).
  if (inRangeInclusive(d, pascha, ascension)) {
    return "Christ is risen! Truly He is risen!";
  }
  // Ascension to Pentecost — still in the Pentecostarion but past
  // Ascension itself.
  if (inRangeInclusive(d, addDays(ascension, 1), pentecost)) {
    return "Christ is ascended! Glorify Him!";
  }
  // Holy Week (between Palm Sunday and Pascha).
  if (inRangeInclusive(d, addDays(palmSunday, 1), addDays(pascha, -1))) {
    return "Behold, the Bridegroom comes.";
  }
  // Great Lent (Clean Monday through Palm Sunday).
  if (inRangeInclusive(d, cleanMonday, palmSunday)) {
    return "Open to me the doors of repentance.";
  }
  // The Twelve Days (Dec 25 through Jan 6 either year).
  if (
    (month === 11 && day >= 25) ||
    (month === 0 && day <= 6)
  ) {
    return "Christ is born! Glorify Him!";
  }

  // Check whether we're inside the previous year's Pentecostarion (if
  // someone visits in early-year Pascha 2027 from Jan 2027, the above
  // year check uses 2027's Pascha, not 2026's — so we cross-check the
  // previous-year window for January overlap.)
  const prevAscension = addDays(previousPascha, 39);
  if (inRangeInclusive(d, previousPascha, prevAscension)) {
    return "Christ is risen! Truly He is risen!";
  }

  // Ordinary time.
  return "Glory to Jesus Christ. Glory forever.";
}

// ----- Named Orthodox seasons (for the home-page season banner) -----

export type SeasonInfo = {
  label: string;
  subtheme?: string;
  blurb: string;
  href: string;
};

/**
 * Classifies the given date into a named Orthodox season (Great Lent,
 * Holy Week, Bright Week, Pre-Lent, Apostles' Fast, Dormition Fast,
 * Nativity Fast, Twelve Days of Christmas) and returns label + subtheme
 * for surface display. Returns null in ordinary time.
 */
export function currentSeason(date: Date): SeasonInfo | null {
  const d = startOfDayUtc(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const dow = d.getUTCDay();

  const pascha = orthodoxPascha(year);
  const previousPascha = orthodoxPascha(year - 1);
  const palmSunday = addDays(pascha, -7);
  const cleanMonday = addDays(pascha, -48);
  const holySaturday = addDays(pascha, -1);
  const brightWeekEnd = addDays(pascha, 7);
  const pentecost = addDays(pascha, 49);
  const allSaintsSunday = addDays(pascha, 56);
  const apostlesFastStart = addDays(allSaintsSunday, 1);
  const apostlesFastEnd = new Date(Date.UTC(year, 5, 28, 12));
  const dormitionStart = new Date(Date.UTC(year, 7, 1, 12));
  const dormitionEnd = new Date(Date.UTC(year, 7, 14, 12));
  const nativityStart = new Date(Date.UTC(year, 10, 15, 12));
  const nativityEnd = new Date(Date.UTC(year, 11, 24, 12));

  const SUNDAYS_OF_LENT = [
    "Sunday of Orthodoxy",
    "St. Gregory Palamas",
    "Veneration of the Cross",
    "St. John Climacus",
    "St. Mary of Egypt",
  ];

  // Holy Week (Palm Sunday's Monday through Holy Saturday).
  if (inRangeInclusive(d, addDays(palmSunday, 1), holySaturday)) {
    const daysIntoHolyWeek = diffDays(d, palmSunday);
    const dayLabel = [
      null,
      "Bridegroom Monday",
      "Bridegroom Tuesday",
      "Bridegroom Wednesday",
      "Holy Thursday",
      "Holy Friday",
      "Holy Saturday",
    ][daysIntoHolyWeek];
    return {
      label: "Holy Week",
      subtheme: dayLabel ?? undefined,
      blurb:
        "The final week of Great Lent. The Church walks with Christ from the Bridegroom services through the Passion to the empty tomb.",
      href: "/calendar",
    };
  }

  // Palm Sunday itself.
  if (sameDay(d, palmSunday)) {
    return {
      label: "Palm Sunday",
      subtheme: "Entry into Jerusalem",
      blurb: "The Lord enters Jerusalem on a colt. The crowds spread branches and cry Hosanna. Holy Week begins this evening.",
      href: "/calendar",
    };
  }

  // Bright Week (Pascha through following Sunday).
  if (inRangeInclusive(d, pascha, brightWeekEnd)) {
    const daysIntoBright = diffDays(d, pascha);
    const dayLabel = [
      "Pascha",
      "Bright Monday",
      "Bright Tuesday",
      "Bright Wednesday",
      "Bright Thursday",
      "Bright Friday",
      "Bright Saturday",
      "Thomas Sunday",
    ][daysIntoBright];
    return {
      label: "Bright Week",
      subtheme: dayLabel,
      blurb:
        "The week of the Resurrection. The Royal Doors of the iconostasis stay open all week; the fast is set aside.",
      href: "/calendar",
    };
  }

  // Great Lent (Clean Monday through Holy Saturday eve, but Holy Week
  // matched first above; Palm Sunday matched above; so this catches
  // Clean Monday through the Friday before Palm Sunday).
  if (inRangeInclusive(d, cleanMonday, addDays(palmSunday, -1))) {
    // Which Sunday of Lent are we in or approaching?
    const weeksIn = Math.floor(diffDays(d, cleanMonday) / 7);
    const sundayName = SUNDAYS_OF_LENT[Math.min(weeksIn, SUNDAYS_OF_LENT.length - 1)];
    return {
      label: "Great Lent",
      subtheme: dow === 0 ? `Sunday of ${sundayName}` : `Week of ${sundayName}`,
      blurb:
        "The forty days of preparation before Holy Week and Pascha. A season for fasting, prayer, almsgiving, and the lengthened services of the Church.",
      href: "/calendar",
    };
  }

  // Pre-Lent (the three Sundays before Lent: Publican & Pharisee,
  // Prodigal Son, Last Judgment, Forgiveness Sunday).
  const publicanSunday = addDays(pascha, -70);
  const prodigalSunday = addDays(pascha, -63);
  const meatfareSunday = addDays(pascha, -56);
  const forgivenessSunday = addDays(pascha, -49);
  if (inRangeInclusive(d, publicanSunday, addDays(cleanMonday, -1))) {
    let sub: string;
    if (diffDays(d, publicanSunday) <= 6) sub = "Publican and Pharisee";
    else if (diffDays(d, prodigalSunday) <= 6) sub = "Prodigal Son";
    else if (diffDays(d, meatfareSunday) <= 6) sub = "Last Judgment (Meatfare)";
    else sub = "Forgiveness Sunday (Cheesefare)";
    return {
      label: "Pre-Lent",
      subtheme: sub,
      blurb:
        "The three weeks of preparation before Great Lent. The Church reads the parables that frame the coming fast.",
      href: "/calendar",
    };
  }

  // Apostles' Fast (Monday after All Saints Sunday → June 28).
  if (inRangeInclusive(d, apostlesFastStart, apostlesFastEnd)) {
    const remaining = diffDays(apostlesFastEnd, d) + 1;
    return {
      label: "Apostles' Fast",
      subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the feast of Sts. Peter and Paul`,
      blurb:
        "Preparation for the feast of the Holy Apostles Peter and Paul (June 29). Length varies with the date of Pascha.",
      href: "/calendar",
    };
  }

  // Dormition Fast (Aug 1-14).
  if (inRangeInclusive(d, dormitionStart, dormitionEnd)) {
    const remaining = diffDays(dormitionEnd, d) + 1;
    return {
      label: "Dormition Fast",
      subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the Dormition of the Theotokos`,
      blurb:
        "Two weeks of preparation before the Dormition (the falling-asleep) of the Theotokos on August 15.",
      href: "/calendar",
    };
  }

  // Nativity Fast (Nov 15 - Dec 24).
  if (inRangeInclusive(d, nativityStart, nativityEnd)) {
    const remaining = diffDays(nativityEnd, d) + 1;
    return {
      label: "Nativity Fast",
      subtheme: `${remaining} day${remaining === 1 ? "" : "s"} until the Nativity of Christ`,
      blurb:
        "Forty days of preparation before the Nativity of Christ on December 25. A quieter Lent, looking toward the manger.",
      href: "/calendar",
    };
  }

  // Twelve Days of Christmas (Dec 25 - Jan 6).
  if (
    (month === 11 && day >= 25) ||
    (month === 0 && day <= 6)
  ) {
    return {
      label: "The Twelve Days",
      subtheme: "Christmas through Theophany",
      blurb:
        "The fast-free days between the Nativity of Christ (Dec 25) and the Theophany (Jan 6). The Church celebrates the Incarnation.",
      href: "/calendar",
    };
  }

  // Cross-year Pentecostarion edge case.
  const prevAscension = addDays(previousPascha, 39);
  if (inRangeInclusive(d, previousPascha, prevAscension)) {
    return {
      label: "Paschal season",
      subtheme: "The Pentecostarion",
      blurb:
        "The forty days from Pascha to the Ascension. Christians greet one another with Christ is risen.",
      href: "/calendar",
    };
  }

  return null;
}
