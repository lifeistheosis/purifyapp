// Master flag for Community conversations, mirroring lib/campaigns/flags.ts.
// Unset = the Conversations surface shows its "opening soon" state and the
// API 404s. Set NEXT_PUBLIC_COMMUNITY_ENABLED=1 (or "true") once the
// 20260722_community.sql migration is applied, so the feature never renders
// or writes before its tables exist. Prayer campaigns keep their own flag.

export function communityEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_COMMUNITY_ENABLED;
  return v === "1" || v === "true";
}
