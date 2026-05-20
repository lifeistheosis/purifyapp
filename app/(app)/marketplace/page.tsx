import { FeatureShell } from "@/components/feature/FeatureShell";
import { ComingSoonLink } from "@/components/marketing/ComingSoonLink";

export const metadata = {
  title: "Marketplace",
  description:
    "Faithful Orthodox makers, icons, books, beeswax candles, prayer ropes, in one curated shelf. Coming soon.",
};

const sections = [
  {
    title: "Shops",
    body: "Independent iconographers, woodcarvers, and Orthodox artisans.",
  },
  {
    title: "Monasteries",
    body: "Verified monastery storefronts, incense, prayer ropes, books.",
  },
  {
    title: "Paid blessings",
    body: "Request a memorial, supplication, or blessing. Funds the priest.",
  },
  {
    title: "Sell your work",
    body: "Open a shop or apply for monastery verification.",
  },
];

export default function MarketplacePage() {
  return (
    <FeatureShell
      eyebrow="Marketplace"
      title="Icon & Orthodox Marketplace"
      body="A trusted place for the faithful to buy, sell, and support, from icons to monastery goods to paid blessings."
      tierBadge="Free"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <ComingSoonLink
            key={s.title}
            ariaLabel={`${s.title} (coming soon)`}
            className="rounded-lg border border-paper/10 bg-night-soft p-6 hover:border-paper/25 transition-colors"
          >
            <h3 className="font-sans text-[20px] font-semibold text-paper">
              {s.title}
            </h3>
            <p className="mt-2 font-sans text-[14px] text-paper/70">{s.body}</p>
          </ComingSoonLink>
        ))}
      </div>
    </FeatureShell>
  );
}
