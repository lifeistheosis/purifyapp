"use client";

import { trackingLink } from "@/lib/shop/trackingLink";
import { CLAIM_STEPS, claimStepIndex, memberClaimStep } from "@/lib/eikonBox/status";
import type { ClaimStatus, DropStatus } from "@/lib/eikonBox/types";
import { cn } from "@/lib/cn";

/**
 * The step bar and tracking button for a claimed box.
 *
 * A sibling of components/shop/OrderProgress rather than a reuse of it: that
 * component computes a dispatch estimate from DispatchWindow items a drop
 * does not have, and all of its copy hangs off shop.* i18n keys. The carrier
 * inference IS shared, because trackingLink() is a pure function over a
 * tracking number and there is no second way to do that job.
 */
export function DropProgress({
  claimStatus,
  dropStatus,
  claimedAt,
  tracking,
  claimsCloseAt,
}: {
  claimStatus: ClaimStatus;
  dropStatus: DropStatus;
  claimedAt: string;
  tracking: string | null;
  claimsCloseAt: string | null;
}) {
  if (claimStatus === "cancelled") {
    return (
      <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-4">
        <span className="inline-flex items-center rounded-pill border border-paper/20 bg-paper/[0.06] px-2.5 py-1 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/60">
          Cancelled
        </span>
        <p className="mt-2.5 font-sans text-caption text-paper/55 leading-[1.55]">
          This box was cancelled. Nothing was charged for it.
        </p>
      </div>
    );
  }

  const step = memberClaimStep({ status: claimStatus }, { status: dropStatus });
  const reached = claimStepIndex(step);
  const link = tracking ? trackingLink(tracking) : null;

  const gathering =
    step === "Being gathered" && claimsCloseAt
      ? `We gather the boxes after claims close on ${new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(claimsCloseAt))}.`
      : null;

  return (
    <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-4">
      <ol className="flex items-center gap-1.5">
        {CLAIM_STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <span
              aria-hidden
              className={cn(
                "block h-1 rounded-full transition-colors",
                i <= reached ? "bg-gold" : "bg-paper/12",
              )}
            />
            <span
              className={cn(
                "mt-1.5 block font-sans text-[10px] uppercase tracking-[0.6px] leading-tight",
                i === reached ? "text-paper" : "text-paper/40",
              )}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3.5 font-sans text-caption text-paper/55 leading-[1.55]">
        Claimed{" "}
        {new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(claimedAt))}
        {gathering ? `. ${gathering}` : "."}
      </p>

      {tracking && (
        <div className="mt-3.5 border-t border-paper/10 pt-3.5">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
            Tracking
          </p>
          <p className="mt-1 font-sans text-ui text-paper break-all">
            {tracking}
            {link?.carrier && (
              <span className="ml-2 text-paper/50">({link.carrier})</span>
            )}
          </p>
          {link && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center rounded-pill border border-gold/45 bg-gold/12 px-3.5 py-2 font-sans text-detail font-semibold text-gold-pale"
            >
              Track your parcel ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
