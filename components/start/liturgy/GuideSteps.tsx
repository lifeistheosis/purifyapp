"use client";

// The cards of Your first Liturgy (1.7). Each is one screen's worth: a Lora
// heading, a line under it, and its content as calm rows on hairlines, with
// no box around anything and nothing drawn but the app's own icons. The words
// are lib/start/firstLiturgy.ts's; the reader's choices go straight into
// their plan on the device (lib/start/liturgyPlan.ts).

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Info } from "@/components/ui/icons/Info";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import {
  CHECK_LIST,
  CUSTOMS,
  KINDS,
  KIND_LIST,
  NOT_SURE,
  PART_IDS,
  WORDS,
  type Item,
  type Part,
  type Why,
} from "@/lib/start/firstLiturgy";
import {
  CHECK_IDS,
  dayOf,
  daysBetween,
  formatDay,
  kindNameKey,
  reminderStarts,
  sundaysFrom,
  toggleCheck,
  updatePlan,
  upcomingDate,
  REMINDER_DAYS,
  type LiturgyPlan,
  type StepId,
} from "@/lib/start/liturgyPlan";

type HeadingRef = RefObject<HTMLHeadingElement | null>;

const LEAD = "mt-2 max-w-[56ch] font-sans text-ui leading-[1.6] text-paper/65";
const BODY = "font-sans text-body leading-[1.6] text-paper/80";
const ROWS = "divide-y divide-paper/[0.07] border-y border-paper/[0.08]";
const SMALL_ACTION =
  "tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill font-sans text-detail font-semibold text-paper/70 hover:text-paper";

/** The card's heading: the one place focus lands when a card opens. */
function StepHeading({ headingRef, children }: { headingRef: HeadingRef; children: React.ReactNode }) {
  return (
    <h2
      id="liturgy-step-title"
      ref={headingRef}
      tabIndex={-1}
      className="text-title font-bold leading-[1.15] tracking-[-0.01em] text-paper outline-none"
    >
      {children}
    </h2>
  );
}

/** "Why?", opening what a line rests on in a sheet. */
function WhyButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslate();
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className={cn(SMALL_ACTION, "-ms-1 px-1")}>
      <Info size={16} />
      {t(WORDS.ui.why.key)}
    </button>
  );
}

/** A round mark for a choice: an empty ring, or filled with a drawn check. */
function ChoiceMark({ on, square = false }: { on: boolean; square?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[22px] shrink-0 place-items-center",
        square ? "rounded-[7px]" : "rounded-full",
        on ? "bg-paper text-night" : "ring-[1.5px] ring-inset ring-paper/30",
      )}
    >
      {on ? <Check size={14} strokeWidth={2.4} /> : null}
    </span>
  );
}

/**
 * The arrows move a choice along a list of radios, as a radio group does:
 * only the chosen one (or the first) is in the tab order.
 */
function onRadioKeys(e: KeyboardEvent<HTMLElement>, count: number, at: number, pick: (index: number) => void) {
  const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
  const backward = e.key === "ArrowUp" || e.key === "ArrowLeft";
  if (!forward && !backward) return;
  e.preventDefault();
  const rtl = document.documentElement.dir === "rtl";
  const step = (e.key === "ArrowRight" || e.key === "ArrowLeft") && rtl ? (forward ? -1 : 1) : forward ? 1 : -1;
  const next = (at + step + count) % count;
  pick(next);
  const group = e.currentTarget.closest("[role=radiogroup]");
  group?.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
}

// ---- 1. Going to your first Liturgy? -------------------------------------

export function StepIntro({ headingRef, onAnswer }: { headingRef: HeadingRef; onAnswer: (going: boolean) => void }) {
  const { t } = useTranslate();
  const outline = [...PART_IDS.map((id) => `start.liturgy.part.${id}.title`), WORDS.step.customs.key];
  return (
    <div>
      <StepHeading headingRef={headingRef}>{t(WORDS.intro.title.key)}</StepHeading>
      <p className={cn(BODY, "mt-3")}>{t(WORDS.intro.lead.key)}</p>

      {/* What the guide holds, in its order: the sense of the way before it starts. */}
      <ol className="mt-6 space-y-2.5">
        {outline.map((key, i) => (
          <li key={key} className="flex items-baseline gap-3 font-sans text-ui text-paper/80">
            <span aria-hidden className="w-4 shrink-0 text-end font-semibold tabular-nums text-paper/35">
              {i + 1}
            </span>
            {t(key)}
          </li>
        ))}
      </ol>

      <p className={cn(BODY, "mt-6")}>{t(WORDS.intro.calm.key)}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="tap-press inline-flex min-h-12 items-center justify-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          {t(WORDS.intro.yes.key)}
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className="tap-press inline-flex min-h-12 items-center justify-center rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper/85 hover:border-paper/40"
        >
          {t(WORDS.intro.notYet.key)}
        </button>
      </div>
    </div>
  );
}

// ---- 2. Which kind of church is it? --------------------------------------

export function StepKind({ headingRef, plan }: { headingRef: HeadingRef; plan: LiturgyPlan }) {
  const { t } = useTranslate();
  const chosen = KIND_LIST.findIndex((k) => k.id === plan.kind);
  const pick = (i: number) => {
    const id = KIND_LIST[i].id;
    updatePlan((p) => ({ ...p, kind: id }));
  };

  return (
    <div>
      <StepHeading headingRef={headingRef}>{t(WORDS.kind.title.key)}</StepHeading>
      <p className={LEAD}>{t(WORDS.kind.lead.key)}</p>

      <div role="radiogroup" aria-labelledby="liturgy-step-title" className={cn("mt-6", ROWS)}>
        {KIND_LIST.map((kind, i) => {
          const on = i === chosen;
          return (
            <button
              key={kind.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (chosen < 0 && i === 0) ? 0 : -1}
              onClick={() => pick(i)}
              onKeyDown={(e) => onRadioKeys(e, KIND_LIST.length, Math.max(chosen, 0), pick)}
              className="flex min-h-14 w-full items-center gap-3 py-2.5 text-start"
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block font-sans text-ui font-semibold", on ? "text-paper" : "text-paper/85")}>
                  {t(kind.name.key)}
                </span>
                {kind.note ? (
                  <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{t(kind.note.key)}</span>
                ) : null}
              </span>
              <ChoiceMark on={on} />
            </button>
          );
        })}
      </div>

      {/* "Not sure": how to find out, never a verdict on a parish. */}
      {plan.kind === "unsure" ? (
        <section aria-labelledby="liturgy-unsure" className="mt-8">
          <h3 id="liturgy-unsure" className="text-lede font-semibold leading-snug text-paper">
            {t(WORDS.kind.unsureTitle.key)}
          </h3>
          <div className="mt-2 space-y-3">
            {NOT_SURE.map((line) => (
              <p key={line.key} className={BODY}>
                {t(line.key)}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ---- 3. When are you going? ----------------------------------------------

type DayChoice = "first" | "second" | "other" | "none";

export function StepWhen({ headingRef, plan }: { headingRef: HeadingRef; plan: LiturgyPlan }) {
  const { t, locale } = useTranslate();
  const todayDate = useToday();
  const today = todayDate ? dayOf(todayDate) : null;
  const sundays = today ? sundaysFrom(today) : null;
  const [otherOpen, setOtherOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const date = today ? upcomingDate(plan, today) : plan.date;
  const selected: DayChoice = otherOpen
    ? "other"
    : sundays && date === sundays.first
      ? "first"
      : sundays && date === sundays.second
        ? "second"
        : date
          ? "other"
          : "none";

  const setDate = (next: string | null) =>
    updatePlan((p) => ({ ...p, date: next, going: next ? true : p.going, hiddenFor: next === p.hiddenFor ? p.hiddenFor : null }));

  const choices: { id: DayChoice; label: string; sub?: string }[] = [
    {
      id: "first",
      label: sundays?.todayIsSunday ? t("calendar.today") : t(WORDS.when.thisSunday.key),
      sub: sundays ? formatDay(sundays.first, locale) : undefined,
    },
    { id: "second", label: t(WORDS.when.nextSunday.key), sub: sundays ? formatDay(sundays.second, locale) : undefined },
    { id: "other", label: t(WORDS.when.other.key), sub: selected === "other" && date ? formatDay(date, locale) : undefined },
    { id: "none", label: t(WORDS.when.notSure.key) },
  ];
  const at = choices.findIndex((c) => c.id === selected);

  const pick = (i: number) => {
    const id = choices[i].id;
    if (id === "first" && sundays) setDate(sundays.first);
    else if (id === "second" && sundays) setDate(sundays.second);
    else if (id === "none") setDate(null);
    setOtherOpen(id === "other");
    if (id === "other") window.setTimeout(() => input.current?.focus(), 0);
  };

  return (
    <div>
      <StepHeading headingRef={headingRef}>{t(WORDS.when.title.key)}</StepHeading>
      <p className={LEAD}>{t(WORDS.when.lead.key)}</p>

      <div role="radiogroup" aria-labelledby="liturgy-step-title" className={cn("mt-6", ROWS)}>
        {choices.map((c, i) => {
          const on = c.id === selected;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              disabled={!sundays && (c.id === "first" || c.id === "second")}
              onClick={() => pick(i)}
              onKeyDown={(e) => onRadioKeys(e, choices.length, at, pick)}
              className="flex min-h-14 w-full items-center gap-3 py-2.5 text-start disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block font-sans text-ui font-semibold", on ? "text-paper" : "text-paper/85")}>{c.label}</span>
                {c.sub ? <span className="mt-0.5 block font-sans text-caption text-paper/55">{c.sub}</span> : null}
              </span>
              <ChoiceMark on={on} />
            </button>
          );
        })}
      </div>

      {selected === "other" ? (
        <input
          ref={input}
          type="date"
          aria-label={t(WORDS.when.otherLabel.key)}
          min={today ?? undefined}
          value={date ?? ""}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v) && (!today || daysBetween(today, v) >= 0)) setDate(v);
          }}
          className="mt-4 h-12 w-full rounded-xl border border-paper/15 bg-transparent px-4 font-sans text-ui text-paper focus-visible:border-paper/50 focus-visible:outline-none"
        />
      ) : null}
    </div>
  );
}

// ---- 4 to 7. The four parts ----------------------------------------------

function ItemRow({ item, onWhy }: { item: Item; onWhy: (title: string, why: Why) => void }) {
  const { t } = useTranslate();
  const title = t(item.title.key);
  const link = item.link;
  return (
    <li className="py-5 first:pt-1">
      <h3 className="text-lede font-semibold leading-snug text-paper">{title}</h3>
      <p className={cn(BODY, "mt-1.5")}>{t(item.body.key)}</p>
      {item.why || link ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-5">
          {item.why ? <WhyButton onClick={() => onWhy(title, item.why as Why)} /> : null}
          {link ? (
            <Link href={link.href} className={SMALL_ACTION}>
              {t(typeof link.label === "string" ? link.label : link.label.key)}
              <ChevronRight size={14} className="rtl:-scale-x-100" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function StepPart({
  headingRef,
  part,
  onWhy,
}: {
  headingRef: HeadingRef;
  part: Part;
  onWhy: (title: string, why: Why) => void;
}) {
  const { t } = useTranslate();
  return (
    <div>
      <StepHeading headingRef={headingRef}>{t(part.title.key)}</StepHeading>
      <p className={LEAD}>{t(part.lead.key)}</p>
      <ul className="mt-5 divide-y divide-paper/[0.07]">
        {part.items.map((item) => (
          <ItemRow key={item.id} item={item} onWhy={onWhy} />
        ))}
      </ul>
    </div>
  );
}

// ---- 8. In a <kind> parish you may see ----------------------------------

export function StepCustoms({
  headingRef,
  plan,
  onWhy,
  onChange,
}: {
  headingRef: HeadingRef;
  plan: LiturgyPlan;
  onWhy: (title: string, why: Why) => void;
  onChange: () => void;
}) {
  const { t } = useTranslate();
  const kind = KINDS[plan.kind ?? "unsure"];
  const heading = t(kind.see.key);
  return (
    <div>
      <StepHeading headingRef={headingRef}>{heading}</StepHeading>
      <p className={LEAD}>{t(WORDS.customs.lead.key)}</p>
      <ul className="mt-5 divide-y divide-paper/[0.07]">
        {kind.language ? (
          <li className="py-4 first:pt-1">
            <p className={BODY}>{t(kind.language.key)}</p>
          </li>
        ) : null}
        {kind.customs.map((id) => {
          const custom = CUSTOMS[id];
          return (
            <li key={id} className="py-4 first:pt-1">
              <p className={BODY}>{t(custom.line.key)}</p>
              {custom.why ? <WhyButton onClick={() => onWhy(t(WORDS.ui.why.key), custom.why as Why)} /> : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-paper/[0.08] pt-4">
        <p className="min-w-0 font-sans text-detail text-paper/60">
          {t(WORDS.ready.church.key)}
          {": "}
          <span className="font-semibold text-paper/85">{t(kind.name.key)}</span>
        </p>
        <button type="button" onClick={onChange} className={cn(SMALL_ACTION, "shrink-0 px-2")}>
          {t(WORDS.ready.change.key)}
        </button>
      </div>
    </div>
  );
}

// ---- 9. You are ready -----------------------------------------------------

const NEXT_DOORS: { labelKey: string; href: string }[] = [
  { labelKey: "start.liturgy.link.creed", href: "/prayers/creed" },
  { labelKey: "start.step.cross.title", href: "/prayers/learning/sign-of-the-cross" },
  { labelKey: "start.step.parish.title", href: "/parishes" },
  { labelKey: "start.liturgy.link.start", href: "/start" },
];

export function StepReady({
  headingRef,
  plan,
  onGo,
  onSources,
}: {
  headingRef: HeadingRef;
  plan: LiturgyPlan;
  onGo: (step: StepId) => void;
  onSources: () => void;
}) {
  const { t, locale } = useTranslate();
  const todayDate = useToday();
  const today = todayDate ? dayOf(todayDate) : null;
  const date = today ? upcomingDate(plan, today) : null;
  const soon = date && today ? daysBetween(today, date) <= REMINDER_DAYS : false;
  const done = plan.checked.length;

  const row = "flex min-h-14 items-center gap-3 py-2";
  return (
    <div>
      <StepHeading headingRef={headingRef}>{t(WORDS.ready.title.key)}</StepHeading>
      <p className={cn(BODY, "mt-3")}>{t(WORDS.ready.lead.key)}</p>

      <section aria-labelledby="liturgy-plan" className="mt-9">
        <h3 id="liturgy-plan" className="text-lede font-semibold text-paper">
          {t(WORDS.ready.plan.key)}
        </h3>
        <dl className={cn("mt-3", ROWS)}>
          <div className={row}>
            <dt className="w-24 shrink-0 font-sans text-caption text-paper/55">{t(WORDS.ready.church.key)}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="min-w-0 font-sans text-ui font-semibold text-paper">
                {plan.kind ? t(kindNameKey(plan.kind)) : t(WORDS.ready.noDay.key)}
              </span>
              <button type="button" onClick={() => onGo("kind")} className={cn(SMALL_ACTION, "-me-2 shrink-0 px-2")}>
                {t(WORDS.ready.change.key)}
              </button>
            </dd>
          </div>
          <div className={row}>
            <dt className="w-24 shrink-0 font-sans text-caption text-paper/55">{t(WORDS.ready.day.key)}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="min-w-0 font-sans text-ui font-semibold text-paper">
                {date ? formatDay(date, locale) : t(WORDS.ready.noDay.key)}
              </span>
              <button
                type="button"
                onClick={() => {
                  updatePlan((p) => ({ ...p, going: true }));
                  onGo("when");
                }}
                className={cn(SMALL_ACTION, "-me-2 shrink-0 px-2")}
              >
                {date ? t(WORDS.ready.change.key) : t(WORDS.ready.chooseDay.key)}
              </button>
            </dd>
          </div>
        </dl>
        {date ? (
          <p className="mt-3 font-sans text-detail text-paper/60">
            {soon
              ? t(WORDS.ready.reminderNow.key)
              : t(WORDS.ready.reminderFrom.key, { date: formatDay(reminderStarts(date), locale) })}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="liturgy-checklist" className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="liturgy-checklist" className="text-lede font-semibold text-paper">
            {t(WORDS.ready.checklist.key)}
          </h3>
          <p className="shrink-0 font-sans text-caption text-paper/55">
            {t(WORDS.ready.count.key, { n: done, total: CHECK_IDS.length })}
          </p>
        </div>
        <ul className={cn("mt-3", ROWS)}>
          {CHECK_LIST.map(({ id, line }) => {
            const on = plan.checked.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleCheck(id)}
                  className="flex min-h-12 w-full items-center gap-3 py-2.5 text-start"
                >
                  <ChoiceMark on={on} square />
                  <span className={cn("font-sans text-ui", on ? "text-paper/55" : "text-paper")}>{t(line.key)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="liturgy-next" className="mt-10">
        <h3 id="liturgy-next" className="text-lede font-semibold text-paper">
          {t(WORDS.ready.next.key)}
        </h3>
        <ul className={cn("mt-3", ROWS)}>
          {NEXT_DOORS.map((door) => (
            <li key={door.href}>
              <Link href={door.href} className="tap-press flex min-h-12 items-center gap-3 py-2.5 font-sans text-ui text-paper hover:text-paper">
                <span className="min-w-0 flex-1">{t(door.labelKey)}</span>
                <ChevronRight size={15} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onGo("before")}
          className="tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper/85 hover:border-paper/40"
        >
          {t(WORDS.ready.again.key)}
        </button>
        <button type="button" onClick={onSources} aria-haspopup="dialog" className={cn(SMALL_ACTION, "px-3")}>
          {t(WORDS.ui.sources.key)}
        </button>
      </div>
    </div>
  );
}
