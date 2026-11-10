// Prayer campaigns, reworked (1.9.1): what a campaign is, and its rules.
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

/** Over for everyone: closed, ended or past its last day. Never true of a held one. */
export function isOver(c: { status: string; ends_at?: string | null }, now: number = Date.now()): boolean {
  if (c.status === "answered" || c.status === "memory_eternal" || c.status === "ended") return true;
  return c.status === "active" && !isRunning(c, now);
}

// ── The prayer it places ────────────────────────────────────────────────────

/** A prayer of the prayer book, by its rule's id and its own (lib/prayers/rules.ts). */
export type PrayerRef = { rule: string; id: string };

/**
 * The prayers a campaign for the living may carry beside the name (his yes
 * to item 123: "a campaign for the living carries the name, and a psalm if
 * the creator wants"): the psalms the prayer book already holds, each read
 * from its own file when it is prayed and never copied. A campaign for the
 * reposed names none: the Church's prayer for the departed is said over its
 * name, as over every name of the reader's departed
 * (lib/prayers/commemoration.ts, DEPARTED_PRAYER).
 *
 * Which prayer goes with which need is a priest's question
 * (docs/1.9-build/notes/campaigns-fable.md, 8.2), so nothing here pairs one
 * with a kind: the creator chooses, or chooses none.
 */
export const CAMPAIGN_PSALMS: readonly (PrayerRef & { number: number })[] = [
  { rule: "protection", id: "psalm-90", number: 90 },
  { rule: "protection", id: "psalm-26", number: 26 },
  { rule: "repentance", id: "psalm-50", number: 50 },
];

export function campaignPsalm(ref: { rule?: unknown; id?: unknown } | null | undefined): (PrayerRef & { number: number }) | null {
  if (!ref) return null;
  return CAMPAIGN_PSALMS.find((p) => p.rule === ref.rule && p.id === ref.id) ?? null;
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
  status: Exclude<CampaignStatus, "removed">;
  /** The creator as Community shows them, kept on the row so no read carries their id. */
  creator_name: string | null;
  creator_handle: string | null;
  created_at: string;
  /** This reader started it. Only on the routes that know who asks. */
  mine?: boolean;
  /** Its creator keeps it after its last day (for the reposed; his yes to item 125). Told to its creator alone. */
  keep_after_end?: boolean;
};

/** Every column a read may name. No creator_id, no praying_count, no prayer_count. */
export const CAMPAIGN_COLS =
  "id, title, intention, for_whom, subject_name, details, note, days, starts_on, ends_on, ends_at, prayer_rule, prayer_id, status, creator_name, creator_handle, created_at";

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/**
 * The row a reader receives, written as an explicit projection: a row that is
 * spread carries whatever a later select adds to it. A July row has no
 * details, days or creator; its one line of `note` stands as its words.
 */
export function publicCampaign(row: Record<string, unknown>): PublicCampaign {
  const status = row.status === "held" || row.status === "answered" || row.status === "memory_eternal" || row.status === "ended" ? row.status : "active";
  const prayer = campaignPsalm({ rule: row.prayer_rule, id: row.prayer_id });
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
    status,
    creator_name: text(row.creator_name),
    creator_handle: text(row.creator_handle),
    created_at: String(row.created_at ?? ""),
  };
}

// ── Reports ─────────────────────────────────────────────────────────────────

/**
 * The reasons to tick on a report. "about_me" hides the campaign at once,
 * until a moderator looks: a person named without their blessing should not
 * have to wait for two more readers to agree.
 */
export const REPORT_REASONS = ["about_me", "private_details", "money", "unkind", "not_prayer", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

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
export const CAMPAIGN_MOD_ACTIONS = ["approve_campaign", "remove_campaign", "restore_campaign", "dismiss_campaign_report"] as const;
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
};

/** A campaign's open report as the queue shows it: the reason ticked, the words, and the campaign. Never who reported. */
export type OpenCampaignReport = {
  id: string;
  reason: string | null;
  reason_code: string | null;
  created_at: string;
  campaign: { id: string; title: string; status: string; intention: string; subject_name: string | null; details?: string | null; creator_name?: string | null } | null;
};

/** What the moderators' queue carries of campaigns, when they are open for the moderator who asks. */
export type CampaignQueue = { waiting: WaitingCampaign[]; reports: OpenCampaignReport[]; live: boolean };

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
