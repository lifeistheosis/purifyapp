"use client";

// The Kitchen: the catalogue of recipes for every kind of fast day.
//
// Redone 2026-09-28 at the owner's request from the Trapeza, a filter board
// of text cards, into a catalogue in the house language (Discover, Saved):
// a card for today's fast with the dishes that suit it, the four kinds of
// fast day as chips in the calendar's own colours and glyphs, and a section
// of photo cards per kind of day. The whole catalogue is read once and
// filtered on the device, so switching a chip is instant and works offline
// once loaded.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG, Eyebrow, ICON_TILE_SM } from "@/components/ui/Graphite";
import { Plus } from "@/components/ui/icons/Plus";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { cn } from "@/lib/cn";
import { fetchRecipes } from "@/lib/trapeza/client";
import {
  levelsSuitingDay,
  recipesForDay,
  seasonForRuleId,
  type FastLevel,
  type RecipeSeason,
  type RecipeTradition,
  type TrapezaRecipe,
} from "@/lib/trapeza/recipes";

import { LEVEL_META, LEVEL_ORDER, SEASON_ORDER, TRADITION_ORDER, levelKeys, recipeHref } from "./levels";
import { LevelChip, RecipeCard, RecipePhoto } from "./RecipeCard";

type Load = TrapezaRecipe[] | null | "failed";

export function KitchenClient() {
  const { t, tn } = useTranslate();
  const [recipes, setRecipes] = useState<Load>(null);
  const [level, setLevel] = useState<FastLevel | "all">("all");
  const [season, setSeason] = useState<RecipeSeason>("any");
  const [tradition, setTradition] = useState<RecipeTradition>("any");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    // External-system effect (the Kitchen API); state set after the await.
    void fetchRecipes({ limit: 120 }).then((list) => {
      if (alive) setRecipes(list ?? "failed");
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setRecipes(null);
    setAttempt((n) => n + 1);
  }, []);

  const all = useMemo(() => (Array.isArray(recipes) ? recipes : []), [recipes]);

  // Season and tradition narrow everything below them, the chips included,
  // so a chip's count is always what tapping it shows.
  const narrowed = useMemo(
    () =>
      all.filter(
        (r) =>
          (season === "any" || r.season === season) &&
          (tradition === "any" || r.tradition === tradition),
      ),
    [all, season, tradition],
  );

  const counts = useMemo(() => {
    const c: Record<FastLevel, number> = { xerophagy: 0, oil_wine: 0, fish: 0, any: 0 };
    for (const r of narrowed) c[r.fast_level] += 1;
    return c;
  }, [narrowed]);

  const sections = useMemo(
    () =>
      (level === "all" ? LEVEL_ORDER : [level])
        .map((l) => ({ level: l, items: narrowed.filter((r) => r.fast_level === l) }))
        .filter((s) => s.items.length > 0),
    [level, narrowed],
  );

  const churchDay = useChurchDay();
  const today = useMemo(() => {
    if (!churchDay) return null;
    const levels = levelsSuitingDay(churchDay.fast.kind);
    return {
      ruleId: churchDay.fast.ruleId,
      level: levels[0],
      recipes: recipesForDay(all, levels, seasonForRuleId(churchDay.fast.ruleId)).slice(0, 8),
    };
  }, [churchDay, all]);

  const filtered = season !== "any" || tradition !== "any";

  return (
    <section className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1100px]">
        <header className="max-w-[720px]">
          <Eyebrow>{t("kitchen.name")}</Eyebrow>
          <h1 className="mt-3 text-heading font-bold leading-[1.05] tracking-[-0.02em] text-paper md:text-display-sm">
            {t("study.fastingAtTheTable")}
          </h1>
          <p className="mt-4 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/70 md:text-lede">
            {t("kitchen.lead")}
          </p>
          <Link
            href="/kitchen/new"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-[transform,background-color] duration-150 hover:bg-paper/90 active:scale-[0.98] motion-reduce:transition-none"
          >
            <Plus size={16} />
            {t("study.shareARecipe")}
          </Link>
        </header>

        {today ? <TodayCard today={today} /> : null}

        {/* The kinds of fast day, strictest first, then season and tradition. */}
        <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label={t("kitchen.filter.byFast")}
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <LevelFilter
              label={t("study.trapeza.allDays")}
              count={narrowed.length}
              active={level === "all"}
              onClick={() => setLevel("all")}
            />
            {LEVEL_ORDER.map((l) => (
              <LevelFilter
                key={l}
                level={l}
                label={t(levelKeys(l).label)}
                count={counts[l]}
                active={level === l}
                onClick={() => setLevel(l)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <FilterSelect
              label={t("kitchen.filter.season")}
              value={season}
              onChange={(v) => setSeason(v as RecipeSeason)}
              options={SEASON_ORDER.map((s) => ({ value: s, label: t(`kitchen.season.${s}`) }))}
            />
            <FilterSelect
              label={t("kitchen.filter.tradition")}
              value={tradition}
              onChange={(v) => setTradition(v as RecipeTradition)}
              options={TRADITION_ORDER.map((s) => ({ value: s, label: t(`kitchen.tradition.${s}`) }))}
            />
          </div>
        </div>

        {recipes === null ? (
          <div aria-busy="true" className="mt-10">
            <p className="sr-only" role="status">
              {t("study.settingTheTable")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  aria-hidden
                  className="lm-card overflow-hidden rounded-[22px] ring-1 ring-inset ring-paper/10"
                  style={CARD_BG}
                >
                  <div className="aspect-[4/3] animate-pulse bg-paper/[0.04] motion-reduce:animate-none" />
                  <div className="space-y-2.5 p-5">
                    <div className="h-4 w-3/4 rounded-full bg-paper/[0.07]" />
                    <div className="h-3 w-full rounded-full bg-paper/[0.05]" />
                    <div className="h-3 w-1/2 rounded-full bg-paper/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : recipes === "failed" ? (
          <Notice
            title={t("kitchen.loadFailed")}
            action={
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-medium text-paper hover:border-paper/40"
              >
                {t("kitchen.tryAgain")}
              </button>
            }
          />
        ) : sections.length === 0 ? (
          <Notice
            title={t("study.noRecipesHereYet")}
            body={t("kitchen.emptyBody")}
            action={
              filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setSeason("any");
                    setTradition("any");
                  }}
                  className="inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-medium text-paper hover:border-paper/40"
                >
                  {t("kitchen.clearFilters")}
                </button>
              ) : (
                <Link
                  href="/kitchen/new"
                  className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night hover:bg-paper/90"
                >
                  {t("study.shareARecipe")}
                </Link>
              )
            }
          />
        ) : (
          sections.map((s) => {
            const { Icon, rgb } = LEVEL_META[s.level];
            const keys = levelKeys(s.level);
            return (
              <section key={s.level} aria-labelledby={`kitchen-${s.level}`} className="mt-12">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className={ICON_TILE_SM} style={{ color: `rgb(${rgb})` }}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id={`kitchen-${s.level}`}
                        className="text-title-sm font-bold leading-tight text-paper"
                      >
                        {t(keys.title)}
                      </h2>
                      <p className="mt-0.5 font-sans text-detail leading-[1.5] text-paper/55">
                        {t(keys.sub)}
                      </p>
                    </div>
                  </div>
                  <span className="hidden shrink-0 font-sans text-caption tabular-nums text-paper/45 sm:inline">
                    {tn("kitchen.recipeCount", s.items.length)}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {s.items.map((r) => (
                    <RecipeCard key={r.id} recipe={r} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}

/** Today's fast from the calendar, and the dishes that suit it. */
function TodayCard({
  today,
}: {
  today: { ruleId: string; level: FastLevel; recipes: TrapezaRecipe[] };
}) {
  const { t } = useTranslate();
  const { Icon, rgb } = LEVEL_META[today.level];
  return (
    <section
      aria-labelledby="kitchen-today"
      className="lm-card mt-10 overflow-hidden rounded-[24px] p-5 ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] md:p-6"
      style={CARD_BG}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{t("kitchen.today.eyebrow")}</Eyebrow>
          <h2 id="kitchen-today" className="mt-2 text-title-sm font-bold leading-tight text-paper">
            {t(`calendar.fast.${today.ruleId}.label`)}
          </h2>
          <p className="mt-1 font-sans text-detail leading-[1.55] text-paper/60">
            {t(`calendar.fast.${today.ruleId}.rule`)}
          </p>
        </div>
        <span aria-hidden className={ICON_TILE_SM} style={{ color: `rgb(${rgb})` }}>
          <Icon size={20} />
        </span>
      </div>
      {today.recipes.length > 0 ? (
        <>
          <p className="mt-5 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45">
            {t("kitchen.today.suits")}
          </p>
          {/* scroll-px matches the padding: without it the snap lines the first
              dish up with the card's edge rather than its text. */}
          <ul className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-6 md:scroll-px-6 md:px-6 [&::-webkit-scrollbar]:hidden">
            {today.recipes.map((r) => (
              <li key={r.id} className="w-[168px] shrink-0 snap-start sm:w-[196px]">
                <Link href={recipeHref(r.id)} className="group block">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-inset ring-paper/10">
                    <RecipePhoto recipe={r} sizes="196px" plateIcon={28} />
                    <LevelChip level={r.fast_level} onPhoto className="absolute bottom-2 left-2" />
                  </span>
                  <span className="mt-2 line-clamp-2 block font-sans text-detail font-semibold leading-snug text-paper/85 group-hover:text-paper">
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function LevelFilter({
  level,
  label,
  count,
  active,
  onClick,
}: {
  level?: FastLevel;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const glyph = level ? LEVEL_META[level] : null;
  const Glyph = glyph?.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-detail font-semibold transition-colors duration-150",
        active
          ? "border-transparent bg-paper text-night"
          : "border-paper/15 bg-paper/[0.04] text-paper/75 hover:border-paper/30 hover:text-paper",
      )}
    >
      {glyph && Glyph ? (
        <span aria-hidden style={{ color: `rgb(${glyph.rgb})` }}>
          <Glyph size={16} />
        </span>
      ) : null}
      {label}
      <span className="font-sans text-[12px] font-medium tabular-nums opacity-60">{count}</span>
    </button>
  );
}

/**
 * A native select drawn as a pill. Its list takes the page's own colours
 * (bg-night, text-paper on every option) rather than a forced colour scheme,
 * which on Light opened a dark list of dark words.
 */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex min-w-0 flex-1 lg:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-11 w-full min-w-0 appearance-none truncate rounded-pill border bg-night py-2 pl-4 pr-9 font-sans text-detail font-medium text-paper transition-colors focus:border-paper/45 focus:outline-none lg:w-auto [&>option]:bg-night [&>option]:text-paper",
          value === "any" ? "border-paper/15" : "border-paper/45",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-caption text-paper/50"
      >
        {"▾"}
      </span>
    </label>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="lm-card mt-10 flex flex-col items-center rounded-[24px] px-6 py-12 text-center ring-1 ring-inset ring-paper/10"
      style={CARD_BG}
    >
      <p className="font-heading text-title-sm font-bold text-paper">{title}</p>
      {body ? (
        <p className="mt-2 max-w-[420px] font-sans text-ui leading-[1.6] text-paper/60">{body}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
