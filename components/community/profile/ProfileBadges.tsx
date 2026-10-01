"use client";

import type { ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Octogram } from "@/components/ui/icons/Octogram";
import { Quill } from "@/components/ui/icons/Quill";
import { Search } from "@/components/ui/icons/Search";
import { Shield } from "@/components/ui/icons/Shield";
import { Sun } from "@/components/ui/icons/Sun";
import { PurifyMark } from "@/components/ui/PurifyMark";
import type { BadgeId, EarnedBadge } from "@/lib/profile/badges";
import { cn } from "@/lib/cn";

/**
 * Profile badges, after Discord's: a row of small marks under the name, and
 * the same marks with their meaning on the profile's Badges tab.
 *
 * Every glyph is drawn in the app's own line set (components/ui/icons), so
 * no badge is an emoji or a typed symbol. Each has one colour from the
 * palette tokens, which Parchment re-inks, so the row reads on every
 * palette without a variant per theme.
 *
 * Plus and Pro reuse the supporter mark's cross (SupporterMark.tsx): the
 * same reader should not carry two different crosses for one subscription.
 */

const TONE: Record<BadgeId, string> = {
  team: "var(--color-premium-ink)",
  moderator: "var(--color-sage-soft)",
  verified: "var(--color-gold)",
  pro: "var(--color-crimson-soft)",
  plus: "var(--color-premium-ink)",
  early_reader: "var(--color-premium-soft)",
  beta_tester: "var(--color-link-soft)",
  bug_hunter: "var(--color-comment-hover)",
  ambassador: "var(--color-premium-bright)",
  translator: "var(--color-sage-soft)",
  contributor: "var(--color-paper)",
};

/** Two speech bubbles, one behind the other: a word carried across. */
function Bubbles({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 5.5h9a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M17.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5h-3.5a1.5 1.5 0 0 1-1.5-1.5v-.5" />
    </svg>
  );
}

/** A flask with a level in it: tried before anyone else. */
function Flask({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M9.5 3.5h5" />
      <path d="M10.5 3.5v5.2L5.2 18a1.7 1.7 0 0 0 1.5 2.5h10.6a1.7 1.7 0 0 0 1.5-2.5l-5.3-9.3V3.5" />
      <path d="M7.6 14.5h8.8" />
    </svg>
  );
}

/** The verified seal, filled, as it stands beside a name in the feed. */
function Seal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 1.6l2.3 2.1 3.1-.4 1.2 2.9 2.9 1.2-.4 3.1L23.2 14l-2.1 2.3.4 3.1-2.9 1.2-1.2 2.9-3.1-.4L12 25.2 9.7 23.1l-3.1.4-1.2-2.9-2.9-1.2.4-3.1L.8 14l2.1-2.3-.4-3.1 2.9-1.2 1.2-2.9 3.1.4z"
        transform="translate(0 -1.6)"
      />
      <path d="M8.2 12.4l2.6 2.6 5-5.2" fill="none" stroke="var(--color-night, #14121a)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The supporter cross: plain gold for Plus, in a red ring for Pro. */
function Cross({ size, pro }: { size: number; pro: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {pro ? <circle cx="12" cy="12" r="10.75" fill="none" stroke="var(--color-crimson)" strokeWidth="1.5" /> : null}
      <path
        d={pro ? "M12 6.2v11.6M8.4 9.6h7.2" : "M12 3.6v16.8M6.8 8.6h10.4"}
        fill="none"
        stroke="var(--color-festal)"
        strokeWidth={pro ? 2.2 : 2.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BadgeGlyph({ id, size = 16 }: { id: BadgeId; size?: number }): ReactNode {
  switch (id) {
    case "team":
      return <PurifyMark size={size} />;
    case "moderator":
      return <Shield size={size} />;
    case "verified":
      return <Seal size={size} />;
    case "pro":
      return <Cross size={size} pro />;
    case "plus":
      return <Cross size={size} pro={false} />;
    case "early_reader":
      return <Sun size={size} />;
    case "beta_tester":
      return <Flask size={size} />;
    case "bug_hunter":
      return <Search size={size} />;
    case "ambassador":
      return <Octogram size={size} />;
    case "translator":
      return <Bubbles size={size} />;
    case "contributor":
      return <Quill size={size} />;
  }
}

export function badgeTone(id: BadgeId): string {
  return TONE[id];
}

/**
 * The row under a name. Each mark is a button that opens the Badges tab, so
 * a phone, which has no hover, still has a way to learn what a mark means;
 * a mouse also gets the name in a tooltip (the supporter mark's, same rules).
 */
export function BadgeRow({
  badges,
  onSelect,
  className,
}: {
  badges: EarnedBadge[];
  onSelect?: (id: BadgeId) => void;
  className?: string;
}) {
  const { t } = useTranslate();
  if (badges.length === 0) return null;
  return (
    <ul
      aria-label={t("profile.badgesLabel")}
      className={cn("inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-paper/10 bg-black/20 p-0.5", className)}
    >
      {badges.map((b) => {
        const label = t(`profile.badge.${b.id}`);
        const glyph = (
          <span className="inline-flex size-6 items-center justify-center" style={{ color: TONE[b.id] }}>
            <BadgeGlyph id={b.id} size={15} />
          </span>
        );
        return (
          <li key={b.id} className="supporter-mark-wrap relative inline-flex">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-label={label}
                className="tap-press rounded-md transition-colors hover:bg-paper/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-paper/40"
              >
                {glyph}
              </button>
            ) : (
              <span role="img" aria-label={label}>
                {glyph}
              </span>
            )}
            <span
              aria-hidden="true"
              className="supporter-tip absolute left-1/2 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-paper/15 bg-night-soft px-2.5 py-1 font-sans text-eyebrow font-medium text-paper shadow-lg"
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The Badges tab: every badge with what it means and since when. */
export function BadgeList({ badges, highlight }: { badges: EarnedBadge[]; highlight?: BadgeId | null }) {
  const { t, locale } = useTranslate();
  if (badges.length === 0) {
    return <p className="py-6 text-center font-sans text-detail text-paper/50">{t("profile.noBadges")}</p>;
  }
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {badges.map((b) => (
        <li
          key={b.id}
          id={`badge-${b.id}`}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 transition-colors",
            highlight === b.id ? "border-paper/30 bg-paper/[0.07]" : "border-paper/10 bg-paper/[0.03]",
          )}
        >
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/25"
            style={{ color: TONE[b.id] }}
          >
            <BadgeGlyph id={b.id} size={18} />
          </span>
          <span className="min-w-0">
            <span className="block font-sans text-ui font-semibold text-paper">{t(`profile.badge.${b.id}`)}</span>
            <span className="block font-sans text-detail leading-snug text-paper/60">
              {t(`profile.badgeAbout.${b.id}`)}
            </span>
            {b.since ? (
              <span className="mt-1 block font-sans text-caption text-paper/40">
                {t("profile.badgeSince", { date: fmt.format(new Date(b.since)) })}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
