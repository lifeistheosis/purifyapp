"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  FAST_LEVELS,
  SEASONS,
  TRADITIONS,
  authorLabel,
  fastLevelLabel,
  recipeLevelsForFastKind,
  seasonLabel,
  type FastLevel,
  type RecipeSeason,
  type RecipeTradition,
  type TrapezaRecipe,
} from "@/lib/trapeza/recipes";
import { fetchRecipes } from "@/lib/trapeza/client";
import { fastingStatus } from "@/lib/calendar/orthodox";

export function TrapezaClient() {
  const [recipes, setRecipes] = useState<TrapezaRecipe[] | null>(null);
  const [level, setLevel] = useState<FastLevel | null>(null);
  const [season, setSeason] = useState<RecipeSeason>("any");
  const [tradition, setTradition] = useState<RecipeTradition>("any");
  const [today, setToday] = useState<{ level: FastLevel; label: string } | null>(
    null,
  );

  useEffect(() => {
    // Read today's fast from the calendar so we can offer "recipes for today".
    const f = fastingStatus(new Date());
    const levels = recipeLevelsForFastKind(f.kind);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday({ level: levels[levels.length - 1], label: f.label });
  }, []);

  const load = useCallback(
    async (l: FastLevel | null, s: RecipeSeason, t: RecipeTradition) => {
      setRecipes(null);
      const list = await fetchRecipes({
        fastLevel: l ?? undefined,
        season: s,
        tradition: t,
      });
      setRecipes(list);
    },
    [],
  );

  useEffect(() => {
    // External-system effect (the trapeza API); state set after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(level, season, tradition);
  }, [level, season, tradition, load]);

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[760px]">
        <header className="reveal-rise text-center" style={{ animationDelay: "40ms" }}>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold-pale/70">
            The Trapeza
          </p>
          <h1 className="mt-3 font-display-serif text-display-sm font-bold text-paper">
            Fasting at the table
          </h1>
          <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
            Recipes for the days of the fast, kept by the community. Filter by
            what the day allows, by season, and by tradition.
          </p>
          <div className="mt-6">
            <Link
              href="/trapeza/new"
              className="inline-flex items-center gap-2 rounded-pill bg-paper px-5 py-3 font-sans text-ui font-semibold text-night transition-[transform,background-color] duration-150 hover:bg-paper/90 active:scale-[0.98]"
            >
              Share a recipe
            </Link>
          </div>
          {today ? (
            <p className="mt-4 font-sans text-caption text-paper/55">
              Today is a {today.label.toLowerCase()} day.{" "}
              <button
                type="button"
                onClick={() => setLevel(today.level)}
                className="font-semibold text-gold-pale underline underline-offset-2"
              >
                See recipes for today
              </button>
            </p>
          ) : null}
        </header>

        {/* Filters */}
        <div className="reveal-rise mt-8 space-y-3" style={{ animationDelay: "120ms" }}>
          <ChipRow>
            <Chip label="All days" active={level === null} onClick={() => setLevel(null)} />
            {FAST_LEVELS.map((l) => (
              <Chip
                key={l.slug}
                label={l.label}
                active={level === l.slug}
                onClick={() => setLevel(l.slug)}
              />
            ))}
          </ChipRow>
          <div className="flex flex-wrap justify-center gap-2">
            <Select
              value={season}
              onChange={(v) => setSeason(v as RecipeSeason)}
              options={SEASONS.map((s) => ({ value: s.slug, label: s.label }))}
            />
            <Select
              value={tradition}
              onChange={(v) => setTradition(v as RecipeTradition)}
              options={TRADITIONS.map((t) => ({ value: t.slug, label: t.label }))}
            />
          </div>
        </div>

        {/* Recipes */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {recipes === null ? (
            <p className="col-span-full py-10 text-center font-sans text-ui text-paper/40">
              Setting the table…
            </p>
          ) : recipes.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
              <p className="font-serif text-lede text-paper/80">
                No recipes here yet.
              </p>
              <p className="mt-2 font-sans text-ui text-paper/55">
                Share one, and it joins the board once reviewed.
              </p>
            </div>
          ) : (
            recipes.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} />)
          )}
        </div>
      </div>
    </section>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-2">{children}</div>;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-1.5 font-sans text-caption font-semibold transition-[transform,border-color,background-color,color] duration-150 active:scale-95 ${
        active
          ? "border-gold/50 bg-gold/10 text-gold-pale"
          : "border-paper/15 text-paper/60 hover:border-paper/30"
      }`}
    >
      {label}
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-pill border border-paper/15 bg-black/30 px-4 py-1.5 font-sans text-caption text-paper/80 [color-scheme:dark] focus:border-gold/45 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RecipeCard({ recipe, index }: { recipe: TrapezaRecipe; index: number }) {
  return (
    <Link
      href={`/trapeza/detail?id=${recipe.id}`}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      className="reveal-rise block rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 transition-[transform,border-color] duration-150 hover:border-paper/25 active:scale-[0.99]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[0.5px] text-gold-pale">
          {fastLevelLabel(recipe.fast_level)}
        </span>
        {recipe.season !== "any" ? (
          <span className="font-sans text-caption text-paper/50">
            {seasonLabel(recipe.season)}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display-serif text-title-sm text-paper">
        {recipe.title}
      </p>
      {recipe.summary ? (
        <p className="mt-1.5 line-clamp-2 font-sans text-ui leading-relaxed text-paper/60">
          {recipe.summary}
        </p>
      ) : null}
      <p className="mt-3 font-sans text-caption text-paper/40">
        {authorLabel(recipe)}
        {recipe.time_minutes ? ` · ${recipe.time_minutes} min` : ""}
      </p>
    </Link>
  );
}
