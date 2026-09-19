// The investor page's numbers that nothing in the app can count.
//
// Everything else on purifyapp.net/invest is read live by lib/invest/live.ts.
// These come from outside the app (TikTok's analytics, the App Store) or from
// the deal itself, so they are typed in here. Updating one is one edit here,
// and both the page and the owner dashboard pick it up on the next deploy.

export const INVEST_MANUAL = {
  /** The organic headline on the cover: TikTok plus Instagram, all organic. */
  organicViewsHeadline: "500K+",
  /** TikTok analytics, as reported by TikTok for the window below. */
  tiktok: {
    window: "Aug 31, 2025 to Aug 30, 2026",
    views: 457_100,
    likes: 62_200,
    shares: 5_900,
    comments: 1_700,
  },
  /** App Store rating as shown on the listing. */
  appStoreRating: 5.0,
  /** The investment on the page's ask and terms slides. */
  deal: {
    amount: 25_000,
    stakeUntilRepaid: 45,
    stakeForGood: 18.5,
    /**
     * Profit actually paid out to the investor so far, in dollars. Moves his
     * stake from 45% to 18.5% once it reaches the amount. Update it with every
     * payout.
     */
    paidOutToInvestor: 0,
  },
} as const;
