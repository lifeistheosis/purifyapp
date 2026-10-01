"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ActionMenu } from "@/components/community/ActionMenu";
import { BadgeList } from "@/components/community/profile/ProfileBadges";
import { ProfileAbout, ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Close } from "@/components/ui/icons/Close";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { blockCommunityAuthor } from "@/lib/community/client";
import { POST_KIND_KEYS, timeAgo } from "@/lib/community/types";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import type { BadgeId } from "@/lib/profile/badges";
import { fetchProfile, reportProfile } from "@/lib/profile/client";
import type { PublicProfile } from "@/lib/profile/publicProfile";
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
 * top, the reader on the left and Posts and Badges on the right. Either way
 * the backdrop dims and blurs in step with the card.
 *
 * Read by @handle from /api/community/profile, which serves a fixed
 * projection: nothing here can learn an auth id or an email. A profile seen
 * once is kept for the session, so reopening it is instant while a fresh copy
 * loads behind it.
 */

type Loaded =
  | { state: "loading" }
  | { state: "ok"; profile: PublicProfile }
  | { state: "missing" | "unavailable" | "error" };

const CACHE = new Map<string, PublicProfile>();

export function ProfileViewer({
  handle,
  onClose,
  myHandle,
  signedIn,
  feedPostIds,
  onOpenPost,
  onBlocked,
}: {
  /** The @handle to show, or null when closed. */
  handle: string | null;
  onClose: () => void;
  /** The signed-in reader's own handle, to offer Edit instead of the menu. */
  myHandle: string | null;
  signedIn: boolean;
  /** Posts on screen in the feed, which a profile's post can scroll to. */
  feedPostIds?: Set<string>;
  onOpenPost?: (postId: string) => void;
  /** After a block, so the feed can drop that reader's posts. */
  onBlocked?: () => void;
}) {
  const { t, tn } = useTranslate();
  const reduced = useReducedMotion();
  const open = handle !== null;
  // The last handle stays drawn while the card slides away.
  const [shown, setShown] = useState<string | null>(handle);
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<"posts" | "badges">("posts");
  const [highlight, setHighlight] = useState<BadgeId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
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
      const cached = CACHE.get(handle);
      setLoaded(cached ? { state: "ok", profile: cached } : { state: "loading" });
    }
  }

  useEffect(() => {
    if (!open || !shown) return;
    let alive = true;
    void (async () => {
      const res = await fetchProfile(shown);
      if (!alive) return;
      if (res.ok) {
        CACHE.set(shown, res.profile);
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

  async function copyLink() {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/community#@${shown}`);
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

  if (!mounted || typeof document === "undefined") return null;

  const profile = loaded.state === "ok" ? loaded.profile : null;
  const surface = profile ? profileSurface(profile.cosmetics) : { themed: false, style: undefined };
  const mine = Boolean(profile && myHandle && profile.handle === myHandle);

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
      <ActionMenu
        size="md"
        label={t("profile.moreActions")}
        items={[
          { label: t("profile.copyLink"), onSelect: () => void copyLink() },
          ...(signedIn
            ? [
                {
                  label: reported ? t("community.reported") : t("profile.report"),
                  onSelect: () => void report(),
                  disabled: reported,
                },
                { label: t("community.block"), onSelect: () => setConfirmingBlock(true), danger: true },
              ]
            : []),
        ]}
      />
    )
  ) : null;

  const posts = profile?.posts ?? [];

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
        <ProfileEffect effect={profile?.cosmetics.effect} />

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
          <ProfileBanner
            cosmetics={profile?.cosmetics ?? { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null }}
            className="h-28 md:h-40"
          />

          {profile ? (
            <div className="px-4 pb-8 md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-7 md:px-6">
              <div className="min-w-0">
                <ProfileHeader profile={profile} actions={actions} onBadge={showBadge} />
                {notice ? (
                  <p role="status" className="mt-3 font-sans text-detail text-paper/75">
                    {notice}
                  </p>
                ) : null}
                <div className="mt-4">
                  <ProfileAbout profile={profile} onNavigate={onClose} />
                </div>
              </div>

              <div className="mt-6 min-w-0 md:mt-5">
                <div role="tablist" aria-label={t("profile.sections")} className="flex gap-1.5">
                  {(
                    [
                      ["posts", t("profile.tabPosts"), posts.length],
                      ["badges", t("profile.tabBadges"), profile.badges.length],
                    ] as const
                  ).map(([id, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`profile-tab-${id}`}
                      aria-selected={tab === id}
                      aria-controls={`profile-panel-${id}`}
                      onClick={() => setTab(id)}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors",
                        tab === id ? "bg-paper/[0.12] text-paper" : "text-paper/60 hover:bg-paper/[0.05] hover:text-paper",
                      )}
                    >
                      {label}
                      <span className="ml-1.5 text-paper/45">{count}</span>
                    </button>
                  ))}
                </div>

                <div
                  role="tabpanel"
                  id={`profile-panel-${tab}`}
                  aria-labelledby={`profile-tab-${tab}`}
                  className="mt-3"
                >
                  {tab === "posts" ? (
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
                  ) : (
                    <BadgeList badges={profile.badges} highlight={highlight} />
                  )}
                </div>
              </div>
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

