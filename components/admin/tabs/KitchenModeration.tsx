"use client";

// The Kitchen's cards in the admin Community tab: each recipe's photo, the
// reviews readers have reported, and the newest reviews with their photos.
//
// Reviews are post-moderated like the community feed, and they carry photos,
// so the newest ones are listed here with their pictures rather than waiting
// for a report. Everything reads from /api/admin/community (the `kitchen`
// block) and writes through it, except the photo upload, which is multipart
// and has its own route, /api/admin/kitchen/photo.

import { useState } from "react";

import { Card, Pill, ToolbarButton } from "../primitives";

export type KitchenRecipeRow = {
  id: string;
  title: string;
  fast_level: string;
  photo_url?: string | null;
  photo_credit?: string | null;
};

type ReviewCore = {
  id: string;
  stars: number;
  body: string | null;
  photo_urls: string[] | null;
  author_name: string;
  status: string;
};

export type RecentReview = ReviewCore & {
  created_at: string;
  recipe: { id: string; title: string } | null;
};

export type ReviewReport = {
  id: string;
  reason: string | null;
  created_at: string;
  review: ReviewCore | null;
  recipe: { id: string; title: string } | null;
};

export type KitchenBlock = {
  live: { photos: boolean; reviews: boolean };
  recipes: KitchenRecipeRow[];
  recentReviews: RecentReview[];
  reviewReports: ReviewReport[];
};

type Act = (action: "remove_review" | "dismiss_recipe_report", id: string) => Promise<void> | void;

const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
const fieldStyle = {
  background: "var(--adm-control)",
  borderColor: "var(--adm-line-strong)",
  color: "var(--adm-ink)",
} as React.CSSProperties;

export function KitchenModeration({
  kitchen,
  busy,
  act,
  reload,
}: {
  kitchen: KitchenBlock | undefined;
  busy: string | null;
  act: Act;
  reload: () => void;
}) {
  if (!kitchen) return null;
  const { live } = kitchen;
  return (
    <>
      <Card
        title="Reported reviews"
        subtitle="Kitchen reviews readers have flagged. Removing hides the review, deletes its photos and clears its reports."
        accent={kitchen.reviewReports.length > 0}
      >
        {!live.reviews ? (
          <Waiting />
        ) : kitchen.reviewReports.length === 0 ? (
          <Quiet>Nothing reported.</Quiet>
        ) : (
          <div className="space-y-3">
            {kitchen.reviewReports.map((rep) => (
              <ReviewRow
                key={rep.id}
                review={rep.review}
                recipeTitle={rep.recipe?.title ?? "(deleted recipe)"}
                reason={rep.reason}
                when={rep.created_at}
                actions={
                  <>
                    {rep.review && rep.review.status !== "removed" ? (
                      <ToolbarButton
                        variant="danger"
                        loading={busy === rep.review.id + "remove_review"}
                        onClick={() => {
                          if (rep.review) void act("remove_review", rep.review.id);
                        }}
                      >
                        Remove review
                      </ToolbarButton>
                    ) : null}
                    <ToolbarButton
                      loading={busy === rep.id + "dismiss_recipe_report"}
                      onClick={() => act("dismiss_recipe_report", rep.id)}
                    >
                      Dismiss
                    </ToolbarButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Latest reviews"
        subtitle="The newest Kitchen reviews, with their photos. They show as soon as they are posted."
      >
        {!live.reviews ? (
          <Waiting />
        ) : kitchen.recentReviews.length === 0 ? (
          <Quiet>No reviews yet.</Quiet>
        ) : (
          <div className="space-y-3">
            {kitchen.recentReviews.map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                recipeTitle={r.recipe?.title ?? "(deleted recipe)"}
                reason={null}
                when={r.created_at}
                actions={
                  <ToolbarButton
                    variant="danger"
                    loading={busy === r.id + "remove_review"}
                    onClick={() => act("remove_review", r.id)}
                  >
                    Remove
                  </ToolbarButton>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Recipe photos"
        subtitle="The photo each Kitchen recipe shows. Only photos we took or are licensed to use; name the photographer in the credit when it is not ours."
      >
        {!live.photos ? (
          <Waiting />
        ) : (
          <div className="space-y-2">
            {kitchen.recipes.map((r) => (
              <PhotoRow key={r.id} recipe={r} onSaved={reload} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ReviewRow({
  review,
  recipeTitle,
  reason,
  when,
  actions,
}: {
  review: ReviewCore | null;
  recipeTitle: string;
  reason: string | null;
  when: string;
  actions: React.ReactNode;
}) {
  const photos = review?.photo_urls ?? [];
  return (
    <div className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-detail font-semibold text-paper">{recipeTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {review ? <Pill tone="gold">{`${review.stars} of 5`}</Pill> : null}
            {review?.status === "removed" ? <Pill tone="rose">removed</Pill> : null}
            <span className="font-sans text-caption text-paper/45">
              {review?.author_name ?? "unknown"} · {new Date(when).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {review?.body ? (
        <p className="mt-2 line-clamp-4 whitespace-pre-line font-sans text-detail text-paper/80">{review.body}</p>
      ) : null}
      {photos.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((u) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="block size-20 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Attached to a review of ${recipeTitle}`} className="size-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {reason ? (
        <p className="mt-2 font-sans text-caption text-[color:color-mix(in_oklab,var(--adm-critical),transparent_20%)]">
          Reason: {reason}
        </p>
      ) : null}
    </div>
  );
}

function PhotoRow({ recipe, onSaved }: { recipe: KitchenRecipeRow; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState(recipe.photo_credit ?? "");
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = Boolean(file) || credit.trim() !== (recipe.photo_credit ?? "");

  async function send(clear: boolean) {
    setBusy(clear ? "clear" : "save");
    setError(null);
    const form = new FormData();
    form.append("recipeId", recipe.id);
    if (clear) form.append("clear", "1");
    else {
      if (file) form.append("file", file);
      form.append("credit", credit);
    }
    try {
      const r = await fetch("/api/admin/kitchen/photo", { method: "POST", body: form });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "That didn't go through.");
        return;
      }
      setFile(null);
      onSaved();
    } catch {
      setError("That didn't go through.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--adm-radius-sm)] border p-2.5" style={{ borderColor: "var(--adm-line)" }}>
      <div className="size-16 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/10 bg-paper/[0.04]">
        {recipe.photo_url ? (
          <a href={recipe.photo_url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={recipe.photo_url} alt={`The dish: ${recipe.title}`} className="size-full object-cover" />
          </a>
        ) : null}
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="font-sans text-detail font-semibold text-paper">{recipe.title}</p>
        <p className="font-sans text-[11.5px] text-paper/45">
          {recipe.fast_level} · {recipe.photo_url ? "has a photo" : "no photo yet"}
        </p>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={`New photo for ${recipe.title}`}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="max-w-[220px] font-sans text-[12px] text-paper/70"
      />
      <input
        className={`${fieldCls} h-11 max-w-[220px]`}
        style={fieldStyle}
        placeholder="Credit (optional)"
        aria-label={`Photo credit for ${recipe.title}`}
        value={credit}
        maxLength={200}
        onChange={(e) => setCredit(e.target.value)}
      />
      <div className="flex gap-2">
        <ToolbarButton
          variant="primary"
          loading={busy === "save"}
          onClick={() => {
            if (dirty) void send(false);
          }}
        >
          Save
        </ToolbarButton>
        {recipe.photo_url ? (
          <ToolbarButton variant="danger" loading={busy === "clear"} onClick={() => send(true)}>
            Take off
          </ToolbarButton>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="w-full font-sans text-[12px] text-[color:var(--adm-critical)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Waiting() {
  return (
    <p className="font-sans text-detail text-paper/45">
      Switches on once the Kitchen migration (20260928_kitchen.sql) is applied.
    </p>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-detail text-paper/40">{children}</p>;
}
