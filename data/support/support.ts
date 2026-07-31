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
  monthlyGoalUsd: 250,
  /** Donations received toward this month's goal in USD. */
  monthlyRaisedUsd: 42,
  /** Last update of these numbers (human-readable). */
  lastUpdated: "May 17, 2026",
  /** Where the money goes, in priority order. */
  expenses: [
    {
      label: "Web hosting (Render)",
      monthlyUsd: 19,
      note: "Always-on web service with one small worker.",
    },
    {
      label: "Domain (purifyapp.net)",
      monthlyUsd: 2,
      note: "Annualized to a per-month figure.",
    },
    {
      label: "Image storage and CDN",
      monthlyUsd: 8,
      note: "Saint icons, marketing imagery.",
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
      label: "Buy Me a Coffee",
      href: "https://buymeacoffee.com/purifyapp",
      note: "One-time gifts of any size. The live counter on this page pulls from here.",
    },
    {
      label: "Monthly supporter",
      href: "mailto:team@purifyapp.net?subject=Monthly%20supporter",
      note: "Email us to set up a recurring gift. Stripe link coming soon.",
    },
    {
      label: "Direct (zero-fee)",
      href: "mailto:team@purifyapp.net?subject=Direct%20gift",
      note: "Wire, check, or in-person. No processing fees.",
    },
  ],
};
