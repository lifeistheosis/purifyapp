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
