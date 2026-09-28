"use client";

// One recipe in the Kitchen: the dish's photo, the day it suits, the
// ingredients as a list a cook can tick off, the method as numbered steps,
// the community's reviews, and more dishes for the same kind of day.
//
// Client-rendered from ?id= like the rest of the native-safe pages: the app
// ships a static export, so the recipe is read from /api/trapeza at runtime.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { fetchRecipe, fetchRecipes, reportRecipe } from "@/lib/trapeza/client";
import { splitIngredients, splitSteps, type TrapezaRecipe } from "@/lib/trapeza/recipes";

import { LevelChip, RatingLine, RecipeCard, RecipePhoto } from "./RecipeCard";
import { RecipeReviews } from "./RecipeReviews";

type Phase = "loading" | "missing" | "ready";

export function KitchenRecipeClient() {
  const { t } = useTranslate();
  const id = useSearchParams().get("id") ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [recipe, setRecipe] = useState<TrapezaRecipe | null>(null);
  const [more, setMore] = useState<TrapezaRecipe[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(() => new Set());
  const [report, setReport] = useState<"idle" | "busy" | "done" | "signin">("idle");

  useEffect(() => {
    let alive = true;
    // External-system effect (the Kitchen API); state set after the await.
    void (async () => {
      if (!id) {
        if (alive) setPhase("missing");
        return;
      }
      const r = await fetchRecipe(id);
      if (!alive) return;
      setRecipe(r);
      setTicked(new Set());
      setPhase(r ? "ready" : "missing");
      if (!r) return;
      // The same read the catalogue makes, so it is usually already cached.
      const all = await fetchRecipes({ limit: 120 });
      if (!alive || !all) return;
      setMore(all.filter((x) => x.fast_level === r.fast_level && x.id !== r.id).slice(0, 3));
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const ingredients = useMemo(() => (recipe ? splitIngredients(recipe.ingredients) : []), [recipe]);
  const steps = useMemo(() => (recipe ? splitSteps(recipe.steps) : []), [recipe]);

  const toggle = useCallback((i: number) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const onReport = useCallback(async () => {
    if (!recipe || report === "busy") return;
    setReport("busy");
    const res = await reportRecipe(recipe.id);
    setReport(res.ok ? "done" : res.status === 401 ? "signin" : "idle");
  }, [recipe, report]);

  if (phase === "loading") {
    return (
      <Page>
        <div aria-busy="true" className="mt-3 grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
          <p className="sr-only" role="status">
            {t("study.bringingTheRecipe")}
          </p>
          <div
            aria-hidden
            className="lm-card aspect-[4/3] animate-pulse rounded-[28px] ring-1 ring-inset ring-paper/10 motion-reduce:animate-none"
            style={CARD_BG}
          />
          <div aria-hidden className="space-y-3">
            <div className="h-5 w-24 rounded-full bg-paper/[0.07]" />
            <div className="h-10 w-4/5 rounded-2xl bg-paper/[0.08]" />
            <div className="h-4 w-full rounded-full bg-paper/[0.05]" />
            <div className="h-4 w-2/3 rounded-full bg-paper/[0.05]" />
          </div>
        </div>
      </Page>
    );
  }

  if (phase === "missing" || !recipe) {
    return (
      <Page>
        <div
          className="lm-card mt-6 flex flex-col items-center rounded-[24px] px-6 py-14 text-center ring-1 ring-inset ring-paper/10"
          style={CARD_BG}
        >
          <p className="font-heading text-title-sm font-bold text-paper">{t("study.thisRecipeCouldNotBe")}</p>
          <Link
            href="/kitchen"
            className="mt-6 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-medium text-paper hover:border-paper/40"
          >
            {t("kitchen.backTo")}
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mt-3 grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <figure className="min-w-0">
          <div
            className="lm-card relative aspect-[4/3] overflow-hidden rounded-[28px] ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)]"
            style={CARD_BG}
          >
            <RecipePhoto recipe={recipe} sizes="(min-width: 1024px) 580px, 100vw" priority plateIcon={56} />
          </div>
          {recipe.photo_url && recipe.photo_credit ? (
            <figcaption className="mt-2 font-sans text-caption text-paper/45">
              {t("kitchen.photoCredit", { credit: recipe.photo_credit })}
            </figcaption>
          ) : null}
        </figure>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LevelChip level={recipe.fast_level} />
            {recipe.season !== "any" ? <Tag>{t(`kitchen.season.${recipe.season}`)}</Tag> : null}
            {recipe.tradition !== "any" ? <Tag>{t(`kitchen.tradition.${recipe.tradition}`)}</Tag> : null}
          </div>
          <h1 className="mt-4 break-words text-heading font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display-sm">
            {recipe.title}
          </h1>
          {recipe.rating_avg != null && recipe.rating_count ? (
            <a
              href="#reviews"
              className="mt-2 inline-flex min-h-11 items-center font-sans text-detail text-paper/60 hover:text-paper"
            >
              <RatingLine avg={recipe.rating_avg} count={recipe.rating_count} size={15} />
            </a>
          ) : null}
          {recipe.summary ? (
            <p className="mt-4 font-sans text-ui leading-[1.65] text-paper/75 md:text-lede">{recipe.summary}</p>
          ) : null}
          {recipe.time_minutes || recipe.servings ? (
            <dl className="mt-6 grid max-w-[420px] grid-cols-2 gap-3">
              {recipe.time_minutes ? (
                <Fact label={t("kitchen.time")} value={t("kitchen.minutes", { n: recipe.time_minutes })} />
              ) : null}
              {recipe.servings ? <Fact label={t("kitchen.serves")} value={recipe.servings} /> : null}
            </dl>
          ) : null}
          <p className="mt-5 font-sans text-caption text-paper/45">
            {recipe.author_id ? t("kitchen.byMember") : t("kitchen.byKitchen")}
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <section
          aria-labelledby="kitchen-ingredients"
          className="lm-card rounded-[24px] p-6 ring-1 ring-inset ring-paper/10 md:p-7 lg:sticky lg:top-24"
          style={CARD_BG}
        >
          <h2 id="kitchen-ingredients" className="text-title-sm font-bold leading-tight text-paper">
            {t("study.ingredients")}
          </h2>
          <p className="mt-1 font-sans text-caption text-paper/45">{t("kitchen.tickHint")}</p>
          <ul className="mt-3 divide-y divide-paper/[0.07]">
            {ingredients.map((item, i) => {
              const done = ticked.has(i);
              return (
                <li key={`${i}-${item}`}>
                  <button
                    type="button"
                    aria-pressed={done}
                    onClick={() => toggle(i)}
                    className="flex min-h-11 w-full items-start gap-3 py-2.5 text-left font-sans text-ui leading-[1.5]"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[3px] inline-flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors",
                        done ? "bg-paper text-night ring-paper" : "ring-paper/25",
                      )}
                    >
                      {done ? <Check size={12} /> : null}
                    </span>
                    <span className={cn("min-w-0 break-words", done ? "text-paper/40 line-through" : "text-paper/85")}>
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="kitchen-method" className="min-w-0">
          <h2 id="kitchen-method" className="text-title-sm font-bold leading-tight text-paper">
            {t("study.method")}
          </h2>
          <ol className="mt-5 space-y-5">
            {steps.map((s, i) => (
              <li key={`${i}-${s.slice(0, 24)}`} className="flex gap-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper/[0.07] font-sans text-detail font-semibold tabular-nums text-paper/85 ring-1 ring-inset ring-paper/10"
                >
                  {i + 1}
                </span>
                <p className="min-w-0 break-words pt-1.5 font-sans text-ui leading-[1.7] text-paper/85 md:text-body">
                  {s}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <RecipeReviews recipeId={recipe.id} />

      {more.length > 0 ? (
        <section aria-labelledby="kitchen-more" className="mt-16">
          <h2 id="kitchen-more" className="text-title-sm font-bold leading-tight text-paper">
            {t("kitchen.moreLikeThis")}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-14 border-t border-paper/[0.08] pt-4">
        {report === "done" ? (
          <p className="py-3 font-sans text-caption text-paper/45">{t("study.reportedThankYou")}</p>
        ) : report === "signin" ? (
          <p className="py-3 font-sans text-caption text-paper/45">{t("kitchen.reportSignIn")}</p>
        ) : (
          <button
            type="button"
            onClick={onReport}
            disabled={report === "busy"}
            className="inline-flex min-h-11 items-center font-sans text-caption text-paper/45 hover:text-paper/80 disabled:opacity-50"
          >
            {t("study.reportThisRecipe")}
          </button>
        )}
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  const { t } = useTranslate();
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 pb-16 pt-5 md:px-8 md:pt-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <Link
          href="/kitchen"
          className="inline-flex min-h-11 items-center gap-1.5 font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          <span aria-hidden>{"←"}</span>
          {t("kitchen.name")}
        </Link>
        {children}
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-paper/[0.06] px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-paper/65 ring-1 ring-inset ring-paper/10">
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper/[0.05] px-4 py-3 ring-1 ring-inset ring-paper/10">
      <dt className="font-sans text-caption uppercase tracking-[1px] text-paper/45">{label}</dt>
      <dd className="mt-1 break-words font-sans text-ui font-semibold text-paper">{value}</dd>
    </div>
  );
}
