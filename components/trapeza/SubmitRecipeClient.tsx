"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  FAST_LEVELS,
  SEASONS,
  TRADITIONS,
  type FastLevel,
  type RecipeSeason,
  type RecipeTradition,
} from "@/lib/trapeza/recipes";
import { submitRecipe } from "@/lib/trapeza/client";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function SubmitRecipeClient() {
  const { t } = useTranslate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [fastLevel, setFastLevel] = useState<FastLevel>("oil_wine");
  const [season, setSeason] = useState<RecipeSeason>("any");
  const [tradition, setTradition] = useState<RecipeTradition>("any");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [servings, setServings] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (title.trim().length < 3) return setError("Give the recipe a title.");
    if (ingredients.trim().length < 3) return setError("Add the ingredients.");
    if (steps.trim().length < 3) return setError("Add the method.");
    setBusy(true);
    const parsedTime = time.trim() ? parseInt(time, 10) : null;
    const res = await submitRecipe({
      title: title.trim(),
      fastLevel,
      season,
      tradition,
      summary: summary.trim() || null,
      ingredients: ingredients.trim(),
      steps: steps.trim(),
      servings: servings.trim() || null,
      timeMinutes: Number.isFinite(parsedTime) ? parsedTime : null,
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error ?? "Couldn't submit your recipe.");
  }

  if (signedIn === false) {
    return (
      <Shell>
        <p className="font-serif text-lede text-paper/85">
          {t("study.signInToShareA")}
        </p>
        <Link
          href="/signin?next=/trapeza/new"
          className="mt-5 inline-flex rounded-pill bg-paper px-6 py-3 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("common.signIn")}
        </Link>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <h1 className="font-display-serif text-title text-paper">
          {t("study.thankYou")}
        </h1>
        <p className="mt-3 font-serif text-lede leading-[1.7] text-paper/80">
          {t("study.yourRecipeHasBeenSent")}
        </p>
        <Link
          href="/trapeza"
          className="mt-6 inline-flex rounded-pill border border-paper/20 px-5 py-3 font-sans text-ui font-semibold text-paper/80 hover:border-paper/40"
        >
          {t("study.backToTheTrapeza")}
        </Link>
      </Shell>
    );
  }

  const labelCls =
    "block font-sans text-caption font-semibold uppercase tracking-[1px] text-paper/50 mb-2";
  const inputCls =
    "w-full rounded-lg border border-paper/15 bg-black/30 px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/30 focus:border-gold/45 focus:outline-none transition-colors";

  return (
    <Shell>
      <Link
        href="/trapeza"
        className="font-sans text-caption text-paper/50 hover:text-paper/80"
      >
        {t("study.theTrapeza")}
      </Link>
      <h1 className="mt-4 font-display-serif text-title text-paper">
        {t("study.shareAFastingRecipe")}
      </h1>
      <p className="mt-2 font-sans text-ui leading-relaxed text-paper/60">
        {t("study.shareADishThatKeeps")}
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-6">
        <div>
          <label htmlFor="title" className={labelCls}>
            {t("study.title")}
          </label>
          <input
            id="title"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("study.trapeza.exTitle")}
          />
        </div>

        <div>
          <span className={labelCls}>{t("study.whatFastDoesItSuit")}</span>
          <div className="flex flex-wrap gap-2">
            {FAST_LEVELS.map((l) => (
              <button
                key={l.slug}
                type="button"
                onClick={() => setFastLevel(l.slug)}
                aria-pressed={fastLevel === l.slug}
                className={`rounded-pill border px-3.5 py-1.5 font-sans text-caption font-semibold transition-colors ${
                  fastLevel === l.slug
                    ? "border-gold/50 bg-gold/10 text-gold-pale"
                    : "border-paper/15 text-paper/60 hover:border-paper/30"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as RecipeSeason)}
            className="rounded-lg border border-paper/15 bg-black/30 px-4 py-2.5 font-sans text-ui text-paper [color-scheme:dark] focus:border-gold/45 focus:outline-none"
          >
            {SEASONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={tradition}
            onChange={(e) => setTradition(e.target.value as RecipeTradition)}
            className="rounded-lg border border-paper/15 bg-black/30 px-4 py-2.5 font-sans text-ui text-paper [color-scheme:dark] focus:border-gold/45 focus:outline-none"
          >
            {TRADITIONS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="summary" className={labelCls}>
            {t("study.aLineAboutItOptional")}
          </label>
          <input
            id="summary"
            className={inputCls}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={280}
            placeholder={t("study.trapeza.exLine")}
          />
        </div>

        <div>
          <label htmlFor="ingredients" className={labelCls}>
            {t("study.ingredients")}
          </label>
          <textarea
            id="ingredients"
            className={`${inputCls} min-h-[110px] resize-y`}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            maxLength={2000}
            placeholder={t("study.trapeza.exIngredients")}
          />
        </div>

        <div>
          <label htmlFor="steps" className={labelCls}>
            {t("study.method")}
          </label>
          <textarea
            id="steps"
            className={`${inputCls} min-h-[140px] resize-y`}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            maxLength={4000}
            placeholder={t("study.trapeza.exMethod")}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="servings" className={labelCls}>
              {t("study.servesOptional")}
            </label>
            <input
              id="servings"
              className={inputCls}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              maxLength={40}
              placeholder={t("study.trapeza.exServes")}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="time" className={labelCls}>
              {t("study.minutesOptional")}
            </label>
            <input
              id="time"
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              min={0}
              max={1440}
              placeholder="45"
            />
          </div>
        </div>

        {error ? (
          <p className="font-sans text-caption text-crimson-soft">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send for review"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[560px]">{children}</div>
    </section>
  );
}
