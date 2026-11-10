// How a campaign is said on a screen (1.9): its length, its last day, the
// line under its title, its psalm's name, and the picture it wears. Pure, so
// the page, the rows, the card and the sheets all say the same thing.
//
// The page says the dates, never a score: when a campaign ends "is a fact
// about the campaign rather than a measure of anyone's praying" (July's own
// argument, which holds).

import { dateLocale } from "@/lib/i18n/deviceDates";
import { COUNTRIES, countryNamer } from "@/lib/onboarding/clergy";

import { KIND_LABEL, LENGTHS, LENGTH_LABEL, campaignPrayer, dayNoon, isDay, type CampaignPrayer, type ForWhom, type PublicCampaign } from "./model";

type T = (key: string, replacements?: Record<string, string | number>) => string;
type Tn = (key: string, count: number, replacements?: Record<string, string | number>) => string;

/**
 * A line of the catalog with a stranger's words set in, each exactly as
 * written. The catalogs' own interpolation hands a value to String.replace as
 * a pattern, so a title holding "$&" would come out as the placeholder
 * itself, and one holding "{date}" would be filled in a second time
 * (lib/i18n/plural.ts; lib/prayers/commemoration.ts, wallLine, is the same
 * care for the prayer wall). One pass, and what is set in is not read again.
 */
export function setIn(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole));
}

/** A day as the reader's language writes one: "December 19". The day is the campaign's own, so no zone moves it. */
export function dayText(day: string | null | undefined, locale: string): string {
  if (!isDay(day)) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), { month: "long", day: "numeric", timeZone: "UTC" }).format(dayNoon(day));
}

/** And shorter, for a row: "Dec 19". */
export function dayShort(day: string | null | undefined, locale: string): string {
  if (!isDay(day)) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), { month: "short", day: "numeric", timeZone: "UTC" }).format(dayNoon(day));
}

/** A length as it is offered: "Forty days", "A week", or "12 days" for a chosen last day. */
export function lengthText(days: number, t: T, tn: Tn): string {
  const offered = (LENGTHS as readonly number[]).includes(days) ? LENGTH_LABEL[days as (typeof LENGTHS)[number]] : null;
  return offered ? t(offered) : tn("plans.days", days);
}

/** "Forty days, to December 19", or the length alone, or nothing for a July campaign that had none. */
export function lengthTo(c: Pick<PublicCampaign, "days" | "ends_on">, locale: string, t: T, tn: Tn): string {
  if (!c.days) return "";
  const length = lengthText(c.days, t, tn);
  const last = dayText(c.ends_on, locale);
  return last ? t("campaigns.lengthTo", { length, date: last }) : length;
}

/** For whom, in the app's own two headings. */
export function forWhomLabel(forWhom: ForWhom): string {
  return forWhom === "departed" ? "prayers.diptychs.reposedHeading" : "prayers.diptychs.livingHeading";
}

/** What it is for, for a row's small line: the kind for the living, "For the reposed" otherwise. */
export function kindLabel(c: Pick<PublicCampaign, "intention" | "for_whom">): string {
  return c.for_whom === "departed" ? KIND_LABEL.departed : KIND_LABEL[c.intention] ?? KIND_LABEL.other;
}

/** How it stands once it is no longer running, or null while it runs. */
export function standingLabel(status: PublicCampaign["status"]): string | null {
  switch (status) {
    case "held":
      return "campaigns.waiting";
    case "answered":
      return "campaigns.closing.answered";
    case "memory_eternal":
      return "shop.memoryEternal";
    case "ended":
      return "campaigns.ended";
    default:
      return null;
  }
}

/** A prayer of the list by its name: a psalm as the app names a psalm ("Psalm 90"), another by the catalog's own line for it ("The Trisagion Prayers"). */
export function prayerName(prayer: CampaignPrayer, t: T): string {
  return prayer.number !== undefined ? t("today.greet.psalm", { ref: prayer.number }) : t(prayer.title);
}

/** The prayer a campaign names, by its name, or null. */
export function prayerLabel(c: { prayer_rule?: string | null; prayer_id?: string | null }, t: T): string | null {
  const prayer = campaignPrayer({ rule: c.prayer_rule, id: c.prayer_id });
  return prayer ? prayerName(prayer, t) : null;
}

/**
 * The picture a campaign wears while it has none of its own, so no one feels
 * they must post a photograph of a sick person: the app's own icon of the
 * Resurrection for the reposed, Christ Pantocrator otherwise
 * (lib/prayers/icons.ts).
 */
export function campaignIcon(forWhom: ForWhom): string {
  return forWhom === "departed" ? "anastasis" : "christ-pantocrator";
}

// ── A place ─────────────────────────────────────────────────────────────────

/** The comma between a town and its country, where a language writes its own. */
const PLACE_COMMA: Readonly<Record<string, string>> = { ar: "\u060C ", ur: "\u060C " };

/**
 * A campaign's place as a reader's language says it: "Thessaloniki, Greece",
 * or the country alone. Nothing for a campaign with no place. The town is its
 * creator's own typing, so it is set apart from the line's direction (the
 * two isolates), and the country is named by the device.
 */
export function placeText(c: { place_country?: string | null; place_name?: string | null }, locale: string): string {
  if (!c.place_country) return "";
  const country = countryNamer(locale)(c.place_country);
  if (!c.place_name) return country;
  return `\u2068${c.place_name}\u2069${PLACE_COMMA[locale.split("-")[0]] ?? ", "}${country}`;
}

/** Short names readers type for a country that no language's name holds. */
const PLACE_ALIASES: Readonly<Record<string, string>> = { US: "USA", GB: "UK" };

/**
 * The countries a creator chooses a place from: the device's own first, then
 * every country by its name in the reader's language. Each is also found by
 * its name in English and by its code, so "Greece", "usa" and "uk" find
 * theirs in any language.
 */
export function placeCountries(locale: string, region: string | null): { code: string; name: string; terms: string }[] {
  const local = countryNamer(locale);
  const english = countryNamer("en");
  const collator = new Intl.Collator(locale);
  const all = COUNTRIES.map((code) => ({ code, name: local(code), terms: [english(code), code, PLACE_ALIASES[code] ?? ""].join(" ").trim() })).sort((a, b) =>
    collator.compare(a.name, b.name),
  );
  const own = region ? all.find((c) => c.code === region) : undefined;
  return own ? [own, ...all.filter((c) => c !== own)] : all;
}
