import { useId } from "react";

import { PurifyMark } from "@/components/ui/PurifyMark";
import { cn } from "@/lib/cn";

/**
 * EIKON's printed marks, as the shop's own pages for a buyer draw them
 * (r3-19, after r3-09's packaging): the black seal with its white cross, the
 * avatar EIKON (and Purify's support) wears in Messages; and the black box
 * with the white "EIKON by Purify" seal on its lid, where a shipped order
 * waits on its page. Both stay black on every palette, as the printed things
 * do (app/globals.css, .eikon-seal and .eikon-box). Decoration beside their
 * own words, so a screen reader hears nothing of them.
 */
export function EikonSeal({ size, className }: { size: number; className?: string }) {
  return (
    <span aria-hidden className={cn("eikon-seal", className)} style={{ width: size, height: size }}>
      <PurifyMark size={Math.round(size * 0.46)} />
    </span>
  );
}

/** A seller's initial in a ring, for a store that is not EIKON. */
function Initial({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-night-deep font-heading font-semibold text-paper/70 ring-1 ring-inset ring-paper/30"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}

/** Who a thread is with: EIKON's seal (Purify's on a support ticket), or the seller's initial. */
export function StoreAvatar({ name, seal, size }: { name: string; seal: boolean; size: number }) {
  return seal ? <EikonSeal size={size} /> : <Initial name={name} size={size} />;
}

/** The words printed on the seal, the brand's own, the same in every language. */
const SEAL_NAME = "EIKON";
const SEAL_BY = "by Purify";

/** The white seal on the box's lid: the cross, EIKON, and "by Purify" under a rule. */
function LidSeal({ size }: { size: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden className="drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.4)]">
      <defs>
        <radialGradient id={`lid-${id}`} cx="34%" cy="26%" r="85%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".6" stopColor="#f4f4f2" />
          <stop offset="1" stopColor="#e5e5e2" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill={`url(#lid-${id})`} />
      {/* PurifyMark's four bars (components/ui/PurifyMark.tsx), 36 units tall. */}
      <g transform="translate(89.8 40) scale(0.2045)" fill="#121214">
        <rect x="41" y="2" width="18" height="172" rx="1" />
        <rect x="22" y="20" width="56" height="15" rx="1" />
        <rect x="0" y="55" width="100" height="16" rx="1" />
        <rect x="22" y="131" width="56" height="15" rx="1" transform="rotate(18 50 138)" />
      </g>
      <text x="101.3" y="123" textAnchor="middle" fontWeight="700" fontSize="33" letterSpacing="2.6" fill="#121214" style={{ fontFamily: "var(--font-heading)" }}>
        {SEAL_NAME}
      </text>
      <rect x="81" y="135.5" width="38" height="1.1" fill="#121214" opacity=".45" />
      <text x="100" y="156" textAnchor="middle" fontStyle="italic" fontSize="13" fill="#3b3b40" style={{ fontFamily: "var(--font-heading)" }}>
        {SEAL_BY}
      </text>
    </svg>
  );
}

/** EIKON's box, closed, `width` px wide, its seal on the lid's front edge. */
export function EikonBox({ width }: { width: number }) {
  const lid = Math.round(width * 0.62);
  const seal = Math.round(width * 0.34);
  return (
    <span aria-hidden className="eikon-box block" style={{ width, height: lid + 8 }}>
      <span className="eikon-box-lid block" style={{ height: lid }} />
      <span className="eikon-box-edge block" />
      <span className="absolute block" style={{ insetInlineStart: Math.round(width / 2 - seal / 2), top: Math.round(lid - width * 0.26) }}>
        <LidSeal size={seal} />
      </span>
    </span>
  );
}
