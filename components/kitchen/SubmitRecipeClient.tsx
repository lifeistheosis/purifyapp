"use client";

// Share a recipe with the Kitchen. Lands pending and joins the catalogue once
// it is reviewed (app/api/trapeza/route.ts). Now with a photo of the dish,
// shrunk and stripped of its EXIF on the device before it is sent
// (lib/trapeza/upload.ts), and the form in the Kitchen's own language.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { Close } from "@/components/ui/icons/Close";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { submitRecipe } from "@/lib/trapeza/client";
import type { FastLevel, RecipeSeason, RecipeTradition } from "@/lib/trapeza/recipes";
import { uploadKitchenPhoto } from "@/lib/trapeza/upload";

import { LEVEL_META, LEVEL_ORDER, SEASON_ORDER, TRADITION_ORDER, levelKeys } from "./levels";

const LABEL = "mb-2 block font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55";
const INPUT =
  "w-full rounded-2xl border border-paper/15 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 transition-colors focus:border-paper/45 focus:outline-none";
const SELECT =
  "min-h-11 w-full appearance-none rounded-2xl border border-paper/15 bg-night py-2.5 pl-4 pr-9 font-sans text-ui text-paper focus:border-paper/45 focus:outline-none [&>option]:bg-night [&>option]:text-paper";

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
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [ownPhoto, setOwnPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setSignedIn(Boolean(data.user));
      });
    return () => {
      alive = false;
    };
  }, []);

  // The preview is an object URL; let it go when it is replaced or the page closes.
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = previewRef.current;
    previewRef.current = photo?.preview ?? null;
    if (prev && prev !== photo?.preview) URL.revokeObjectURL(prev);
  }, [photo]);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploadedUrl(null);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (title.trim().length < 3) return setError(t("kitchen.submit.needTitle"));
    if (ingredients.trim().length < 3) return setError(t("kitchen.submit.needIngredients"));
    if (steps.trim().length < 3) return setError(t("kitchen.submit.needMethod"));
    if (photo && !ownPhoto) return setError(t("kitchen.submit.confirmOwn"));
    setBusy(true);

    let photoUrl = uploadedUrl;
    if (photo && !photoUrl) {
      const up = await uploadKitchenPhoto(photo.file, "recipe");
      if (!up.ok) {
        setBusy(false);
        setError(up.status === 401 ? t("study.signInToShareA") : t("kitchen.reviews.photoError"));
        return;
      }
      photoUrl = up.url;
      // Kept, so a failed submit does not send the photo twice.
      setUploadedUrl(up.url);
    }

    const parsedTime = time.trim() ? Number.parseInt(time, 10) : null;
    const res = await submitRecipe({
      title: title.trim(),
      fastLevel,
      season,
      tradition,
      summary: summary.trim() || null,
      ingredients: ingredients.trim(),
      steps: steps.trim(),
      servings: servings.trim() || null,
      timeMinutes: parsedTime != null && Number.isFinite(parsedTime) ? parsedTime : null,
      photoUrl: photoUrl ?? null,
      ownPhoto: Boolean(photoUrl) && ownPhoto,
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else
      setError(
        res.status === 401
          ? t("study.signInToShareA")
          : res.status === 429
            ? t("kitchen.reviews.tooMany")
            : t("kitchen.submit.error"),
      );
  }

  if (signedIn === false) {
    return (
      <Shell>
        <Card>
          <p className="font-heading text-title-sm font-bold text-paper">{t("study.signInToShareA")}</p>
          <Link
            href={`/signin?next=${encodeURIComponent("/kitchen/new")}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90"
          >
            {t("common.signIn")}
          </Link>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <h1 className="text-title font-bold text-paper">{t("study.thankYou")}</h1>
          <p className="mt-3 max-w-[440px] font-sans text-ui leading-[1.65] text-paper/70">
            {t("kitchen.submit.doneBody")}
          </p>
          <Link
            href="/kitchen"
            className="mt-6 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper/85 hover:border-paper/40"
          >
            {t("kitchen.backTo")}
          </Link>
        </Card>
      </Shell>
    );
  }

  // The example ingredients are one line in every catalog; the field asks for
  // one per line, so the example is shown that way.
  const ingredientsExample = t("study.trapeza.exIngredients")
    .split(/[,،、]\s*/)
    .join("\n");

  return (
    <Shell>
      <h1 className="text-heading font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display-sm">
        {t("study.shareAFastingRecipe")}
      </h1>
      <p className="mt-3 max-w-[520px] font-sans text-ui leading-[1.6] text-paper/65">{t("kitchen.submit.lead")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-7">
        <div>
          <label htmlFor="kitchen-title" className={LABEL}>
            {t("study.title")}
          </label>
          <input
            id="kitchen-title"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("study.trapeza.exTitle")}
          />
        </div>

        <fieldset>
          <legend className={LABEL}>{t("study.whatFastDoesItSuit")}</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {LEVEL_ORDER.map((l) => {
              const { Icon, rgb } = LEVEL_META[l];
              const keys = levelKeys(l);
              const active = fastLevel === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setFastLevel(l)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-11 items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    active
                      ? "border-paper/60 bg-paper/[0.08]"
                      : "border-paper/15 bg-paper/[0.03] hover:border-paper/30",
                  )}
                >
                  <span aria-hidden className="mt-0.5 shrink-0" style={{ color: `rgb(${rgb})` }}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-detail font-semibold text-paper">{t(keys.label)}</span>
                    <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">
                      {t(keys.sub)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kitchen-season" className={LABEL}>
              {t("kitchen.filter.season")}
            </label>
            <SelectBox>
              <select
                id="kitchen-season"
                className={SELECT}
                value={season}
                onChange={(e) => setSeason(e.target.value as RecipeSeason)}
              >
                {SEASON_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {t(`kitchen.season.${s}`)}
                  </option>
                ))}
              </select>
            </SelectBox>
          </div>
          <div>
            <label htmlFor="kitchen-tradition" className={LABEL}>
              {t("kitchen.filter.tradition")}
            </label>
            <SelectBox>
              <select
                id="kitchen-tradition"
                className={SELECT}
                value={tradition}
                onChange={(e) => setTradition(e.target.value as RecipeTradition)}
              >
                {TRADITION_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {t(`kitchen.tradition.${s}`)}
                  </option>
                ))}
              </select>
            </SelectBox>
          </div>
        </div>

        <div>
          <label htmlFor="kitchen-summary" className={LABEL}>
            {t("study.aLineAboutItOptional")}
          </label>
          <input
            id="kitchen-summary"
            className={INPUT}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={280}
            placeholder={t("study.trapeza.exLine")}
          />
        </div>

        <div>
          <label htmlFor="kitchen-ingredients" className={LABEL}>
            {t("study.ingredients")}
          </label>
          <textarea
            id="kitchen-ingredients"
            className={cn(INPUT, "min-h-[150px] resize-y leading-[1.6]")}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            maxLength={2000}
            placeholder={ingredientsExample}
            aria-describedby="kitchen-ingredients-hint"
          />
          <p id="kitchen-ingredients-hint" className="mt-1.5 font-sans text-caption text-paper/45">
            {t("kitchen.submit.onePerLine")}
          </p>
        </div>

        <div>
          <label htmlFor="kitchen-steps" className={LABEL}>
            {t("study.method")}
          </label>
          <textarea
            id="kitchen-steps"
            className={cn(INPUT, "min-h-[170px] resize-y leading-[1.6]")}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            maxLength={4000}
            placeholder={t("study.trapeza.exMethod")}
            aria-describedby="kitchen-steps-hint"
          />
          <p id="kitchen-steps-hint" className="mt-1.5 font-sans text-caption text-paper/45">
            {t("kitchen.submit.oneStepPerLine")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kitchen-servings" className={LABEL}>
              {t("study.servesOptional")}
            </label>
            <input
              id="kitchen-servings"
              className={INPUT}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              maxLength={40}
              placeholder={t("study.trapeza.exServes")}
            />
          </div>
          <div>
            <label htmlFor="kitchen-time" className={LABEL}>
              {t("study.minutesOptional")}
            </label>
            <input
              id="kitchen-time"
              type="number"
              inputMode="numeric"
              className={INPUT}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              min={0}
              max={1440}
              placeholder="45"
            />
          </div>
        </div>

        <div>
          <p className={LABEL}>{t("kitchen.submit.photo")}</p>
          {photo ? (
            <div className="relative aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-2xl ring-1 ring-inset ring-paper/15">
              <Image src={photo.preview} alt="" fill sizes="360px" unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setUploadedUrl(null);
                  setOwnPhoto(false);
                }}
                aria-label={t("kitchen.reviews.removePhoto")}
                className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full bg-black/65 text-white"
              >
                <Close size={14} />
              </button>
            </div>
          ) : (
            <label className="flex aspect-[4/3] w-full max-w-[360px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-paper/25 bg-paper/[0.02] text-paper/60 transition-colors hover:border-paper/45 hover:text-paper focus-within:border-paper/60">
              <Plus size={22} />
              <span className="font-sans text-detail font-medium">{t("kitchen.reviews.addPhoto")}</span>
              <input type="file" accept="image/*" onChange={onPick} className="sr-only" />
            </label>
          )}
          <p className="mt-1.5 font-sans text-caption text-paper/45">{t("kitchen.submit.photoHint")}</p>
          {photo ? (
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 font-sans text-detail text-paper/75">
              <input
                type="checkbox"
                checked={ownPhoto}
                onChange={(e) => setOwnPhoto(e.target.checked)}
                className="size-5 shrink-0 accent-premium"
              />
              {t("kitchen.submit.ownPhoto")}
            </label>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-60"
        >
          {busy ? t("kitchen.submit.sending") : t("kitchen.submit.send")}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslate();
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 pb-16 pt-5 md:px-8 md:pt-10">
      <div className="mx-auto w-full max-w-[620px]">
        <Link
          href="/kitchen"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          <span aria-hidden>{"←"}</span>
          {t("kitchen.name")}
        </Link>
        {children}
      </div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="lm-card flex flex-col items-start rounded-[24px] p-6 ring-1 ring-inset ring-paper/10 md:p-8"
      style={CARD_BG}
    >
      {children}
    </div>
  );
}

function SelectBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-caption text-paper/50"
      >
        {"▾"}
      </span>
    </div>
  );
}
