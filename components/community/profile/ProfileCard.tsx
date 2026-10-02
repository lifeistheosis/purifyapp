"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ClergySeal } from "@/components/community/ClergySeal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { BadgeRow } from "@/components/community/profile/ProfileBadges";
import { SocialLinkIcon } from "@/components/community/profile/SocialLinkIcon";
import { SymbolText } from "@/components/community/SymbolText";
import { StreakChip } from "@/components/streak/StreakChip";
import { Book } from "@/components/ui/icons/Book";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { BadgeId } from "@/lib/profile/badges";
import { isBannerMotion, type Cosmetics } from "@/lib/profile/cosmetics";
import { clergyLabelKey } from "@/lib/profile/clergy";
import { nameColorClass } from "@/lib/profile/nameColor";
import { recordDate } from "@/lib/profile/dates";
import type { PublicProfile } from "@/lib/profile/publicProfile";

/**
 * The pieces of a Community profile, shared by the profile viewer, the
 * editor's live preview and the card beside the feed on a desktop.
 *
 * Laid out after Discord's: a banner, the avatar lifted off it on a ring of
 * the card's own colour, the status line in a bubble beside the avatar, the
 * name, the @handle and the badge row, then an inner panel with the reader's
 * own words.
 *
 * A Plus theme paints the whole card in its two colours, top to bottom, and
 * marks the card a dark island (app/globals.css), so on the light Parchment
 * palette its text stays light on the dark theme it chose. The colours are
 * already deepened for legibility by lib/profile/cosmetics.ts.
 */

/** The card's surface: a Plus theme's gradient, or the house card. */
export function profileSurface(c: Cosmetics): { themed: boolean; style: CSSProperties | undefined } {
  if (!c.themePrimary || !c.themeAccent) return { themed: false, style: undefined };
  return {
    themed: true,
    style: {
      background: `linear-gradient(180deg, ${c.themePrimary} 0%, color-mix(in oklab, ${c.themePrimary} 55%, ${c.themeAccent}) 34%, ${c.themeAccent} 100%)`,
      ["--profile-surface" as string]: c.themePrimary,
    },
  };
}

export function ProfileBanner({
  cosmetics,
  className,
  children,
}: {
  cosmetics: Cosmetics;
  /** Height and rounding, which differ between the sheet, the modal and the side card. */
  className?: string;
  children?: ReactNode;
}) {
  const color = cosmetics.bannerColor ?? cosmetics.themePrimary;
  return (
    <div
      className={cn("relative w-full overflow-hidden", !color && !cosmetics.bannerUrl && "bg-paper/[0.08]", className)}
      style={color ? { backgroundColor: color } : undefined}
    >
      {cosmetics.bannerUrl ? (
        // A plain img: the banner is a reader's upload on our own storage,
        // shown at the size it was cut for, and the optimizer would add a
        // second copy of every banner for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cosmetics.bannerUrl}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover", cosmetics.bannerMotion === "drift" && "banner-drift-img")}
          referrerPolicy="no-referrer"
          decoding="async"
        />
      ) : null}
      {/* An animated banner (Plus): slow light over the colour or picture,
          drawn by CSS (app/globals.css, "Animated banners"), still under
          the motion switch. */}
      {isBannerMotion(cosmetics.bannerMotion) ? (
        <span aria-hidden className={`banner-motion banner-motion-${cosmetics.bannerMotion}`} />
      ) : null}
      {children}
    </div>
  );
}

/** The status line, in a bubble that trails toward the avatar. */
function StatusBubble({ text, small }: { text: string; small: boolean }) {
  const { t } = useTranslate();
  return (
    <div className="relative min-w-0 max-w-[240px]">
      <span aria-hidden className="absolute -left-2.5 top-1 size-2 rounded-full bg-night-soft" />
      <span aria-hidden className="absolute -left-1 top-3 size-3 rounded-full bg-night-soft" />
      <p
        className={cn(
          "relative line-clamp-2 text-balance rounded-2xl border border-paper/10 bg-night-soft px-3 py-1.5 font-sans leading-snug text-paper/85 shadow-md",
          small ? "text-caption" : "text-detail",
        )}
        aria-label={t("profile.statusAria", { status: text })}
      >
        <SymbolText text={text} />
      </p>
    </div>
  );
}

/**
 * Avatar, status, name, handle and badges.
 *
 * `actions` sits at the right of the avatar row: Edit for your own profile,
 * the ⋯ menu for anyone else's.
 */
export function ProfileHeader({
  profile,
  avatarSize = 88,
  ring = 6,
  actions,
  onBadge,
  nameAs = "h2",
  afterHandle,
  celebrating = false,
  actionsInCorner = false,
}: {
  profile: Pick<PublicProfile, "name" | "handle" | "avatar" | "status" | "badges" | "cosmetics"> &
    Partial<Pick<PublicProfile, "clergy" | "streak">>;
  avatarSize?: number;
  ring?: number;
  actions?: ReactNode;
  onBadge?: (id: BadgeId) => void;
  /** The viewer's dialog is named by this heading; the side card is not a dialog. */
  nameAs?: "h2" | "p";
  /** Beside the @handle, e.g. "Follows you". */
  afterHandle?: ReactNode;
  /** A name day: the picture wears a soft gold light for the day. */
  celebrating?: boolean;
  /**
   * On a wide card the actions sit in the top-right corner of the card, as
   * on Discord's full profile, so the status line beside the picture keeps
   * its room. Needs a positioned ancestor at the top of the card body.
   */
  actionsInCorner?: boolean;
}) {
  const Name = nameAs;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3" style={{ marginTop: -Math.round(avatarSize / 2) - ring }}>
          <CommunityAvatar
            name={profile.name}
            url={profile.avatar}
            size={avatarSize}
            ring={ring}
            decoration={profile.cosmetics.decoration}
            className={celebrating ? "rounded-full shadow-[0_0_0_2px_rgb(201_162_90/0.9),0_0_28px_6px_rgb(201_162_90/0.45)]" : undefined}
          />
          {profile.status ? (
            <div style={{ marginTop: Math.round(avatarSize / 2) + ring + 6 }} className="min-w-0">
              <StatusBubble text={profile.status} small={avatarSize < 70} />
            </div>
          ) : null}
        </div>
        {actions ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 pt-3",
              actionsInCorner && "md:absolute md:right-6 md:top-1 md:pt-0",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
      <Name
        id={nameAs === "h2" ? "profile-name" : undefined}
        className="mt-3 flex flex-wrap items-center gap-x-1.5 break-words font-serif text-title-sm leading-tight text-paper"
        {...(nameAs === "p" ? { role: "heading", "aria-level": 2 } : {})}
      >
        <span className={nameColorClass(profile.cosmetics.nameColor)}>{profile.name}</span>
        {profile.clergy ? <ClergySeal mark={profile.clergy.rank ?? "clergy"} size={20} /> : null}
      </Name>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-detail text-paper/70">
        <span>@{profile.handle}</span>
        {afterHandle}
        {profile.streak ? <StreakChip days={profile.streak} /> : null}
      </p>
      {profile.badges.length > 0 ? <BadgeRow badges={profile.badges} onSelect={onBadge} className="mt-2.5" /> : null}
    </div>
  );
}

/** The inner panel: the reader's own words and what they keep close. */
export function ProfileAbout({
  profile,
  compact = false,
  onNavigate,
}: {
  profile: Pick<PublicProfile, "bio" | "patronSaint" | "favoriteVerse" | "joinedAt"> &
    Partial<Pick<PublicProfile, "parish" | "nowReading" | "clergy" | "links">>;
  compact?: boolean;
  /** Called before following a link out of the profile, so an overlay can close. */
  onNavigate?: () => void;
}) {
  const { t, locale } = useTranslate();
  const since = profile.joinedAt
    ? recordDate(profile.joinedAt, locale, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const label = "font-sans text-caption font-semibold text-paper/55";
  const link =
    "text-paper/85 underline decoration-paper/25 underline-offset-2 hover:text-paper hover:decoration-paper/60";
  const reading = profile.nowReading;
  const clergy = profile.clergy;
  // Where they serve, without saying the parish twice when the profile's own
  // parish line already says it.
  const sameParish =
    clergy?.parish && profile.parish && clergy.parish.trim().toLowerCase() === profile.parish.trim().toLowerCase();
  const clergyWhere = clergy ? [sameParish ? null : clergy.parish, clergy.jurisdiction].filter(Boolean).join(" · ") : "";
  const links = profile.links ?? [];
  return (
    <div className={cn("space-y-3 rounded-xl border border-paper/[0.08] bg-black/20", compact ? "p-3" : "p-4")}>
      {clergy ? (
        // Who they are to the Church, said once, plainly: the seal's name,
        // then where they serve when they shared it.
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0">
            <ClergySeal mark={clergy.rank ?? "clergy"} size={18} />
          </span>
          <span className="min-w-0 font-sans text-detail leading-snug">
            <span className="block font-semibold text-paper">{t(clergyLabelKey(clergy.rank ?? "clergy"))}</span>
            {clergyWhere ? <span className="block text-paper/65">{clergyWhere}</span> : null}
          </span>
        </div>
      ) : null}
      {reading ? (
        <p className="flex items-center gap-2 font-sans text-detail text-paper/80">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-paper/[0.08] text-paper/75" aria-hidden="true">
            <Book size={14} />
          </span>
          <span className="min-w-0">
            {t("profile.nowReading")}{" "}
            <Link href={reading.href} onClick={onNavigate} className={link}>
              {reading.label}
            </Link>
          </span>
        </p>
      ) : null}
      {profile.bio ? (
        <div>
          <p role="heading" aria-level={3} className={label}>
            {t("profile.aboutMe")}
          </p>
          <p className={cn("mt-1 whitespace-pre-wrap break-words font-sans text-paper/85", compact ? "line-clamp-3 text-detail" : "text-ui leading-relaxed")}>
            <SymbolText text={profile.bio} />
          </p>
        </div>
      ) : null}
      {profile.parish ? (
        <div className="min-w-0">
          <p className={label}>{t("profile.parish")}</p>
          <p className="mt-1 break-words font-sans text-detail text-paper/85">{profile.parish}</p>
        </div>
      ) : null}
      {profile.patronSaint || profile.favoriteVerse ? (
        <dl className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
          {profile.patronSaint ? (
            <div className="min-w-0">
              <dt className={label}>{t("profile.patronSaint")}</dt>
              <dd className="mt-1 truncate font-sans text-detail">
                <Link
                  href={`/saints/${profile.patronSaint.slug}`}
                  onClick={onNavigate}
                  className="text-paper/85 underline decoration-paper/25 underline-offset-2 hover:text-paper hover:decoration-paper/60"
                >
                  {profile.patronSaint.name}
                </Link>
              </dd>
            </div>
          ) : null}
          {profile.favoriteVerse ? (
            <div className="min-w-0">
              <dt className={label}>{t("profile.favoriteVerse")}</dt>
              <dd className="mt-1 truncate font-sans text-detail">
                <Link
                  href={profile.favoriteVerse.href}
                  onClick={onNavigate}
                  className="text-paper/85 underline decoration-paper/25 underline-offset-2 hover:text-paper hover:decoration-paper/60"
                >
                  {profile.favoriteVerse.label}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <div>
          <p className={label}>{t("profile.links")}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  // A reader's own link: never vouched for, never handed the
                  // page it came from.
                  rel="noopener noreferrer nofollow ugc"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1.5 font-sans text-caption text-paper/80 transition-colors hover:border-paper/35 hover:text-paper"
                >
                  <SocialLinkIcon kind={l.kind} size={14} />
                  <span className="truncate">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {since ? (
        <div>
          <p className={label}>{t("profile.memberSince")}</p>
          <p className="mt-1 font-sans text-detail text-paper/80">{since}</p>
        </div>
      ) : null}
    </div>
  );
}
