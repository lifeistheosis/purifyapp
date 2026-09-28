"use client";

// Reviews on a Kitchen recipe: stars, a few words, and up to four photos of
// the dish as the reader made it.
//
// One review per member per recipe, which they can edit or delete. It shows
// at once and anyone can report it, the same terms as the community feed.
// Nothing here exists until 20260928_kitchen.sql is applied: the API answers
// "closed" and this renders nothing, rather than an empty section that reads
// as "nobody has cooked this".

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReviewPhotos } from "@/components/shop/ReviewPhotos";
import { CARD_BG } from "@/components/ui/Graphite";
import { Close } from "@/components/ui/icons/Close";
import { Plus } from "@/components/ui/icons/Plus";
import { Star } from "@/components/ui/icons/Star";
import { cn } from "@/lib/cn";
import {
  deleteReview,
  fetchReviews,
  reportReview,
  saveReview,
  type ReviewsState,
} from "@/lib/trapeza/client";
import { MAX_REVIEW_PHOTOS } from "@/lib/trapeza/photos";
import type { KitchenReview } from "@/lib/trapeza/recipes";
import { uploadKitchenPhoto } from "@/lib/trapeza/upload";

import { Stars } from "./RecipeCard";

const SMALL_BTN =
  "inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-caption font-medium text-paper/50 transition-colors hover:text-paper disabled:opacity-50";
const OUTLINE_BTN =
  "inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] px-5 font-sans text-ui font-medium text-paper transition-colors hover:border-paper/40";

export function RecipeReviews({ recipeId }: { recipeId: string }) {
  const { t, tn } = useTranslate();
  const [state, setState] = useState<ReviewsState | null>(null);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    // External-system effect (the Kitchen API); state set after the await.
    void fetchReviews(recipeId).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [recipeId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const openForm = useCallback(() => {
    setEditing(true);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  }, []);

  if (state === null || state.kind === "closed") return null;

  const ready = state.kind === "ready" ? state : null;
  const mine = ready?.reviews.find((r) => r.mine) ?? null;
  const photos = ready ? ready.reviews.flatMap((r) => r.photo_urls).slice(0, 12) : [];
  const nextPath = `/kitchen/recipe?id=${encodeURIComponent(recipeId)}`;

  return (
    <section id="reviews" aria-labelledby="kitchen-reviews" className="mt-16 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="kitchen-reviews" className="text-title-sm font-bold leading-tight text-paper">
            {t("kitchen.reviews.title")}
          </h2>
          {ready && ready.summary.avg != null && ready.summary.count > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-detail text-paper/60">
              <span
                className="inline-flex items-center gap-2"
                aria-label={tn("shop.ratedOutOfFive", ready.summary.count, {
                  avg: ready.summary.avg.toFixed(1),
                })}
              >
                <Stars value={ready.summary.avg} size={16} />
                <span aria-hidden className="font-semibold tabular-nums text-paper">
                  {ready.summary.avg.toFixed(1)}
                </span>
              </span>
              <span>{tn("kitchen.reviews.count", ready.summary.count)}</span>
            </p>
          ) : null}
        </div>
        {ready && !editing ? (
          ready.signedIn ? (
            <button type="button" onClick={openForm} className={OUTLINE_BTN}>
              {mine ? t("kitchen.reviews.edit") : (
                <>
                  <Plus size={15} />
                  {t("kitchen.reviews.write")}
                </>
              )}
            </button>
          ) : (
            <Link href={`/signin?next=${encodeURIComponent(nextPath)}`} className={OUTLINE_BTN}>
              {t("kitchen.reviews.signIn")}
            </Link>
          )
        ) : null}
      </div>

      {photos.length > 0 ? (
        <div className="mt-6">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45">
            {t("kitchen.reviews.fromReaders")}
          </p>
          <ReviewPhotos urls={photos} />
        </div>
      ) : null}

      {editing && ready ? (
        <div ref={formRef} className="scroll-mt-24">
          <ReviewForm
            recipeId={recipeId}
            existing={mine}
            onDone={() => {
              setEditing(false);
              reload();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}

      {state.kind === "failed" ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="font-sans text-detail text-paper/55">{t("kitchen.reviews.loadFailed")}</p>
          <button type="button" onClick={reload} className={OUTLINE_BTN}>
            {t("kitchen.tryAgain")}
          </button>
        </div>
      ) : ready && ready.reviews.length === 0 ? (
        editing ? null : (
          <p className="mt-6 max-w-[520px] font-sans text-ui leading-[1.6] text-paper/55">
            {t("kitchen.reviews.none")}
          </p>
        )
      ) : ready ? (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {ready.reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              recipeId={recipeId}
              onEdit={openForm}
              onChanged={reload}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ReviewCard({
  review,
  recipeId,
  onEdit,
  onChanged,
}: {
  review: KitchenReview;
  recipeId: string;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { t, tn, locale } = useTranslate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState<"no" | "yes" | "signin">("no");

  const when = (() => {
    try {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(review.created_at),
      );
    } catch {
      return review.created_at.slice(0, 10);
    }
  })();

  async function onDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    const res = await deleteReview(recipeId);
    setBusy(false);
    setConfirming(false);
    if (res.ok) onChanged();
  }

  async function onReport() {
    setBusy(true);
    const res = await reportReview(recipeId, review.id);
    setBusy(false);
    setReported(res.ok ? "yes" : res.status === 401 ? "signin" : "no");
  }

  return (
    <li
      className="lm-card flex min-w-0 flex-col rounded-[22px] p-5 ring-1 ring-inset ring-paper/10"
      style={CARD_BG}
    >
      <div className="flex items-center gap-3">
        <ReviewAvatar name={review.author_name} url={review.author_avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-ui font-semibold text-paper">
            {review.author_name}
            {review.mine ? (
              <span className="font-normal text-paper/45">
                {" · "}
                {t("kitchen.reviews.you")}
              </span>
            ) : null}
          </p>
          <p className="font-sans text-caption text-paper/45">{when}</p>
        </div>
        <span className="shrink-0" role="img" aria-label={tn("kitchen.reviews.stars", review.stars)}>
          <Stars value={review.stars} size={14} />
        </span>
      </div>
      {review.body ? (
        <p className="mt-3 whitespace-pre-line break-words font-sans text-ui leading-[1.65] text-paper/80">
          {review.body}
        </p>
      ) : null}
      <ReviewPhotos urls={review.photo_urls} />
      <div className="-mx-3 mt-auto flex flex-wrap items-center pt-2">
        {review.mine ? (
          <>
            <button type="button" onClick={onEdit} className={SMALL_BTN}>
              {t("common.edit")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className={cn(SMALL_BTN, confirming && "text-crimson-soft hover:text-crimson-soft")}
            >
              {confirming ? t("kitchen.reviews.deleteSure") : t("common.delete")}
            </button>
            {confirming ? (
              <button type="button" onClick={() => setConfirming(false)} className={SMALL_BTN}>
                {t("common.cancel")}
              </button>
            ) : null}
          </>
        ) : reported === "yes" ? (
          <span className="px-3 py-3 font-sans text-caption text-paper/45">{t("kitchen.reviews.reported")}</span>
        ) : reported === "signin" ? (
          <span className="px-3 py-3 font-sans text-caption text-paper/45">{t("kitchen.reportSignIn")}</span>
        ) : (
          <button type="button" onClick={onReport} disabled={busy} className={SMALL_BTN}>
            {t("kitchen.reviews.report")}
          </button>
        )}
      </div>
    </li>
  );
}

type Picked = { file: File; preview: string };

function ReviewForm({
  recipeId,
  existing,
  onDone,
  onCancel,
}: {
  recipeId: string;
  existing: KitchenReview | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t, tn } = useTranslate();
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  // Photos already uploaded (an edit's, or ones sent before a failed save),
  // and photos picked on this device and not yet sent.
  const [kept, setKept] = useState<string[]>(existing?.photo_urls ?? []);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [own, setOwn] = useState(Boolean(existing && existing.photo_urls.length > 0));
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  // Previews are object URLs; let them go when the form closes.
  const pickedRef = useRef<Picked[]>([]);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(
    () => () => {
      for (const p of pickedRef.current) URL.revokeObjectURL(p.preview);
    },
    [],
  );

  const count = kept.length + picked.length;
  const room = MAX_REVIEW_PHOTOS - count;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, room));
    e.target.value = "";
    if (files.length === 0) return;
    setPicked((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  function dropPicked(preview: string) {
    URL.revokeObjectURL(preview);
    setPicked((prev) => prev.filter((p) => p.preview !== preview));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "idle") return;
    if (stars < 1) {
      setError(t("kitchen.reviews.pickRating"));
      return;
    }
    if (count > 0 && !own) {
      setError(t("kitchen.reviews.confirmOwn"));
      return;
    }
    setError(null);

    const urls = [...kept];
    if (picked.length > 0) {
      setPhase("uploading");
      for (const p of picked) {
        const up = await uploadKitchenPhoto(p.file, "review");
        if (!up.ok) {
          // Whatever went up already is kept, so a retry sends only the rest.
          const sent = urls.length - kept.length;
          for (const done of picked.slice(0, sent)) URL.revokeObjectURL(done.preview);
          setKept(urls);
          setPicked(picked.slice(sent));
          setPhase("idle");
          setError(up.status === 429 ? t("kitchen.reviews.tooMany") : t("kitchen.reviews.photoError"));
          return;
        }
        urls.push(up.url);
      }
      for (const p of picked) URL.revokeObjectURL(p.preview);
      setKept(urls);
      setPicked([]);
    }

    setPhase("saving");
    const res = await saveReview(recipeId, {
      stars,
      body: body.trim() || null,
      photoUrls: urls,
      ownPhotos: urls.length > 0 && own,
    });
    setPhase("idle");
    if (res.ok) {
      onDone();
      return;
    }
    setError(
      res.status === 403
        ? t("kitchen.reviews.takenDown")
        : res.status === 429
          ? t("kitchen.reviews.tooMany")
          : t("kitchen.reviews.error"),
    );
  }

  const labelCls = "font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55";

  return (
    <form
      onSubmit={onSubmit}
      className="lm-card mt-6 rounded-[24px] p-5 ring-1 ring-inset ring-paper/10 md:p-6"
      style={CARD_BG}
    >
      <fieldset>
        <legend className={labelCls}>{t("kitchen.reviews.rating")}</legend>
        <div className="mt-1 flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-pressed={stars === n}
              aria-label={tn("kitchen.reviews.stars", n)}
              className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-paper/[0.06]"
            >
              <Star size={26} filled={n <= stars} className={n <= stars ? "text-premium" : "text-paper/30"} />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block">
        <span className={labelCls}>{t("kitchen.reviews.bodyLabel")}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={t("kitchen.reviews.bodyPlaceholder")}
          className="mt-2 w-full resize-y rounded-2xl border border-paper/15 bg-paper/[0.04] px-4 py-3 font-sans text-ui leading-[1.6] text-paper placeholder:text-paper/35 focus:border-paper/45 focus:outline-none"
        />
      </label>

      <div className="mt-5">
        <p className={labelCls}>{tn("kitchen.reviews.photosLabel", MAX_REVIEW_PHOTOS)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {kept.map((u) => (
            <Thumb
              key={u}
              src={u}
              label={t("kitchen.reviews.removePhoto")}
              onRemove={() => setKept((prev) => prev.filter((x) => x !== u))}
            />
          ))}
          {picked.map((p) => (
            <Thumb
              key={p.preview}
              src={p.preview}
              label={t("kitchen.reviews.removePhoto")}
              onRemove={() => dropPicked(p.preview)}
            />
          ))}
          {room > 0 ? (
            <label className="inline-flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-paper/25 text-paper/60 transition-colors hover:border-paper/45 hover:text-paper focus-within:border-paper/60">
              <Plus size={18} />
              <span className="px-1 text-center font-sans text-[11px] font-medium leading-tight">
                {t("kitchen.reviews.addPhoto")}
              </span>
              <input type="file" accept="image/*" multiple onChange={onPick} className="sr-only" />
            </label>
          ) : null}
        </div>
        {count > 0 ? (
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 font-sans text-detail text-paper/75">
            <input
              type="checkbox"
              checked={own}
              onChange={(e) => setOwn(e.target.checked)}
              className="size-5 shrink-0 accent-premium"
            />
            {t("kitchen.reviews.ownPhotos")}
          </label>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={phase !== "idle"}
          className="inline-flex min-h-11 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-60"
        >
          {phase === "uploading"
            ? t("kitchen.reviews.uploading")
            : phase === "saving"
              ? t("kitchen.reviews.posting")
              : existing
                ? t("kitchen.reviews.update")
                : t("kitchen.reviews.submit")}
        </button>
        <button type="button" onClick={onCancel} className={OUTLINE_BTN}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

function Thumb({ src, label, onRemove }: { src: string; label: string; onRemove: () => void }) {
  return (
    <div className="relative size-20 overflow-hidden rounded-xl ring-1 ring-inset ring-paper/15">
      <Image src={src} alt="" fill sizes="80px" unoptimized className="object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="hit-44 absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/65 text-white"
      >
        <Close size={11} />
      </button>
    </div>
  );
}

/** The reviewer's picture, or their initial when there is none or it will not load. */
function ReviewAvatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-paper/15 bg-paper/[0.06] font-sans text-detail font-semibold text-paper/70">
      {url && failed !== url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes="40px"
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
          className="object-cover"
        />
      ) : (
        (name.trim()[0] ?? "R").toUpperCase()
      )}
    </span>
  );
}
