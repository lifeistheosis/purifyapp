import Link from "next/link";

/**
 * Shown in place of a Plus feature when the signed-in user is not
 * entitled to the feature layer. In the dark-launch builds
 * (ENTITLEMENTS_ENFORCED = false) this never renders, because every
 * caller derives plusFeatures = true; it lights up only at v10.
 *
 * Quiet, in the prayer-book register: no countdown, no hard sell. It
 * names the feature, names Purify Plus, and links to pricing.
 */
export function PlusGate({
  feature,
  blurb,
}: {
  feature: string;
  blurb: string;
}) {
  return (
    <div className="mt-10 rounded-lg border border-gold/30 bg-gold/[0.04] p-6 md:p-8">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-3">
        Purify Plus
      </p>
      <h2 className="font-sans text-title-sm font-bold text-paper leading-tight">
        {feature}
      </h2>
      <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
        {blurb}
      </p>
      <p className="mt-5">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
        >
          See Purify Plus
        </Link>
      </p>
      <p className="mt-4 font-sans text-caption text-paper/50 leading-[1.55]">
        Everything you have already gathered stays on this device, free,
        whether or not you subscribe.
      </p>
    </div>
  );
}
