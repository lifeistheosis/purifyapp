import * as React from "react";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { T } from "@/components/i18n/T";

type FeatureShellProps = {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  ctaLabel?: React.ReactNode;
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
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          {eyebrow}
        </p>
        <h1 className="font-sans text-display-sm md:text-display-lg font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {title}
        </h1>
        <p className="font-sans text-body md:text-lede text-paper/75 mt-5 max-w-[640px]">
          {body}
        </p>
        {ctaLabel && (
          <div className="mt-8">
            <ComingSoonCTA variant="inverse">{ctaLabel}</ComingSoonCTA>
          </div>
        )}
        {children && <div className="mt-12">{children}</div>}
        <p className="mt-12 font-sans text-detail text-paper/40 uppercase tracking-[1.5px]">
          <T k="signin.comingSoon" />
        </p>
      </div>
    </section>
  );
}
