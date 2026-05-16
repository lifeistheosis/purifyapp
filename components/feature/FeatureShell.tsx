import * as React from "react";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { Badge } from "@/components/ui/Badge";

type FeatureShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  tierBadge?: "Free" | "Paid";
  ctaLabel?: string;
  children?: React.ReactNode;
};

export function FeatureShell({
  eyebrow,
  title,
  body,
  tierBadge,
  ctaLabel,
  children,
}: FeatureShellProps) {
  const isPaid = tierBadge === "Paid";
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[960px] w-full">
        <div className="flex items-center gap-3 mb-4">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60">
            {eyebrow}
          </p>
          {tierBadge && (
            <Badge variant={isPaid ? "paid" : "free"}>{tierBadge}</Badge>
          )}
        </div>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {title}
        </h1>
        <p className="font-sans text-[17px] md:text-[18px] text-paper/75 mt-5 max-w-[640px]">
          {body}
        </p>
        {isPaid && (
          <div className="mt-8 rounded-lg border border-accent/30 bg-accent/8 p-6 max-w-[640px]">
            <p className="font-sans text-[15px] text-paper/85">
              This is a paid-tier feature. Upgrade to unlock.
            </p>
            <div className="mt-4">
              <ComingSoonCTA variant="primary">
                {ctaLabel ?? "Upgrade to Paid"}
              </ComingSoonCTA>
            </div>
          </div>
        )}
        {!isPaid && ctaLabel && (
          <div className="mt-8">
            <ComingSoonCTA variant="inverse">{ctaLabel}</ComingSoonCTA>
          </div>
        )}
        {children && <div className="mt-12">{children}</div>}
        <p className="mt-12 font-sans text-[13px] text-paper/40 uppercase tracking-[1.5px]">
          Coming soon
        </p>
      </div>
    </section>
  );
}
