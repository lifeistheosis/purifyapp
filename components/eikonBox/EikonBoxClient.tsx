"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { dropIsOpen } from "@/lib/eikonBox/status";
import type {
  EikonBoxCurrent,
  MemberClaimHistoryRow,
} from "@/lib/eikonBox/types";
import { AddressForm, EMPTY_ADDRESS, toFields, type AddressFields } from "./AddressForm";
import { DropProgress } from "./DropProgress";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/**
 * The EIKON Box screen: /account/eikon-box.
 *
 * ELIGIBILITY COMES FROM THE SERVER, in the `eligible` field of
 * /api/eikon-box/current. This screen deliberately does NOT call
 * hasActiveProClient(): that helper races a 2.5s timeout and fails open to
 * "not Pro", which on a slow connection would tell a paying member they are
 * not a member, on the one screen where that is unforgivable.
 *
 * The claim form IS the address form. There is no separate address step:
 * a returning member sees their saved address collapsed to one line with a
 * Change affordance, and a first-time claimer fills it in once.
 */

function monthLabel(periodMonth: string): string {
  if (!periodMonth) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${periodMonth}T12:00:00Z`));
}

function deadlineLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const CARD =
  "rounded-2xl border border-paper/10 bg-paper/[0.03] p-5";

export function EikonBoxClient() {
  const [state, setState] = useState<EikonBoxCurrent | null>(null);
  const [history, setHistory] = useState<MemberClaimHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [fields, setFields] = useState<AddressFields>(EMPTY_ADDRESS);
  const [editingAddress, setEditingAddress] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // No synchronous setState before the first await: this is called straight
  // from an effect, and setting state in an effect body cascades renders.
  // The initial `loading` state already covers the first pass; the retry
  // button re-arms it from an event handler, where it is free.
  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/eikon-box/current");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as EikonBoxCurrent;
      setState(data);
      const prefill = data.claim?.shippingAddress ?? data.savedAddress ?? data.suggestedAddress;
      setFields(toFields(prefill));
      setEditingAddress(!prefill);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       load shares its path with the retry button. Every write is past an
       await, so nothing lands synchronously in the effect body. */
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/eikon-box/mine")
      .then((r) => (r.ok ? r.json() : { claims: [] }))
      .then((d: { claims?: MemberClaimHistoryRow[] }) => {
        if (!cancelled) setHistory(d.claims ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state?.claim?.id]);

  async function claim() {
    if (!state?.drop) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const res = await apiFetch("/api/eikon-box/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropId: state.drop.id,
          address: {
            name: fields.name,
            line1: fields.line1,
            line2: fields.line2 || null,
            city: fields.city,
            state: fields.state,
            postalCode: fields.postalCode,
          },
          saveAddress: true,
          termsAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors(data.fields ?? {});
        setFormError(data.error ?? "Could not claim this box.");
        return;
      }
      setLoading(true);
      await load();
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!eikonBoxEnabled()) {
    return (
      <div className={CARD}>
        <h1 className="font-serif text-title-sm text-paper">The EIKON Box</h1>
        <p className="mt-2 font-sans text-ui text-paper/60 leading-[1.6]">
          Opening soon. Your Pro membership already includes it, and we will
          tell you the moment the first box is ready to claim.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" rounded="rounded-2xl" />
        <Skeleton className="h-24 w-full" rounded="rounded-2xl" />
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className={CARD}>
        <p className="font-sans text-ui text-paper/70">
          We could not load your box just now.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError(false);
            void load();
          }}
          className="mt-3 rounded-pill border border-paper/20 px-4 py-2 font-sans text-detail font-semibold text-paper"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Not a Pro member ────────────────────────────────────────────────
  if (!state.eligible) {
    return (
      <div className={CARD}>
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
          Purify Pro
        </p>
        <h1 className="mt-2 font-serif text-title-sm text-paper">The EIKON Box</h1>
        <p className="mt-2 font-sans text-ui text-paper/65 leading-[1.6]">
          Each month we open a curated box of Orthodox devotional goods: an
          icon, a prayer rope, incense, a booklet, or seasonal gifts. Pro
          members claim theirs in the app while the window is open.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center rounded-pill border border-gold/45 bg-gold/12 px-4 py-2.5 font-sans text-detail font-semibold text-gold-pale"
        >
          See what Pro includes →
        </Link>
      </div>
    );
  }

  const drop = state.drop;
  const claim_ = state.claim;
  const open = drop ? dropIsOpen(drop) : false;
  const deadline = deadlineLabel(drop?.claimsCloseAt ?? null);

  return (
    <div className="space-y-5">
      {/* ── No drop to act on ──────────────────────────────────────── */}
      {!drop && (
        <div className={CARD}>
          <h1 className="font-serif text-title-sm text-paper">Your EIKON Box</h1>
          <p className="mt-2 font-sans text-ui text-paper/65 leading-[1.6]">
            The next box opens at the start of the month. We will tell you when
            it does.
          </p>
        </div>
      )}

      {drop && (
        <div className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
          {drop.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={drop.imageUrl}
              alt={drop.title}
              className="h-48 w-full object-cover"
            />
          )}
          <div className="p-5">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
              {monthLabel(drop.periodMonth)}
            </p>
            <h1 className="mt-1.5 font-serif text-title-sm text-paper">
              {drop.title}
            </h1>
            {drop.teaser && (
              <p className="mt-2 font-sans text-ui text-paper/65 leading-[1.6]">
                {drop.teaser}
              </p>
            )}

            {/* Claimed already */}
            {claim_ && (
              <div className="mt-4 space-y-3">
                <DropProgress
                  claimStatus={claim_.status}
                  dropStatus={drop.status}
                  claimedAt={claim_.claimedAt}
                  tracking={claim_.tracking}
                  claimsCloseAt={drop.claimsCloseAt}
                />
                {claim_.shippingAddress && claim_.status !== "cancelled" && (
                  <p className="font-sans text-caption text-paper/55 leading-[1.55]">
                    Shipping to {claim_.shippingAddress.name},{" "}
                    {claim_.shippingAddress.address.line1},{" "}
                    {claim_.shippingAddress.address.city}{" "}
                    {claim_.shippingAddress.address.state}
                    {claim_.status === "claimed" && (
                      <>
                        {" · "}
                        <Link href="/account/profile" className="underline">
                          Need to change it?
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Open, unclaimed: the claim form */}
            {!claim_ && open && (
              <div className="mt-4 space-y-4">
                {deadline && (
                  <p className="rounded-md border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5 font-sans text-detail font-medium text-gold-pale">
                    Claims close {deadline}.
                  </p>
                )}

                {!editingAddress ? (
                  <div className="flex items-start justify-between gap-3 rounded-md border border-paper/12 bg-paper/[0.04] px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
                        Ship to
                      </p>
                      <p className="mt-1 font-sans text-caption text-paper/75 leading-[1.5]">
                        {fields.name}, {fields.line1}
                        {fields.line2 ? `, ${fields.line2}` : ""}, {fields.city}{" "}
                        {fields.state} {fields.postalCode}
                      </p>
                      {state.suggestedAddress && !state.savedAddress && (
                        <p className="mt-1 font-sans text-[11px] text-paper/40">
                          From your last EIKON order
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingAddress(true)}
                      className="shrink-0 font-sans text-detail font-semibold text-gold-pale underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <AddressForm
                    value={fields}
                    onChange={setFields}
                    errors={fieldErrors}
                    disabled={submitting}
                  />
                )}

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
                  />
                  <span className="font-sans text-caption text-paper/60 leading-[1.55]">
                    I understand this box is made to the number claimed, and
                    that a box I do not claim before the window closes is not
                    carried over and is not refunded.
                  </span>
                </label>

                {formError && (
                  <p role="alert" className="font-sans text-caption text-crimson">
                    {formError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!accepted || submitting}
                  onClick={() => void claim()}
                  className={cn(
                    "w-full rounded-pill px-4 py-3 font-sans text-ui font-semibold transition-colors",
                    accepted && !submitting
                      ? "bg-gold text-night"
                      : "bg-paper/10 text-paper/40",
                  )}
                >
                  {submitting
                    ? "Claiming…"
                    : editingAddress
                      ? "Claim my box"
                      : "Confirm and claim"}
                </button>
              </div>
            )}

            {/* Closed, and they did not claim */}
            {!claim_ && !open && (
              <p className="mt-4 font-sans text-ui text-paper/60 leading-[1.6]">
                {drop.status === "cancelled"
                  ? "This month's box was cancelled. Nothing was charged for it."
                  : "This box has closed. The next one opens at the start of the month, and we will tell you when it does."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Past boxes ─────────────────────────────────────────────── */}
      {history.length > 1 && (
        <div>
          <p className="mb-2.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/50">
            Past boxes
          </p>
          <ul className="space-y-2">
            {history
              .filter((h) => h.dropId !== drop?.id)
              .map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-paper/10 bg-paper/[0.02] px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-ui text-paper truncate">
                      {h.dropTitle}
                    </p>
                    <p className="font-sans text-caption text-paper/45">
                      {monthLabel(h.periodMonth)} · {h.status}
                    </p>
                  </div>
                  {h.tracking && (
                    <span className="shrink-0 font-sans text-caption text-paper/45">
                      Shipped
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
