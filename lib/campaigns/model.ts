// Prayer campaigns, reworked (1.9): what a campaign is, and its rules.
//
// The owner, 2026-11-10: "creating a prayer campaign for whatever, you know,
// the reposed, your sickness, your school exam. And users can participate in
// these prayer campaigns, and these prayer campaigns will be inserted into
// their prayers for either the day or the week or the month. And the person
// who created the campaign can create how long the campaign will be for."
//
// A campaign is a name carried together: one reader asks, and whoever joins
// carries that name in "Those I pray for" (lib/prayers/commemoration.ts), in
// the prayers they choose, for a set number of days. Then it leaves by
// itself. The prayer is the Church's, from the prayer book by reference, and
// nobody is counted (CONTRIBUTING.md, "On prayer, no figures at all"). The
// design, with his answers to items 116 to 128, is
// docs/1.9-build/notes/campaigns-fable.md.
//
// July's model (./campaigns.ts) stays for July's rows and its retired routes:
// six of its nine prayers were lines Purify wrote, and it counted. Nothing
// here reads it.
//
// Pure data: no "use client" and no server-only, so the routes, the device's
// list (./carried.ts) and the screens all read the same rules.

export type ForWhom = "living" | "departed";

/**
 * What a campaign for the living is for, as the table's `intention` keeps it,
 * in the order the choice is offered: an illness, an exam or studies, a
 * journey, thanksgiving, a trial, guidance, the persecuted, something else.
 */
export const LIVING_KINDS = ["healing", "study", "travel", "thanksgiving", "comfort", "guidance", "persecuted", "other"] as const;
export type LivingKind = (typeof LIVING_KINDS)[number];
export type CampaignKind = LivingKind | "departed";

/** Each kind's name, in the reader's language. */
export const KIND_LABEL: Readonly<Record<CampaignKind, string>> = {
  healing: "campaigns.kind.healing",
  study: "campaigns.kind.study",
  travel: "campaigns.kind.travel",
  thanksgiving: "campaigns.kind.thanksgiving",
  comfort: "campaigns.kind.comfort",
  guidance: "campaigns.kind.guidance",
  persecuted: "campaigns.kind.persecuted",
  other: "campaigns.kind.other",
  // The app's own heading for the reader's departed (Your rule).
  departed: "prayers.diptychs.reposedHeading",
};

export function isCampaignKind(v: unknown): v is CampaignKind {
  return typeof v === "string" && (v === "departed" || (LIVING_KINDS as readonly string[]).includes(v));
}

/** The kind a campaign may have for whom it is for: the departed have one. */
export function kindFits(forWhom: ForWhom, kind: CampaignKind): boolean {
  return forWhom === "departed" ? kind === "departed" : kind !== "departed";
}

// ── Its length ──────────────────────────────────────────────────────────────

/**
 * Forty days is the ceiling (his yes to item 119): the Church's own number,
 * it covers his month, and it keeps a sick person's name from standing in
 * public without end. A longer need is renewed.
 */
export const MAX_DAYS = 40;

/** The lengths offered: a day, a week, thirty days, forty days. Any other, up to forty, is a chosen last day. */
export const LENGTHS = [1, 7, 30, 40] as const;

/** Each offered length's name. */
export const LENGTH_LABEL: Readonly<Record<(typeof LENGTHS)[number], string>> = {
  1: "campaigns.length.day",
  7: "campaigns.length.week",
  30: "campaigns.length.thirty",
  40: "campaigns.length.forty",
};

/**
 * The length ticked to begin with: forty days for the reposed, as the Church
 * keeps them, and a week for the living, the shortest that is still a
 * campaign. A name stands in public no longer than its creator chooses.
 */
export const DEFAULT_DAYS: Readonly<Record<ForWhom, number>> = { living: 7, departed: 40 };

export function isLength(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_DAYS;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** A calendar day as the table keeps one, `YYYY-MM-DD`, that is a real day. */
export function isDay(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = DAY_RE.exec(v);
  if (!m) return false;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v;
}

/** A day as a moment: its noon in UTC, which no zone's offset carries into another day. */
export function dayNoon(day: string): number {
  const m = DAY_RE.exec(day);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : NaN;
}

/** The day `n` days after `day` (before it, when negative). */
export function addDays(day: string, n: number): string {
  return new Date(dayNoon(day) + n * DAY_MS).toISOString().slice(0, 10);
}

/** How many days from `from` to `to`: 0 when they are the same day, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayNoon(to) - dayNoon(from)) / DAY_MS);
}

/** A campaign's last day: it runs `days` days and its first day is one of them. */
export function lastDayOf(startsOn: string, days: number): string {
  return addDays(startsOn, days - 1);
}

/**
 * The moment the server treats a campaign as over: noon UTC of the day after
 * its last day, when that day has ended everywhere on earth but the far
 * Pacific's last two hours. Its own readers leave it by their own calendar
 * (./carried.ts); this is only for the board and the upkeep.
 */
export function endsAtOf(endsOn: string): string {
  return new Date(dayNoon(endsOn) + DAY_MS).toISOString();
}

/**
 * Whether a first day sent by a reader's device can be today somewhere: the
 * server's own day in UTC, the day before, or the day after.
 */
export function startsNow(startsOn: string, now: number = Date.now()): boolean {
  if (!isDay(startsOn)) return false;
  const today = new Date(now).toISOString().slice(0, 10);
  return Math.abs(daysBetween(today, startsOn)) <= 1;
}

// ── Its state ───────────────────────────────────────────────────────────────

/**
 * held            waiting for a moderator to read it (every new campaign,
 *                 his yes to item 117), or hidden again by reports
 * active          on the board and open to join
 * answered,
 * memory_eternal  closed early by its creator, with the two closings July had
 * ended           its last day has passed
 * removed         taken down by a moderator; kept unseen for thirty days
 */
export type CampaignStatus = "held" | "active" | "answered" | "memory_eternal" | "ended" | "removed";

export const CLOSINGS = ["answered", "memory_eternal"] as const;
export type Closing = (typeof CLOSINGS)[number];

/** Open to join: active, and its last day not yet over for the server. */
export function isRunning(c: { status: string; ends_at?: string | null }, now: number = Date.now()): boolean {
  if (c.status !== "active") return false;
  if (!c.ends_at) return true;
  const end = Date.parse(c.ends_at);
  return !Number.isFinite(end) || end > now;
}

/**
 * A campaign of July's: it has no length. July's campaigns were public with
 * no last day and were never read by a moderator, so the rework does not run
 * them: nobody is shown one but the reader who started it, who finds it among
 * their own as ended and can take it down (lib/campaigns/server.ts, mayRead).
 * The row itself is left exactly as it is; a length is what tells the two
 * apart, as the housekeeping already reads it (lib/campaigns/upkeep.ts).
 */
export function isJulyRow(row: Record<string, unknown>): boolean {
  return !isLength(row.days);
}

/** Over for everyone: closed, ended or past its last day. Never true of a held one. */
export function isOver(c: { status: string; ends_at?: string | null }, now: number = Date.now()): boolean {
  if (c.status === "answered" || c.status === "memory_eternal" || c.status === "ended") return true;
  return c.status === "active" && !isRunning(c, now);
}

// ── A kind on the board ─────────────────────────────────────────────────────
//
// The notes, 2.10: "A choice of kind sits behind the sliders, as Talk
// together's filters do." It filters what is on the screen and nothing more:
// the board is asked for once, whole, and a choice asks the server nothing.

/** A campaign's kind as the board sorts by it. The reposed are one kind, whatever else a row says. */
export function boardKind(c: Pick<PublicCampaign, "for_whom" | "intention">): CampaignKind {
  if (c.for_whom === "departed") return "departed";
  return c.intention === "departed" ? "other" : c.intention;
}

/** The kinds on a board, each once, in the order the start screen lists them, the reposed last. A choice is offered only among what is there. */
export function boardKinds(list: readonly Pick<PublicCampaign, "for_whom" | "intention">[]): CampaignKind[] {
  const there = new Set(list.map(boardKind));
  return ([...LIVING_KINDS, "departed"] as CampaignKind[]).filter((k) => there.has(k));
}

/** The campaigns of one kind, in the order they came; all of them when no kind is chosen, or when the kind chosen is no longer on the board. */
export function ofKind<T extends Pick<PublicCampaign, "for_whom" | "intention">>(list: readonly T[], kind: CampaignKind | null): T[] {
  if (kind === null || !list.some((c) => boardKind(c) === kind)) return [...list];
  return list.filter((c) => boardKind(c) === kind);
}

// ── Run it again ────────────────────────────────────────────────────────────
//
// The notes, 2.2: forty days is the ceiling, and "a need that lasts longer is
// renewed: 'Run it again' makes a new campaign from the same parts, and
// nobody is carried over without choosing to be." So it is a new campaign in
// every way: its creator gives the blessing again and accepts the rules and
// the Terms again, a moderator reads it again, and it is in nobody's prayers
// until they add it themselves. Only what its creator wrote and chose comes
// over (the parts below), and its creator can change any of it first.

/** Whether this reader may run it again: it is their own, and it is over. Never one that waits or runs, and one taken down is not there to ask about. */
export function mayRunAgain(c: Pick<PublicCampaign, "status" | "ends_at" | "mine">, now: number = Date.now()): boolean {
  return c.mine === true && isOver(c, now);
}

/** What a new campaign takes from one that is over: what its creator wrote and chose, and nothing of anyone else. */
export type AgainParts = {
  forWhom: ForWhom;
  /** Its kind, for the living; null for the reposed, and for a kind the list no longer has. */
  kind: LivingKind | null;
  title: string;
  name: string;
  words: string;
  /** Its length; null for one of July's, which had none. */
  days: number | null;
  prayer: PrayerRef | null;
  country: string | null;
  town: string;
  /** The circle it was kept to, by its name; null for one everyone in Community could see. */
  circle: string | null;
};

export function partsToRunAgain(c: PublicCampaign): AgainParts {
  const living = c.for_whom === "living";
  const prayer = living ? campaignPrayer({ rule: c.prayer_rule, id: c.prayer_id }) : null;
  return {
    forWhom: c.for_whom,
    kind: living && (LIVING_KINDS as readonly string[]).includes(c.intention) ? (c.intention as LivingKind) : null,
    title: c.title.slice(0, TITLE_MAX),
    name: (c.subject_name ?? "").slice(0, NAME_MAX),
    words: (c.details ?? "").slice(0, WORDS_MAX),
    days: isLength(c.days) ? c.days : null,
    prayer: prayer ? { rule: prayer.rule, id: prayer.id } : null,
    country: c.place_country,
    town: c.place_country ? (c.place_name ?? "") : "",
    circle: c.circle?.name ?? null,
  };
}

// ── A place ─────────────────────────────────────────────────────────────────
//
// His words: "Allow them to add a location." The notes, 2.9: a country from
// the list the app already has, and a town or region the creator types.
// Optional, and off to begin with. Typed, never read from the device or the
// network: the app asks for no location anywhere, and this does not change
// that. No coordinates and no map. A campaign a parent or guardian makes for
// a child keeps the country alone (the notes, 3.6).

/** How long a town or region may be. The table holds it to sixty. */
export const PLACE_TOWN_MAX = 60;

/**
 * A town or region as typed: letters of any script, with spaces, hyphens,
 * apostrophes and full stops between them. No digit at all, so no street
 * number, no postcode and no telephone; two letters at least.
 */
const TOWN = /^[\p{L}\p{M}][\p{L}\p{M}' .\u2019-]*[\p{L}\p{M}.]$/u;

/** The town as it is kept: spaces gathered, ends trimmed. Null for none, and for anything that is not a town by the pattern. */
export function cleanTown(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const town = v.replace(/\s+/g, " ").trim();
  // The pattern itself asks for two letters at least: one to begin and one to end.
  if (town.length > PLACE_TOWN_MAX || !TOWN.test(town)) return null;
  return town;
}

/** Whether what was typed is a town, or nothing at all. What the start screen asks before Create. */
export function townFits(v: string): boolean {
  return v.trim() === "" || cleanTown(v) !== null;
}

/** A campaign's place: a country of the app's list, and a town when one was given. */
export type CampaignPlace = { country: string; town: string | null };

/** A country's code as the table holds one. Which codes are countries is asked when a campaign is started (lib/onboarding/clergy.ts, isCountry). */
const COUNTRY_CODE = /^[A-Z]{2}$/;

/** The two fields of a row as a reader receives them: both empty unless the country is a code, and the town only with a country. */
function placeOf(row: Record<string, unknown>): { place_country: string | null; place_name: string | null } {
  const country = typeof row.place_country === "string" && COUNTRY_CODE.test(row.place_country) ? row.place_country : null;
  return { place_country: country, place_name: country ? cleanTown(row.place_name) : null };
}

// ── The prayer it places ────────────────────────────────────────────────────

/** A prayer of the prayer book, by its rule's id and its own (lib/prayers/rules.ts). */
export type PrayerRef = { rule: string; id: string };

/**
 * A prayer a campaign may carry: a psalm, named by its number as the app
 * names a psalm, or a prayer of the prayer book, named by a line the catalog
 * already has.
 */
export type CampaignPrayer = PrayerRef & ({ number: number; title?: undefined } | { number?: undefined; title: string });

/**
 * The prayers a campaign for the living may carry beside the name (his yes
 * to item 123: "a campaign for the living carries the name, and a psalm if
 * the creator wants"), each read from the app's own file when it is prayed
 * and never copied (./prayerTexts.ts). A campaign keeps a pointer to one
 * (prayer_rule, prayer_id) and never its words, so a correction to the book
 * reaches every campaign.
 *
 * Three kinds of pointer:
 *   protection, repentance   a psalm the prayer book's own files hold
 *   psalter                  a psalm read from the Bible's file (Brenton's
 *                            Septuagint, the Psalter the prayer book prints
 *                            its psalms from), which the prayer book has no
 *                            copy of
 *   morning                  the Trisagion prayers, as the morning prayers
 *                            have them
 *
 * A campaign for the reposed names none: the Church's prayer for the
 * departed is said over its name, as over every name of the reader's
 * departed (lib/prayers/commemoration.ts, DEPARTED_PRAYER).
 *
 * The Trisagion first, then the psalms by their number.
 */
export const CAMPAIGN_PRAYERS: readonly CampaignPrayer[] = [
  { rule: "morning", id: "trisagion", title: "onboard.day1.trisagion.title" },
  { rule: "psalter", id: "psalm-24", number: 24 },
  { rule: "protection", id: "psalm-26", number: 26 },
  { rule: "repentance", id: "psalm-50", number: 50 },
  { rule: "protection", id: "psalm-90", number: 90 },
  { rule: "psalter", id: "psalm-102", number: 102 },
  { rule: "psalter", id: "psalm-120", number: 120 },
  { rule: "psalter", id: "psalm-142", number: 142 },
];

export function campaignPrayer(ref: { rule?: unknown; id?: unknown } | null | undefined): CampaignPrayer | null {
  if (!ref) return null;
  return CAMPAIGN_PRAYERS.find((p) => p.rule === ref.rule && p.id === ref.id) ?? null;
}

/**
 * The prayer each kind starts with (his "yes prayers", 2026-11-10, to the
 * mapping of docs/1.9-build/notes/campaigns-fable.md, section 22): choosing
 * a kind on the start screen sets the prayer's row to it, and the creator
 * can change it to any other on the list, or to the name alone.
 *
 * Each is here for words of its own that ask what the campaign asks, read
 * from the app's file (the notes give them, and
 * lib/campaigns/__tests__/model.test.ts holds every one to its file):
 *
 *   an illness       the Trisagion prayers   "visit and heal our infirmities"
 *   a trial          Psalm 90                "I am with him in affliction"
 *   the persecuted   Psalm 26                "my persecutors and mine enemies"
 *   guidance         Psalm 142               "Teach me to do thy will"
 *   a journey        Psalm 120               "thy coming in, and thy going out"
 *   thanksgiving     Psalm 102               "forget not all his praises"
 *
 * An exam or studies, and something else, start with the name alone: the
 * app holds nothing that speaks of studies (Psalm 24, "teach me thy paths",
 * is on the list for whoever wants it). Only the reposed have a prayer the
 * Church made for that need, and theirs is not chosen here. Prayers made
 * for the sick, for studies, for a journey and for thanksgiving come after
 * 1.9, one at a time, each read off its page (section 22.4): a preset is a
 * pointer, so one takes a psalm's place here and nothing else changes.
 */
export const KIND_PRAYER: Readonly<Record<LivingKind, PrayerRef | null>> = {
  healing: { rule: "morning", id: "trisagion" },
  comfort: { rule: "protection", id: "psalm-90" },
  persecuted: { rule: "protection", id: "psalm-26" },
  guidance: { rule: "psalter", id: "psalm-142" },
  travel: { rule: "psalter", id: "psalm-120" },
  thanksgiving: { rule: "psalter", id: "psalm-102" },
  study: null,
  other: null,
};

/**
 * The prayer the start screen holds once its creator has chosen a kind: the
 * kind's own, until they have chosen the prayer themselves. From then on a
 * change of kind leaves it as they set it, the name alone included: what a
 * creator chose is never changed for them.
 */
export function prayerAfterKind(kind: LivingKind, held: PrayerRef | null, byHand: boolean): PrayerRef | null {
  return byHand ? held : KIND_PRAYER[kind];
}

// ── The blessing ────────────────────────────────────────────────────────────

/**
 * What the creator affirmed before Create, kept with its day: their own
 * request, the person's blessing, a parent or guardian, or the family of the
 * departed. July checked a tick and threw it away.
 */
export const CONSENT_KINDS = ["self", "blessing", "guardian", "family"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** The line to tick for each. */
export const CONSENT_LINE: Readonly<Record<ConsentKind, string>> = {
  self: "campaigns.consent.self",
  blessing: "campaigns.consent.blessing",
  guardian: "campaigns.consent.guardian",
  family: "campaigns.consent.family",
};

/** The reposed are affirmed by their family; the living by themselves, their blessing, or their parent. */
export function consentFits(forWhom: ForWhom, consent: ConsentKind): boolean {
  return forWhom === "departed" ? consent === "family" : consent !== "family";
}

// ── What a reader is handed ─────────────────────────────────────────────────

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const NAME_MAX = 80;
/** The creator's own words: six hundred characters to begin with (the table allows two thousand). */
export const WORDS_MAX = 600;

/**
 * A campaign as every route hands it out. Never the creator's account id and
 * never a count of anyone: the columns a route reads are CAMPAIGN_COLS and
 * nothing else, and the row is projected, not spread (publicCampaign).
 */
export type PublicCampaign = {
  id: string;
  title: string;
  intention: CampaignKind;
  for_whom: ForWhom;
  /** Who it prays for: a first name, as the Church remembers them. */
  subject_name: string | null;
  /** What the creator asks prayers for, in their own words. */
  details: string | null;
  days: number | null;
  starts_on: string | null;
  ends_on: string | null;
  ends_at: string | null;
  prayer_rule: string | null;
  prayer_id: string | null;
  /** Where it is, if its creator said: a country's code, and a town or region as typed. */
  place_country: string | null;
  place_name: string | null;
  status: Exclude<CampaignStatus, "removed">;
  /** The creator as Community shows them, kept on the row so no read carries their id. */
  creator_name: string | null;
  creator_handle: string | null;
  created_at: string;
  /** This reader started it. Only on the routes that know who asks. */
  mine?: boolean;
  /** Its creator keeps it after its last day (for the reposed; his yes to item 125). Told to its creator alone. */
  keep_after_end?: boolean;
  /** Only for its creator: whether it may stand in "Prayed by many". */
  listed?: boolean;
  /**
   * Kept to one circle: that circle's name, for the line that says who can
   * see it. Only ever sent to a reader who may open the campaign (its
   * circle's members and its creator); absent for a campaign everyone in
   * Community can see.
   */
  circle?: { name: string };
  /**
   * For its creator alone, while it waits: its words may mean someone is in
   * danger, a moderator reads it first, and the page shows the safety line
   * (./safety.ts). Never told to another reader, and never on a list.
   */
  safety?: boolean;
};

/** Every column a read may name. No creator_id, no praying_count, no prayer_count. */
export const CAMPAIGN_COLS =
  "id, title, intention, for_whom, subject_name, details, note, days, starts_on, ends_on, ends_at, prayer_rule, prayer_id, place_country, place_name, status, creator_name, creator_handle, created_at";

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/**
 * The row a reader receives, written as an explicit projection: a row that is
 * spread carries whatever a later select adds to it. A July row has no
 * details, days or creator; its one line of `note` stands as its words.
 */
export function publicCampaign(row: Record<string, unknown>): PublicCampaign {
  const said = row.status === "held" || row.status === "answered" || row.status === "memory_eternal" || row.status === "ended" ? row.status : "active";
  // One of July's still says active, and runs for nobody: it reads as ended.
  const status = said === "active" && isJulyRow(row) ? "ended" : said;
  const prayer = campaignPrayer({ rule: row.prayer_rule, id: row.prayer_id });
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    intention: isCampaignKind(row.intention) ? row.intention : "other",
    for_whom: row.for_whom === "departed" ? "departed" : "living",
    subject_name: text(row.subject_name),
    details: text(row.details) ?? text(row.note),
    days: isLength(row.days) ? row.days : null,
    starts_on: isDay(row.starts_on) ? row.starts_on : null,
    ends_on: isDay(row.ends_on) ? row.ends_on : null,
    ends_at: text(row.ends_at),
    // Only a prayer the book is known to hold: a reference nothing can read is no prayer.
    prayer_rule: prayer?.rule ?? null,
    prayer_id: prayer?.id ?? null,
    // A place only as the list and the pattern know one: a country of the
    // app's own list, and a town that is letters.
    ...placeOf(row),
    status,
    creator_name: text(row.creator_name),
    creator_handle: text(row.creator_handle),
    created_at: String(row.created_at ?? ""),
  };
}

// ── Parts that ship switched off ────────────────────────────────────────────

/**
 * A part of campaigns that the server can turn on by itself
 * (lib/campaigns/parts.ts): "Prayed by many", and pictures. An app never
 * decides one from its own bundle; it is told with the answer that says
 * campaigns are open.
 */
export type CampaignPart = "many" | "pictures";
export const CAMPAIGN_PART_NAMES: readonly CampaignPart[] = ["many", "pictures"];

// ── "Prayed by many" ────────────────────────────────────────────────────────
//
// His item 118, said yes to as written: top campaigns later, named for what
// the list is, with no number, and a creator can stay out. Built in 1.9 and
// switched off on the server.
//
// It meets a rule he made himself (CONTRIBUTING.md, 2026-08-22, "On prayer,
// no figures at all"), so it is held to this form and no wider:
//
//   - The order is shown and no figure ever is: no number of people, no rank.
//   - It is ordered by how many readers with an account added a campaign to
//     their prayers in the time chosen, one for each account. Never by
//     comments, and never by anything a reader does while praying.
//   - It never stands alone: the board opens on "Newly asked", so a need
//     nobody carries yet is seen first.
//   - A floor: a campaign appears only once enough readers carry it that the
//     list says nothing about any one of them.
//   - A way out: its creator can keep a campaign out of it (`listed`), and a
//     campaign kept to a circle never appears.

/** The times "Prayed by many" can be asked over. */
export const MANY_SPANS = ["day", "week", "month", "year"] as const;
export type ManySpan = (typeof MANY_SPANS)[number];

export function isManySpan(v: unknown): v is ManySpan {
  return typeof v === "string" && (MANY_SPANS as readonly string[]).includes(v);
}

/** Each span in days. */
export const MANY_SPAN_DAYS: Readonly<Record<ManySpan, number>> = { day: 1, week: 7, month: 30, year: 365 };

/** How many readers must have added a campaign in the span before it is listed at all. */
export const MANY_FLOOR = 5;

/** How many campaigns the list holds. */
export const MANY_SHOWN = 12;

// ── Pictures ────────────────────────────────────────────────────────────────
//
// His first words were "a 3-image photo limit for normal users. And for
// premium users, they can add as up to 20 photos", and his yes to item 121
// built it so: three, or twenty with Plus. His "rec yes to all" of 2026-11-10
// changed it: the same limit for every reader, not a Plus perk, and five
// (the arbiter's answer the same day; nine is this one constant away if he
// asks). Each picture is checked before it is shown, and "I am 18 or older"
// is ticked to put one up. Built in 1.9 and switched off on the server until
// his steps for the check are done (lib/campaigns/parts.ts,
// lib/campaigns/pictureCheck.ts).

/**
 * How many pictures a campaign may carry: five, whoever started it. Not a
 * Plus perk: no entitlement is read for it, and nothing about pictures is
 * sold. Every picture is a moderator's look before anyone sees it, so the
 * limit is also the moderators' load.
 */
export const PICTURES_MAX = 5;
/** What may be sent: a still JPEG, PNG or WebP of at most 4 MB. The server makes it again from its pixels. */
export const PICTURE_MAX_BYTES = 4 * 1024 * 1024;
export const PICTURE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
/** What it shows, in its creator's words, for a reader who cannot see it. */
export const PICTURE_ALT_MAX = 140;

/** A picture as a reader receives it: where to load it, its size, and what it shows. */
export type CampaignPicture = {
  id: string;
  /** Its public address once shown. While it waits, a short-lived one, handed to its creator alone. */
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  /** Waiting for a moderator. Only its creator is ever handed one that is. */
  held: boolean;
};

/** A campaign's pictures, in their order, with what this reader may do. */
export type CampaignPictures = {
  pictures: CampaignPicture[];
  /** For its creator: how many a campaign may carry (PICTURES_MAX, the same for everyone). Null for any other reader. */
  limit: number | null;
  /** Its creator, on a campaign that waits or runs, with a place still free. */
  canAdd: boolean;
};

// ── Updates and comments ────────────────────────────────────────────────────
//
// His words: "free users can add announcements, right, to their campaign ...
// Each day they can post an update if they want", and "allow comments on the
// prayer campaign". His yes to item 126: its creator can close comments and
// take one off; no reactions and no counts under one. And to item 124: no
// links, and no asking for money.
//
// Both are replies in the campaign's own thread in Community (docs/1.9-build/
// sql/campaigns-2-threads.sql), so the word filter, the spam guard, holds,
// reports, blocks, mutes, the moderators' queue and its log apply as they
// stand, with nothing built twice (lib/campaigns/thread.ts).

/** How long an update or a comment may be. */
export const NOTE_MAX = 1000;
/** How many updates a campaign's creator may write in a day. */
export const UPDATES_A_DAY = 3;

export type NoteKind = "update" | "comment";

/**
 * An update or a comment as a reader receives it: who wrote it as Community
 * shows them, the words, and when. No account id, no count of anything, and
 * nothing to react with.
 */
export type CampaignNote = {
  id: string;
  /** The creator's update. Otherwise a comment. */
  update: boolean;
  body: string;
  author_name: string;
  author_handle: string | null;
  author_avatar: string | null;
  /** The clergy seal, as Community shows it on a reply. */
  author_clergy: string | null;
  created_at: string;
  /** The reader wrote it. */
  mine: boolean;
  /** Written by someone the reader has muted: folded until they open it. */
  muted: boolean;
};

/** A campaign's updates, newest first, and its comments, oldest first, with what this reader may do. */
export type CampaignThread = {
  updates: CampaignNote[];
  comments: CampaignNote[];
  commentsOpen: boolean;
  /** The reader has an account here, so a note that is not theirs can be reported. */
  signedIn: boolean;
  /** Its creator, while it runs. */
  canUpdate: boolean;
  /** A signed-in reader, while it runs and comments are open. */
  canComment: boolean;
};

// ── Reports ─────────────────────────────────────────────────────────────────

/**
 * The reasons to tick on a report. "about_me" hides the campaign at once,
 * until a moderator looks: a person named without their blessing should not
 * have to wait for two more readers to agree.
 */
export const REPORT_REASONS = ["about_me", "private_details", "money", "unkind", "not_prayer", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** The reasons to tick on a report of one picture, from its viewer. */
export const PICTURE_REPORT_REASONS = ["about_me", "picture", "other"] as const;
export type PictureReportReason = (typeof PICTURE_REPORT_REASONS)[number];
export const PICTURE_REPORT_REASON_LABEL: Readonly<Record<PictureReportReason, string>> = {
  about_me: "campaigns.report.pictureAboutMe",
  picture: "campaigns.report.picture",
  other: "campaigns.report.other",
};

export const REPORT_REASON_LABEL: Readonly<Record<ReportReason, string>> = {
  about_me: "campaigns.report.aboutMe",
  private_details: "campaigns.report.privateDetails",
  money: "campaigns.report.money",
  unkind: "campaigns.report.unkind",
  not_prayer: "campaigns.report.notPrayer",
  other: "campaigns.report.other",
};

// ── Limits ──────────────────────────────────────────────────────────────────

/** Campaigns one account may have running or waiting at once: one while the account is a day old, three after. */
export const RUNNING_CAP = { fresh: 1, settled: 3 } as const;
/** And at most this many started in a day. */
export const STARTED_A_DAY = 3;

// ── Moderating ──────────────────────────────────────────────────────────────

/** The decisions a moderator takes on campaigns, by name, as the queue's buttons send them (./moderation.ts runs them). */
export const CAMPAIGN_MOD_ACTIONS = ["approve_campaign", "remove_campaign", "restore_campaign", "dismiss_campaign_report", "approve_picture", "remove_picture"] as const;
export type CampaignModAction = (typeof CAMPAIGN_MOD_ACTIONS)[number];

export function isCampaignModAction(v: unknown): v is CampaignModAction {
  return typeof v === "string" && (CAMPAIGN_MOD_ACTIONS as readonly string[]).includes(v);
}

/** A campaign waiting for a moderator, as the queue shows it: its words, and why it waits. Never its creator's account. */
export type WaitingCampaign = {
  id: string;
  title: string;
  intention: string;
  for_whom: string;
  subject_name: string | null;
  details: string | null;
  days: number | null;
  ends_on: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  /** Why it waits, in the server's own few words: "new; crisis; words (2 masked); money, phone; address", or "reports (3)". */
  held_reason: string | null;
  created_at: string;
  /** Kept to one circle: its name, so the moderator knows who will see it. Null for one everyone in Community will see. */
  circle?: string | null;
  /** Its place, if its creator gave one: the moderator reads it with the rest, since every reader will. */
  place_country?: string | null;
  place_name?: string | null;
};

/** A campaign's open report as the queue shows it: the reason ticked, the words, and the campaign. Never who reported. */
export type OpenCampaignReport = {
  id: string;
  reason: string | null;
  reason_code: string | null;
  created_at: string;
  campaign: { id: string; title: string; status: string; intention: string; subject_name: string | null; details?: string | null; creator_name?: string | null } | null;
};

/**
 * A picture waiting for a moderator, as the queue shows it: the picture, what
 * its creator says it shows, what the automatic check answered, and whose
 * campaign by its title. With reasons when readers' reports hid it, and
 * none when it is new. Never an account, and never who reported.
 */
export type WaitingPicture = {
  id: string;
  /** A short-lived address: the file is in the private bucket until it is cleared. Null when one could not be made. */
  url: string | null;
  /** Still shown to readers: reported, and not hidden by its reports. Then `url` is its public address. */
  shown: boolean;
  alt: string | null;
  check_result: string | null;
  created_at: string;
  reports: { reason_code: string | null; reason: string | null }[];
  campaign: { id: string; title: string; creator_name: string | null };
};

/**
 * What the moderators' queue carries of campaigns, when they are open for
 * the moderator who asks. `pictures` is there only while the server has
 * pictures switched on, and only for the team (the notes, 3.4).
 */
export type CampaignQueue = { waiting: WaitingCampaign[]; reports: OpenCampaignReport[]; live: boolean; pictures?: WaitingPicture[] };

/**
 * Why a campaign waits, read from the server's few words into what a
 * moderator is shown: every campaign is read once ("new"); the rest are what
 * the filters saw, and whether readers' reports hid it.
 */
export type HeldWhy = "crisis" | "words" | "asks" | "address" | "reports";

export function heldWhy(reason: string | null | undefined): HeldWhy[] {
  const said = (reason ?? "").toLowerCase();
  const out: HeldWhy[] = [];
  if (/\bcrisis\b/.test(said)) out.push("crisis");
  if (/\bwords\b/.test(said)) out.push("words");
  if (/\b(?:money|phone|email|contact)\b/.test(said)) out.push("asks");
  if (/\baddress\b/.test(said)) out.push("address");
  if (/\breports\b/.test(said)) out.push("reports");
  return out;
}
