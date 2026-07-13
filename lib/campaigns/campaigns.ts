// Prayer Campaigns: shared shapes and helpers for the community "pray for ___"
// board. Pure data, no "use client" and no server-only, so it is importable
// from route handlers, the read layer, and client components alike (the same
// discipline as lib/shop/types.ts + format.ts).

export type CampaignIntention =
  | "healing"
  | "comfort"
  | "guidance"
  | "persecuted"
  | "thanksgiving"
  | "departed";

export type ForWhom = "living" | "departed";

export type CampaignStatus =
  | "active"
  | "answered"
  | "memory_eternal"
  | "removed";

/**
 * Public shape of a public.prayer_campaigns row. Snake_case to mirror the
 * columns exactly, like the shop types, so the read layer returns rows as-is.
 */
export type PrayerCampaign = {
  id: string;
  creator_id: string;
  title: string;
  intention: CampaignIntention;
  for_whom: ForWhom;
  subject_name: string | null;
  note: string | null;
  /** The chosen preset prayer's key, or null to fall back to the intention. */
  prayer_key: string | null;
  /** When the campaign ends, or null for an ongoing one. */
  ends_at: string | null;
  praying_count: number;
  prayer_count: number;
  status: CampaignStatus;
  created_at: string;
};

/** A user's own join/activity row (self-select), for "My prayers" + profile. */
export type MyPrayerRow = {
  campaign_id: string;
  joined_at: string;
  last_prayed_at: string | null;
  prayer_days: number;
};

/** The six intentions, in display order. `defaultFor` seeds the living/departed
 *  toggle when this intention is chosen on the create form. */
export const INTENTIONS: {
  slug: CampaignIntention;
  label: string;
  sub: string;
  defaultFor: ForWhom;
}[] = [
  { slug: "healing", label: "Healing", sub: "For the sick and the suffering", defaultFor: "living" },
  { slug: "comfort", label: "Comfort and strength", sub: "In anxiety, grief, or trial", defaultFor: "living" },
  { slug: "guidance", label: "Guidance", sub: "For a decision, a path, a discernment", defaultFor: "living" },
  { slug: "persecuted", label: "The persecuted", sub: "For the suffering Church and the oppressed", defaultFor: "living" },
  { slug: "thanksgiving", label: "Thanksgiving", sub: "For a mercy received", defaultFor: "living" },
  { slug: "departed", label: "The departed", sub: "Memory eternal for those who have fallen asleep", defaultFor: "departed" },
];

const BY_SLUG: Record<CampaignIntention, (typeof INTENTIONS)[number]> =
  Object.fromEntries(INTENTIONS.map((i) => [i.slug, i])) as Record<
    CampaignIntention,
    (typeof INTENTIONS)[number]
  >;

export function intentionLabel(slug: CampaignIntention): string {
  return BY_SLUG[slug]?.label ?? "Prayer";
}

export function isIntention(v: unknown): v is CampaignIntention {
  return typeof v === "string" && v in BY_SLUG;
}

/**
 * A short traditional intercession the app shows on a campaign, so joining
 * tells you exactly what to pray. These are plain petitionary lines and the
 * Jesus Prayer, in the common tradition, not contested doctrine.
 */
export function suggestedPrayer(
  intention: CampaignIntention,
  forWhom: ForWhom,
): string {
  if (forWhom === "departed" || intention === "departed") {
    return "Give rest, O Lord, to the soul of your servant who has fallen asleep, and make their memory to be eternal.";
  }
  switch (intention) {
    case "healing":
      return "Lord Jesus Christ, Son of God, have mercy on your servant and grant them healing of soul and body.";
    case "comfort":
      return "Lord Jesus Christ, Son of God, comfort your servant in their affliction and give them your peace.";
    case "guidance":
      return "Lord Jesus Christ, Son of God, enlighten your servant and order their steps according to your will.";
    case "persecuted":
      return "Lord Jesus Christ, Son of God, strengthen, protect, and deliver your suffering people.";
    case "thanksgiving":
      return "Glory to you, O God, glory to you. We thank you for your mercy and your loving-kindness.";
    default:
      return "Lord Jesus Christ, Son of God, have mercy on your servant.";
  }
}

/**
 * Preset prayers a creator can choose from, in the manner of Hallow's prayer
 * campaigns, so joining tells you exactly what to pray. Traditional petitionary
 * lines, the Jesus Prayer, the Trisagion, and short commemorations, not
 * contested doctrine. `context` narrows the picker to the living or the
 * departed; "any" shows for both.
 */
export type PresetPrayer = {
  key: string;
  label: string;
  text: string;
  context: "living" | "departed" | "any";
};

export const PRESET_PRAYERS: PresetPrayer[] = [
  { key: "for-the-sick", label: "For the sick", text: "Lord Jesus Christ, Son of God, have mercy on your servant and grant them healing of soul and body.", context: "living" },
  { key: "for-comfort", label: "For comfort and strength", text: "Lord Jesus Christ, Son of God, comfort your servant in their affliction and give them your peace.", context: "living" },
  { key: "for-guidance", label: "For guidance", text: "Lord Jesus Christ, Son of God, enlighten your servant and order their steps according to your will.", context: "living" },
  { key: "for-the-persecuted", label: "For the persecuted", text: "Lord Jesus Christ, Son of God, strengthen, protect, and deliver your suffering people.", context: "living" },
  { key: "thanksgiving", label: "Thanksgiving", text: "Glory to you, O God, glory to you. We thank you for your mercy and your loving-kindness.", context: "any" },
  { key: "memory-eternal", label: "Memory eternal", text: "Give rest, O Lord, to the soul of your servant who has fallen asleep, and make their memory to be eternal.", context: "departed" },
  { key: "jesus-prayer", label: "The Jesus Prayer", text: "Lord Jesus Christ, Son of God, have mercy on me, a sinner.", context: "any" },
  { key: "trisagion", label: "The Trisagion", text: "Holy God, Holy Mighty, Holy Immortal, have mercy on us.", context: "any" },
  { key: "theotokos", label: "To the Theotokos", text: "Most Holy Theotokos, save us.", context: "any" },
];

const PRESET_BY_KEY: Record<string, PresetPrayer> = Object.fromEntries(
  PRESET_PRAYERS.map((p) => [p.key, p]),
);

const DEFAULT_PRAYER: Record<CampaignIntention, string> = {
  healing: "for-the-sick",
  comfort: "for-comfort",
  guidance: "for-guidance",
  persecuted: "for-the-persecuted",
  thanksgiving: "thanksgiving",
  departed: "memory-eternal",
};

/** The preset pre-selected on the create form when an intention is chosen. */
export function defaultPrayerKey(intention: CampaignIntention): string {
  return DEFAULT_PRAYER[intention] ?? "jesus-prayer";
}

/** The presets to offer for a campaign's for-whom (plus the "any" prayers). */
export function presetsFor(forWhom: ForWhom): PresetPrayer[] {
  return PRESET_PRAYERS.filter(
    (p) => p.context === "any" || p.context === forWhom,
  );
}

export function isPrayerKey(v: unknown): v is string {
  return typeof v === "string" && v in PRESET_BY_KEY;
}

/** The prayer a campaign shows: the chosen preset, or the intention default
 *  for older rows or a key we no longer carry. */
export function prayerText(campaign: {
  prayer_key?: string | null;
  intention: CampaignIntention;
  for_whom: ForWhom;
}): string {
  const preset = campaign.prayer_key
    ? PRESET_BY_KEY[campaign.prayer_key]
    : undefined;
  return preset?.text ?? suggestedPrayer(campaign.intention, campaign.for_whom);
}

/** Campaign length options offered on the create form. `days` null = ongoing. */
export const DURATIONS: { label: string; sub: string; days: number | null }[] = [
  { label: "Ongoing", sub: "No end date", days: null },
  { label: "A week", sub: "Seven days", days: 7 },
  { label: "A novena", sub: "Nine days", days: 9 },
  { label: "Forty days", sub: "The traditional length", days: 40 },
];

/** The day-counts a campaign may be capped to (null/ongoing has no cap). */
export const DURATION_DAYS = [7, 9, 40] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left until ends_at, or null when ongoing. 0 means today/past. */
export function daysLeft(
  ends_at: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!ends_at) return null;
  const end = new Date(ends_at).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - now;
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** Has the campaign finished? Closed by the creator, removed, or past its end. */
export function isFinished(
  campaign: { status: CampaignStatus; ends_at?: string | null },
  now: number = Date.now(),
): boolean {
  if (campaign.status !== "active") return true;
  return !!campaign.ends_at && new Date(campaign.ends_at).getTime() <= now;
}

/** Once-a-day gate for the "prayed today" action. ~20h avoids timezone math
 *  while still meaning "not again the same day". Shared so the client can grey
 *  the button and the server can enforce it. */
export const PRAY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export function canPrayAgain(
  lastPrayedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastPrayedAt) return true;
  const last = new Date(lastPrayedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now - last >= PRAY_COOLDOWN_MS;
}

/** Status the UI can show for a closed campaign. */
export function statusLabel(status: CampaignStatus): string | null {
  if (status === "answered") return "Answered, glory to God";
  if (status === "memory_eternal") return "Memory eternal";
  return null;
}
