/**
 * Verified-buyer badge shown on every review. Each review comes from a real
 * purchaser (the submit RPCs require a delivered order), so the badge is always
 * truthful. `bought` names what they purchased: the product title for a product
 * review, or the store name ("EIKON") for a store-level review.
 */
export function VerifiedBuyerBadge({ bought }: { bought?: string | null }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1 rounded-pill border border-emerald-400/30 bg-emerald-400/[0.08] px-2 py-0.5 font-sans text-caption font-semibold text-emerald-300">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13.5 4.5 6 12 2.5 8.5" />
        </svg>
        Verified buyer
      </span>
      {bought ? (
        <span className="font-sans text-caption text-paper/50">
          Bought {bought}
        </span>
      ) : null}
    </span>
  );
}
