"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { ClergySeal } from "@/components/community/ClergySeal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { SocialLinkIcon } from "@/components/community/profile/SocialLinkIcon";
import { SymbolText } from "@/components/community/SymbolText";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { Share } from "@/components/ui/icons/Share";
import { apiFetch } from "@/lib/api/client";
import { getBook, localBookNames, referenceIn } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { clergyLabelKey } from "@/lib/profile/clergy";
import { isBannerMotion, normalizeHex, type Cosmetics } from "@/lib/profile/cosmetics";
import { recordDate } from "@/lib/profile/dates";
import { nameColorClass } from "@/lib/profile/nameColor";
import type { PublicProfile } from "@/lib/profile/publicProfile";
import { networkName } from "@/lib/profile/socialLinks";
import type { PictureWords } from "@/lib/share/verseCard";

// Words as a picture, loaded on the first Share: a profile carries no canvas
// for a reader who never shares (components/today/VerseCardActions.tsx).
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * The pieces of a Community profile, shared by the profile viewer, the
 * shared page, the editor's live card, the Plus page's try window and the
 * small cards beside the feed.
 *
 * Laid out as the owner picked it, r3-28 A, "fade and doors" (notes 75 and
 * 81, 2026-10-31; Homebase/boards/purify-master/variants/r3-28-profile.html):
 * a reader's page set like a saint's. At the top a soft light, where a
 * banner fades in (ProfileTop); the picture in the middle, in its frame; the
 * name in Lora; the status as one quiet line; Follow; then the doors
 * (ProfileDoors.tsx). No streak (refinement 4: a count of days kept, shown to
 * everyone, runs against "on prayer, no figures"), and no status bubble.
 *
 * Colour, his "two for normal users, one for plus users": a free profile is
 * black, white and four greys, a Plus member's the Church's colours and gold
 * (lib/profile/cosmetics.ts). This file draws what it is given, and the
 * server gives a free reader the greys alone (visibleCosmetics); nothing
 * here adds a colour of its own, the name day's light included, which is
 * white.
 *
 * A theme paints the whole card in its two colours, top to bottom; a banner,
 * a theme or an effect is light drawn over a dark card, so such a card is a
 * dark island (app/globals.css) and on the light Parchment palette keeps its
 * dark ground and light words. Every other card follows the palette.
 */

/** The card's ground: a theme's two colours, or the house card; and whether it stays dark on every palette. */
export function profileSurface(c: Cosmetics): { themed: boolean; island: boolean; style: CSSProperties | undefined } {
  const themed = Boolean(c.themePrimary && c.themeAccent);
  const island = themed || Boolean(c.bannerColor || c.bannerUrl || isBannerMotion(c.bannerMotion) || c.effect);
  if (!themed) return { themed, island, style: undefined };
  return {
    themed,
    island,
    style: {
      background: `linear-gradient(180deg, ${c.themePrimary} 0%, color-mix(in oklab, ${c.themePrimary} 55%, ${c.themeAccent}) 34%, ${c.themeAccent} 100%)`,
      ["--profile-surface" as string]: c.themePrimary,
    },
  };
}

/** The card's own ground and island classes, for its surface; its border is the caller's. */
export function surfaceClass(s: { themed: boolean; island: boolean }): string {
  return cn(s.island && "dark-island", !s.themed && "bg-night-soft");
}

/**
 * A banner as a band: its colour drawn as vestment cloth (lit from above, a
 * faint woven cross), the reader's picture over it, and an animated banner's
 * light over both. Inside ProfileTop it fades; the editor shows the moving
 * banners on small ones.
 */
export function ProfileBanner({
  cosmetics,
  className,
  bare = false,
}: {
  cosmetics: Cosmetics;
  /** Size, place and rounding. */
  className?: string;
  /** No ground of its own when there is no colour: the light behind shows. */
  bare?: boolean;
}) {
  const color = normalizeHex(cosmetics.bannerColor ?? cosmetics.themePrimary);
  return (
    <div
      className={cn("relative w-full overflow-hidden", color ? "profile-cloth" : !bare && "bg-paper/[0.08]", className)}
      style={color ? ({ "--cloth": color } as CSSProperties) : undefined}
    >
      {cosmetics.bannerUrl ? (
        // A plain img: the banner is a reader's upload on our own storage,
        // shown at the size it was cut for. It arrives whole over the
        // banner's colour, never a band at a time (build 85, note 52).
        <ArrivingImage
          src={cosmetics.bannerUrl}
          className={cn("profile-banner-picture absolute inset-0 h-full w-full object-cover", cosmetics.bannerMotion === "drift" && "banner-drift-img")}
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
    </div>
  );
}

/**
 * The top of a profile, behind the picture and the name: the soft light, or
 * the reader's banner fading in under it (app/globals.css, .profile-top).
 * The caller places it at the top of a positioned box.
 */
export function ProfileTop({ cosmetics, height }: { cosmetics: Cosmetics; height?: number }) {
  const color = normalizeHex(cosmetics.bannerColor ?? cosmetics.themePrimary);
  const banner = Boolean(color || cosmetics.bannerUrl || isBannerMotion(cosmetics.bannerMotion));
  return (
    <div
      aria-hidden
      className="profile-top"
      style={height ? ({ "--profile-top-h": `${height}px` } as CSSProperties) : undefined}
      data-profile-top={banner ? "banner" : "light"}
    >
      {!color && !cosmetics.bannerUrl ? <span className="profile-light" /> : null}
      {banner ? <ProfileBanner cosmetics={cosmetics} bare className="profile-banner profile-top-in absolute inset-0" /> : null}
    </div>
  );
}

/** The status's own quotation marks, from the reader's language ("“…”", "„…“", "« … »"). */
const MARK = "\u0001";
function quoteMarks(t: (key: string, r?: Record<string, string | number>) => string): [string, string] {
  const s = t("profile.statusLine", { status: MARK });
  const at = s.indexOf(MARK);
  return at < 0 ? ["", ""] : [s.slice(0, at), s.slice(at + MARK.length)];
}

/**
 * The picture in its frame, the name, the @handle, the status as one quiet
 * line and the actions, all down the middle.
 *
 * `actions`: Follow and the ⋯ menu for anyone else, Edit for your own.
 */
export function ProfileFace({
  profile,
  actions,
  afterHandle,
  celebrating = false,
  nameAs = "h2",
  compact = false,
}: {
  profile: Pick<PublicProfile, "name" | "handle" | "avatar" | "status" | "cosmetics"> & Partial<Pick<PublicProfile, "clergy">>;
  actions?: ReactNode;
  /** Beside the @handle, e.g. "Follows you". */
  afterHandle?: ReactNode;
  /** A name day: the picture wears a soft white light for the day. */
  celebrating?: boolean;
  /** The viewer's dialog is named by this heading; a card that is not a dialog uses a p. */
  nameAs?: "h2" | "p";
  /** The small cards: a smaller picture and name. */
  compact?: boolean;
}) {
  const { t } = useTranslate();
  const Name = nameAs;
  const [open, close] = quoteMarks(t);
  return (
    <div className="relative flex flex-col items-center text-center">
      <CommunityAvatar
        name={profile.name}
        url={profile.avatar}
        size={compact ? 64 : 100}
        ring={5}
        decoration={profile.cosmetics.decoration}
        className={celebrating ? "rounded-full shadow-[0_0_0_2px_rgb(255_255_255/0.85),0_0_28px_6px_rgb(255_255_255/0.3)]" : undefined}
      />
      <Name
        id={nameAs === "h2" ? "profile-name" : undefined}
        // The size before the leading: a later text size takes a line height
        // with it in the class merge (lib/cn.ts).
        className={cn(
          compact ? "mt-3 text-[21px]" : "mt-4 text-[27px]",
          "flex max-w-full flex-wrap items-center justify-center gap-x-1.5 break-words font-serif leading-[1.1] tracking-[-0.2px] text-paper",
        )}
        // Lora at 600, as the sheet sets it: the sitewide heading rule is 700.
        style={{ fontWeight: 600 }}
        {...(nameAs === "p" ? { role: "heading", "aria-level": 2 } : {})}
      >
        <span className={nameColorClass(profile.cosmetics.nameColor)}>{profile.name}</span>
        {profile.clergy ? <ClergySeal mark={profile.clergy.rank ?? "clergy"} size={20} /> : null}
      </Name>
      {profile.handle || afterHandle ? (
        <p className="mt-[7px] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-sans text-[13.5px] text-paper/60">
          {/* No handle, no lone @: a reader not signed in, on the Plus page's try window. */}
          {profile.handle ? <span>@{profile.handle}</span> : null}
          {afterHandle}
        </p>
      ) : null}
      {profile.status ? (
        <p
          className={cn(
            compact ? "text-detail" : "text-[15.5px]",
            "mt-[9px] max-w-[30rem] break-words px-3.5 font-serif italic leading-[1.35] text-paper/80",
          )}
        >
          <span className="sr-only">{t("profile.statusAria", { status: profile.status })}</span>
          <span aria-hidden>
            {open}
            <SymbolText text={profile.status} />
            {close}
          </span>
        </p>
      ) : null}
      {actions ? <div className="mt-4 flex items-center justify-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

/** Follow, as the sheet draws it: white, softly lit, wide. Following is the quiet outline. */
export function followClass(following: boolean): string {
  return cn(
    "inline-flex h-11 min-w-[156px] items-center justify-center rounded-pill px-6 font-sans text-ui font-semibold motion-safe:transition-colors",
    following
      ? "border border-paper/25 text-paper/85 hover:border-paper/45"
      : "bg-paper text-night shadow-[0_0_0_1px_rgb(255_255_255/0.5),0_0_22px_rgb(255_255_255/0.18)] hover:bg-paper/90",
  );
}

/** A name day or a prayer request: a small lit card under the actions, white on every profile. */
export function ProfileMoment({
  icon,
  title,
  detail,
  count,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  count: string | null;
  action: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-paper/20 bg-paper/[0.06] p-3 text-left shadow-[0_0_22px_rgb(255_255_255/0.06)]">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper/[0.1] text-paper" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-[9rem] flex-1">
        <span className="block font-sans text-detail font-semibold text-paper">{title}</span>
        {detail ? <span className="block break-words font-sans text-caption text-paper/65">{detail}</span> : null}
        {count ? <span className="block font-sans text-caption text-paper/55">{count}</span> : null}
      </span>
      {action}
    </div>
  );
}

/** A raised panel, as the sheet draws its cards: the palette's own ink, lit along the top. */
const PANEL =
  "rounded-[20px] border border-paper/[0.085] bg-gradient-to-b from-paper/[0.07] to-paper/[0.025] shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_18px_30px_-20px_rgb(0_0_0/0.95)]";
const EYEBROW = "font-sans text-eyebrow font-bold uppercase tracking-[0.11em] text-paper/52";

/** The patron saint's icon and his name day, from the library in brief; null until it is read. */
function usePatron(slug: string, locale: string): { icon: string | null; nameDay: string | null } | null {
  const [got, setGot] = useState<{ key: string; icon: string | null; nameDay: string | null } | null>(null);
  const key = `${slug} ${locale}`;
  useEffect(() => {
    let live = true;
    void import("@/lib/profile/patron").then((m) => {
      const facts = m.patronFacts(slug);
      if (live) setGot({ key, icon: facts?.icon ?? null, nameDay: facts?.feast ? m.feastLabel(facts.feast, locale) : null });
    });
    return () => {
      live = false;
    };
  }, [slug, locale, key]);
  return got && got.key === key ? got : null;
}

/**
 * The patron saint: his icon on a plate, only when its rights are settled
 * (lib/saints/iconRights.ts; any other saint stands with the cross, never a
 * stand-in face), his name, and the name day. It opens his page.
 */
export function PatronCard({ patron, onNavigate }: { patron: { slug: string; name: string }; onNavigate?: () => void }) {
  const { t, locale } = useTranslate();
  const facts = usePatron(patron.slug, locale);
  return (
    <Link
      href={`/saints/${patron.slug}`}
      onClick={onNavigate}
      prefetch={false}
      data-profile-patron={patron.slug}
      className={cn(PANEL, "press-card flex items-center gap-3.5 py-[11px] pl-[11px] pr-3 text-left")}
    >
      <span className="relative h-16 w-[52px] shrink-0 overflow-hidden rounded-xl bg-paper/[0.08] shadow-[0_0_0_1px_rgb(255_255_255/0.16),0_8px_16px_-8px_rgb(0_0_0/0.9)]">
        {facts?.icon ? (
          <ArrivingImage src={facts.icon} className="absolute inset-0 h-full w-full object-cover object-[50%_25%]" decoding="async" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-paper/55" aria-hidden>
            <Cross size={22} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(EYEBROW, "block")}>{t("profile.patronSaint")}</span>
        <span className="mt-1 block font-serif text-[17px] font-semibold leading-snug text-paper">{patron.name}</span>
        {/* Its line is kept while the name day is read, so nothing moves when it comes. */}
        <span className="mt-[3px] block min-h-[1.25em] font-sans text-[12.5px] leading-tight text-paper/55">
          {facts?.nameDay ? t("profile.patronNameDay", { date: facts.nameDay }) : null}
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-paper/40" />
    </Link>
  );
}

/** A verse's words, by its stored reference ("john/1/5"), kept for the visit. */
const VERSES = new Map<string, Promise<string | null>>();
function verseWords(ref: string): Promise<string | null> {
  const known = VERSES.get(ref);
  if (known) return known;
  const [book, chapter, verse] = ref.split("/");
  const asked = apiFetch(`/api/bible/verse?book=${encodeURIComponent(book)}&chapter=${Number(chapter)}&verse=${Number(verse)}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ verses?: { text: string }[] }>) : null))
    .then((j) => j?.verses?.map((v) => v.text).join(" ") || null)
    .catch(() => null);
  VERSES.set(ref, asked);
  // A miss is not kept: a phone that had no signal for one ask may have it for the next.
  void asked.then((text) => {
    if (text === null && VERSES.get(ref) === asked) VERSES.delete(ref);
  });
  return asked;
}

function useVerseWords(ref: string): { ref: string; text: string | null } | null {
  const [got, setGot] = useState<{ ref: string; text: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    void verseWords(ref).then((text) => {
      if (live) setGot({ ref, text });
    });
    return () => {
      live = false;
    };
  }, [ref]);
  return got && got.ref === ref ? got : null;
}

/**
 * The favourite verse as a card: the words whole, as the Bible in Purify
 * has them, with the reference and the edition; Open goes to the verse, and
 * Share makes a picture of it (components/share/PictureSheet.tsx).
 * `onPicture` hears the picture sheet open and close, so the profile under
 * it stays open while it does.
 */
export function VerseCard({
  verse,
  onNavigate,
  onPicture,
}: {
  verse: { ref: string; label: string; href: string };
  onNavigate?: () => void;
  onPicture?: (open: boolean) => void;
}) {
  const { t } = useTranslate();
  const book = verse.ref.split("/")[0];
  const words = useVerseWords(verse.ref);
  const reference = referenceIn(verse.label, book, localBookNames(t));
  // Brenton's Septuagint for the Old Testament, the King James for the rest,
  // named as the Verse of the Day names it.
  const edition = t(getBook(book)?.source === "brenton-lxx-pd" ? "reading.collection.brenton" : "reading.collection.kjv");
  const [sharing, setSharing] = useState(false);
  // Mounted on the first Share and kept, so it can close as it opened.
  const [made, setMade] = useState(false);
  // A card taken away with its picture sheet up says the sheet is down.
  const sharingNow = useRef({ sharing, onPicture });
  useEffect(() => {
    sharingNow.current = { sharing, onPicture };
  });
  useEffect(
    () => () => {
      if (sharingNow.current.sharing) sharingNow.current.onPicture?.(false);
    },
    [],
  );
  const picture = useMemo<PictureWords | null>(
    () => (words?.text ? { text: words.text, reference, note: edition } : null),
    [words, reference, edition],
  );
  const round =
    "hit-44 tap-press inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.06] text-paper/85 hover:text-paper";
  return (
    <div
      data-profile-verse={verse.ref}
      className={cn(PANEL, "relative overflow-hidden px-4 pb-[13px] pt-[15px] text-left")}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.07),rgb(255_255_255/0)_60%)]" />
      <p className={cn(EYEBROW, "relative flex items-center gap-1.5")}>
        <Cross size={13} />
        {t("profile.favoriteVerse")}
      </p>
      {words === null || words.text ? (
        words?.text ? (
          <p className="relative mt-2 font-serif text-[17.5px] leading-[1.42] tracking-[-0.05px] text-paper">{words.text}</p>
        ) : (
          // The words are on their way: two lines held for them.
          <span aria-hidden className="relative mt-3 block space-y-2.5">
            <span className="block h-3 w-full rounded-full bg-paper/[0.08]" />
            <span className="block h-3 w-2/3 rounded-full bg-paper/[0.08]" />
          </span>
        )
      ) : null}
      {/* The two round buttons 44px apart, centre to centre, so their reach never overlaps. */}
      <div className="relative mt-2.5 flex items-center gap-3">
        <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 font-sans text-[12.5px] text-paper/55">
          <span className="font-semibold text-paper/90">{reference}</span>
          <span>{edition}</span>
        </p>
        <Link href={verse.href} onClick={onNavigate} prefetch={false} aria-label={t("today.verse.openChapter")} className={round}>
          <Book size={16} />
        </Link>
        {picture ? (
          <button
            type="button"
            aria-label={t("today.verse.shareAsPicture")}
            onClick={() => {
              setMade(true);
              setSharing(true);
              onPicture?.(true);
            }}
            className={round}
          >
            <Share size={16} />
          </button>
        ) : null}
      </div>
      {made && picture ? (
        <PictureSheet
          open={sharing}
          onClose={() => {
            setSharing(false);
            onPicture?.(false);
          }}
          words={picture}
          title={t("picture.title")}
          name={reference}
          caption={`${reference}\n${edition}`}
          layer="over-player"
        />
      ) : null}
    </div>
  );
}

/**
 * The About door: the patron saint, the verse, the reader's own words, where
 * they worship and since when, what they are reading, their links; and, from
 * the viewer, the readers in common. A private profile says so and no more.
 */
export function ProfileAboutDoor({
  profile,
  onNavigate,
  onPicture,
  inCommon,
}: {
  profile: Pick<PublicProfile, "bio" | "patronSaint" | "favoriteVerse" | "joinedAt" | "private"> &
    Partial<Pick<PublicProfile, "parish" | "nowReading" | "clergy" | "links">>;
  /** Called before following a link out of the profile, so an overlay can close. */
  onNavigate?: () => void;
  onPicture?: (open: boolean) => void;
  /** The readers both follow, drawn by the viewer. */
  inCommon?: ReactNode;
}) {
  const { t, locale } = useTranslate();
  if (profile.private) {
    return (
      <p className="rounded-2xl border border-paper/[0.08] bg-paper/[0.04] p-4 font-sans text-detail text-paper/70">{t("profile.privateNotice")}</p>
    );
  }
  const since = profile.joinedAt ? recordDate(profile.joinedAt, locale, { month: "short", day: "numeric", year: "numeric" }) : null;
  const reading = profile.nowReading;
  const clergy = profile.clergy;
  // Where they serve, without saying the parish twice when the profile's own
  // parish line already says it.
  const sameParish =
    clergy?.parish && profile.parish && clergy.parish.trim().toLowerCase() === profile.parish.trim().toLowerCase();
  const clergyWhere = clergy ? [sameParish ? null : clergy.parish, clergy.jurisdiction].filter(Boolean).join(" · ") : "";
  const links = profile.links ?? [];
  const label = "font-sans text-caption font-semibold text-paper/52";
  return (
    <div className="space-y-2.5 text-left">
      {clergy ? (
        // Who they are to the Church, said once, plainly: the seal's name,
        // then where they serve when they shared it.
        <div className="flex items-start gap-2.5 px-1 pb-1">
          <span className="mt-0.5 shrink-0">
            <ClergySeal mark={clergy.rank ?? "clergy"} size={18} />
          </span>
          <span className="min-w-0 font-sans text-detail leading-snug">
            <span className="block font-semibold text-paper">{t(clergyLabelKey(clergy.rank ?? "clergy"))}</span>
            {clergyWhere ? <span className="block text-paper/65">{clergyWhere}</span> : null}
          </span>
        </div>
      ) : null}
      {profile.patronSaint ? <PatronCard patron={profile.patronSaint} onNavigate={onNavigate} /> : null}
      {profile.favoriteVerse ? <VerseCard verse={profile.favoriteVerse} onNavigate={onNavigate} onPicture={onPicture} /> : null}
      {profile.bio ? (
        <div className="px-1 pt-2">
          <p role="heading" aria-level={3} className={label}>
            {t("profile.aboutMe")}
          </p>
          <p dir="auto" className="mt-1 whitespace-pre-wrap break-words font-sans text-[15px] leading-[1.45] text-paper/86">
            <SymbolText text={profile.bio} />
          </p>
        </div>
      ) : null}
      {reading ? (
        <p className="flex items-center gap-2 px-1 pt-1 font-sans text-detail text-paper/80">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-paper/[0.08] text-paper/75" aria-hidden="true">
            <Book size={14} />
          </span>
          <span className="min-w-0">
            {t("profile.nowReading")}{" "}
            <Link
              href={reading.href}
              onClick={onNavigate}
              className="text-paper/85 underline decoration-paper/25 underline-offset-2 hover:text-paper hover:decoration-paper/60"
            >
              {reading.label}
            </Link>
          </span>
        </p>
      ) : null}
      {profile.parish || since ? (
        <dl className="grid grid-cols-2 gap-3 px-1 pt-1">
          {profile.parish ? (
            <div className="min-w-0">
              <dt className={label}>{t("profile.parish")}</dt>
              <dd className="mt-1 flex items-start gap-1.5 break-words font-sans text-detail text-paper/85">
                <Church size={15} className="mt-px shrink-0 text-paper/55" />
                <span className="min-w-0">{profile.parish}</span>
              </dd>
            </div>
          ) : null}
          {since ? (
            <div className="min-w-0">
              <dt className={label}>{t("profile.memberSince")}</dt>
              <dd className="mt-1 font-sans text-detail text-paper/85">{since}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <ul aria-label={t("profile.links")} className={cn(PANEL, "mt-1 divide-y divide-paper/[0.06] overflow-hidden")}>
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                // A reader's own link: never vouched for, never handed the
                // page it came from.
                rel="noopener noreferrer nofollow ugc"
                className="flex min-h-[46px] items-center gap-3 px-3.5 font-sans text-[14.5px] text-paper/86 hover:text-paper"
              >
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-paper/[0.07] text-paper" aria-hidden="true">
                  <SocialLinkIcon kind={l.kind} size={16} />
                </span>
                <span className="min-w-0 truncate">{l.label}</span>
                <span className="shrink-0 text-[13px] text-paper/50">{l.kind === "website" ? t("profile.linkWebsite") : networkName(l.kind)}</span>
                <ChevronRight size={15} className="ml-auto shrink-0 text-paper/35" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {inCommon}
    </div>
  );
}
