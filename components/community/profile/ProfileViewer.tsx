"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ProfileCampaigns } from "@/components/campaigns/ProfileCampaigns";
import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { MedalCase } from "@/components/community/profile/ProfileBadges";
import {
  ProfileAboutDoor,
  ProfileFace,
  ProfileMoment,
  ProfileTop,
  followClass,
  profileSurface,
  surfaceClass,
} from "@/components/community/profile/ProfileCard";
import { ProfileDoors } from "@/components/community/profile/ProfileDoors";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { SymbolText } from "@/components/community/SymbolText";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Close } from "@/components/ui/icons/Close";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { blockCommunityAuthor, muteCommunityAuthor, unmuteCommunityAuthor } from "@/lib/community/client";
import { POST_KIND_KEYS, timeAgo } from "@/lib/community/types";
import { useIsNative } from "@/lib/platform/native";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { cachedProfile, loadProfile, patchCachedProfile } from "@/lib/profile/cache";
import {
  fetchRelation,
  greetNameDay,
  reportProfile,
  setFollow,
  startGiftCheckout,
} from "@/lib/profile/client";
import { useProfileCampaigns } from "@/lib/campaigns/useProfileCampaigns";
import { profileDoors } from "@/lib/profile/doors";
import type { ProfileRelation, ProfileSeed, PublicProfile } from "@/lib/profile/publicProfile";
import { SITE_URL } from "@/lib/site";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { copyText as putOnClipboard } from "@/lib/ui/copyText";

/**
 * A reader's profile, opened from their name or picture in Community.
 *
 * Laid out as the owner picked it, r3-28 A, "fade and doors" (notes 75 and
 * 81, 2026-10-31): a reader's page set like a saint's. A soft light at the
 * top, where a Plus member's banner fades in; the picture in the middle in
 * its frame; the name in Lora; the status as one quiet line; Follow and the
 * ⋯ menu (Edit on your own); a name day or a prayer request when there is
 * one; then the doors, About, Badges and Posts (Campaigns in 1.9), each
 * opening what is below it (components/community/profile/ProfileDoors.tsx).
 * The readers you both follow are at the foot of About. No streak: it lives
 * on Today and You (refinement 4).
 *
 * One card, two shapes, like every pop-up in Purify (lib/ui/useDraggableSheet):
 * on a phone a sheet that follows the finger and closes on a flick down; above
 * `md` a centred card. Either way the backdrop dims and blurs in step with
 * the card.
 *
 * Read by @handle from /api/community/profile, which serves a fixed
 * projection: nothing here can learn an auth id or an email. How the viewer
 * stands with the profile (following, greeted) is a second, private
 * read, /api/community/relation.
 *
 * FAST TO OPEN. The request starts when a finger touches the name
 * (lib/profile/cache.ts), the card opens at once with what the feed already
 * knew (the seed: name, picture, frame), and the profile effect waits until
 * the card has finished sliding in, so the slide is never sharing its frames
 * with a burst of new layers.
 */

type Loaded =
  | { state: "loading" }
  | { state: "ok"; profile: PublicProfile }
  | { state: "missing" | "unavailable" | "error" };

const NO_COSMETICS = {
  bannerColor: null,
  bannerUrl: null,
  themePrimary: null,
  themeAccent: null,
  decoration: null,
  effect: null,
  nameColor: null,
  bannerMotion: null,
};

/** What the card shows while the profile loads: the seed from the feed. */
function seedProfile(seed: ProfileSeed): PublicProfile {
  return {
    handle: seed.handle,
    name: seed.name,
    avatar: seed.avatar,
    verified: Boolean(seed.verified),
    tier: seed.tier ?? null,
    joinedAt: null,
    bio: null,
    status: null,
    patronSaint: null,
    favoriteVerse: null,
    cosmetics: { ...NO_COSMETICS, decoration: seed.decoration ?? null, nameColor: seed.nameColor ?? null },
    badges: [],
    posts: [],
    parish: null,
    private: false,
    postsHidden: false,
    nameDay: null,
    nowReading: null,
    // The seal is known from the feed, so it is there from the first frame.
    clergy: seed.clergy ? { rank: seed.clergy === "clergy" ? null : seed.clergy, jurisdiction: null, parish: null } : null,
    links: [],
  };
}

export function ProfileViewer({
  handle,
  seed,
  onClose,
  myHandle,
  signedIn,
  feedPostIds,
  onOpenPost,
  onOpenProfile,
  onBlocked,
}: {
  /** The @handle to show, or null when closed. */
  handle: string | null;
  /** What the feed already knows of this reader, to draw before the profile loads. */
  seed?: ProfileSeed | null;
  onClose: () => void;
  /** The signed-in reader's own handle, to offer Edit instead of the menu. */
  myHandle: string | null;
  signedIn: boolean;
  /** Posts on screen in the feed, which a profile's post can scroll to. */
  feedPostIds?: Set<string>;
  onOpenPost?: (postId: string) => void;
  /** Open another profile in this card (a mutual follow). */
  onOpenProfile?: (handle: string, seed?: ProfileSeed) => void;
  /** After a block, so the feed can drop that reader's posts. */
  onBlocked?: () => void;
}) {
  const { t, tn } = useTranslate();
  const reduced = useReducedMotion();
  const native = useIsNative();
  const open = handle !== null;
  // The last handle stays drawn while the card slides away.
  const [shown, setShown] = useState<string | null>(handle);
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [relation, setRelation] = useState<ProfileRelation | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [effectReady, setEffectReady] = useState(false);
  const [busy, setBusy] = useState<"follow" | "greet" | "gift" | null>(null);
  // The verse's picture sheet stands over the card (VerseCard): while it is
  // up, Escape and the Android back button are its, not the card's.
  const [picturing, setPicturing] = useState(false);
  // When it last went down: one press of back is heard by every listener, the
  // sheet's and the card's, in whichever order they were added.
  const picture = useRef({ up: false, downAt: 0 });
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({ open, onClose, reduced, half: 1 });

  // The Campaigns door (1.9; lib/campaigns/useProfileCampaigns.ts): this
  // reader's campaigns as anyone may see them, asked for once the profile
  // itself has come and never for a private one. Empty while campaigns are
  // closed, so the door is drawn only where something stands behind it.
  const campaigns = useProfileCampaigns(open && loaded.state === "ok" && !loaded.profile.private ? loaded.profile.handle : null);

  // Each opening starts on the first door with nothing left over from the
  // last one (the doors are keyed by the handle). Done while rendering, not
  // in an effect, so the first frame of the card is already the right profile.
  const [openedFor, setOpenedFor] = useState<string | null>(handle);
  if (handle !== openedFor) {
    setOpenedFor(handle);
    if (handle !== null) {
      setShown(handle);
      setNotice(null);
      setPicturing(false);
      setReported(false);
      setRelation(null);
      setEffectReady(false);
      const cached = cachedProfile(handle);
      setLoaded(cached ? { state: "ok", profile: cached } : { state: "loading" });
    }
  }

  useEffect(() => {
    if (!open || !shown) return;
    let alive = true;
    void (async () => {
      const res = await loadProfile(shown, { fresh: version > 0 });
      if (!alive) return;
      if (res.ok) {
        setLoaded({ state: "ok", profile: res.profile });
      } else {
        setLoaded((prev) =>
          // A failed refresh keeps a profile already on screen.
          prev.state === "ok"
            ? prev
            : {
                state:
                  res.status === 404 ? (/not open/i.test(res.error) ? "unavailable" : "missing") : "error",
              },
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, shown, version]);

  // How the viewer stands with this reader. Signed in only, after the card
  // is up: it never holds the profile back.
  useEffect(() => {
    if (!open || !shown || !signedIn) return;
    let alive = true;
    void (async () => {
      const res = await fetchRelation(shown);
      if (alive && res.ok) setRelation(res.relation);
    })();
    return () => {
      alive = false;
    };
  }, [open, shown, signedIn]);

  // The effect joins once the card has finished arriving.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setEffectReady(true), reduced ? 0 : 460);
    return () => window.clearTimeout(timer);
  }, [open, shown, reduced]);

  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [mounted]);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    // An open ⋯ menu answers Escape itself and stops it there, and an open
    // picture sheet closes itself.
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || confirmingBlock || picturing) return;
      e.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, confirmingBlock, picturing, onClose]);

  useAndroidBack(mounted, () => {
    if (!picture.current.up && Date.now() - picture.current.downAt > 400) onClose();
  });

  function onPicture(up: boolean) {
    picture.current = { up, downAt: up ? 0 : Date.now() };
    setPicturing(up);
  }

  /** Change the profile on screen and in the cache together. */
  function patchProfile(patch: Partial<PublicProfile>) {
    if (!shown) return;
    patchCachedProfile(shown, patch);
    setLoaded((prev) => (prev.state === "ok" ? { state: "ok", profile: { ...prev.profile, ...patch } } : prev));
  }

  async function copyLink() {
    if (!shown) return;
    try {
      if (!(await putOnClipboard(`${SITE_URL}/u/${shown}`))) throw new Error("the clipboard refused");
      setNotice(t("profile.linkCopied"));
    } catch {
      setNotice(t("profile.linkCopyFailed"));
    }
  }

  async function report() {
    if (!shown || reported) return;
    setReported(true);
    const res = await reportProfile(shown, null);
    if (res.ok) setNotice(t("profile.reportedNotice"));
    else {
      setReported(false);
      setNotice(t("community.reportFailed"));
    }
  }

  async function block() {
    setConfirmingBlock(false);
    if (!shown) return;
    const res = await blockCommunityAuthor({ profileHandle: shown });
    if (res.ok) {
      onBlocked?.();
      onClose();
    } else {
      setNotice(res.error ?? t("community.blockFailed"));
    }
  }

  /**
   * Mute or unmute. Quieter than a block and as easily undone, so it asks
   * nothing first: their posts leave the feed, their replies fold away.
   */
  async function toggleMute() {
    if (!shown || !relation) return;
    const next = !relation.muted;
    setRelation({ ...relation, muted: next });
    const res = next ? await muteCommunityAuthor({ profileHandle: shown }) : await unmuteCommunityAuthor({ profileHandle: shown });
    if (res.ok) {
      setNotice(next ? t("profile.mutedNotice") : t("profile.unmutedNotice"));
      onBlocked?.();
    } else {
      setRelation((r) => (r ? { ...r, muted: !next } : r));
      setNotice(res.error ?? t("community.muteFailed"));
    }
  }

  async function toggleFollow() {
    if (!shown || !relation || busy) return;
    const next = !relation.following;
    // On screen at once; put back if the server says no.
    setRelation({ ...relation, following: next });
    setBusy("follow");
    const res = await setFollow(shown, next);
    setBusy(null);
    if (!res.ok) {
      setRelation((r) => (r ? { ...r, following: !next } : r));
      setNotice(t("profile.followFailed"));
    }
  }

  async function greet() {
    if (!shown || !relation || busy || relation.greeted) return;
    setRelation({ ...relation, greeted: true });
    setBusy("greet");
    const res = await greetNameDay(shown);
    setBusy(null);
    if (res.ok) {
      const day = loaded.state === "ok" ? loaded.profile.nameDay : null;
      if (day) patchProfile({ nameDay: { ...day, greetings: res.count } });
    } else {
      setRelation((r) => (r ? { ...r, greeted: false } : r));
      setNotice(t("profile.greetFailed"));
    }
  }

  async function gift() {
    if (!shown || busy) return;
    setBusy("gift");
    const res = await startGiftCheckout(shown);
    if (res.ok) {
      window.location.assign(res.url);
      return;
    }
    setBusy(null);
    setNotice(t("profile.giftFailed"));
  }

  if (!mounted || typeof document === "undefined") return null;

  const profile =
    loaded.state === "ok"
      ? loaded.profile
      : loaded.state === "loading" && seed && seed.handle === shown
        ? seedProfile(seed)
        : null;
  const ready = loaded.state === "ok";
  const cosmetics = profile?.cosmetics ?? NO_COSMETICS;
  const surface = profileSurface(cosmetics);
  const mine = Boolean(profile && myHandle && profile.handle === myHandle);

  const menuItems: ActionMenuItem[] = [{ label: t("profile.copyLink"), onSelect: () => void copyLink() }];
  // Gift Plus: website only, because the app stores require their own billing
  // for anything digital, and only once the owner has switched it on.
  if (relation?.canGift && !native) {
    menuItems.unshift({ label: t("profile.giftPlus"), onSelect: () => void gift(), disabled: busy === "gift" });
  }
  if (signedIn) {
    menuItems.push({ label: reported ? t("community.reported") : t("profile.report"), onSelect: () => void report(), disabled: reported });
    if (relation && !relation.mine) {
      menuItems.push({ label: relation.muted ? t("community.unmute") : t("community.mute"), onSelect: () => void toggleMute() });
    }
    menuItems.push({ label: t("community.block"), onSelect: () => setConfirmingBlock(true), danger: true });
  }

  const actions = profile ? (
    mine ? (
      <Link href="/account/profile/edit" onClick={onClose} className={followClass(false)}>
        {t("profile.edit")}
      </Link>
    ) : (
      <>
        {relation && !relation.mine ? (
          <button type="button" onClick={() => void toggleFollow()} aria-pressed={relation.following} className={followClass(relation.following)}>
            {relation.following ? t("profile.following") : t("profile.follow")}
          </button>
        ) : null}
        <ActionMenu size="lg" label={t("profile.moreActions")} items={menuItems} />
      </>
    )
  ) : null;

  const posts = profile?.posts ?? [];
  const mutuals = relation?.mutuals ?? [];
  const doors = profile && ready ? profileDoors(profile, { inCommon: mutuals.length, campaigns: campaigns.length > 0 }) : [];

  const postList =
    posts.length === 0 ? (
      <p className="py-6 text-center font-sans text-detail text-paper/50">{t("profile.noPosts")}</p>
    ) : (
      <ul className="space-y-2">
        {posts.map((p) => {
          const inFeed = Boolean(onOpenPost && feedPostIds?.has(p.id));
          const body = (
            <>
              <p className="font-sans text-caption text-paper/50">
                {t(POST_KIND_KEYS[p.kind])} · {timeAgo(p.createdAt)}
              </p>
              {p.title ? (
                <p dir="auto" className="mt-1 font-serif text-[16px] font-semibold leading-snug text-paper">
                  <SymbolText text={p.title} />
                </p>
              ) : null}
              {p.excerpt ? (
                <p className="mt-1 line-clamp-3 font-sans text-detail leading-relaxed text-paper/75">
                  <SymbolText text={p.excerpt} />
                </p>
              ) : null}
              {p.quoteSource ? <p className="mt-1 font-sans text-caption text-paper/50">{p.quoteSource}</p> : null}
              <p className="mt-2 font-sans text-caption text-paper/45">
                {tn("profile.likeCount", p.likes)} · {tn("community.replyCount", p.replies)}
              </p>
            </>
          );
          const card =
            "block w-full rounded-[20px] border border-paper/[0.085] bg-gradient-to-b from-paper/[0.07] to-paper/[0.025] px-[15px] py-[13px] text-start";
          return (
            <li key={p.id}>
              {inFeed ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPost?.(p.id);
                  }}
                  className={cn(card, "press-card hover:border-paper/25")}
                >
                  {body}
                </button>
              ) : (
                <div className={card}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    );

  // The readers you both follow, at the foot of About.
  const inCommon =
    mutuals.length > 0 ? (
      <section aria-labelledby="profile-common" className="pt-3">
        <p id="profile-common" role="heading" aria-level={3} className="px-1 font-sans text-caption font-semibold text-paper/52">
          {t("profile.tabCommon")}
        </p>
        <p className="mt-0.5 px-1 font-sans text-caption text-paper/45">{t("profile.commonHint")}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {mutuals.map((m) => (
            <li key={m.handle}>
              <button
                type="button"
                onClick={() => onOpenProfile?.(m.handle, { handle: m.handle, name: m.name, avatar: m.avatar })}
                className="press-card flex w-full items-center gap-3 rounded-2xl border border-paper/10 bg-paper/[0.04] p-2.5 text-start hover:border-paper/25"
              >
                <CommunityAvatar name={m.name} url={m.avatar} size={36} />
                <span className="min-w-0">
                  <span className="block truncate font-sans text-ui font-semibold text-paper">{m.name}</span>
                  <span className="block truncate font-sans text-caption text-paper/55">@{m.handle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={profile ? "profile-name" : undefined}
      aria-label={profile ? undefined : t("profile.title")}
      className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6"
    >
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-night/72"
        style={{ opacity: 0 }}
      />
      <div
        ref={panelRef}
        data-profile-card
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t shadow-2xl will-change-transform md:max-h-[86vh] md:max-w-[600px] md:rounded-2xl md:border",
          surfaceClass(surface),
          surface.themed ? "border-white/10" : "border-paper/15",
        )}
        style={{ ...surface.style, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {effectReady && ready ? <ProfileEffect effect={cosmetics.effect} quiet /> : null}

        {/* The grab strip over the top edge: on a phone the card drags from
            here both ways, and from its body when scrolled up. */}
        <div className="absolute inset-x-0 top-0 z-20 h-8 cursor-grab touch-none select-none active:cursor-grabbing md:hidden" {...grab}>
          <div className="flex justify-center pt-2.5">
            {/* Over the banner's picture: a dark island, white on every palette, by the palette's own tokens. */}
            <span aria-hidden className="dark-island block h-1.5 w-11 rounded-full bg-paper/55 shadow-sm" />
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          // Over the banner's picture, at the end of the line: a dark island, so the
          // palette's night and paper are dark and white on Light too.
          className="dark-island hit-44 absolute end-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-pill bg-night/45 text-paper hover:bg-night/60"
        >
          <Close size={15} />
        </button>

        <div ref={bodyRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
          {/* The soft light, or the banner fading in once the profile is
              read (the seed from the feed knows no banner). */}
          <ProfileTop cosmetics={ready ? cosmetics : NO_COSMETICS} />

          {profile ? (
            <div className="relative mx-auto w-full max-w-[560px] px-4 pb-8 pt-[50px] md:px-6">
              <ProfileFace
                profile={profile}
                actions={actions}
                celebrating={Boolean(profile.nameDay)}
                afterHandle={
                  relation?.followsYou ? (
                    <span className="rounded-md bg-paper/[0.09] px-1.5 py-0.5 font-sans text-caption font-semibold text-paper/72">
                      {t("profile.followsYou")}
                    </span>
                  ) : null
                }
              />
              {notice ? (
                <p role="status" className="mt-3 text-center font-sans text-detail text-paper/75">
                  {notice}
                </p>
              ) : null}

              {profile.nameDay ? (
                <ProfileMoment
                  icon={<HaloedHead size={18} />}
                  title={t("profile.nameDayToday")}
                  detail={profile.nameDay.saint}
                  count={profile.nameDay.greetings > 0 ? tn("profile.greetingCount", profile.nameDay.greetings) : null}
                  action={
                    relation && !relation.mine ? (
                      <MomentButton done={relation.greeted} onClick={() => void greet()}>
                        {relation.greeted ? t("profile.greeted") : t("profile.greet")}
                      </MomentButton>
                    ) : null
                  }
                />
              ) : null}

              {!ready ? (
                <div className="mt-6" aria-busy aria-label={t("profile.loading")}>
                  <SkeletonList rows={2} />
                </div>
              ) : (
                <ProfileDoors
                  key={profile.handle}
                  doors={doors}
                  label={t("profile.sections")}
                  panels={{
                    about: <ProfileAboutDoor profile={profile} onNavigate={onClose} onPicture={onPicture} inCommon={inCommon} />,
                    badges: <MedalCase badges={profile.badges} />,
                    posts: postList,
                    campaigns: campaigns.length > 0 ? <ProfileCampaigns campaigns={campaigns} onOpen={onClose} /> : undefined,
                  }}
                />
              )}
            </div>
          ) : (
            <div className="relative px-4 pb-10 pt-16 md:px-6">
              {loaded.state === "loading" ? (
                <div aria-busy aria-label={t("profile.loading")}>
                  <SkeletonList rows={3} />
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="font-serif text-lede text-paper/85">
                    {loaded.state === "unavailable"
                      ? t("profile.notOpenYet")
                      : loaded.state === "missing"
                        ? t("profile.missing")
                        : t("profile.loadFailed")}
                  </p>
                  {loaded.state === "error" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLoaded({ state: "loading" });
                        setVersion((v) => v + 1);
                      }}
                      className="mt-4 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night"
                    >
                      {t("community.tryAgain")}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingBlock}
        title={t("community.blockConfirmTitle", { name: profile?.name ?? "" })}
        description={t("community.blockConfirmBody")}
        confirmLabel={t("community.block")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={() => void block()}
        onCancel={() => setConfirmingBlock(false)}
      />
    </div>,
    document.body,
  );
}

function MomentButton({ done, onClick, children }: { done: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      aria-pressed={done}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
        done ? "border border-paper/20 text-paper/70" : "bg-paper text-night hover:bg-paper/90",
      )}
    >
      {children}
    </button>
  );
}
