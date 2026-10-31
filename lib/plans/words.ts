import "server-only";

import cites from "@/data/plans/guide/cites.json";
import en from "@/data/plans/guide/en.json";
import sayings from "@/data/plans/sayings.json";

import type { GuideCites, GuideContent, PlanWords, SayingsContent } from "./guide";

/**
 * A reading plan's own words for its page, taken at build: the English guide
 * (each day's intro and questions), where the verses it quotes stand, and the
 * Fathers' sayings, for that plan alone. The page hands them to its client
 * (components/plans/PlanClient.tsx), so the day's card is whole in the page's
 * first frame.
 *
 * They used to be loaded on the device after the page was drawn
 * (lib/plans/guideContent.ts): the card arrived as a day and a passage, and a
 * moment later grew its intro and the verses it quotes, pushing Begin and the
 * days down, on every opening of every plan. The owner's note 42 of build 80:
 * "there's a frame where it bugs out".
 */
export function planWords(id: string): PlanWords {
  return {
    en: { [id]: (en as GuideContent)[id] },
    cites: { [id]: (cites as GuideCites)[id] },
    sayings: { [id]: (sayings as SayingsContent)[id] },
  };
}
