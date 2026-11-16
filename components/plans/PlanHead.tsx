"use client";

// The head of a reading plan's page (1.9, the fifteen screens' round 3; the
// owner's note 7 of build 97 with The four Gospels' page: "we need a better
// plans design"). The plan's own picture leads the page: the picture its tile
// wears on the plans list (the saint its books are attributed to, or its
// season's picture; components/plans/PlansClient.tsx), as a band from the
// screen's top under the clear bar, with the plan's name in the serif over
// its foot. Under the name the band is shaded with the page's own ground, so
// the name reads on every palette (app/globals.css, .plan-head-shade); the
// shade is one plain fall to the ground and nothing else is laid on the
// picture.
//
// The tile's picture travels into this band and back out of it
// (lib/ui/routeMotion.ts, "A picture that leads to its own page": the tile
// wears `data-carry`, this takes it by the same address), and the name is
// pictured apart, over it, while it does (.plan-head-words, as Your rule's
// head has it).
//
// The cover is streamed from the website and never carried in the apps
// (lib/readAloud/covers.ts); with no signal the band is the manuscript plate
// the apps carry, and then the plate with the cross
// (components/player/CoverArt.tsx).

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { getPlan } from "@/lib/plans/plans";
import { SEASON_PICTURES } from "@/lib/plans/season";
import { readAloudCover } from "@/lib/readAloud/covers";
import { useCoversVersion } from "@/lib/readAloud/useCovers";

export function PlanHead({ id }: { id: string }) {
  useCoversVersion();
  const { t } = useTranslate();
  const plan = getPlan(id);
  if (!plan) return null;
  // The tile's own picture, by the tile's own rule.
  const cover = plan.season ? { src: SEASON_PICTURES[plan.season], fallback: SEASON_PICTURES[plan.season] } : readAloudCover(plan.cover ?? plan.days[0][0].book);
  return (
    <header className="plan-head relative" data-plan-head="">
      <div
        data-plan-picture={plan.season ? "season" : "saint"}
        data-carry-into={cover.src}
        className="plan-head-picture under-topbar relative -mx-5 overflow-hidden bg-night-soft md:mx-0"
      >
        <CoverArt src={cover.src} fallback={cover.fallback} size={420} className="absolute inset-0 h-full w-full" />
        <div aria-hidden className="plan-head-shade" />
      </div>
      <div className="plan-head-words relative">
        <h1 id="plan-title" className="plan-head-title text-balance font-serif text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {t(`plans.${id}.name`)}
        </h1>
      </div>
    </header>
  );
}
