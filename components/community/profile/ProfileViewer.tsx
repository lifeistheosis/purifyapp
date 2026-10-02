"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { BadgeList } from "@/components/community/profile/ProfileBadges";
import { ProfileAbout, ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Close } from "@/components/ui/icons/Close";
import { Orans } from "@/components/ui/icons/Orans";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { blockCommunityAuthor } from "@/lib/community/client";
import { POST_KIND_KEYS, timeAgo } from "@/lib/community/types";
import { useIsNative } from "@/lib/platform/native";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import type { BadgeId } from "@/lib/profile/badges";
import { cachedProfile, loadProfile, patchCachedProfile } from "@/lib/profile/cache";
import {
  fetchRelation,
  greetNameDay,
  reportProfile,
  sayPrayed,
  setFollow,
  startGiftCheckout,
} from "@/lib/profile/client";
import type { ProfileRelation, ProfileSeed, PublicProfile } from "@/lib/profile/publicProfile";
import { SITE_URL } from "@/lib/site";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";

/**
 * A reader's profile, opened from their name or picture in Community.
 *
 * One card, two shapes, like every pop-up in Purify (lib/ui/useDraggableSheet):
 * on a phone a sheet that follows the finger and closes on a flick down; above
 * `md` a centred card in Discord's full-profile layout, the banner across the
 * top, the reader on the left and Posts, Badges and In common on the right.
 * Either way the backdrop dims and blurs in step with the card.
 *
 * Read by @handle from /api/community/profile, which serves a fixed
 * projection: nothing here can learn an auth id or an email. How the viewer
 * stands with the profile (following, greeted, prayed) is a second, private
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

type Tab = "posts" | "badges" | "common";

const NO_COSMETICS = { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null };

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
    cosmetics: { ...NO_COSMETICS, decoration: seed.decoration ?? null },
    badges: [],
    posts: [],
    parish: null,
    private: false,
    postsHidden: false,
    nameDay: null,
    prayerRequest: null,
    nowReading: null,
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
  const [tab, setTab] = useState<Tab>("posts");
  const [highlight, setHighlight] = useState<BadgeId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [effectReady, setEffectReady] = useState(false);
  const [busy, setBusy] = useState<"follow" | "greet" | "pray" | "gift" | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({ open, onClose, reduced, half: 1 });

  // Each opening starts on the first tab with nothing left over from the
  // last one. Done while rendering, not in an effect, so the first frame of
  // the card is already the right profile.
  const [openedFor, setOpenedFor] = useState<string | null>(handle);
  if (handle !== openedFor) {
    setOpenedFor(handle);
    if (handle !== null) {
      setShown(handle);
      setTab("posts");
      setHighlight(null);
      setNotice(null);
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
    // An open ⋯ menu answers Escape itself and stops it there.
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || confirmingBlock) return;
      e.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, confirmingBlock, onClose]);

  useAndroidBack(mounted, onClose);

  const showBadge = useCallback(
    (id: BadgeId) => {
      setTab("badges");
      setHighlight(id);
      // Bring the tab into view on a phone, where it sits below the panel.
      // A timeout rather than a frame: it runs once the tab has rendered,
      // and a frame callback never fires in a hidden webview.
      window.setTimeout(() =>
        document.getElementById(`badge-${id}`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }),
      );
    },
    [reduced],
  );

  /** Change the profile on screen and in the cache together. */
  const patchProfile = useCallback(
    (patch: Partial<PublicProfile>) => {
      if (!shown) return;
      patchCachedProfile(shown, patch);
      setLoaded((prev) => (prev.state === "ok" ? { state: "ok", profile: { ...prev.profile, ...patch } } : prev));
    },
    [shown],
  );

  async function copyLink() {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/u/${shown}`);
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

  async function pray() {
    if (!shown || !relation || busy || relation.prayed) return;
    setRelation({ ...relation, prayed: true });
    setBusy("pray");
    const res = await sayPrayed(shown);
    setBusy(null);
    if (res.ok) {
      const request = loaded.state === "ok" ? loaded.profile.prayerRequest : null;
      if (request) patchProfile({ prayerRequest: { ...request, count: res.count } });
    } else {
      setRelation((r) => (r ? { ...r, prayed: false } : r));
      setNotice(t("profile.prayFailed"));
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
  const surface = profile ? profileSurface(profile.cosmetics) : { themed: false, style: undefined };
  const mine = Boolean(profile && myHandle && profile.handle === myHandle);

  const menuItems: ActionMenuItem[] = [{ label: t("profile.copyLink"), onSelect: () => void copyLink() }];
  // Gift Plus: website only, because the app stores require their own billing
  // for anything digital, and only once the owner has switched it on.
  if (relation?.canGift && !native) {
    menuItems.unshift({ label: t("profile.giftPlus"), onSelect: () => void gift(), disabled: busy === "gift" });
  }
  if (signedIn) {
    menuItems.push(
      { label: reported ? t("community.reported") : t("profile.report"), onSelect: () => void report(), disabled: reported },
      { label: t("community.block"), onSelect: () => setConfirmingBlock(true), danger: true },
    );
  }

  const actions = profile ? (
    mine ? (
      <Link
        href="/account/profile/edit"
        onClick={onClose}
        className="inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night hover:bg-paper/90"
      >
        {t("profile.edit")}
      </Link>
    ) : (
      <>
        {relation && !relation.mine ? (
          <button
            type="button"
            onClick={() => void toggleFollow()}
            aria-pressed={relation.following}
            className={cn(
              "inline-flex h-11 items-center rounded-pill px-5 font-sans text-detail font-semibold transition-colors",
              relation.following
                ? "border border-paper/25 text-paper/85 hover:border-paper/45"
                : "bg-paper text-night hover:bg-paper/90",
            )}
          >
            {relation.following ? t("profile.following") : t("profile.follow")}
          </button>
        ) : null}
        <ActionMenu size="md" label={t("profile.moreActions")} items={menuItems} />
      </>
    )
  ) : null;

  const posts = profile?.posts ?? [];
  const mutuals = relation?.mutuals ?? [];
  const tabs: [Tab, string, number][] = [];
  if (profile && !profile.postsHidden) tabs.push(["posts", t("profile.tabPosts"), posts.length]);
  if (profile && !profile.private) tabs.push(["badges", t("profile.tabBadges"), profile.badges.length]);
  if (mutuals.length > 0) tabs.push(["common", t("profile.tabCommon"), mutuals.length]);
  const activeTab: Tab | null = tabs.some(([id]) => id === tab) ? tab : (tabs[0]?.[0] ?? null);

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
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t shadow-2xl will-change-transform md:max-h-[86vh] md:max-w-[880px] md:rounded-2xl md:border",
          surface.themed ? "dark-island border-white/10" : "border-paper/15 bg-night-soft",
        )}
        style={{ ...surface.style, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {effectReady && ready ? <ProfileEffect effect={profile?.cosmetics.effect} /> : null}

        {/* The grab strip over the banner's top edge: on a phone the card
            drags from here both ways, and from its body when scrolled up. */}
        <div className="absolute inset-x-0 top-0 z-20 h-8 cursor-grab touch-none select-none active:cursor-grabbing md:hidden" {...grab}>
          <div className="flex justify-center pt-2.5">
            <span aria-hidden className="block h-1.5 w-11 rounded-full bg-white/55 shadow-sm" />
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="hit-44 absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-pill bg-black/45 text-white hover:bg-black/60"
        >
          <Close size={15} />
        </button>

        <div ref={bodyRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
          <ProfileBanner cosmetics={profile?.cosmetics ?? NO_COSMETICS} className="h-28 md:h-40" />

          {profile ? (
            <div className="relative px-4 pb-8 md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-7 md:px-6">
              <div className="min-w-0">
                <ProfileHeader
                  profile={profile}
                  actions={actions}
                  actionsInCorner
                  onBadge={showBadge}
                  celebrating={Boolean(profile.nameDay)}
                  afterHandle={
                    relation?.followsYou ? (
                      <span className="rounded-md bg-paper/[0.09] px-1.5 py-0.5 font-sans text-caption font-medium text-paper/75">
                        {t("profile.followsYou")}
                      </span>
                    ) : null
                  }
                />
                {notice ? (
                  <p role="status" className="mt-3 font-sans text-detail text-paper/75">
                    {notice}
                  </p>
                ) : null}

                {profile.nameDay ? (
                  <Moment
                    tone="gold"
                    icon={<Sparkle size={16} />}
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

                {profile.prayerRequest ? (
                  <Moment
                    tone="sage"
                    icon={<Orans size={16} />}
                    title={mine ? t("profile.prayerRequestMine") : t("profile.prayerRequest")}
                    count={tn("profile.prayedCount", profile.prayerRequest.count)}
                    action={
                      relation && !relation.mine ? (
                        <MomentButton done={relation.prayed} onClick={() => void pray()}>
                          {relation.prayed ? t("profile.prayed") : t("profile.pray")}
                        </MomentButton>
                      ) : null
                    }
                  />
                ) : null}

                <div className="mt-4">
                  {!ready ? (
                    <div aria-busy aria-label={t("profile.loading")}>
                      <SkeletonList rows={2} />
                    </div>
                  ) : profile.private ? (
                    <p className="rounded-xl border border-paper/[0.08] bg-black/20 p-4 font-sans text-detail text-paper/70">
                      {t("profile.privateNotice")}
                    </p>
                  ) : (
                    <ProfileAbout profile={profile} onNavigate={onClose} />
                  )}
                </div>
              </div>

              {ready && activeTab ? (
                // On a wide card the actions take the top-right corner, so
                // the tabs start below them.
                <div className="mt-6 min-w-0 md:mt-16">
                  <div role="tablist" aria-label={t("profile.sections")} className="flex flex-wrap gap-1.5">
                    {tabs.map(([id, label, count]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`profile-tab-${id}`}
                        aria-selected={activeTab === id}
                        aria-controls={`profile-panel-${id}`}
                        onClick={() => setTab(id)}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors",
                          activeTab === id ? "bg-paper/[0.12] text-paper" : "text-paper/60 hover:bg-paper/[0.05] hover:text-paper",
                        )}
                      >
                        {label}
                        <span className="ml-1.5 text-paper/45">{count}</span>
                      </button>
                    ))}
                  </div>

                  <div
                    role="tabpanel"
                    id={`profile-panel-${activeTab}`}
                    aria-labelledby={`profile-tab-${activeTab}`}
                    className="mt-3"
                  >
                    {activeTab === "posts" ? (
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
                                  <p className="mt-1 font-serif text-ui font-semibold leading-snug text-paper">{p.title}</p>
                                ) : null}
                                {p.excerpt ? (
                                  <p className="mt-1 line-clamp-3 font-sans text-detail leading-relaxed text-paper/75">
                                    {p.excerpt}
                                  </p>
                                ) : null}
                                {p.quoteSource ? (
                                  <p className="mt-1 font-sans text-caption text-paper/50">{p.quoteSource}</p>
                                ) : null}
                                <p className="mt-2 font-sans text-caption text-paper/45">
                                  {tn("profile.likeCount", p.likes)} · {tn("community.replyCount", p.replies)}
                                </p>
                              </>
                            );
                            return (
                              <li key={p.id}>
                                {inFeed ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenPost?.(p.id);
                                    }}
                                    className="block w-full rounded-xl border border-paper/10 bg-black/15 p-3 text-left transition-colors hover:border-paper/25 hover:bg-black/25"
                                  >
                                    {body}
                                  </button>
                                ) : (
                                  <div className="rounded-xl border border-paper/10 bg-black/15 p-3">{body}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )
                    ) : activeTab === "badges" ? (
                      <BadgeList badges={profile.badges} highlight={highlight} />
                    ) : (
                      <div>
                        <p className="mb-2 font-sans text-caption text-paper/50">{t("profile.commonHint")}</p>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {mutuals.map((m) => (
                            <li key={m.handle}>
                              <button
                                type="button"
                                onClick={() => onOpenProfile?.(m.handle, { handle: m.handle, name: m.name, avatar: m.avatar })}
                                className="flex w-full items-center gap-3 rounded-xl border border-paper/10 bg-black/15 p-2.5 text-left transition-colors hover:border-paper/25"
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
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 pb-10 pt-6 md:px-6">
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

/** A name day or a prayer request: a small lit card under the name. */
function Moment({
  tone,
  icon,
  title,
  detail,
  count,
  action,
}: {
  tone: "gold" | "sage";
  icon: ReactNode;
  title: string;
  detail?: string;
  count: string | null;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-3",
        tone === "gold" ? "border-premium/35 bg-premium/[0.08]" : "border-sage/35 bg-sage/[0.08]",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone === "gold" ? "bg-premium/15 text-premium-ink" : "bg-sage/15 text-sage-soft",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-[9rem] flex-1">
        <span className="block font-sans text-detail font-semibold text-paper">{title}</span>
        {detail ? <span className="block font-sans text-caption text-paper/65">{detail}</span> : null}
        {count ? <span className="block font-sans text-caption text-paper/55">{count}</span> : null}
      </span>
      {action}
    </div>
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
        "inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors",
        done ? "border border-paper/20 text-paper/70" : "bg-paper text-night hover:bg-paper/90",
      )}
    >
      {children}
    </button>
  );
}
