import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const freeFeatures = [
  "Orthodox Study Bible",
  "Prayer Plans",
  "Saints' Works",
  "Prayer Campaigns",
  "Orthodox Calendar (New, Old & other)",
  "Marketplace browsing",
  "Website ads supported",
];

const paidFeatures = [
  "Everything in Free",
  "No ads, anywhere",
  "Personal Prayer Plans",
  "Paid blessings (supports clergy)",
  "Seller tools & monastery storefronts",
  "Early access to new features",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {items.map((f) => (
        <li
          key={f}
          className="font-sans text-[15px] text-paper/85 flex items-start gap-3"
        >
          <span className="mt-[7px] inline-block h-[6px] w-[6px] rounded-pill bg-accent shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function PricingTable() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-lg border border-paper/10 bg-night-soft p-8">
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-[24px] font-semibold text-paper">
            Free
          </h3>
          <Badge variant="free">Free</Badge>
        </div>
        <p className="mt-2 font-sans text-[14px] text-paper/60">
          The full Orthodox hub, supported by website ads.
        </p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-sans text-[40px] font-bold text-paper tracking-[-0.02em]">
            $0
          </span>
          <span className="font-sans text-[14px] text-paper/60">forever</span>
        </div>
        <FeatureList items={freeFeatures} />
        <div className="mt-10">
          <Button variant="inverse" className="w-full">
            Get started
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-accent/40 bg-night p-8 relative">
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-[24px] font-semibold text-paper">
            Paid
          </h3>
          <Badge variant="paid">Paid</Badge>
        </div>
        <p className="mt-2 font-sans text-[14px] text-paper/60">
          Ad-free experience, personal prayer plans, and marketplace tools.
        </p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-sans text-[40px] font-bold text-paper tracking-[-0.02em]">
            TBD
          </span>
          <span className="font-sans text-[14px] text-paper/60">/ month</span>
        </div>
        <FeatureList items={paidFeatures} />
        <div className="mt-10">
          <Button variant="primary" className="w-full">
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
