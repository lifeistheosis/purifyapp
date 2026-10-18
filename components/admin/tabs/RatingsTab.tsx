"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";

import { Card, Select, StatCard, ToolbarButton } from "../primitives";
import { patchJson, shortDate, useAdminFetch } from "../adminFetch";
import {
  REVIEW_LIMITS,
  ratingText,
  type AppReview,
  type ShownRating,
  type StoreId,
} from "@/lib/marketing/storeRatings";
import type { RatingsPayload } from "@/app/api/admin/ratings/route";

/**
 * Ratings: what the front page says about the two stores (1.8).
 *
 * The owner, 2026-10-17: "the ratings, I want that to be updated ... add a
 * custom ... number changer that we could just change in the back end in the
 * admin panel, so it matches how much reviews we have in real time", and a
 * row of reviews "that we put" for a reader to scroll through.
 *
 * - The App Store's number is read live from Apple, so it is shown here and
 *   needs nothing typed.
 * - Google Play has no public rating feed: its rating and count are typed
 *   here, or read off the listing with one press and checked before saving.
 * - The reviews are the ones the phone front page lets a reader swipe
 *   through, in this order, the shown ones only; the computer's front page
 *   quotes the first. Real ones only, copied exactly.
 *
 * Both are kept in site_settings (docs/1.8-build/sql/site-settings.sql).
 * Until that has run, this shows what the front page shows, the committed
 * defaults, and offers no save.
 */

const STORE_LABEL: Record<StoreId, string> = { appStore: "App Store", googlePlay: "Google Play" };

const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
const fieldStyle: CSSProperties = {
  background: "var(--adm-control)",
  borderColor: "var(--adm-line-strong)",
  color: "var(--adm-ink)",
};
const labelCls = "mb-1 block font-sans text-[11.5px]";
const quiet: CSSProperties = { color: "var(--adm-ink-3)" };

function sourceLine(r: ShownRating, store: StoreId): string {
  const day = shortDate(`${r.asOf}T12:00:00Z`);
  if (r.source === "live") return `Live from Apple, read ${day}`;
  if (r.source === "admin") return `Saved here, ${day}`;
  return store === "appStore"
    ? `Apple did not answer: the committed number, read ${day}`
    : `The committed number, read ${day}. Save one to replace it`;
}

function countWord(store: StoreId, n: number): string {
  if (store === "appStore") return n === 1 ? "1 rating" : `${n} ratings`;
  return n === 1 ? "1 review" : `${n} reviews`;
}

export function RatingsTab() {
  const { data, error, reload } = useAdminFetch<RatingsPayload>("/api/admin/ratings");

  if (!data) {
    return (
      <p className="font-sans text-detail" style={{ color: error ? "var(--adm-critical)" : "var(--adm-ink-3)" }}>
        {error ?? "Loading the ratings…"}
      </p>
    );
  }

  const apple = data.appStore.shown;
  const play = data.googlePlay.shown;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="App Store"
          value={apple.count > 0 ? ratingText(apple.rating) : "None yet"}
          hint={`${countWord("appStore", apple.count)} · ${sourceLine(apple, "appStore")}`}
        />
        <StatCard
          label="Google Play"
          value={play.count > 0 ? ratingText(play.rating) : "None yet"}
          hint={`${countWord("googlePlay", play.count)} · ${sourceLine(play, "googlePlay")}`}
        />
      </div>

      {!data.present ? (
        <p role="status" className="font-sans text-detail leading-[1.55]" style={{ color: "var(--adm-ink-2)" }}>
          Saving needs the site_settings table. Run docs/1.8-build/sql/site-settings.sql in the Supabase SQL editor,
          then reload this tab. Until then the front page shows the numbers and reviews below, the committed defaults.
        </p>
      ) : null}
      {data.present && !data.readOk ? (
        <p role="alert" className="font-sans text-detail" style={{ color: "var(--adm-critical)" }}>
          The saved rows could not be read just now. The front page keeps what it read last.
        </p>
      ) : null}

      <PlayCard
        key={`${play.rating}-${play.count}-${play.asOf}`}
        initial={play}
        listing={data.googlePlay.listing}
        canSave={data.present}
        onSaved={reload}
      />

      <ReviewsCard
        key={`${data.reviewsFromDefault ? "default" : data.updated.reviews?.at ?? "saved"}-${data.reviews.length}`}
        initial={data.reviews}
        fromDefault={data.reviewsFromDefault}
        savedAt={data.updated.reviews?.at ?? null}
        canSave={data.present}
        onSaved={reload}
      />
    </div>
  );
}

// ── Google Play ──────────────────────────────────────────────────────────

function PlayCard({
  initial,
  listing,
  canSave,
  onSaved,
}: {
  initial: ShownRating;
  listing: string;
  canSave: boolean;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(initial.rating.toFixed(1));
  const [count, setCount] = useState(String(initial.count));
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const ratingId = useId();
  const countId = useId();

  const r = Number(rating);
  const c = Number(count);
  const ratingOk = /^\d(\.\d)?$/.test(rating.trim()) && r >= 0 && r <= 5;
  const countOk = /^\d{1,9}$/.test(count.trim());
  const changed = ratingOk && countOk && (Math.abs(r - initial.rating) > 1e-9 || c !== initial.count);

  async function readListing() {
    setBusy("read");
    setNote(null);
    setProblem(null);
    try {
      const res = await fetch("/api/admin/ratings?read=play", { cache: "no-store" });
      const body = res.ok ? ((await res.json()) as { read?: { rating: number; count: number } | null }) : null;
      if (body?.read) {
        setRating(ratingText(body.read.rating));
        setCount(String(body.read.count));
        setNote("Read off the listing just now. Check it against the store, then save.");
      } else {
        setProblem("The listing did not give its numbers. Open it and type them in.");
      }
    } catch {
      setProblem("The listing did not answer. Open it and type the numbers in.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setNote(null);
    setProblem(null);
    if (!canSave) {
      setProblem("Saving opens once docs/1.8-build/sql/site-settings.sql has run.");
      return;
    }
    if (!ratingOk || !countOk) {
      setProblem("Both numbers first, as the listing shows them.");
      return;
    }
    setBusy("save");
    const err = await patchJson("/api/admin/ratings", { kind: "play", rating: r, count: c }, "POST");
    setBusy(null);
    if (err) {
      setProblem(err);
      return;
    }
    setNote(`Saved: ${ratingText(r)} from ${countWord("googlePlay", c)}. The front page shows it within a minute.`);
    onSaved();
  }

  return (
    <Card
      title="Google Play rating"
      subtitle="Google has no public rating feed, so the front page shows the number saved here. Copy both numbers exactly as the listing shows them."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={ratingId} className="w-[120px]">
          <span className={labelCls} style={quiet}>
            Rating, out of 5
          </span>
          <input
            id={ratingId}
            inputMode="decimal"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className={`${fieldCls} h-11 tabular-nums`}
            style={fieldStyle}
            aria-invalid={!ratingOk || undefined}
          />
        </label>
        <label htmlFor={countId} className="w-[140px]">
          <span className={labelCls} style={quiet}>
            Reviews
          </span>
          <input
            id={countId}
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={`${fieldCls} h-11 tabular-nums`}
            style={fieldStyle}
            aria-invalid={!countOk || undefined}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <ToolbarButton onClick={readListing} loading={busy === "read"}>
            Read the listing
          </ToolbarButton>
          <ToolbarButton variant="primary" onClick={save} loading={busy === "save"} title={canSave ? undefined : "Run the SQL first"}>
            Save
          </ToolbarButton>
          <a
            href={listing}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center px-1 font-sans text-[12.5px] underline underline-offset-4"
            style={{ color: "var(--adm-ink-2)" }}
          >
            Open the listing
          </a>
        </div>
      </div>
      {!ratingOk ? (
        <p className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          A rating from 0 to 5 with one decimal, as the listing shows it (for example 4.9).
        </p>
      ) : null}
      {!countOk ? (
        <p className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          The number of reviews, as a whole number.
        </p>
      ) : null}
      {!canSave ? (
        <p className="mt-2 font-sans text-[12px]" style={quiet}>
          Saving opens once the SQL has run.
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          {note}
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          {problem}
        </p>
      ) : null}
      {changed && canSave ? (
        <p className="mt-2 font-sans text-[12px]" style={quiet}>
          Not saved yet.
        </p>
      ) : null}
    </Card>
  );
}

// ── Reviews ──────────────────────────────────────────────────────────────

type Draft = {
  store: StoreId;
  name: string;
  stars: string;
  month: string;
  title: string;
  quote: string;
};

const EMPTY_DRAFT: Draft = { store: "googlePlay", name: "", stars: "5", month: "", title: "", quote: "" };

function draftOf(r: AppReview): Draft {
  return { store: r.store, name: r.name, stars: String(r.stars), month: r.month, title: r.title ?? "", quote: r.quote };
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** What is wrong with a draft, in the panel's words, or null. */
function draftProblem(d: Draft): string | null {
  if (!d.name.trim()) return "The name, as the store shows it.";
  if (d.name.trim().length > REVIEW_LIMITS.name) return `A name of at most ${REVIEW_LIMITS.name} characters.`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.month)) return "The month it was written.";
  if (d.month > thisMonth()) return "A month that has come.";
  if (d.title.trim().length > REVIEW_LIMITS.title) return `A title of at most ${REVIEW_LIMITS.title} characters.`;
  if (!d.quote.trim()) return "The words of the review.";
  if (d.quote.trim().length > REVIEW_LIMITS.quote) return `At most ${REVIEW_LIMITS.quote} characters: stop at the end of a sentence.`;
  return null;
}

function newId(store: StoreId): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `${store === "appStore" ? "as" : "gp"}-${raw.slice(0, 10)}`;
}

function monthName(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function ReviewsCard({
  initial,
  fromDefault,
  savedAt,
  canSave,
  onSaved,
}: {
  initial: AppReview[];
  fromDefault: boolean;
  savedAt: string | null;
  canSave: boolean;
  onSaved: () => void;
}) {
  const [list, setList] = useState<AppReview[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(list) !== JSON.stringify(initial), [list, initial]);
  const shownCount = list.filter((r) => r.shown).length;

  const move = (i: number, by: number) =>
    setList((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const update = (id: string, patch: Partial<AppReview>) =>
    setList((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setList((l) => l.filter((r) => r.id !== id));

  async function save() {
    setNote(null);
    setProblem(null);
    if (!canSave) {
      setProblem("Saving opens once docs/1.8-build/sql/site-settings.sql has run.");
      return;
    }
    setBusy(true);
    const err = await patchJson("/api/admin/ratings", { kind: "reviews", reviews: list }, "POST");
    setBusy(false);
    if (err) {
      setProblem(err);
      return;
    }
    setNote("Saved. The front page shows the new row within a minute.");
    onSaved();
  }

  return (
    <Card
      title="Reviews on the front page"
      subtitle={
        fromDefault
          ? "The committed list, not saved here yet: every one copied from its listing on 2026-10-18. Phones swipe through the shown ones in this order; the computer's front page quotes the first."
          : `Saved ${savedAt ? shortDate(savedAt) : ""}. Phones swipe through the shown ones in this order; the computer's front page quotes the first.`
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[12px] tabular-nums" style={quiet}>
            {shownCount} of {list.length} shown
          </span>
          {dirty ? (
            <ToolbarButton onClick={() => setList(initial)} title="Put the list back as it was saved">
              Undo changes
            </ToolbarButton>
          ) : null}
          <ToolbarButton variant="primary" onClick={save} loading={busy} title={canSave ? undefined : "Run the SQL first"}>
            Save reviews
          </ToolbarButton>
        </div>
      }
    >
      <p className="mb-3 font-sans text-[12px] leading-[1.55]" style={{ color: "var(--adm-ink-2)" }}>
        Real reviews only. Copy the words exactly as the store shows them, with the name as it shows it; you may stop at
        the end of a sentence, and change nothing inside one.
      </p>

      <ol className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
        {list.map((r, i) => (
          <li key={r.id} className="py-3" style={{ borderColor: "var(--adm-line)" }}>
            {editing === r.id ? (
              <ReviewForm
                initial={draftOf(r)}
                submitLabel="Keep these changes"
                onCancel={() => setEditing(null)}
                onSubmit={(d) => {
                  update(r.id, {
                    store: d.store,
                    name: d.name.trim(),
                    stars: Number(d.stars),
                    month: d.month,
                    title: d.title.trim() || undefined,
                    quote: d.quote.trim(),
                  });
                  setEditing(null);
                }}
              />
            ) : (
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-[280px]">
                  <p className="font-sans text-[12.5px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                    {r.name}
                    <span className="font-normal" style={quiet}>
                      {" "}
                      · {STORE_LABEL[r.store]} · {monthName(r.month)} · {r.stars} of 5 stars
                    </span>
                  </p>
                  {r.title ? (
                    <p className="mt-1 font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                      {r.title}
                    </p>
                  ) : null}
                  <p className="mt-1 line-clamp-3 font-sans text-[12.5px] leading-[1.5]" style={{ color: "var(--adm-ink-2)" }}>
                    &ldquo;{r.quote}&rdquo;
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ToolbarButton
                    variant={r.shown ? "chosen" : "default"}
                    onClick={() => update(r.id, { shown: !r.shown })}
                    title={r.shown ? "Shown on the front page: press to hide" : "Hidden: press to show"}
                  >
                    {r.shown ? "Shown" : "Hidden"}
                  </ToolbarButton>
                  <ToolbarButton onClick={() => move(i, -1)} title="Earlier in the row">
                    Up
                  </ToolbarButton>
                  <ToolbarButton onClick={() => move(i, 1)} title="Later in the row">
                    Down
                  </ToolbarButton>
                  <ToolbarButton onClick={() => setEditing(r.id)}>Edit</ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => remove(r.id)}>
                    Remove
                  </ToolbarButton>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        {adding ? (
          <ReviewForm
            initial={EMPTY_DRAFT}
            submitLabel="Add to the list"
            onCancel={() => setAdding(false)}
            onSubmit={(d) => {
              setList((l) => [
                ...l,
                {
                  id: newId(d.store),
                  store: d.store,
                  name: d.name.trim(),
                  stars: Number(d.stars),
                  month: d.month,
                  ...(d.title.trim() ? { title: d.title.trim() } : {}),
                  quote: d.quote.trim(),
                  shown: true,
                },
              ]);
              setAdding(false);
            }}
          />
        ) : list.length < REVIEW_LIMITS.count ? (
          <ToolbarButton onClick={() => setAdding(true)}>Add a review</ToolbarButton>
        ) : (
          <p className="font-sans text-[12px]" style={quiet}>
            The row holds {REVIEW_LIMITS.count} at most. Remove one to add another.
          </p>
        )}
      </div>

      {dirty ? (
        <p className="mt-3 font-sans text-[12px]" style={quiet}>
          {canSave ? "Not saved yet." : "Saving opens once the SQL has run."}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-3 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          {note}
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="mt-3 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          {problem}
        </p>
      ) : null}
    </Card>
  );
}

function ReviewForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const problem = draftProblem(d);
  const ids = { store: useId(), name: useId(), stars: useId(), month: useId(), title: useId(), quote: useId() };

  return (
    <div className="grid grid-cols-1 gap-3 rounded-[var(--adm-radius-sm)] border p-3 md:grid-cols-12" style={{ borderColor: "var(--adm-line-strong)" }}>
      <div className="md:col-span-3">
        <span id={ids.store} className={labelCls} style={quiet}>
          Store
        </span>
        <Select<StoreId>
          ariaLabelledBy={ids.store}
          value={d.store}
          onChange={(v) => set("store", v)}
          options={[
            { value: "googlePlay", label: "Google Play" },
            { value: "appStore", label: "App Store" },
          ]}
        />
      </div>
      <label htmlFor={ids.name} className="md:col-span-5">
        <span className={labelCls} style={quiet}>
          Name, as the store shows it
        </span>
        <input id={ids.name} value={d.name} onChange={(e) => set("name", e.target.value)} className={`${fieldCls} h-11`} style={fieldStyle} />
      </label>
      <div className="md:col-span-2">
        <span id={ids.stars} className={labelCls} style={quiet}>
          Stars given
        </span>
        <Select<string>
          ariaLabelledBy={ids.stars}
          value={d.stars}
          onChange={(v) => set("stars", v)}
          options={["5", "4", "3", "2", "1"].map((s) => ({ value: s, label: `${s} of 5` }))}
        />
      </div>
      <label htmlFor={ids.month} className="md:col-span-2">
        <span className={labelCls} style={quiet}>
          Month written
        </span>
        <input
          id={ids.month}
          type="month"
          max={thisMonth()}
          value={d.month}
          onChange={(e) => set("month", e.target.value)}
          className={`${fieldCls} h-11 tabular-nums`}
          style={fieldStyle}
        />
      </label>
      <label htmlFor={ids.title} className="md:col-span-12">
        <span className={labelCls} style={quiet}>
          Title (App Store reviews have one; leave it empty otherwise)
        </span>
        <input id={ids.title} value={d.title} onChange={(e) => set("title", e.target.value)} className={`${fieldCls} h-11`} style={fieldStyle} />
      </label>
      <label htmlFor={ids.quote} className="md:col-span-12">
        <span className={labelCls} style={quiet}>
          The words, exactly as written ({d.quote.trim().length} of {REVIEW_LIMITS.quote})
        </span>
        <textarea
          id={ids.quote}
          rows={3}
          value={d.quote}
          onChange={(e) => set("quote", e.target.value)}
          className={`${fieldCls} py-2 leading-[1.6]`}
          style={fieldStyle}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 md:col-span-12">
        <ToolbarButton
          variant="primary"
          onClick={() => {
            setTried(true);
            if (!problem) onSubmit(d);
          }}
        >
          {submitLabel}
        </ToolbarButton>
        <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
        {tried && problem ? (
          <span role="alert" className="font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
            {problem}
          </span>
        ) : null}
      </div>
    </div>
  );
}
