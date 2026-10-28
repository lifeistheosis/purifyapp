"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Play } from "@/components/ui/icons/Play";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { MY_RULE_IDS, type MyRulePart } from "@/lib/prayers/myRule";
import { partHref, ruleToday, stepWindow, type RuleToday as RuleTodayModel, type RuleTodayRow } from "@/lib/prayers/ruleToday";
import { PRAYER_EVENT, useTodayDone } from "@/lib/prayers/storage";
import { useMyRule } from "@/lib/prayers/useMyRule";
import { isKept } from "@/lib/rhythm/marks";
import { useMounted } from "@/lib/useMounted";

type Library = typeof import("@/lib/prayers/library");

const PART_TITLE: Record<MyRulePart, string> = {
  morning: "prayers.mine.morningTitle",
  evening: "prayers.mine.eveningTitle",
};

function subscribeMarks(cb: () => void): () => void {
  window.addEventListener(PRAYER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PRAYER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Whether a part was prayed through today, on this device or another. */
function useKept(part: MyRulePart): boolean {
  return useSyncExternalStore(subscribeMarks, () => isKept(MY_RULE_IDS[part]), () => false);
}

/**
 * Your rule today (1.8): the reader's own rule as a checklist, at the foot of
 * the Pantocrator on Prayers (components/mobile/PrayersHero.tsx), the owner's
 * merged pick of round 4 (2026-10-27): "then your rule as a checklist", what
 * is done and what is next.
 *
 * The rule is the one the reader made in 1.7 (Your rule, /prayers/personal):
 * the part the hour calls for, prayer by prayer, each checked when "Mark
 * prayed" was pressed on it today in the prayer reader, and the other part as
 * one row (lib/prayers/ruleToday.ts). The ring and the line under the title
 * say how many rows are checked. Continue opens the part at the first prayer
 * not yet marked; while none is, Pray my rule opens it at its start, as the
 * builder's own button does. A row opens the part at that prayer. Nothing
 * here marks anything: the marks are made where the prayers are prayed.
 *
 * A reader with no rule yet is offered the way to make one, the builder, and
 * never an empty list. The rule lives on the device, so until the page has
 * read it the section is a quiet outline; the prayers' names come from the
 * prayer book's files, which only Your rule's pages carry, so they are
 * fetched here once the page knows there is a rule to name.
 *
 * Long parts fold to five rows around what is next, with See all.
 */
export function RuleToday({ hourPart }: { hourPart: MyRulePart }) {
  const { t, locale } = useTranslate();
  const mounted = useMounted();
  const rule = useMyRule();
  const morningDone = useTodayDone(MY_RULE_IDS.morning);
  const eveningDone = useTodayDone(MY_RULE_IDS.evening);
  const keptMorning = useKept("morning");
  const keptEvening = useKept("evening");
  const [library, setLibrary] = useState<Library | null>(null);

  const hasRule = rule.morning.length + rule.evening.length > 0;
  const wantsLibrary = mounted && hasRule;
  useEffect(() => {
    if (!wantsLibrary || library) return;
    let alive = true;
    void import("@/lib/prayers/library").then((m) => {
      if (alive) setLibrary(m);
    });
    return () => {
      alive = false;
    };
  }, [wantsLibrary, library]);

  const lookup = useMemo(() => (library ? (id: string) => library.libraryRule(id, locale) : null), [library, locale]);
  const today = useMemo(() => {
    if (!lookup) return null;
    const done = { morning: new Set(morningDone), evening: new Set(eveningDone) };
    const kept = { morning: keptMorning, evening: keptEvening };
    return ruleToday(rule, hourPart, { done: (part) => done[part], kept: (part) => kept[part] }, lookup);
  }, [lookup, rule, hourPart, morningDone, eveningDone, keptMorning, keptEvening]);

  // Nothing read yet (the server, the first paint), or the names on their way.
  if (!mounted || (hasRule && !lookup)) return <RuleOutline />;

  if (!today) {
    return (
      <section aria-labelledby="rule-today" className="px-5">
        <h2 id="rule-today" className="text-title-sm leading-tight tracking-[-0.01em] text-paper">
          {t("prayers.mine.title")}
        </h2>
        <p className="mt-1.5 max-w-[44ch] font-sans text-detail leading-[1.55] text-paper/65">{t("prayers.mine.intro")}</p>
        <Link
          href="/prayers/personal"
          className="tap-press mt-4 inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          {t("prayers.mine.build")}
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </section>
    );
  }

  // A rule's name in the reader's language, else the prayer book's own (an
  // Hour has no catalog name of its own here).
  const ruleName = (id: string): string => {
    const key = `prayers.rule.${id}.title`;
    const v = t(key);
    return v === key ? (lookup?.(id)?.title ?? id) : v;
  };
  return <RuleChecklist today={today} ruleName={ruleName} />;
}

/**
 * The checklist itself, for a rule already read and named: the ring and the
 * line beside it, the rows, See all for a long part, and the way on.
 */
export function RuleChecklist({ today, ruleName }: { today: RuleTodayModel; ruleName: (id: string) => string }) {
  const { t, tn } = useTranslate();
  const [unfolded, setUnfolded] = useState(false);

  const titleOf = (row: RuleTodayRow): string =>
    row.kind === "part" ? t(PART_TITLE[row.part]) : row.kind === "names" ? t("prayers.mine.names") : row.title;
  const subOf = (row: RuleTodayRow): string => {
    if (row.done) return t("shop.prayedToday");
    if (row.kind === "part") return row.tonight ? t("prayers.ruleToday.tonight") : tn("prayers.reader.prayerCount", row.count);
    if (row.kind === "names") return t("prayers.mine.namesSub");
    return t("prayers.mine.fromRule", { rule: ruleName(row.fromRule) });
  };

  const nextIndex = today.next ? today.steps.indexOf(today.next) : -1;
  const fold = unfolded ? { start: 0, end: today.steps.length } : stepWindow(today.steps.length, nextIndex);
  const folded = today.steps.length - (fold.end - fold.start);
  const shown: RuleTodayRow[] = [
    ...(today.other?.part === "morning" ? [today.other] : []),
    ...today.steps.slice(fold.start, fold.end),
    ...(today.other && today.other.part !== "morning" ? [today.other] : []),
  ];
  const started = today.steps.some((s) => s.done);
  const line =
    today.done === today.total ? t("shop.prayedToday") : t("prayers.ruleToday.progress", { done: today.done, left: today.total - today.done });

  return (
    <section aria-labelledby="rule-today">
      <div className="flex items-center gap-3.5 px-5">
        <RuleRing done={today.done} total={today.total} />
        <div className="min-w-0">
          <h2 id="rule-today" className="text-title-sm leading-tight tracking-[-0.01em] text-paper">
            {t("prayers.ruleToday.title")}
          </h2>
          <p className="mt-1 font-sans text-detail text-paper/60">{line}</p>
        </div>
      </div>

      <ul className="mt-3">
        {shown.map((row) => (
          <li key={row.key} className="border-t border-paper/[0.07] first:border-t-0">
            <Link
              href={row.href}
              className="tap-press flex min-h-[60px] items-center gap-3.5 px-5 py-3 transition-colors active:bg-paper/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper motion-reduce:transition-none"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[26px] shrink-0 place-items-center rounded-full",
                  row.done ? "rule-check-lit bg-paper text-night" : "ring-[1.5px] ring-inset ring-paper/30",
                )}
              >
                {row.done ? <Check size={15} strokeWidth={2.6} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-sans text-[15px] font-semibold leading-snug", row.done ? "text-paper/50" : "text-paper")}>
                  {titleOf(row)}
                </span>
                <span className="mt-0.5 block truncate font-sans text-detail text-paper/55">{subOf(row)}</span>
              </span>
              <span className="shrink-0 font-sans text-detail tabular-nums text-paper/50">{t("today.minRead", { count: row.minutes })}</span>
            </Link>
          </li>
        ))}
      </ul>

      {folded > 0 ? (
        <div className="px-5">
          <button
            type="button"
            onClick={() => setUnfolded(true)}
            className="tap-press inline-flex min-h-11 items-center gap-1 font-sans text-detail font-semibold text-paper/65 hover:text-paper"
          >
            {t("common.seeAll")}
            <ChevronRight size={14} className="shrink-0 rotate-90" />
          </button>
        </div>
      ) : null}

      {today.next ? (
        <div className="mt-4 px-5">
          <Link
            href={started ? today.next.href : partHref(today.part)}
            className="tap-press flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            <Play size={14} className="shrink-0" />
            <span className="truncate">
              {started ? t("prayers.ruleToday.continue", { title: titleOf(today.next) }) : t("prayers.mine.pray")}
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

/**
 * How much of the day's rule is checked, as the design draws it: a ring and
 * the count in it. Drawn for the eye; the line beside it says it in words.
 * The lit arc glows white (globals.css, .rule-ring-lit).
 */
function RuleRing({ done, total }: { done: number; total: number }) {
  const r = 31;
  const length = 2 * Math.PI * r;
  const lit = total > 0 ? (done / total) * length : 0;
  return (
    <span aria-hidden className="relative grid size-[58px] shrink-0 place-items-center text-paper">
      {/* The glow is on the svg, not the arc: a filter on an svg's own shape
          is not drawn by every WebView. The track is faint enough that its
          share of the glow is too. */}
      <svg viewBox="0 0 74 74" className="rule-ring-lit absolute inset-0 size-full -rotate-90">
        <circle cx="37" cy="37" r={r} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={7} />
        {done > 0 ? (
          <circle
            cx="37"
            cy="37"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${lit} ${length}`}
          />
        ) : null}
      </svg>
      <span dir="ltr" className="relative font-sans text-[15px] font-bold tabular-nums">
        {done}/{total}
      </span>
    </span>
  );
}

/** The section before the device has been read: its shape, and nothing in it. */
function RuleOutline() {
  return (
    <div aria-hidden className="px-5">
      <div className="flex items-center gap-3.5">
        <span className="size-[58px] shrink-0 rounded-full ring-[7px] ring-inset ring-paper/10" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-44" weight="strong" />
          <Skeleton className="mt-2 h-3.5 w-28" weight="faint" />
        </div>
      </div>
      <div className="mt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex min-h-[60px] items-center gap-3.5 border-t border-paper/[0.07] py-3 first:border-t-0">
            <span className="size-[26px] shrink-0 rounded-full ring-[1.5px] ring-inset ring-paper/15" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-36" weight="mid" />
              <Skeleton className="mt-1.5 h-3 w-24" weight="faint" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
