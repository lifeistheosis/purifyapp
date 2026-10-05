"use client";

import Link from "next/link";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { MentionField } from "@/components/community/MentionField";
import { CommunityAvatar as Avatar } from "@/components/community/CommunityAvatar";
import { MyProfileCard, PlusProfileNudge } from "@/components/community/CommunitySide";
import { NotificationsInbox } from "@/components/community/NotificationsInbox";
import type { CommunityNotification } from "@/lib/community/inbox";
import { notificationTarget } from "@/lib/community/notificationTarget";
import { ProfileHoverCard, type HoverTarget } from "@/components/community/profile/ProfileHoverCard";
import { ProfileViewer } from "@/components/community/profile/ProfileViewer";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import {
  addReply,
  createCommunityPost,
  deleteCommunityPost,
  fetchMyCommunityIds,
  fetchModWaiting,
  blockCommunityAuthor,
  muteCommunityAuthor,
  reportCommunityItem,
  fetchCommunityPost,
  fetchCommunityPosts,
  type CommunityResult,
  type PostsResult,
  fetchReplies,
  uploadAvatar,
} from "@/lib/community/client";
import {
  POST_KIND_KEYS,
  timeAgo,
  type CommunityPost,
  type CommunityPostKind,
  type CommunityReply,
} from "@/lib/community/types";
import {
  useFlorilegia,
  type FlorilegiumItem,
} from "@/lib/florilegium/florilegium";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { cn } from "@/lib/cn";
import { sortPinnedFirst } from "@/lib/community/pinning";
import { reconcilePosts, sameEntries, sameMembers } from "@/lib/community/reconcile";
import { ReactionButtons } from "@/components/community/ReactionButtons";
import { ResponseButtons } from "@/components/community/ResponseButtons";
import { ClergySeal } from "@/components/community/ClergySeal";
import { PrayerWall } from "@/components/community/PrayerWall";
import { SupporterMark } from "@/components/community/SupporterMark";
import type { ReactionState } from "@/lib/community/reactions";
import { countsOf, type ResponseKind } from "@/lib/community/responses";
import { validChapterRef } from "@/lib/community/chapterRef";
import { getBook } from "@/lib/bible/books";
import { nameColorClass } from "@/lib/profile/nameColor";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { Cross as CrossIcon } from "@/components/ui/icons/Cross";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageCropSheet } from "@/components/profile/ImageCropSheet";
import { SymbolText } from "@/components/community/SymbolText";
import { splitMentions } from "@/lib/community/mentions";
import { prefetchProfile } from "@/lib/profile/cache";
import { fetchMyProfile, syncCalendar } from "@/lib/profile/client";
import { announcePicture } from "@/lib/profile/myPicture";
import type { MyProfile, ProfileSeed } from "@/lib/profile/publicProfile";
import { haptic, scrollBehavior } from "@/lib/ui/motion";
import { Close } from "@/components/ui/icons/Close";

/**
 * The Community tab: prayer campaigns and conversations side by side.
 *
 * Conversations carry three kinds of post: a discussion in the reader's own
 * words, or a VERBATIM shared line from the reader's Florilegium (scripture
 * or a Father, with its citation) plus an optional reflection. Shares can
 * only come from lines gathered inside Purify's own vetted library, so no
 * fresh doctrinal text enters the app through this surface.
 */

type Panel = "campaigns" | "conversations";

/** The feed's tabs: everything, who you follow, Ask a Priest, the prayer wall, or one kind. */
type Filter = "all" | "following" | "questions" | "prayer" | CommunityPostKind;

/** A stable empty list, so a post nobody answered keeps one identity across renders. */
const NO_KINDS: ResponseKind[] = [];

/** The same map when nothing in it changed, so the memoised cards stay put. */
function sameResponseMap(
  prev: Record<string, ResponseKind[]>,
  next: Record<string, ResponseKind[]>,
): Record<string, ResponseKind[]> {
  const a = Object.keys(prev);
  const b = Object.keys(next);
  if (a.length !== b.length) return next;
  for (const k of b) {
    if ((prev[k] ?? []).join(",") !== next[k].join(",")) return next;
  }
  return prev;
}

type Me = { id: string; name: string; avatar: string | null } | null;

const field =
  "w-full rounded-lg border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40";

/**
 * How often the open conversation refetches itself, in ms.
 *
 * Polling rather than Supabase realtime, deliberately. Realtime has no
 * precedent in this repo: no channel is opened anywhere, no migration adds a
 * table to the `supabase_realtime` publication, and the native shell would
 * need a new WebSocket egress path that neither `build:android` nor
 * `build:ios` exercises. The admin console already polls at 5s and 10s
 * (LiveTab, OverviewTab), so this is the pattern the codebase supports today.
 *
 * Paused while the document is hidden, so a phone in a pocket is not calling
 * the API every eight seconds for a screen nobody is looking at.
 */
const POLL_MS = 8000;

/** The hash that selects the Conversations panel. */
const CONVERSATIONS_HASH = "#conversations";

/** Anchor id for a post row, so a notification can link straight to it. */
function postAnchorId(postId: string): string {
  return `post-${postId}`;
}

/** Anchor id for one reply in a thread, so a notification can bring it forward. */
function replyAnchorId(replyId: string): string {
  return `reply-${replyId}`;
}

/**
 * What a notification asked to see: a post, the reply in it to bring forward
 * if the row named one, and a number that is new on every tap, so tapping the
 * same row twice answers twice.
 */
type PostFocus = { postId: string; replyId: string | null; nonce: number };

/** How long the gold light on a post or a reply lasts before it is cleared. */
const LIT_MS = 2800;

/**
 * Which panel the URL is asking for.
 *
 * The panel used to be plain `useState("campaigns")`, which meant the tab
 * could not be linked to and, worse, that every notification in the inbox
 * linked to `/community#post-<id>` and landed the reader on Campaigns with
 * no post in sight. Reading the hash fixes both, and costs no router.
 */
function panelFromHash(hash: string, campaigns: boolean): Panel {
  if (!campaigns) return "conversations";
  if (hash === CONVERSATIONS_HASH) return "conversations";
  if (hash.startsWith("#post-")) return "conversations";
  if (hash.startsWith("#group-")) return "conversations";
  // A shared profile link, /community#@handle.
  if (hash.startsWith("#@")) return "conversations";
  return "campaigns";
}

/** The parish group whose thread the URL is asking for, if any. */
function groupFromHash(hash: string): string | null {
  if (!hash.startsWith("#group-")) return null;
  const id = hash.slice("#group-".length);
  // A uuid and nothing else. The value is put straight into a query string,
  // and the route refuses a non-member anyway, but a malformed id should
  // never reach it in the first place.
  return /^[0-9a-fA-F-]{36}$/.test(id) ? id : null;
}

export function CommunityClient() {
  const { t } = useTranslate();
  // Read once: this is a build-time NEXT_PUBLIC_ value, not reactive state.
  const campaigns = campaignsEnabled();
  const [panel, setPanel] = useState<Panel>(() =>
    campaigns ? "campaigns" : "conversations",
  );
  const [groupId, setGroupId] = useState<string | null>(null);

  // Read the hash after mount rather than during render: the server render
  // has no location, and reading it in the initial state would hydrate
  // mismatched whenever someone opens a #post- link.
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash;
      setPanel(panelFromHash(hash, campaigns));
      setGroupId(groupFromHash(hash));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [campaigns]);

  const choose = useCallback((next: Panel) => {
    setPanel(next);
    // Switching tabs by hand leaves any group scope behind: the pills are
    // the global surfaces, and a group thread is only ever reached by its
    // own link.
    setGroupId(null);
    // replaceState, not a router push: switching a tab is not a new page in
    // the reader's history, and pushing would make Back walk the pills.
    const url =
      next === "conversations"
        ? CONVERSATIONS_HASH
        : window.location.pathname + window.location.search;
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <div>
      {/* A real heading for the page. Community opened straight onto a
          composer with nothing above it to say where the reader was. */}
      <header className="mx-auto w-full max-w-[720px] px-5 pt-8 md:pt-12 lg:max-w-[1060px]">
        <h1 className="text-heading leading-[1.1] text-paper">{t("community.title")}</h1>
        <p className="mt-2 max-w-[540px] font-sans text-ui leading-relaxed text-paper/60">
          {t("community.subtitle")}
        </p>
        {/* The tabs only exist when there is a choice to make. With campaigns
            dark, a "Prayer campaigns" tab led to an empty board that said
            "No campaigns here yet. Be the first to ask" and two buttons into a
            coming-soon shell, on a primary mobile tab. `campaignsEnabled()` was
            honoured in four other places and missed here. */}
        {campaigns ? (
          <div
            role="tablist"
            aria-label={t("community.title")}
            className="mt-6 inline-flex gap-1 rounded-pill border border-paper/12 bg-paper/[0.03] p-1"
          >
            {(
              [
                ["campaigns", t("community.prayerCampaigns")],
                ["conversations", t("community.conversations")],
              ] as [Panel, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                onClick={() => choose(id)}
                aria-selected={panel === id}
                className={
                  "rounded-pill px-4 py-1.5 font-sans text-detail font-semibold transition-colors " +
                  (panel === id ? "bg-paper text-night" : "text-paper/65 hover:text-paper")
                }
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      {campaigns && panel === "campaigns" ? (
        <CampaignsClient embedded />
      ) : (
        <ConversationsPanel groupId={groupId} />
      )}
    </div>
  );
}

/* ── Opening profiles ──────────────────────────────────────────────────── */

/**
 * How anything in the feed opens a profile: a name, a picture, an @mention.
 * Given once by the panel, so the memoised post cards need no new props and
 * every way in shares the prefetch and the hover card.
 */
type ProfileOpener = {
  open: (handle: string, seed?: ProfileSeed) => void;
  hover: (handle: string, seed: ProfileSeed, el: HTMLElement) => void;
  leave: () => void;
};
const ProfileOpenerContext = createContext<ProfileOpener | null>(null);

/* ── Conversations ─────────────────────────────────────────────────────── */

function ConversationsPanel({ groupId }: { groupId: string | null }) {
  const { t, tn } = useTranslate();
  const [me, setMe] = useState<Me>(null);
  const [authSettled, setAuthSettled] = useState(false);
  // undefined = still loading. Otherwise the discriminated result from
  // fetchCommunityPosts, so "dark", "empty" and "failed" stay distinct.
  //
  // The scope it was fetched for travels with it. Switching between the
  // public feed and a group thread is a different feed, not a refresh, and
  // pairing them here means a stale one is simply not shown. Clearing it in
  // an effect instead would be a synchronous setState in an effect, which
  // cascades a render.
  const [fetched, setFetched] = useState<
    { scope: string | null; value: PostsResult } | undefined
  >(undefined);
  const result = fetched && fetched.scope === groupId ? fetched.value : undefined;
  const [version, setVersion] = useState(0);
  const [myPostIds, setMyPostIds] = useState<Set<string>>(() => new Set());
  // Which way this reader voted, from the same authenticated call as
  // ownership. Not in the feed: it is per-user and the feed is cached public.
  const [myReactions, setMyReactions] = useState<Record<string, ReactionState>>(
    () => ({}),
  );
  // The same, for replies. /api/community/mine has always returned these
  // beside the posts; nothing read them, because no reply had a button.
  const [myReplyReactions, setMyReplyReactions] = useState<
    Record<string, ReactionState>
  >(() => ({}));
  // The reader's own profile: the card beside the feed, the frame on their
  // picture in the composer, and which profile is theirs to edit. Null until
  // it loads, and for good while the profiles migration has not run, in
  // which case everything that uses it simply does not show.
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  // The @handle whose profile is open over the feed, and what the feed knew
  // of them, so the card can draw before the profile arrives.
  const [viewing, setViewing] = useState<{ handle: string; seed: ProfileSeed | null } | null>(null);
  const [hovered, setHovered] = useState<HoverTarget | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [followingFeed, setFollowingFeed] = useState<PostsResult | undefined>(undefined);
  // Ask a Priest reads its own list: questions are fewer than the feed's fifty.
  const [questionsFeed, setQuestionsFeed] = useState<PostsResult | undefined>(undefined);
  const [giftSent, setGiftSent] = useState(false);
  // Amen, Praying, Glory to God this reader has given, from the same call as
  // ownership, for the same reason: per reader, so never in the cached feed.
  const [myResponses, setMyResponses] = useState<Record<string, ResponseKind[]>>(() => ({}));
  const [myReplyResponses, setMyReplyResponses] = useState<Record<string, ResponseKind[]>>(() => ({}));
  // Readers who moderate see the queue's button, with how much waits.
  const [moderator, setModerator] = useState(false);
  const [modWaiting, setModWaiting] = useState<number | null>(null);
  // The Bible chapter a reader came from to start a conversation about it
  // (/community?about=john/3, from "Discussed in Community").
  const [about, setAbout] = useState<string | null>(null);
  // What a tapped notification asked to see (PostFocus), and the post itself
  // when it is not among the feed's newest fifty: fetched by its id and shown
  // above the feed. `gone` says so once when it can no longer be read.
  const [focus, setFocus] = useState<PostFocus | null>(null);
  const [linked, setLinked] = useState<CommunityPost | null>(null);
  const [gone, setGone] = useState(false);
  const focusSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const auth = await resolveUser();
      if (!alive) return;
      if (auth.state === "signed-in") {
        const meta = (auth.user.user_metadata ?? {}) as {
          display_name?: string;
          avatar_url?: string;
        };
        setMe({
          id: auth.user.id,
          name:
            (meta.display_name ?? "").trim() ||
            auth.user.email?.split("@")[0] ||
            "Reader",
          avatar: meta.avatar_url || null,
        });
      }
      setAuthSettled(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await fetchCommunityPosts(groupId);
      // A failed poll must not blank a feed the reader is already reading.
      // Only the first load is allowed to surface "error"; after that a
      // dropped request leaves the last good feed on screen and the next
      // tick tries again. Scoped per feed, so a failure on the group thread
      // cannot resurrect the public feed's last good posts.
      if (!alive) return;
      setFetched((prev) => {
        const same = prev?.scope === groupId && prev.value.state === "ok" ? prev.value : null;
        if (next.state === "error" && same) return prev;
        // Keep every post that did not change, and the whole previous feed
        // when nothing did, so a quiet refresh re-renders nothing
        // (lib/community/reconcile.ts).
        if (next.state === "ok" && same && same.state === "ok") {
          const posts = reconcilePosts(same.posts, next.posts);
          return posts === same.posts ? prev : { scope: groupId, value: { state: "ok", posts } };
        }
        return { scope: groupId, value: next };
      });
    })();
    return () => {
      alive = false;
    };
  }, [version, groupId]);

  // Which rows are the reader's own. A separate authenticated call because
  // the feed is cached and public, so it deliberately carries no author id.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const ids = await fetchMyCommunityIds();
      if (!alive) return;
      // Only when something changed: a new Set or map on every refresh would
      // re-render every post card for nothing.
      setMyPostIds((prev) => sameMembers(prev, ids.postIds));
      setMyReactions((prev) => sameEntries(prev, ids.reactions.posts));
      setMyReplyReactions((prev) => sameEntries(prev, ids.reactions.replies));
      setMyResponses((prev) => sameResponseMap(prev, ids.responses.posts));
      setMyReplyResponses((prev) => sameResponseMap(prev, ids.responses.replies));
      setModerator(ids.moderator);
    })();
    return () => {
      alive = false;
    };
  }, [version, authSettled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const myId = me?.id ?? null;
  useEffect(() => {
    if (!myId) return;
    let alive = true;
    void (async () => {
      const res = await fetchMyProfile();
      if (!alive || !res.ok) return;
      setMyProfile(res.profile);
      // The composer draws the profile's picture, the reader's own upload,
      // rather than what the sign-in left in metadata.
      const own = res.profile.avatar;
      if (own) setMe((m) => (m && m.avatar !== own ? { ...m, avatar: own } : m));
      // Name days are counted on the calendar this device keeps.
      const synced = await syncCalendar(res.profile);
      if (alive && synced) setMyProfile(synced);
    })();
    return () => {
      alive = false;
    };
  }, [myId]);

  // A shared profile link (/community#@handle) opens that profile.
  useEffect(() => {
    const apply = () => {
      const m = /^#@([a-z0-9_.]{3,24})$/i.exec(window.location.hash);
      if (m) setViewing({ handle: m[1].toLowerCase(), seed: null });
      // Back from Stripe after giving Plus: say so once, and drop the flag.
      const url = new URL(window.location.href);
      if (url.searchParams.get("gift") === "sent") {
        setGiftSent(true);
        url.searchParams.delete("gift");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
      // From a Bible chapter's "Start a conversation": open the composer on it.
      const chapter = validChapterRef(url.searchParams.get("about"));
      if (chapter) {
        setAbout(chapter);
        url.searchParams.delete("about");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // The Following tab: the readers you follow, read with your own sign-in.
  useEffect(() => {
    if (filter !== "following" || groupId) return;
    let alive = true;
    void (async () => {
      const next = await fetchCommunityPosts(null, { following: true });
      if (!alive) return;
      setFollowingFeed((prev) => {
        if (next.state === "error" && prev?.state === "ok") return prev;
        if (next.state === "ok" && prev?.state === "ok") {
          const posts = reconcilePosts(prev.posts, next.posts);
          return posts === prev.posts ? prev : { state: "ok", posts };
        }
        return next;
      });
    })();
    return () => {
      alive = false;
    };
  }, [filter, groupId, version]);

  // Ask a Priest: the latest questions, read with the same rules as the feed.
  useEffect(() => {
    if (filter !== "questions" || groupId) return;
    let alive = true;
    void (async () => {
      const next = await fetchCommunityPosts(null, { category: "question" });
      if (!alive) return;
      setQuestionsFeed((prev) => {
        if (next.state === "error" && prev?.state === "ok") return prev;
        if (next.state === "ok" && prev?.state === "ok") {
          const posts = reconcilePosts(prev.posts, next.posts);
          return posts === prev.posts ? prev : { state: "ok", posts };
        }
        return next;
      });
    })();
    return () => {
      alive = false;
    };
  }, [filter, groupId, version]);

  // How much waits for the moderators, refreshed with the feed.
  useEffect(() => {
    if (!moderator) return;
    let alive = true;
    void (async () => {
      const n = await fetchModWaiting();
      if (alive) setModWaiting(n);
    })();
    return () => {
      alive = false;
    };
  }, [moderator, version]);

  // ── Opening profiles: tap, hover, @mention ──────────────────────────────
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const openProfile = useCallback((handle: string, seed?: ProfileSeed) => {
    window.clearTimeout(showTimer.current);
    setHovered(null);
    setViewing({ handle, seed: seed ?? null });
  }, []);
  const hoverStart = useCallback((handle: string, seed: ProfileSeed, el: HTMLElement) => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    prefetchProfile(handle);
    showTimer.current = window.setTimeout(() => setHovered({ handle, seed, rect: el.getBoundingClientRect() }), 380);
  }, []);
  const hoverEnd = useCallback(() => {
    window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => setHovered(null), 200);
  }, []);
  const hoverKeep = useCallback(() => window.clearTimeout(hideTimer.current), []);
  useEffect(() => {
    if (!hovered) return;
    // The card is pinned to the screen: it goes when the page moves.
    const away = () => setHovered(null);
    window.addEventListener("scroll", away, { passive: true });
    return () => window.removeEventListener("scroll", away);
  }, [hovered]);
  const opener = useMemo<ProfileOpener>(
    () => ({ open: openProfile, hover: hoverStart, leave: hoverEnd }),
    [openProfile, hoverStart, hoverEnd],
  );

  const closeViewer = useCallback(() => {
    setViewing(null);
    // Drop a profile link from the address, so Back and a reload do not
    // open it again.
    if (window.location.hash.startsWith("#@")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search + CONVERSATIONS_HASH);
    }
  }, []);

  const feedPostIds = useMemo(
    () => new Set(result?.state === "ok" ? result.posts.map((p) => p.id) : []),
    [result],
  );

  // A tap on a notification. A person opens as their profile; something
  // written opens as its post, with the thread open and the reply lit
  // (PostCard answers `focus`). Whatever filter is on, the post is shown, so
  // the feed goes back to everything; and a post too old to be in the feed is
  // fetched and stood above it.
  const feedIdsRef = useRef(feedPostIds);
  useEffect(() => {
    feedIdsRef.current = feedPostIds;
  }, [feedPostIds]);
  // Brings one post forward, however the reader asked for it: a notification,
  // a link to the post, or the post's row on someone's profile.
  const focusPost = useCallback((postId: string, replyId: string | null) => {
    const nonce = ++focusSeq.current;
    setGone(false);
    setFilter("all");
    setFocus({ postId, replyId, nonce });
    if (feedIdsRef.current.has(postId)) {
      setLinked(null);
      return;
    }
    void fetchCommunityPost(postId).then((post) => {
      // A later tap has taken over: this answer is for a row no longer asked.
      if (focusSeq.current !== nonce) return;
      setLinked(post);
      if (!post) {
        setFocus(null);
        setGone(true);
      }
    });
  }, []);
  const openNotification = useCallback(
    (n: CommunityNotification) => {
      const target = notificationTarget(n);
      if (target.kind === "none") return;
      haptic("light");
      if (target.kind === "profile") {
        openProfile(target.handle, { handle: target.handle, name: n.actor_name, avatar: null });
        return;
      }
      focusPost(target.postId, target.replyId);
    },
    [openProfile, focusPost],
  );

  // The post address this page has already answered, so a feed refresh does
  // not bring the same post forward a second time.
  const scrolledFor = useRef<string | null>(null);

  // From a post on someone's profile to the same post in the feed. After the
  // card has closed, because the page cannot scroll while it is open.
  const openPost = useCallback(
    (postId: string) => {
      window.setTimeout(() => {
        const hash = `#${postAnchorId(postId)}`;
        window.history.replaceState(null, "", hash);
        scrolledFor.current = hash;
        focusPost(postId, null);
      }, 360);
    },
    [focusPost],
  );

  // Poll while the tab is actually being looked at, and catch up on the way
  // back from a locked screen or a backgrounded app.
  useEffect(() => {
    if (result?.state === "dark") return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer !== null) return;
      timer = setInterval(reload, POLL_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        reload();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    // A native app resuming from background fires focus but not always
    // visibilitychange, and a dropped connection coming back fires online.
    window.addEventListener("focus", onVisibility);
    window.addEventListener("online", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("online", onVisibility);
    };
  }, [reload, result?.state]);

  // A link to a post (a push notification, an email, a shared address) brings
  // that post forward once the feed has loaded, the same way a tapped
  // notification does: in view, thread open, lit. It used to be scrolled to
  // only when it was among the newest fifty; an older one left the reader at
  // the top of the feed with no sign of what the link was for. Deferred a
  // tick so no state is set from the effect's own body.
  useEffect(() => {
    if (result?.state !== "ok") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#post-")) return;
    if (scrolledFor.current === hash) return;
    const postId = hash.slice("#post-".length);
    if (!/^[0-9a-f-]{36}$/i.test(postId)) return;
    const id = window.setTimeout(() => {
      scrolledFor.current = hash;
      focusPost(postId, null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [result, focusPost]);

  const feedPosts = result?.state === "ok" ? result.posts : null;
  const followingPosts = followingFeed?.state === "ok" ? followingFeed.posts : null;
  const questionPosts = questionsFeed?.state === "ok" ? questionsFeed.posts : null;
  const shownPosts = useMemo(
    () =>
      filter === "following"
        ? (followingPosts ?? [])
        : filter === "questions"
          ? (questionPosts ?? [])
          : filter === "prayer"
            ? []
            : feedPosts
          ? // Sorted here as well as in the query. The server already returns
            // announcements first, so this is a guard rather than the mechanism:
            // it costs one pass over fifty rows and means a cached response from
            // before pinning existed, or any future path that assembles this list
            // locally, still cannot put an ordinary post above an announcement.
            sortPinnedFirst(feedPosts).filter((p) => filter === "all" || p.kind === filter)
          : [],
    [feedPosts, followingPosts, questionPosts, filter],
  );

  return (
    <ProfileOpenerContext.Provider value={opener}>
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-6 lg:grid lg:max-w-[1060px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
      <div className="min-w-0">
        {result?.state === "dark" ? (
          <div className="rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
            <p className="font-serif text-lede text-paper/80">
              {t("community.openingSoon")}
            </p>
            <p className="mx-auto mt-2 max-w-[400px] font-sans text-ui text-paper/55">
              {t("community.openingSoonBody")}
            </p>
          </div>
        ) : (
          <>
            {/* A group thread says whose it is, and offers the way back out.
                Without this the reader has a feed that looks like the global
                one but is not, and no way to tell. */}
            {groupId ? (
              <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.04] px-4 py-3">
                <p className="min-w-0 font-sans text-detail text-paper/80">
                  {t("community.groupThreadHeading")}
                </p>
                <Link
                  href={CONVERSATIONS_HASH}
                  className="shrink-0 font-sans text-caption font-semibold text-gold-pale hover:text-paper"
                >
                  {t("community.allConversations")}
                </Link>
              </div>
            ) : null}
            {/* What came back to you, above what you might say next. Renders
                nothing when there is nothing, including before the
                notifications migration is applied. */}
            {authSettled && me && !groupId ? <NotificationsInbox onOpen={openNotification} /> : null}
            {gone ? (
              <p role="status" className="mb-6 rounded-xl border border-paper/12 bg-paper/[0.03] px-4 py-3 font-sans text-detail text-paper/70">
                {t("community.postGone")}
              </p>
            ) : null}
            {/* The post a notification pointed at, when the feed no longer
                holds it. The same card as in the feed, so everything a reader
                can do to a post they can do here. */}
            {linked && !feedPostIds.has(linked.id) ? (
              <div className="relative mb-6">
                <PostCard
                  post={linked}
                  me={me}
                  myPostIds={myPostIds}
                  myReaction={myReactions[linked.id] ?? null}
                  myReplyReactions={myReplyReactions}
                  myResponses={myResponses[linked.id] ?? NO_KINDS}
                  myReplyResponses={myReplyResponses}
                  onChanged={reload}
                  focus={focus && focus.postId === linked.id ? focus : null}
                />
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => {
                    setLinked(null);
                    setFocus(null);
                  }}
                  className="absolute -right-2 -top-2 inline-flex size-9 items-center justify-center rounded-full border border-paper/15 bg-night text-paper/70 shadow-pop transition-colors hover:text-paper"
                >
                  <Close size={15} />
                </button>
              </div>
            ) : null}
            {authSettled && me ? (
              <Composer
                me={me}
                groupId={groupId}
                decoration={myProfile?.cosmetics.decoration ?? null}
                onOpenProfile={
                  myProfile
                    ? () => openProfile(myProfile.handle, { handle: myProfile.handle, name: myProfile.name, avatar: myProfile.avatar })
                    : undefined
                }
                onPosted={reload}
                onAvatarChanged={(url) => setMe((m) => (m ? { ...m, avatar: url } : m))}
                about={about}
                asking={filter === "questions"}
              />
            ) : authSettled ? (
              <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 text-center">
                <p className="font-sans text-ui text-paper/70">
                  {t("community.signInToPost")}
                </p>
                <Link
                  href="/signin?next=/community"
                  className="mt-3 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night"
                >
                  {t("community.signIn")}
                </Link>
              </div>
            ) : (
              // The sign-in is still being read. The box holds its place, so
              // what follows does not start at the top of the screen and get
              // pushed down a moment later (filmed 2026-10-05: the page
              // arrived in four steps, each one moving the last).
              <Skeleton weight="faint" rounded="rounded-2xl" className="h-[112px] w-full" />
            )}

            {giftSent ? (
              <p role="status" className="mt-5 rounded-xl border border-premium/30 bg-premium/[0.06] px-4 py-3 font-sans text-detail text-paper/85">
                {t("community.giftSent")}
              </p>
            ) : null}

            {/* The moderators' way to the queue, with how much waits. */}
            {moderator && !groupId ? (
              <Link
                href="/community/moderate"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-sage/30 bg-sage/[0.06] px-4 py-3 font-sans text-detail text-paper/85 transition-colors hover:border-sage/50"
              >
                <span className="font-semibold">{t("community.modButton")}</span>
                <span className={cn("rounded-pill px-2.5 py-0.5 text-caption font-semibold", modWaiting ? "bg-crimson/80 text-white" : "bg-paper/10 text-paper/60")}>
                  {modWaiting === null ? "…" : tn("community.modWaiting", modWaiting)}
                </span>
              </Link>
            ) : null}

            {/* What kind of post to show. The feed is fifty posts, already
                here, so this filters on the device and asks nothing of the
                server. Following, Ask a Priest and the prayer wall ask: each
                is its own list. */}
            {result === undefined ? (
              <div aria-hidden className="mt-6 flex gap-1.5 overflow-hidden">
                {[56, 96, 104, 112].map((w) => (
                  <Skeleton key={w} weight="faint" rounded="rounded-pill" className="h-10 shrink-0" style={{ width: w }} />
                ))}
              </div>
            ) : null}
            {result?.state === "ok" && result.posts.length > 0 ? (
              <ScrollRail
                role="tablist"
                label={t("community.filterLabel")}
                current={filter}
                arrows={false}
                className="-mx-5 mt-6"
                trackClassName="gap-1.5 px-5"
              >
                {(
                  [
                    ["all", t("community.filterAll")],
                    ...(me && !groupId ? [["following", t("community.filterFollowing")]] : []),
                    ...(!groupId
                      ? [
                          ["questions", t("community.filterQuestions")],
                          ["prayer", t("community.filterPrayer")],
                        ]
                      : []),
                    ["discussion", t("community.kindDiscussion")],
                    ["scripture", t("community.kindScripture")],
                    ["father", t("community.kindFather")],
                  ] as [Filter, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={filter === id}
                    onClick={() => setFilter(id)}
                    className={cn(
                      "inline-flex min-h-10 shrink-0 items-center rounded-pill border px-4 font-sans text-detail font-semibold transition-colors",
                      filter === id
                        ? "border-paper/40 bg-paper/[0.1] text-paper"
                        : "border-paper/12 text-paper/60 hover:border-paper/30 hover:text-paper",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </ScrollRail>
            ) : null}

            <div className="mt-4 space-y-4">
              {result === undefined ? (
                // The conversations feed is fetched on the device, so a route
                // loading.tsx never covers this wait. Skeleton rows rather than
                // a line of text: they say how much is coming and where it will
                // sit, and the swap is a change of contents rather than a
                // reflow. The word "Gathering" is kept as the accessible name.
                <div aria-busy aria-label={t("community.gathering")}>
                  <SkeletonList rows={4} />
                </div>
              ) : result.state === "error" ? (
                // Say so, and offer the way out. Rendering the empty state here
                // would tell the reader the community is quiet when in fact we
                // could not reach it.
                <div className="rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
                  <p className="font-serif text-lede text-paper/80">
                    {t("community.loadFailed")}
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-4 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night"
                  >
                    {t("community.tryAgain")}
                  </button>
                </div>
              ) : result.posts.length === 0 ? (
                <div className="rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
                  <p className="font-serif text-lede text-paper/80">
                    {t("community.quietHere")}
                  </p>
                  <p className="mt-2 font-sans text-ui text-paper/55">
                    {t("community.quietHereBody")}
                  </p>
                </div>
              ) : filter === "prayer" ? (
                <PrayerWall signedIn={Boolean(me)} onOpenProfile={(h, seed) => openProfile(h, seed)} />
              ) : (filter === "following" && followingFeed === undefined) || (filter === "questions" && questionsFeed === undefined) ? (
                <div aria-busy aria-label={t("community.gathering")}>
                  <SkeletonList rows={3} />
                </div>
              ) : shownPosts.length === 0 ? (
                <p className="py-10 text-center font-sans text-ui text-paper/55">
                  {filter === "following"
                    ? t("community.followingEmpty")
                    : filter === "questions"
                      ? t("community.questionsEmpty")
                      : t("community.filterEmpty")}
                </p>
              ) : (
                shownPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    me={me}
                    myPostIds={myPostIds}
                    myReaction={myReactions[p.id] ?? null}
                    myReplyReactions={myReplyReactions}
                    myResponses={myResponses[p.id] ?? NO_KINDS}
                    myReplyResponses={myReplyResponses}
                    onChanged={reload}
                    focus={focus && focus.postId === p.id ? focus : null}
                  />
                ))
              )}
            </div>

            {/* Beside the feed on a wide screen, under it otherwise. */}
            {result !== undefined ? (
              <p className="mt-8 text-center font-sans text-caption text-paper/40 lg:hidden">
                {t("community.houseRules")}
              </p>
            ) : null}
          </>
        )}
      </div>

      {result?.state !== "dark" ? (
        <aside className="hidden lg:block" aria-label={t("community.sideLabel")}>
          <div className="sticky top-24 space-y-4">
            {me && myProfile ? (
              <MyProfileCard
                profile={myProfile}
                onView={() => openProfile(myProfile.handle, { handle: myProfile.handle, name: myProfile.name, avatar: myProfile.avatar })}
              />
            ) : null}
            {me && myProfile && !myProfile.subscribed ? <PlusProfileNudge profile={myProfile} /> : null}
            <p className="px-1 font-sans text-caption leading-relaxed text-paper/45">
              {t("community.houseRules")}
            </p>
          </div>
        </aside>
      ) : null}

      <ProfileViewer
        handle={viewing?.handle ?? null}
        seed={viewing?.seed ?? null}
        onClose={closeViewer}
        myHandle={myProfile?.handle ?? null}
        signedIn={Boolean(me)}
        feedPostIds={feedPostIds}
        onOpenPost={openPost}
        onOpenProfile={openProfile}
        onBlocked={reload}
      />
      <ProfileHoverCard target={hovered} onOpen={openProfile} onKeep={hoverKeep} onLeave={hoverEnd} />
    </section>
    </ProfileOpenerContext.Provider>
  );
}

/* ── Composer ──────────────────────────────────────────────────────────── */

function Composer({
  me,
  groupId,
  decoration,
  onOpenProfile,
  onPosted,
  onAvatarChanged,
  about,
  asking,
}: {
  me: NonNullable<Me>;
  /** When set, the post goes to this parish group rather than the public
   *  feed. The route re-checks membership; this only shapes the request. */
  groupId: string | null;
  /** The reader's Plus frame, so their own picture wears it here too. */
  decoration: string | null;
  /** Opens the reader's own profile. Absent until profiles are open, and
   *  then the picture keeps its old job of changing the photo. */
  onOpenProfile?: () => void;
  onPosted: () => void;
  onAvatarChanged: (url: string) => void;
  /** A Bible chapter the reader came from ("john/3"), to write about. */
  about: string | null;
  /** The Ask a Priest tab is open: the composer offers a question first. */
  asking: boolean;
}) {
  const { t } = useTranslate();
  const [mode, setMode] = useState<"discussion" | "share" | "question">("discussion");
  // The chapter this post is about, from "Start a conversation" on its page.
  const [chapter, setChapter] = useState<string | null>(null);
  // Said once after posting: it went up, or it waits for a moderator.
  const [notice, setNotice] = useState<string | null>(null);
  // Folded to one line until the reader starts. Open, the form was the
  // tallest thing on the page, above every post, for the many readers who
  // come to read rather than to write.
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<FlorilegiumItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  // Kept apart from `error`: an avatar failure used to render in the post
  // composer's error slot, so "Couldn't update your photo" appeared under a
  // discussion draft that was perfectly fine.
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // A photo being placed before it is saved (ImageCropSheet).
  const [crop, setCrop] = useState<{ file: File; open: boolean } | null>(null);
  // The word filter's question, after a post it would mask.
  const [askFiltered, setAskFiltered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const { florilegia } = useFlorilegia();

  const gathered = florilegia.flatMap((f) => f.items);
  const GATHERED_SHOWN = 40;

  // Opening the form is asking to write, so the cursor goes where the words do.
  useEffect(() => {
    if (expanded && mode !== "share") bodyRef.current?.focus({ preventScroll: true });
  }, [expanded, mode]);

  // From a chapter's page: open on a discussion about that chapter. Adjusted
  // while rendering rather than in an effect, so the first frame is right.
  const [aboutSeen, setAboutSeen] = useState<string | null>(null);
  if (about && about !== aboutSeen) {
    setAboutSeen(about);
    setChapter(about);
    setMode("discussion");
    setExpanded(true);
  }

  function start(next: "discussion" | "share" | "question") {
    setMode(next);
    setExpanded(true);
    setNotice(null);
  }

  /** The spam filter's refusals, in the reader's language (lib/community/guard.ts). */
  function refusal(res: CommunityResult): string | null {
    switch (res.code) {
      case "duplicate":
        return t("community.err.duplicate");
      case "too_many_links":
        return t("community.err.tooManyLinks", { count: res.limit ?? 0 });
      case "too_many_mentions":
        return t("community.err.tooManyMentions", { count: res.limit ?? 0 });
      case "slow_down_new":
        return t("community.err.slowDownNew");
      case "slow_down":
        return t("community.err.slowDown");
      default:
        return null;
    }
  }

  async function submit(confirmFiltered = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res =
      mode === "discussion" || mode === "question"
        ? await createCommunityPost({
            kind: "discussion",
            title: title.trim() || null,
            body: body.trim(),
            groupId,
            confirmFiltered,
            category: mode === "question" ? "question" : null,
            chapterRef: chapter,
          })
        : picked
          ? await (async () => {
              // Send WHERE the line came from, never the line itself. The
              // server rebuilds the quotation from our library and refuses
              // anything it cannot find there.
              const loc = shareLocator(picked);
              if (!loc) {
                return {
                  ok: false as const,
                  error: t("community.untraceableLine"),
                };
              }
              return createCommunityPost({
                ...loc,
                body: body.trim() || null,
                groupId,
                confirmFiltered,
              });
            })()
          : { ok: false, error: t("community.pickALine") };
    setBusy(false);
    setAskFiltered(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setPicked(null);
      setChapter(null);
      setExpanded(false);
      // Kept, and shown to nobody until a moderator looks: say so plainly,
      // so the reader does not post it again thinking it was lost.
      setNotice(res.held ? t("community.heldNotice") : null);
      onPosted();
    } else if (res.code === "filtered") {
      // The word filter would mask some of it: ask before it goes up.
      setAskFiltered(true);
    } else {
      setError(refusal(res) ?? res.error ?? t("community.postFailed"));
    }
  }

  async function changeAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarError(null);
    const res = await uploadAvatar(file);
    setAvatarBusy(false);
    if (res.ok && res.url) {
      onAvatarChanged(res.url);
      announcePicture(res.url);
    }
    else setAvatarError(res.error ?? t("community.photoFailed"));
  }

  const avatarButton = onOpenProfile ? (
    <button
      type="button"
      onClick={onOpenProfile}
      title={t("profile.yourProfile")}
      aria-label={t("profile.yourProfile")}
      className="tap-press shrink-0 rounded-full"
    >
      <Avatar name={me.name} url={me.avatar} size={40} decoration={decoration} />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={avatarBusy}
      title={t("community.changePhoto")}
      aria-label={t("community.changePhoto")}
      className="tap-press shrink-0 rounded-full disabled:opacity-50"
    >
      <Avatar name={me.name} url={me.avatar} size={40} />
    </button>
  );

  const fileInput = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setCrop({ file: f, open: true });
          e.target.value = "";
        }}
      />
      <ImageCropSheet
        open={crop?.open ?? false}
        file={crop?.file ?? null}
        shape="avatar"
        onCancel={() => setCrop((c) => (c ? { ...c, open: false } : c))}
        onConfirm={(cropped) => {
          setCrop((c) => (c ? { ...c, open: false } : c));
          void changeAvatar(cropped);
        }}
      />
    </>
  );

  const avatarErrorLine = avatarError ? (
    <p className="mt-2 font-sans text-detail text-rose-300">{avatarError}</p>
  ) : null;

  const noticeLine = notice ? (
    <p role="status" className="mt-2 rounded-lg border border-sage/30 bg-sage/[0.07] px-3 py-2 font-sans text-detail text-paper/80">
      {notice}
    </p>
  ) : null;

  const chapterLabel = (() => {
    if (!chapter) return null;
    const [slug, n] = chapter.split("/");
    const book = getBook(slug);
    return book ? `${book.name} ${n}` : null;
  })();

  if (!expanded) {
    return (
      <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3">
        <div className="flex items-center gap-3">
          {avatarButton}
          {fileInput}
          <button
            type="button"
            onClick={() => start(asking ? "question" : "discussion")}
            className="min-h-11 min-w-0 flex-1 truncate rounded-pill border border-paper/12 bg-night px-4 text-left font-sans text-ui text-paper/45 transition-colors hover:border-paper/30 hover:text-paper/65"
          >
            {asking ? t("community.askPrompt") : groupId ? t("community.composePromptGroup") : t("community.composePrompt")}
          </button>
          <button
            type="button"
            onClick={() => start("share")}
            className="min-h-11 shrink-0 rounded-pill border border-paper/15 px-3.5 font-sans text-caption font-semibold text-paper/70 transition-colors hover:border-paper/35 hover:text-paper"
          >
            {t("community.shareALine")}
          </button>
        </div>
        {avatarErrorLine}
        {noticeLine}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <div className="flex items-center gap-3">
        {avatarButton}
        {fileInput}
        <div className="min-w-0">
          <p className="truncate font-sans text-ui font-semibold text-paper">
            {me.name}
          </p>
          <p className="font-sans text-eyebrow text-paper/45">
            {onOpenProfile
              ? groupId
                ? t("community.postingToGroup")
                : t("community.postingPublicly")
              : avatarBusy
                ? t("community.uploadingPhoto")
                : t("community.tapPhotoToChange")}
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {(
            [
              ["discussion", t("community.discussion")],
              ...(groupId ? [] : [["question", t("community.askAPriest")]]),
              ["share", t("community.shareALine")],
            ] as ["discussion" | "share" | "question", string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={
                "rounded-pill border px-3 py-1 font-sans text-caption font-semibold transition-colors " +
                (mode === id
                  ? "border-gold/50 bg-gold/10 text-gold-pale"
                  : "border-paper/15 text-paper/60 hover:border-paper/30")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {avatarErrorLine}

      {mode !== "share" ? (
        <div className="mt-4 space-y-2.5">
          {mode === "question" ? (
            <p className="rounded-lg border border-premium/25 bg-premium/[0.06] px-3 py-2 font-sans text-caption leading-relaxed text-paper/75">
              {t("community.askNote")}
            </p>
          ) : null}
          {chapterLabel ? (
            <p className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold/30 bg-gold/[0.06] px-3 py-1 font-sans text-caption font-semibold text-paper/80">
                {t("community.aboutChapter", { chapter: chapterLabel })}
              </span>
              <button
                type="button"
                onClick={() => setChapter(null)}
                className="hit-44 font-sans text-caption text-paper/50 hover:text-paper"
                aria-label={t("community.aboutRemove")}
              >
                {t("community.aboutRemove")}
              </button>
            </p>
          ) : null}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder={mode === "question" ? t("community.questionTitlePlaceholder") : t("community.titlePlaceholder")}
            className={field}
          />
          <MentionField
            as="textarea"
            fieldRef={bodyRef}
            value={body}
            onChange={setBody}
            rows={3}
            maxLength={4000}
            placeholder={mode === "question" ? t("community.questionPlaceholder") : t("community.bodyPlaceholder")}
            className={field}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {gathered.length === 0 ? (
            <p className="rounded-lg border border-paper/10 bg-night p-4 font-sans text-detail text-paper/60">
              {t("community.emptyFlorilegium")}{" "}
              <Link href="/florilegium" className="font-semibold text-gold-pale hover:text-paper">
                {t("community.openFlorilegium")}
              </Link>
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {gathered.slice(0, GATHERED_SHOWN).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPicked(item)}
                  aria-pressed={picked?.id === item.id}
                  className={
                    "block w-full rounded-lg border p-3 text-left transition-colors " +
                    (picked?.id === item.id
                      ? "border-gold/50 bg-gold/[0.07]"
                      : "border-paper/10 bg-night hover:border-paper/25")
                  }
                >
                  <p className="line-clamp-2 font-serif text-detail text-paper/85">
                    {item.text}
                  </p>
                  <p className="mt-1 font-sans text-eyebrow text-paper/50">
                    {shareSource(item)}
                  </p>
                </button>
              ))}
              {/* The picker used to cut off at 40 with no sign it had. A
                  reader with a full Florilegium looked for a line that was
                  there and concluded the app had lost it. */}
              {gathered.length > GATHERED_SHOWN ? (
                <p className="px-1 pt-1 font-sans text-eyebrow text-paper/40">
                  {t("community.moreInFlorilegium", {
                    count: gathered.length - GATHERED_SHOWN,
                  })}
                </p>
              ) : null}
            </div>
          )}
          <MentionField
            as="textarea"
            value={body}
            onChange={setBody}
            rows={2}
            maxLength={4000}
            placeholder={t("community.reflectionPlaceholder")}
            className={field}
          />
        </div>
      )}

      {error ? (
        <p className="mt-2 font-sans text-detail text-rose-300">{error}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        {/* Folding keeps the draft: nothing typed is lost to a stray tap. */}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          disabled={busy}
          className="rounded-pill px-4 py-2 font-sans text-ui font-medium text-paper/60 hover:text-paper disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={
            busy ||
            (mode === "share" ? !picked : body.trim().length < 2)
          }
          className="rounded-pill bg-paper px-6 py-2 font-sans text-ui font-semibold text-night disabled:opacity-50"
        >
          {busy ? t("community.posting") : mode === "question" ? t("community.askSend") : t("community.post")}
        </button>
      </div>
      <ConfirmDialog
        open={askFiltered}
        title={t("community.filteredTitle")}
        description={t("community.filteredBody")}
        confirmLabel={t("community.filteredPost")}
        cancelLabel={t("community.filteredEdit")}
        pending={busy}
        onConfirm={() => void submit(true)}
        onCancel={() => setAskFiltered(false)}
      />
    </div>
  );
}

function shareSource(item: FlorilegiumItem): string {
  if (item.kind === "scripture") return item.reference;
  return item.work ? `${item.author}, ${item.work}` : item.author;
}

/**
 * The locator the server needs to rebuild this quotation from our own
 * library, or null when it cannot be traced.
 *
 * Scripture always resolves: the item carries book, chapter and verse.
 * A Father resolves only when we can name the WORK, which means parsing the
 * work slug out of the deep link, since `item.work` is a printed title
 * ("On the Incarnation") and the loader needs a slug.
 *
 * Null means the line cannot be verified against the work it claims, and the
 * composer refuses to share it rather than asking the server to take the
 * text on trust. That is the whole point: see lib/community/verifyQuote.ts.
 */
function shareLocator(
  item: FlorilegiumItem,
):
  | { kind: "scripture"; book: string; chapter: number; verse: number }
  | { kind: "father"; saintSlug: string; work: string; quoteText: string }
  | null {
  if (item.kind === "scripture") {
    return {
      kind: "scripture",
      book: item.book,
      chapter: item.chapter,
      verse: item.verse,
    };
  }
  const m = item.href?.match(/^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)/);
  if (!m) return null;
  return { kind: "father", saintSlug: m[1], work: m[2], quoteText: item.text };
}

/* ── Post card ─────────────────────────────────────────────────────────── */

/**
 * A reply the reader has written that the server has not confirmed yet.
 *
 * Replies used to appear only after a round trip, so on a slow connection a
 * reader tapped Reply, saw nothing change, and tapped again. Rendering the
 * pending reply immediately is what makes the thread feel like a
 * conversation; keeping its status separate is what stops it looking sent
 * when it failed.
 */
type PendingReply = {
  tempId: number;
  body: string;
  status: "sending" | "failed";
};

/** Monotonic ids for pending replies. Not crypto.randomUUID: that needs a
 *  secure context, and the iOS shell serves from capacitor://localhost. */
let pendingSeq = 0;

function PostCardInner({
  post,
  me,
  myPostIds,
  myReaction,
  myReplyReactions,
  myResponses,
  myReplyResponses,
  onChanged,
  focus = null,
}: {
  post: CommunityPost;
  me: Me;
  /** From GET /api/community/mine. The feed itself carries no author id. */
  myPostIds: Set<string>;
  /** From the same call, for the same reason: per-reader, so not in the feed. */
  myReaction: ReactionState;
  /** Keyed by reply id, from the same call. Every thread reads from one map. */
  myReplyReactions: Record<string, ReactionState>;
  /** Amen, Praying, Glory to God this reader gave the post, and each reply. */
  myResponses: ResponseKind[];
  myReplyResponses: Record<string, ResponseKind[]>;
  onChanged: () => void;
  /** A notification asking for this post. Null for every other card. */
  focus?: PostFocus | null;
}) {
  const { t, tn } = useTranslate();
  const opener = useContext(ProfileOpenerContext);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<CommunityReply[] | null>(null);
  const [repliesState, setRepliesState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [pending, setPending] = useState<PendingReply[]>([]);
  // A reply the word filter would mask, waiting on the writer's answer.
  const [askReply, setAskReply] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  // Said under the thread once: a reply that waits for a moderator.
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  // Replies from muted readers the reader chose to open anyway.
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  // Blocking asks first. It used to fire on one tap, from a pill identical to
  // Report and sitting right beside it, and on 2026-08-31 a reader wrote
  // "i accidentally blocked patryk ... or like a 'are you sure you want to
  // block this person'". With no unblock screen either, that tap was final.
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  // Deleting asks too, now that it sits in a menu beside Report.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Long posts fold to a few lines. The pinned 1.4 announcement ran to
  // several screens, so a reader met one post before the conversation.
  const [unfolded, setUnfolded] = useState(false);
  const mine = myPostIds.has(post.id);

  // Guards the async gap between "Enter pressed" and setBusy landing. Two
  // fast Enters both passed the state check and both posted, so the reply
  // arrived twice and bumped reply_count twice.
  const sending = useRef(false);

  async function report() {
    setReported(true);
    setActionError(null);
    const res = await reportCommunityItem({ postId: post.id });
    // Roll back on failure, the way block already did. Leaving it stuck on
    // "Reported" told the reader their report had been filed when it had not.
    if (!res.ok) {
      setReported(false);
      setActionError(res.error ?? t("community.reportFailed"));
    }
  }

  async function block() {
    // Optimistic like report, but this one changes what the reader sees, so
    // the feed is refetched: the block filters server-side and every other
    // post by that author should disappear in the same beat.
    setConfirmingBlock(false);
    setBlocked(true);
    setActionError(null);
    const res = await blockCommunityAuthor({ postId: post.id });
    if (res.ok) onChanged();
    else {
      setBlocked(false);
      setActionError(res.error ?? t("community.blockFailed"));
    }
  }

  async function mute() {
    // Quieter than a block: their posts leave this reader's feed, their
    // replies fold, and nothing asks first, because it is undone as easily.
    setMuted(true);
    setActionError(null);
    const res = await muteCommunityAuthor({ postId: post.id });
    if (res.ok) onChanged();
    else {
      setMuted(false);
      setActionError(res.error ?? t("community.muteFailed"));
    }
  }

  const loadReplies = useCallback(async () => {
    setRepliesState("loading");
    const res = await fetchReplies(post.id);
    if (res.state === "ok") {
      setReplies(res.replies);
      setRepliesState("idle");
    } else {
      setRepliesState("error");
    }
  }, [post.id]);

  async function toggleReplies() {
    const next = !open;
    setOpen(next);
    if (next && replies === null) await loadReplies();
  }

  // ── Answering a notification ─────────────────────────────────────────────
  // The reader tapped "replied to your post" and this is the post. It used to
  // be scrolled to and nothing more. Now the card comes into view with a gold
  // light on it and its thread open, and when the replies have arrived the
  // one the row was about is brought to the middle of the screen and lit in
  // its turn.
  //
  // Each step runs once per tap (the nonce), and is marked done inside its
  // timer rather than before it: under StrictMode an effect is run, cleaned
  // up and run again, and a step marked done up front would be cancelled by
  // the clean-up and never happen. The state is set from the timer, not from
  // the effect's own body (the set-state-in-effect discipline; WritingReader
  // restores a reading position the same way).
  const cardRef = useRef<HTMLElement | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const focusNonce = focus?.nonce ?? 0;
  const focusReply = focus?.replyId ?? null;
  const cardStep = useRef(0);
  const replyStep = useRef(0);
  const repliesLoaded = replies !== null;
  useEffect(() => {
    if (!focusNonce || cardStep.current === focusNonce) return;
    const id = window.setTimeout(() => {
      cardStep.current = focusNonce;
      setOpen(true);
      if (!repliesLoaded) void loadReplies();
      setLit("post");
      cardRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusNonce, repliesLoaded, loadReplies]);
  useEffect(() => {
    if (!focusNonce || !focusReply || !repliesLoaded || replyStep.current === focusNonce) return;
    // A moment after the rows are in the page, and after the card's own
    // scroll has started, so this one is the scroll that settles.
    const id = window.setTimeout(() => {
      const el = document.getElementById(replyAnchorId(focusReply));
      // Folded behind "a reply from someone you muted", or removed since: the
      // open thread is all there is to show.
      if (!el) return;
      replyStep.current = focusNonce;
      setLit(focusReply);
      el.scrollIntoView({ block: "center", behavior: scrollBehavior() });
    }, 420);
    return () => window.clearTimeout(id);
  }, [focusNonce, focusReply, repliesLoaded, replies]);
  useEffect(() => {
    if (!lit) return;
    const id = window.setTimeout(() => setLit(null), LIT_MS);
    return () => window.clearTimeout(id);
  }, [lit]);

  async function sendReply(text: string, retryOf?: number, confirmFiltered = false) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setActionError(null);

    const tempId = retryOf ?? ++pendingSeq;
    setPending((list) =>
      retryOf
        ? list.map((p) => (p.tempId === retryOf ? { ...p, status: "sending" } : p))
        : [...list, { tempId, body: text, status: "sending" }],
    );
    if (!retryOf) setDraft("");

    const res = await addReply(post.id, text, confirmFiltered);
    sending.current = false;
    setBusy(false);

    if (!res.ok && res.code === "filtered") {
      // Not sent: the word filter would mask some of it. Ask first.
      setPending((list) => list.filter((p) => p.tempId !== tempId));
      setAskReply(text);
      return;
    }
    if (res.ok && res.held) {
      // Kept, and waiting for a moderator: not in the thread yet, and said so.
      setPending((list) => list.filter((p) => p.tempId !== tempId));
      setReplyNotice(t("community.heldReplyNotice"));
      return;
    }
    if (!res.ok && res.code && ["duplicate", "too_many_links", "too_many_mentions", "slow_down", "slow_down_new"].includes(res.code)) {
      // The spam filter's refusal: back to the box, with the reason.
      setPending((list) => list.filter((p) => p.tempId !== tempId));
      setDraft(text);
      setActionError(
        res.code === "duplicate"
          ? t("community.err.duplicate")
          : res.code === "too_many_links"
            ? t("community.err.tooManyLinks", { count: res.limit ?? 0 })
            : res.code === "too_many_mentions"
              ? t("community.err.tooManyMentions", { count: res.limit ?? 0 })
              : res.code === "slow_down_new"
                ? t("community.err.slowDownNew")
                : t("community.err.slowDown"),
      );
      return;
    }
    if (res.ok) {
      // Drop the placeholder and take the server's copy, which carries the
      // real id, author name and timestamp.
      setPending((list) => list.filter((p) => p.tempId !== tempId));
      const fresh = await fetchReplies(post.id);
      if (fresh.state === "ok") setReplies(fresh.replies);
      onChanged();
    } else {
      setPending((list) =>
        list.map((p) => (p.tempId === tempId ? { ...p, status: "failed" } : p)),
      );
      setActionError(res.error ?? t("community.replyFailed"));
    }
  }

  function discardPending(tempId: number) {
    setPending((list) => list.filter((p) => p.tempId !== tempId));
  }

  async function removePost() {
    setConfirmingDelete(false);
    setBusy(true);
    setActionError(null);
    const res = await deleteCommunityPost(post.id);
    setBusy(false);
    if (res.ok) onChanged();
    else setActionError(res.error ?? t("community.deleteFailed"));
  }

  // The thread's own count, once it has been opened: reply_count is the
  // server's snapshot from the last feed load and goes stale the moment the
  // reader adds one.
  const shownCount = replies ? replies.length : post.reply_count;
  const pinned = Boolean(post.pinned_at);
  const feast = post.category === "feast";
  const question = post.category === "question";
  // In a question, what verified clergy said comes first, then the rest in
  // the order it was said.
  const orderedReplies = useMemo(
    () =>
      question && replies
        ? [...replies].sort((a, b) => (b.author_clergy ? 1 : 0) - (a.author_clergy ? 1 : 0))
        : (replies ?? []),
    [question, replies],
  );

  // An announcement folds sooner: it sits above everything else.
  const longBody =
    (post.body?.length ?? 0) > (pinned ? 260 : 560) ||
    (post.body ?? "").split("\n").length > (pinned ? 4 : 8);
  const longQuote = (post.quote_text?.length ?? 0) > 520;
  const folded = (longBody || longQuote) && !unfolded;

  const authorHandle = post.author_handle ?? null;
  const seed: ProfileSeed | null = authorHandle
    ? {
        handle: authorHandle,
        name: post.author_name,
        avatar: post.author_avatar,
        verified: post.author_verified,
        tier: post.author_mark ?? null,
        decoration: post.author_decoration ?? null,
        clergy: post.author_clergy ?? null,
        nameColor: post.author_name_color ?? null,
      }
    : null;
  const menuItems: ActionMenuItem[] = [];
  if (authorHandle && seed) {
    menuItems.push({ label: t("community.viewProfile"), onSelect: () => opener?.open(authorHandle, seed) });
  }
  if (mine) {
    menuItems.push({ label: t("community.delete"), onSelect: () => setConfirmingDelete(true), danger: true, disabled: busy });
  } else if (me) {
    // Both require an account: an anonymous report cannot be weighed or
    // rate-limited, and a block has to belong to somebody to be applied.
    // Reporting asks someone else to act; blocking takes effect for this
    // reader straight away. App Review guideline 1.2 asks for both.
    menuItems.push({
      label: reported ? t("community.reported") : t("community.report"),
      onSelect: () => void report(),
      disabled: reported,
    });
    menuItems.push({
      label: muted ? t("community.muted") : t("community.mute"),
      onSelect: () => void mute(),
      disabled: muted,
    });
    menuItems.push({
      label: blocked ? t("community.blocked") : t("community.block"),
      onSelect: () => setConfirmingBlock(true),
      danger: true,
      disabled: blocked,
    });
  }

  return (
    <article
      ref={cardRef}
      id={postAnchorId(post.id)}
      // scroll-mt clears the sticky mobile top bar when a notification link
      // scrolls this row into view.
      //
      // A PINNED POST IS MARKED, NOT JUST MOVED. Sitting at the top of a
      // reverse-chronological feed is ambiguous: it reads as the newest post,
      // and a reader who came back an hour later would think nothing had been
      // written since. The gold edge and the label say the position is
      // deliberate.
      className={cn(
        // content-visibility: a card off screen is not laid out or painted
        // until it comes near, which is most of what scrolling a long feed
        // costs. The intrinsic size keeps the scrollbar honest meanwhile.
        "scroll-mt-24 rounded-2xl border p-5 [contain-intrinsic-size:auto_320px] [content-visibility:auto]",
        pinned
          ? "border-gold/35 bg-gold/[0.06]"
          : "border-paper/10 bg-paper/[0.03]",
        lit === "post" && "notify-lit",
      )}
    >
      {feast ? (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill border border-premium/45 bg-premium/[0.10] px-2.5 py-1 font-sans text-eyebrow font-semibold text-premium-ink">
          <CrossIcon size={12} />
          {pinned ? t("community.feastToday") : t("community.feastDay")}
        </p>
      ) : question ? (
        <p className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-premium/40 bg-premium/[0.08] px-2.5 py-1 font-sans text-eyebrow font-semibold text-premium-ink">
            {t("community.askAPriest")}
          </span>
          {(post.clergy_reply_count ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-pill border border-paper/15 px-2.5 py-1 font-sans text-eyebrow font-semibold text-paper/80">
              <ClergySeal mark="clergy" size={12} />
              {t("community.answeredByClergy")}
            </span>
          ) : null}
        </p>
      ) : null}
      {pinned && !feast && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-gold/[0.10] px-2.5 py-1 font-sans text-eyebrow font-semibold text-gold">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 17v5" />
            <path d="M9 10.8V4h6v6.8l3 3.2H6l3-3.2Z" />
          </svg>
          {t("community.announcement")}
        </p>
      )}
      <div className="flex items-center gap-3">
        {/* The name and picture open the author's profile. */}
        <AuthorButton seed={seed} className="flex min-w-0 items-center gap-3">
          <Avatar name={post.author_name} url={post.author_avatar} decoration={post.author_decoration} />
          <span className="block min-w-0">
            <span className="flex items-center gap-1 font-sans text-ui font-semibold text-paper">
              <span
                className={cn(
                  "truncate",
                  nameColorClass(post.author_name_color),
                  authorHandle && "decoration-paper/40 underline-offset-2 group-hover:underline",
                )}
              >
                {post.author_name}
              </span>
              <ClergySeal mark={post.author_clergy} />
              {post.author_verified ? <VerifiedBadge /> : null}
              {/* After the tick when both: standing first, support second. */}
              <SupporterMark tier={post.author_mark} />
            </span>
            <span className="block font-sans text-eyebrow text-paper/45">
              {timeAgo(post.created_at)} · {t(POST_KIND_KEYS[post.kind])}
            </span>
          </span>
        </AuthorButton>
        <ActionMenu className="ml-auto shrink-0" label={t("community.postActions")} items={menuItems} />
        <ConfirmDialog
          open={confirmingBlock}
          title={t("community.blockConfirmTitle", { name: post.author_name })}
          description={t("community.blockConfirmBody")}
          confirmLabel={t("community.block")}
          cancelLabel={t("common.cancel")}
          destructive
          onConfirm={() => void block()}
          onCancel={() => setConfirmingBlock(false)}
        />
        <ConfirmDialog
          open={confirmingDelete}
          title={t("community.deleteConfirmTitle")}
          description={t("community.deleteConfirmBody")}
          confirmLabel={t("community.delete")}
          cancelLabel={t("common.cancel")}
          destructive
          pending={busy}
          onConfirm={() => void removePost()}
          onCancel={() => setConfirmingDelete(false)}
        />
        <ConfirmDialog
          open={askReply !== null}
          title={t("community.filteredTitle")}
          description={t("community.filteredBody")}
          confirmLabel={t("community.filteredPost")}
          cancelLabel={t("community.filteredEdit")}
          pending={busy}
          onConfirm={() => {
            const text = askReply;
            setAskReply(null);
            if (text) void sendReply(text, undefined, true);
          }}
          onCancel={() => {
            // Back to the box, as written, to change.
            if (askReply) setDraft(askReply);
            setAskReply(null);
          }}
        />
      </div>

      {post.title ? (
        <h3 className="mt-3 text-title-sm leading-snug text-paper">
          <SymbolText text={post.title} />
        </h3>
      ) : null}

      {post.quote_text ? (
        // The house treatment for a verbatim quotation, matching the five
        // other surfaces that carry one: ApologeticsReader, TopicReader,
        // FlorilegiumDetail and FlorilegiumPickerSheet all use a 1px gold
        // rule at 40% with no fill. This was the only one that reached for a
        // 2px rule on a filled rounded card, which read as a callout rather
        // than a quotation and made the same Father look different depending
        // on which screen you met him.
        <blockquote className="mt-3 border-l border-gold/40 pl-5">
          <p
            className={cn(
              "font-serif italic text-body leading-[1.7] text-paper/90",
              longQuote && folded && "line-clamp-6",
            )}
          >
            {post.quote_text}
          </p>
          <footer className="mt-2 font-sans text-caption text-paper/55">
            {post.quote_href ? (
              <Link href={post.quote_href} className="hover:text-paper">
                {post.quote_source}
              </Link>
            ) : (
              post.quote_source
            )}
          </footer>
        </blockquote>
      ) : null}

      {post.body ? (
        <p
          className={cn(
            "mt-3 whitespace-pre-wrap break-words font-sans text-ui leading-relaxed text-paper/80",
            longBody && folded && (pinned ? "line-clamp-4" : "line-clamp-6"),
          )}
        >
          {/* Folded, the paragraphs run on: a clamp that lands on the blank
              line between two paragraphs shows an ellipsis on nothing. */}
          <MentionText text={longBody && folded ? post.body.replace(/\s*\n+\s*/g, " ") : post.body} />
        </p>
      ) : null}
      {longBody || longQuote ? (
        <button
          type="button"
          onClick={() => setUnfolded((v) => !v)}
          aria-expanded={unfolded}
          className="hit-44 mt-2 font-sans text-detail font-semibold text-paper/70 hover:text-paper"
        >
          {unfolded ? t("community.showLess") : t("community.readMore")}
        </button>
      ) : null}
      {feast && post.feast_slug ? (
        <Link
          href={`/saints/${post.feast_slug}`}
          className="mt-2 inline-flex font-sans text-detail font-semibold text-premium-ink hover:text-paper"
        >
          {t("community.feastReadLife")}
        </Link>
      ) : null}

      {/* One action row. Reactions and replies are both "what you can do with
          this post", and stacking them put a lone like button above a lone
          reply count with nothing tying them together. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ReactionButtons
          postId={post.id}
          likeCount={post.like_count}
          dislikeCount={post.dislike_count}
          mine={myReaction}
          canReact={Boolean(me)}
        />
        <ResponseButtons postId={post.id} counts={countsOf(post)} mine={myResponses} canRespond={Boolean(me)} />
        <button
          type="button"
          onClick={() => void toggleReplies()}
          aria-expanded={open}
          // h-9 to match the reaction pills exactly. items-center alone cannot
          // line up two things of different heights when one of them is a bare
          // text button: the optical baseline lands wherever the shorter one's
          // box happens to put it.
          className="inline-flex h-9 items-center font-sans text-detail font-medium text-paper/55 hover:text-paper"
        >
          {tn("community.replyCount", shownCount)}
          {open ? " ▴" : " ▾"}
        </button>
      </div>

      {actionError ? (
        <p className="mt-2 font-sans text-detail text-rose-300" role="alert">
          {actionError}
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3 border-t border-white/6 pt-3">
          {question ? (
            <p className="font-sans text-caption leading-relaxed text-paper/50">{t("community.askThreadNote")}</p>
          ) : null}
          {repliesState === "loading" && replies === null ? (
            <div aria-busy aria-label={t("community.loadingReplies")}>
              <SkeletonList rows={2} />
            </div>
          ) : repliesState === "error" && replies === null ? (
            <div className="rounded-lg border border-paper/10 bg-black/20 p-4 text-center">
              <p className="font-sans text-detail text-paper/70">
                {t("community.repliesFailed")}
              </p>
              <button
                type="button"
                onClick={() => void loadReplies()}
                className="mt-2 font-sans text-detail font-semibold text-gold-pale hover:text-paper"
              >
                {t("community.tryAgain")}
              </button>
            </div>
          ) : (
            orderedReplies.map((r) =>
              r.author_muted && !opened.has(r.id) ? (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setOpened((s) => new Set(s).add(r.id))}
                  className="block w-full rounded-lg border border-dashed border-paper/12 px-3 py-2 text-left font-sans text-caption text-paper/45 hover:text-paper/70"
                >
                  {t("community.mutedReply")}
                </button>
              ) : (
              <div
                key={r.id}
                id={replyAnchorId(r.id)}
                className={cn(
                  "flex scroll-mt-28 items-start gap-2.5 rounded-xl",
                  question && r.author_clergy && "border border-premium/30 bg-premium/[0.05] p-2.5",
                  // The light reaches a little past the words (the loose
                  // variant), so it reads as a row and the row does not move.
                  lit === r.id && "notify-lit notify-lit-loose",
                )}
              >
                <AuthorButton
                  seed={replySeed(r)}
                  decorative
                  className="shrink-0 rounded-full"
                >
                  <Avatar name={r.author_name} url={r.author_avatar} size={28} decoration={r.author_decoration} />
                </AuthorButton>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1 font-sans text-caption text-paper/50">
                    {r.author_handle ? (
                      <AuthorButton
                        seed={replySeed(r)}
                        className={cn(
                          "font-semibold text-paper/80 decoration-paper/40 underline-offset-2 hover:text-paper hover:underline",
                          nameColorClass(r.author_name_color),
                        )}
                      >
                        {r.author_name}
                      </AuthorButton>
                    ) : (
                      <span className={cn("font-semibold text-paper/80", nameColorClass(r.author_name_color))}>{r.author_name}</span>
                    )}
                    <ClergySeal mark={r.author_clergy} size={14} />
                    <SupporterMark tier={r.author_mark} size={14} />
                    <span>· {timeAgo(r.created_at)}</span>
                    {question && r.author_clergy ? (
                      <span className="rounded-pill bg-premium/15 px-2 py-0.5 font-semibold text-premium-ink">{t("community.clergyAnswer")}</span>
                    ) : null}
                  </p>
                  <p className="whitespace-pre-wrap break-words font-sans text-detail leading-relaxed text-paper/80">
                    <MentionText text={r.body} />
                  </p>
                  {/*
                    Asked for twice by readers, on 25 August and again on 20
                    September ("it would be cool to be able to like responses").
                    Everything underneath already supported it: the table
                    carries the counts, a trigger keeps them, the reactions
                    route takes a replyId, and /api/community/mine returns the
                    reader's own. The thread never selected the counts and the
                    row never drew the button.
                  */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <ReactionButtons
                      replyId={r.id}
                      likeCount={r.like_count ?? 0}
                      dislikeCount={r.dislike_count ?? 0}
                      mine={myReplyReactions[r.id] ?? null}
                      canReact={Boolean(me)}
                      size="reply"
                    />
                    <ResponseButtons
                      replyId={r.id}
                      counts={countsOf(r)}
                      mine={myReplyResponses[r.id] ?? NO_KINDS}
                      canRespond={Boolean(me)}
                      size="reply"
                    />
                  </div>
                </div>
              </div>
              ),
            )
          )}
          {replyNotice ? (
            <p role="status" className="rounded-lg border border-sage/30 bg-sage/[0.07] px-3 py-2 font-sans text-caption text-paper/80">
              {replyNotice}
            </p>
          ) : null}

          {/* The reader's own replies, still in flight or failed. */}
          {pending.map((p) => (
            <div key={p.tempId} className="flex items-start gap-2.5">
              <Avatar name={me?.name ?? "R"} url={me?.avatar ?? null} size={28} />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-caption text-paper/50">
                  <span className="font-semibold text-paper/80">
                    {me?.name ?? ""}
                  </span>{" "}
                  ·{" "}
                  {p.status === "sending"
                    ? t("community.replySending")
                    : t("community.replyNotSent")}
                </p>
                <p
                  className={
                    "whitespace-pre-wrap font-sans text-detail leading-relaxed " +
                    (p.status === "failed" ? "text-paper/50" : "text-paper/60")
                  }
                >
                  {p.body}
                </p>
                {p.status === "failed" ? (
                  <div className="mt-1 flex gap-3">
                    <button
                      type="button"
                      onClick={() => void sendReply(p.body, p.tempId)}
                      disabled={busy}
                      className="font-sans text-caption font-semibold text-gold-pale hover:text-paper disabled:opacity-50"
                    >
                      {t("community.tryAgain")}
                    </button>
                    <button
                      type="button"
                      onClick={() => discardPending(p.tempId)}
                      className="font-sans text-caption font-semibold text-paper/45 hover:text-paper/80"
                    >
                      {t("community.discard")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {me ? (
            <div className="flex gap-2">
              <MentionField
                as="input"
                value={draft}
                onChange={setDraft}
                maxLength={2000}
                placeholder={t("community.replyPlaceholder")}
                className={field + " !py-2"}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  // Same guard the button carries. Without it, Enter was the
                  // one path that could post an empty or duplicate reply.
                  if (busy || !draft.trim()) return;
                  void sendReply(draft.trim());
                }}
              />
              <button
                type="button"
                onClick={() => void sendReply(draft.trim())}
                disabled={busy || !draft.trim()}
                className="shrink-0 rounded-pill bg-paper px-4 font-sans text-detail font-semibold text-night disabled:opacity-50"
              >
                {t("community.reply")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Memoised: with the feed reconciled on every refresh, a card whose post,
 * reaction and handlers did not change is not rendered again.
 */
const PostCard = memo(PostCardInner);

/**
 * An author's name and picture, as the way into their profile.
 *
 * A post or reply from before profiles has no @handle, and then this is the
 * plain row it always was. `decorative` is for a picture beside a name that
 * opens the same profile: one stop for the keyboard and the screen reader,
 * not two.
 */
function AuthorButton({
  seed,
  decorative = false,
  className,
  children,
}: {
  seed: ProfileSeed | null;
  decorative?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const opener = useContext(ProfileOpenerContext);
  if (!seed || !opener) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={() => opener.open(seed.handle, seed)}
      // The profile starts loading as the finger lands, before the tap ends.
      onPointerDown={() => prefetchProfile(seed.handle)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") opener.hover(seed.handle, seed, e.currentTarget);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") opener.leave();
      }}
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative ? true : undefined}
      className={cn("group text-left", className)}
    >
      {children}
    </button>
  );
}

function replySeed(r: CommunityReply): ProfileSeed | null {
  return r.author_handle
    ? {
        handle: r.author_handle,
        name: r.author_name,
        avatar: r.author_avatar,
        verified: r.author_verified,
        tier: r.author_mark ?? null,
        decoration: r.author_decoration ?? null,
        clergy: r.author_clergy ?? null,
        nameColor: r.author_name_color ?? null,
      }
    : null;
}

/**
 * Text with its @mentions made into ways to the person mentioned. Plain text
 * when there are none, which is almost always, so nothing extra is drawn.
 */
function MentionText({ text }: { text: string }) {
  const opener = useContext(ProfileOpenerContext);
  const parts = useMemo(() => splitMentions(text), [text]);
  if (!opener || parts.every((p) => !("handle" in p))) return <SymbolText text={text} />;
  return (
    <>
      {parts.map((p, i) =>
        "handle" in p ? (
          <button
            key={i}
            type="button"
            onClick={() => opener.open(p.handle)}
            onPointerDown={() => prefetchProfile(p.handle)}
            className="font-semibold text-link-soft hover:underline"
          >
            {p.text}
          </button>
        ) : (
          <span key={i}>
            <SymbolText text={p.text} />
          </span>
        ),
      )}
    </>
  );
}

/**
 * The verified badge.
 *
 * shrink-0 beside a truncating name: without it the check is the thing that
 * gets squeezed out on a narrow screen, which is exactly backwards, since the
 * name is already readable when truncated and a half-drawn tick is not.
 *
 * aria-label rather than a decorative hidden icon. Whether an account is
 * verified is information, not ornament, and a screen reader should say so.
 */
function VerifiedBadge() {
  const { t } = useTranslate();
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      className="shrink-0"
      role="img"
      aria-label={t("community.verified")}
    >
      <path
        fill="currentColor"
        className="text-gold"
        d="M12 1.6l2.3 2.1 3.1-.4 1.2 2.9 2.9 1.2-.4 3.1L23.2 14l-2.1 2.3.4 3.1-2.9 1.2-1.2 2.9-3.1-.4L12 25.2 9.7 23.1l-3.1.4-1.2-2.9-2.9-1.2.4-3.1L.8 14l2.1-2.3-.4-3.1 2.9-1.2 1.2-2.9 3.1.4z"
        transform="translate(0 -1.6) scale(1)"
      />
      <path
        d="M8.2 12.4l2.6 2.6 5-5.2"
        fill="none"
        stroke="var(--color-night, #14121a)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
