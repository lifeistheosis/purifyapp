"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Star } from "@/components/ui/icons/Star";
import { CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import type { FastLevel, TrapezaRecipe } from "@/lib/trapeza/recipes";

import { LEVEL_META, levelKeys, recipeHref } from "./levels";

/**
 * The photo of a dish, filling its (relative) parent. Until a recipe has a
 * photo it shows an empty plate in the colour of its fast day: drawn, not a
 * stock picture, so nothing on the page pretends to be a photo of the dish.
 */
export function RecipePhoto({
  recipe,
  sizes,
  priority = false,
  plateIcon = 40,
}: {
  recipe: Pick<TrapezaRecipe, "photo_url" | "fast_level" | "photo_focus">;
  sizes: string;
  priority?: boolean;
  plateIcon?: number;
}) {
  if (recipe.photo_url) {
    return (
      <Image
        src={recipe.photo_url}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        style={recipe.photo_focus ? { objectPosition: recipe.photo_focus } : undefined}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    );
  }
  const { Icon, rgb } = LEVEL_META[recipe.fast_level];
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-paper/[0.03]"
      style={{
        backgroundImage: `radial-gradient(90% 80% at 78% 12%, rgb(${rgb} / 0.2), transparent 62%), radial-gradient(70% 60% at 8% 100%, rgb(${rgb} / 0.08), transparent 70%)`,
      }}
    >
      {/* The plate: a rim, a well, and the day's glyph in the middle. */}
      <span className="absolute left-1/2 top-1/2 flex aspect-square h-[64%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper/[0.035] ring-1 ring-inset ring-paper/10">
        <span
          className="flex aspect-square h-[72%] items-center justify-center rounded-full ring-1 ring-inset ring-paper/[0.08]"
          style={{ color: `rgb(${rgb} / 0.75)` }}
        >
          <Icon size={plateIcon} />
        </span>
      </span>
    </div>
  );
}

/** The fast day a dish suits, as a chip. `onPhoto` for one laid over a picture. */
export function LevelChip({
  level,
  onPhoto = false,
  className,
}: {
  level: FastLevel;
  onPhoto?: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const { rgb } = LEVEL_META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.6px]",
        onPhoto
          ? "bg-black/55 text-white backdrop-blur-sm"
          : "bg-paper/[0.06] text-paper/80 ring-1 ring-inset ring-paper/10",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: `rgb(${rgb})` }} />
      {t(levelKeys(level).label)}
    </span>
  );
}

/** Five stars filled to the rounded average, in the antique gold. */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span aria-hidden className="inline-flex items-center gap-[1px] leading-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          filled={i <= filled}
          className={i <= filled ? "text-premium" : "text-paper/25"}
        />
      ))}
    </span>
  );
}

/** "4.5 (3)" beside the stars, or nothing at all before the first review. */
export function RatingLine({
  avg,
  count,
  size = 12,
  className,
}: {
  avg: number | null | undefined;
  count: number | undefined;
  size?: number;
  className?: string;
}) {
  const { tn } = useTranslate();
  if (avg == null || !count) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={tn("shop.ratedOutOfFive", count, { avg: avg.toFixed(1) })}
    >
      <Stars value={avg} size={size} />
      <span aria-hidden className="tabular-nums">
        {avg.toFixed(1)} {"("}
        {count}
        {")"}
      </span>
    </span>
  );
}

/** One dish in the catalogue: its photo, the day it suits, and the essentials. */
export function RecipeCard({
  recipe,
  className,
  sizes = "(min-width: 1024px) 340px, (min-width: 640px) 46vw, 92vw",
}: {
  recipe: TrapezaRecipe;
  className?: string;
  sizes?: string;
}) {
  const { t } = useTranslate();
  return (
    <Link
      href={recipeHref(recipe.id)}
      className={cn(
        "lm-card group flex min-w-0 flex-col overflow-hidden rounded-[22px] ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      style={CARD_BG}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <RecipePhoto recipe={recipe} sizes={sizes} />
        <LevelChip level={recipe.fast_level} onPhoto className="absolute left-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lede font-bold leading-snug text-paper">{recipe.title}</h3>
        {recipe.summary ? (
          <p className="mt-1.5 line-clamp-2 font-sans text-detail leading-[1.55] text-paper/60">
            {recipe.summary}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 font-sans text-caption text-paper/50">
          <RatingLine avg={recipe.rating_avg} count={recipe.rating_count} />
          {recipe.time_minutes ? (
            <span className="tabular-nums">{t("kitchen.minutes", { n: recipe.time_minutes })}</span>
          ) : null}
          <span className="truncate">
            {recipe.author_id ? t("kitchen.byMember") : t("kitchen.byKitchen")}
          </span>
        </div>
      </div>
    </Link>
  );
}
