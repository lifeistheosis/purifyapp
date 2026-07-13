// Master flag for the Prayer Campaigns feature, mirroring lib/shop/flags.ts.
// Unset = the /campaigns route keeps its "coming soon" shell and the API 404s.
// Set NEXT_PUBLIC_CAMPAIGNS_ENABLED=1 (or "true") once the
// 20260713_prayer_campaigns.sql migration is applied, so the feature never
// renders or writes before its tables exist.

export function campaignsEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_CAMPAIGNS_ENABLED;
  return v === "1" || v === "true";
}
