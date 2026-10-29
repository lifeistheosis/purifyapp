// Pray on Today (1.8): the owner's pick B of round 13, "The hour, large"
// (Homebase/boards/purify-master/r18/choose/13-pray.png). One card for the
// prayer the hour calls for, its name large, and under it the rest of the
// day's prayers as small tiles, the Prayer Rope Anthem last.
//
// The same prayers in the same order the row of cards showed in 1.7, nothing
// added: the reader's own rule first when it has the part the hour calls for
// (lib/prayers/myRule.ts, todayRuleCard), else the Morning or Evening Rule by
// the hour (lib/prayers/ruleForHour.ts), the same choice the greeting's pill
// makes (lib/today/greeting.ts, hourPrayer). Then the day's rule from the hour
// on, and the earlier prayers already said today.
//
// Pure: components/today/PrayNowCard.tsx reads the clock and the marks and
// draws what this says.

import type { HourRuleId } from "@/lib/prayers/ruleForHour";
import { getRuleMeta } from "@/lib/prayers/rules";

import { hourPrayer } from "./greeting";

export type DayRule = "morning" | "midday" | "evening" | "before-sleep";

/** The day's rule in the order of the day. */
const DAY: readonly DayRule[] = ["morning", "midday", "evening", "before-sleep"];

/** The rule the hour calls for, the ones after it, and the earlier ones kept. */
export function railOrder(now: HourRuleId, kept: (id: DayRule) => boolean): DayRule[] {
  const at = DAY.indexOf(now);
  const after = DAY.slice(at + 1);
  const before = DAY.slice(0, at).filter(kept);
  return [now, ...after, ...before];
}

/** The reader's own rule, when it has the part the hour calls for (todayRuleCard). */
export type MineCard = { part: "morning" | "evening"; id: string; href: string; minutes: number };

export type PrayCard = {
  /** The id a prayer is kept under today (lib/rhythm/marks.ts), and the React key. */
  key: string;
  href: string;
  titleKey: string;
  /** The small line under a tile's name: its minutes, or what the anthem is. */
  subKey?: string;
  minutes: number | null;
  done: boolean;
};

export type HourCard = PrayCard & {
  /** The one line under the hour's name: the rule's own description, or what your rule is. */
  lineKey: string;
};

/** The Prayer Rope Anthem, the first chant of Chants (1.7), which closes the day's prayers. */
export const ANTHEM: PrayCard = {
  key: "anthem",
  href: "/chants/prayer-rope-anthem",
  titleKey: "today.prayNow.anthemTitle",
  subKey: "today.prayNow.anthemKicker",
  minutes: null,
  done: false,
};

function titleKeyOf(id: DayRule): string {
  if (id === "morning") return "today.prayNow.morningFallback";
  if (id === "evening") return "today.prayNow.eveningFallback";
  return `prayers.rule.${id}.title`;
}

function ruleCard(id: DayRule, kept: (id: string) => boolean): PrayCard {
  const meta = getRuleMeta(id);
  return {
    key: id,
    href: meta?.href ?? `/prayers/${id}`,
    titleKey: titleKeyOf(id),
    minutes: meta?.estimatedMinutes ?? null,
    done: kept(id),
  };
}

/**
 * The hour's card and the tiles under it. With the reader's own rule leading,
 * the hour's rule is the first tile, as it was the second card in 1.7.
 */
export function prayRail(now: HourRuleId, mine: MineCard | null, kept: (id: string) => boolean): { hour: HourCard; tiles: PrayCard[] } {
  const lead = hourPrayer(now, mine);
  const key = mine ? mine.id : now;
  const hour: HourCard = {
    key,
    href: lead.href,
    titleKey: lead.titleKey,
    lineKey: mine ? "prayers.mine.youHint" : `prayers.rule.${now}.description`,
    minutes: lead.minutes,
    done: kept(key),
  };
  const order = railOrder(now, kept);
  const rest = mine ? order : order.slice(1);
  return { hour, tiles: [...rest.map((id) => ruleCard(id, kept)), ANTHEM] };
}
