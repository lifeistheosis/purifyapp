"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  authorLabel,
  fastLevelLabel,
  seasonLabel,
  traditionLabel,
  type TrapezaRecipe,
} from "@/lib/trapeza/recipes";
import { fetchRecipe, reportRecipe } from "@/lib/trapeza/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type Phase = "loading" | "missing" | "ready";

export function TrapezaDetailClient() {
  const { t } = useTranslate();
  const id = useSearchParams().get("id") ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [recipe, setRecipe] = useState<TrapezaRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setPhase("missing");
      return;
    }
    const r = await fetchRecipe(id);
    setRecipe(r);
    setPhase(r ? "ready" : "missing");
  }, [id]);

  useEffect(() => {
    // External-system effect (the trapeza API); state set after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onReport = useCallback(async () => {
    if (busy || !recipe) return;
    setBusy(true);
    const res = await reportRecipe(recipe.id);
    if (res.ok) setReported(true);
    setBusy(false);
  }, [busy, recipe]);

  if (phase === "loading") {
    return <Centered>{t("study.bringingTheRecipe")}</Centered>;
  }
  if (phase === "missing" || !recipe) {
    return (
      <Centered>
        <p className="font-serif text-lede text-paper/80">
          {t("study.thisRecipeCouldNotBe")}
        </p>
        <Link
          href="/trapeza"
          className="mt-4 inline-flex rounded-pill border border-paper/20 px-4 py-2 font-sans text-ui text-paper/80 hover:border-paper/40"
        >
          {t("study.backToTheTrapeza")}
        </Link>
      </Centered>
    );
  }

  const meta = [
    seasonLabel(recipe.season),
    traditionLabel(recipe.tradition),
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.time_minutes ? `${recipe.time_minutes} min` : null,
  ]
    .filter((m) => m && m !== "Any season" && m !== "Any tradition")
    .join(" · ");

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div
        className="reveal-rise mx-auto w-full max-w-[620px]"
        style={{ animationDelay: "40ms" }}
      >
        <Link
          href="/trapeza"
          className="font-sans text-caption text-paper/50 hover:text-paper/80"
        >
          {t("study.theTrapeza")}
        </Link>

        <span className="mt-5 inline-block rounded-pill border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[0.5px] text-gold-pale">
          {fastLevelLabel(recipe.fast_level)}
        </span>
        <h1 className="mt-3 font-display-serif text-title text-paper">
          {recipe.title}
        </h1>
        {meta ? (
          <p className="mt-1 font-sans text-caption text-paper/50">{meta}</p>
        ) : null}
        {recipe.summary ? (
          <p className="mt-4 font-serif text-body leading-[1.7] text-paper/85">
            {recipe.summary}
          </p>
        ) : null}

        <Block title={t("study.ingredients")}>{recipe.ingredients}</Block>
        <Block title={t("study.method")}>{recipe.steps}</Block>

        <p className="mt-8 font-sans text-caption text-paper/45">
          {authorLabel(recipe)}
        </p>

        <div className="mt-4 border-t border-paper/8 pt-4 font-sans text-caption text-paper/45">
          {reported ? (
            <span>{t("study.reportedThankYou")}</span>
          ) : (
            <button
              type="button"
              onClick={onReport}
              disabled={busy}
              className="hover:text-paper/80 disabled:opacity-50"
            >
              {t("study.reportThisRecipe")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-7">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
        {title}
      </p>
      <p className="mt-2.5 whitespace-pre-line font-sans text-body leading-[1.75] text-paper/85">
        {children}
      </p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center bg-night px-6 text-center">
      <div className="font-sans text-ui text-paper/60">{children}</div>
    </section>
  );
}
