// Live funding goal + monthly expense breakdown for /support.
// Update the numbers below as donations arrive / costs change.

export type ExpenseLine = {
  label: string;
  monthlyUsd: number;
  note?: string;
};

export const SUPPORT = {
  /** Currency code displayed on the page. */
  currency: "USD",
  /** Current month's funding goal in USD. */
  monthlyGoalUsd: 300,
  /** Donations received toward this month's goal in USD. */
  monthlyRaisedUsd: 42,
  /** Last update of these numbers (human-readable). */
  lastUpdated: "May 19, 2026",
  /** Where the money goes, in priority order. */
  expenses: [
    {
      label: "Web hosting (Render)",
      monthlyUsd: 19,
      note: "Always-on web service with one small worker.",
    },
    {
      label: "Database & auth (Supabase)",
      monthlyUsd: 25,
      note: "The Pro plan that powers accounts, magic-link sign-in, your saved highlights and notes, and prayer-rule streaks since v3.3.",
    },
    {
      label: "Transactional email (Resend)",
      monthlyUsd: 9,
      note: "Magic-link sign-in messages and the occasional release-note email.",
    },
    {
      label: "Domain (purify.app)",
      monthlyUsd: 2,
      note: "Annualized to a per-month figure.",
    },
    {
      label: "Image storage and CDN",
      monthlyUsd: 8,
      note: "Saint icons, prayer-section icons, and marketing imagery.",
    },
    {
      label: "Encrypted offsite backups",
      monthlyUsd: 10,
      note: "Daily Supabase backups plus an encrypted mirror of the assets bucket to a second region.",
    },
    {
      label: "Patristic-translation sourcing time",
      monthlyUsd: 80,
      note: "Hours spent ingesting, cross-checking, and proofreading public-domain Father texts before they ship.",
    },
    {
      label: "Iconographer commissions",
      monthlyUsd: 100,
      note: "When a saint has no good public-domain icon, we commission new ones from contemporary Orthodox iconographers.",
    },
    {
      label: "Akathist audio (planned)",
      monthlyUsd: 40,
      note: "Recording fees for chanters reading the akathist and Hours services.",
    },
  ] satisfies ExpenseLine[],
  /** Donation links — populate when wired up. */
  donateLinks: [
    {
      label: "Cash App",
      href: "https://cash.app/$venkeshi",
      note: "$venkeshi",
    },
    {
      label: "PayPal",
      href: "https://www.paypal.com/paypalme/edgaraugustin",
      note: "@edgaraugustin",
    },
    {
      label: "Buy Me a Coffee",
      href: "https://buymeacoffee.com/purifyapp",
      note: "One-time gifts of any size. The live counter on this page pulls from here.",
    },
  ],
};
