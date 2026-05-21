import * as React from "react";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";

type FeatureShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  children?: React.ReactNode;
};

export function FeatureShell({
  eyebrow,
  title,
  body,
  ctaLabel,
  children,
}: FeatureShellProps) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[960px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          {eyebrow}
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {title}
        </h1>
        <p className="font-sans text-[17px] md:text-[18px] text-paper/75 mt-5 max-w-[640px]">
          {body}
        </p>
        {ctaLabel && (
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
