import type { ReactNode } from "react";

import { T } from "@/components/i18n/T";

/**
 * A walkthrough's route while the walks are switched off
 * (lib/walkthroughs/flags.ts): its name and one line saying it is being
 * written. The page's own bar stays above it.
 */
export function WalkSoon({ id, title }: { id: string; title: ReactNode }) {
  return (
    <section className="bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby={id}>
      <div className="mx-auto w-full max-w-[680px]">
        <h1 id={id} className="text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {title}
        </h1>
        <p className="mt-3 max-w-[56ch] font-sans text-body leading-[1.6] text-paper/70">
          <T k="walk.comingSoon" />
        </p>
      </div>
    </section>
  );
}
