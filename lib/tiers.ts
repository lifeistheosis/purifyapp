export type Tier = "free" | "paid";

export const FEATURE_TIER = {
  bible: "free",
  prayers: "free",
  "prayers/personal": "paid",
  saints: "free",
  campaigns: "free",
  calendar: "free",
  marketplace: "free",
  "marketplace/blessings": "paid",
  "marketplace/sell": "paid",
} as const satisfies Record<string, Tier>;

export type FeatureKey = keyof typeof FEATURE_TIER;
