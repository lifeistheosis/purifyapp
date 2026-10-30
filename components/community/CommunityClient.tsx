"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, Fragment, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { MentionField } from "@/components/community/MentionField";
import { CommunityAvatar as Avatar } from "@/components/community/CommunityAvatar";
import { CommunityBell } from "@/components/community/CommunityBell";
import { CommunityHead } from "@/components/community/CommunityHead";
import { FeedTabs } from "@/components/community/FeedTabs";
import { MyProfileCard, PlusProfileNudge } from "@/components/community/CommunitySide";
import { PrayTogether } from "@/components/community/PrayTogether";
import type { CommunityNotification } from "@/lib/community/inbox";
import { notificationTarget } from "@/lib/community/notificationTarget";
import { ProfileHoverCard, type HoverTarget } from "@/components/community/profile/ProfileHoverCard";
import { ProfileViewer } from "@/components/community/profile/ProfileViewer";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  feedSliders,
  feedTabs,
  halfFromHash,
  hashForHalf,
  type CommunityHalf,
  type FeedFilter,
} from "@/lib/community/halves";
import { runningCampaign } from "@/lib/community/runningCampaign";
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
import { SupporterMark } from "@/components/community/SupporterMark";
import type { ReactionState } from "@/lib/community/reactions";
import { countsOf, type ResponseKind } from "@/lib/community/responses";
import { validChapterRef } from "@/lib/community/chapterRef";
import { getBook } from "@/lib/bible/books";
import { nameColorClass } from "@/lib/profile/nameColor";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { Book } from "@/components/ui/icons/Book";
import { Cross as CrossIcon } from "@/components/ui/icons/Cross";
import { Quill } from "@/components/ui/icons/Quill";
import { Share } from "@/components/ui/icons/Share";
import { PurifyMark } from "@/components/ui/PurifyMark";
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
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

// A line shared as a picture opens the picture sheet the verse and the
// saints use, loaded on the first tap: the feed carries no canvas for a
// reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * Community: Pray together and Talk together.
 *
 * 1.8, the owner's pick of r3-02, "B with A's top" (Homebase/boards/
 * purify-master/variants/r3-02-community.html; his notes 18 and 19 of build
 * 80): one switch at the top. Talk together is the conversation, with three
 * words across it (All, Ask a Priest, Discussion), Following, Scripture and
 * the Fathers behind the sliders, and posts set like a page, with no boxes.
 * Pray together opens with A's head, the Pentecost icon fading in behind the
 * name and the campaign running now under it (none runs in 1.8), and the
 * prayer wall, which left the bar of pills.
 *
 * Conversations carry three kinds of post: a discussion in the reader's own
 * words, or a VERBATIM shared line from the reader's Florilegium (scripture
 * or a Father, with its citation) plus an optional reflection. Shares can
 * only come from lines gathered inside Purify's own vetted library, so no
 * fresh doctrinal text enters the app through this surface.
 */

/** The feed's filters: everything, who you follow, Ask a Priest, or one kind. */
type Filter = FeedFilter;

/** The switch's ids: `${HALF_ID}-tab-pray`, and the panel under it. */
const HALF_ID = "community-half";

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

/** How long the light on a post or a reply lasts before it is cleared. */
const LIT_MS = 2800;

/**
 * A post's words are set at 15px on 22px lines (1.8, r3-02 B). The fold
 * counts its lines in these ems where a browser cannot count in lines.
 */
const BODY_LEAD = 22 / 15;

/** The parish group whose thread the URL is asking for, if any. */
function groupFromHash(hash: string): string | null {
  if (!hash.startsWith("#group-")) return null;
  const id = hash.slice("#group-".length);
  // A uuid and nothing else. The value is put straight into a query string,
  // and the route refuses a non-member anyway, but a malformed id should
  // never reach it in the first place.
  return /^[0-9a-fA-F-]{36}$/.test(id) ? id : null;
}

/**
 * The half and the group's thread the address asks for, and the switch.
 *
 * Until 1.8 this chose between two panels, Prayer campaigns and
 * Conversations, and drew that choice only while campaigns were on, which
 * they have not been since 2026-08-26. The switch is now always there, Pray
 * together and Talk together (lib/community/halves.ts), and the campaigns'
 * old board is no longer set inside Community: in 1.9 campaigns come into
 * Pray together, under its head (lib/community/runningCampaign.ts).
 *
 * The half is read from the address, so it can be linked to (#pray) and a
 * notification's #post- or #@handle lands in Talk together, where those are.
 */
export function CommunityClient() {
  const [half, setHalf] = useState<CommunityHalf>("talk");
  const [groupId, setGroupId] = useState<string | null>(null);

  // Read the hash after mount rather than during render: the server render
  // has no location, and reading it in the initial state would hydrate
  // mismatched whenever someone opens a #post- link.
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash;
      setHalf(halfFromHash(hash));
      setGroupId(groupFromHash(hash));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const choose = useCallback((next: CommunityHalf) => {
    setHalf(next);
    // Switching halves by hand leaves any group scope behind: a group thread
    // is only ever reached by its own link.
    setGroupId(null);
    // replaceState, not a router push: switching a half is not a new page in
    // the reader's history, and pushing would make Back walk the switch.
    window.history.replaceState(null, "", window.location.pathname + window.location.search + hashForHalf(next));
  }, []);

  // A post asked for from Pray together (a notification, a post on someone's
  // profile) is in Talk together, so the page goes there to show it. The
  // address is the post's, set by whoever asked.
  const showTalk = useCallback(() => setHalf("talk"), []);

  return <CommunityScreen half={half} groupId={groupId} onChoose={choose} onShowTalk={showTalk} />;
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

/* ── The screen: the head, then Pray together or Talk together ──────────── */

function CommunityScreen({
  half,
  groupId,
  onChoose,
  onShowTalk,
}: {
  half: CommunityHalf;
  groupId: string | null;
  onChoose: (next: CommunityHalf) => void;
  /** Open Talk together without touching the address (a post was asked for). */
  onShowTalk: () => void;
}) {
  const { t, tn } = useTranslate();
  // Pray together, unless a group's thread is open: that is a conversation.
  const praying = half === "pray" && !groupId;
  // The campaign running now, for Pray together's head. None runs in 1.8.
  const campaign = runningCampaign();
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
    onShowTalk();
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
  }, [onShowTalk]);
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
    {/* The head: the page's name and the bell, the switch, and in Pray
        together the Pentecost icon behind them. */}
    <CommunityHead
      half={half}
      onChoose={onChoose}
      showSwitch={!groupId}
      idBase={HALF_ID}
      bell={authSettled && me ? <CommunityBell onOpen={openNotification} onPicture={praying} /> : null}
    />
    {/* Positioned, so it is painted over the foot of Pray together's picture,
        which reaches down behind it, and not under it. */}
    <section className="relative mx-auto w-full max-w-[720px] px-5 pb-16 pt-6 lg:grid lg:max-w-[1060px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
      <div
        className="min-w-0"
        // The half the switch has open. A group's thread has no switch.
        {...(groupId ? {} : { role: "tabpanel", id: `${HALF_ID}-panel-${half}`, "aria-labelledby": `${HALF_ID}-tab-${half}` })}
      >
        {praying ? (
          <PrayTogether signedIn={Boolean(me)} campaign={campaign} onOpenProfile={(h, seed) => openProfile(h, seed)} />
        ) : result?.state === "dark" ? (
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
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.04] px-4 py-3">
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

            {/* What kind of post to show: three words, and the rest behind
                the sliders (FeedTabs). The feed is fifty posts, already here,
                so a kind filters on the device and asks nothing of the server.
                Following and Ask a Priest ask: each is its own list. */}
            {result === undefined ? (
              <div aria-hidden className="flex h-11 items-end gap-6 border-b border-paper/[0.08] pb-3">
                {[28, 84, 76].map((w) => (
                  <Skeleton key={w} weight="faint" className="h-3.5 shrink-0" style={{ width: w }} />
                ))}
              </div>
            ) : (
              <FeedTabs
                tabs={feedTabs(Boolean(groupId))}
                sliders={feedSliders({ signedIn: Boolean(me), inGroup: Boolean(groupId) })}
                filter={filter}
                onFilter={setFilter}
              />
            )}

            <div className="mt-3.5">
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
                // The sign-in is still being read. The row holds its place, so
                // what follows does not start at the top of the screen and get
                // pushed down a moment later (filmed 2026-10-05: the page
                // arrived in four steps, each one moving the last).
                <Skeleton weight="faint" rounded="rounded-[14px]" className="h-[42px] w-full" />
              )}
            </div>

            {giftSent ? (
              <p role="status" className="mt-5 rounded-xl border border-premium/30 bg-premium/[0.06] px-4 py-3 font-sans text-detail text-paper/85">
                {t("community.giftSent")}
              </p>
            ) : null}

            {/* The moderators' way to the queue, with how much waits. */}
            {moderator && !groupId ? (
              <Link
                href="/community/moderate"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-paper/15 bg-paper/[0.04] px-4 py-3 font-sans text-detail text-paper/85 transition-colors hover:border-paper/30"
              >
                <span className="font-semibold">{t("community.modButton")}</span>
                <span className={cn("rounded-pill px-2.5 py-0.5 text-caption font-semibold", modWaiting ? "reader-lit bg-paper text-night" : "bg-paper/10 text-paper/60")}>
                  {modWaiting === null ? "…" : tn("community.modWaiting", modWaiting)}
                </span>
              </Link>
            ) : null}

            {gone ? (
              <p role="status" className="mt-5 rounded-xl border border-paper/12 bg-paper/[0.03] px-4 py-3 font-sans text-detail text-paper/70">
                {t("community.postGone")}
              </p>
            ) : null}
            {/* The post a notification pointed at, when the feed no longer
                holds it. The same card as in the feed, so everything a reader
                can do to a post they can do here, and a line under it before
                the feed begins. */}
            {linked && !feedPostIds.has(linked.id) ? (
              <div className="relative mt-3 border-b border-paper/[0.08]">
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
                  className="absolute -right-2 top-1 inline-flex size-9 items-center justify-center rounded-full border border-paper/15 bg-night text-paper/70 shadow-pop transition-colors hover:text-paper"
                >
                  <Close size={15} />
                </button>
              </div>
            ) : null}

            {/* The feed, set like a page: no box around a post, a hairline
                between one and the next. */}
            <div className="mt-2">
              {result === undefined ? (
                // The conversations feed is fetched on the device, so a route
                // loading.tsx never covers this wait. Skeleton rows rather than
                // a line of text: they say how much is coming and where it will
                // sit, and the swap is a change of contents rather than a
                // reflow. The word "Gathering" is kept as the accessible name.
                <div aria-busy aria-label={t("community.gathering")} className="pt-3">
                  <SkeletonList rows={4} />
                </div>
              ) : result.state === "error" ? (
                // Say so, and offer the way out. Rendering the empty state here
                // would tell the reader the community is quiet when in fact we
                // could not reach it.
                <div className="mt-3 rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
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
                <div className="mt-3 rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
                  <p className="font-serif text-lede text-paper/80">
                    {t("community.quietHere")}
                  </p>
                  <p className="mt-2 font-sans text-ui text-paper/55">
                    {t("community.quietHereBody")}
                  </p>
                </div>
              ) : (filter === "following" && followingFeed === undefined) || (filter === "questions" && questionsFeed === undefined) ? (
                <div aria-busy aria-label={t("community.gathering")} className="pt-3">
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
                shownPosts.map((p, i) => (
                  <Fragment key={p.id}>
                    {i > 0 ? <hr className="border-paper/[0.08]" /> : null}
                    <PostCard
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
                  </Fragment>
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
      <Avatar name={me.name} url={me.avatar} size={36} decoration={decoration} />
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
      <Avatar name={me.name} url={me.avatar} size={36} />
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
    <p role="status" className="mt-2 rounded-lg border border-paper/15 bg-paper/[0.05] px-3 py-2 font-sans text-detail text-paper/80">
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
    // Folded, one line with no box around it (1.8, r3-02 B): the reader's
    // picture, a field set into the page, and Share a line beside it.
    return (
      <div data-composer="">
        <div className="flex items-center gap-2.5">
          {avatarButton}
          {fileInput}
          <button
            type="button"
            onClick={() => start(asking ? "question" : "discussion")}
            className="community-well min-h-[42px] min-w-0 flex-1 truncate rounded-[14px] border border-paper/[0.09] bg-black/30 px-3.5 text-left font-sans text-ui text-paper/45 transition-colors hover:border-paper/25 hover:text-paper/65"
          >
            {asking ? t("community.askPrompt") : groupId ? t("community.composePromptGroup") : t("community.composePrompt")}
          </button>
          <button
            type="button"
            onClick={() => start("share")}
            className="tap-press inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-[14px] border border-paper/10 bg-gradient-to-b from-paper/[0.08] to-paper/[0.03] px-3 font-sans text-detail font-semibold text-paper/80 transition-colors hover:border-paper/30 hover:text-paper"
          >
            <Quill size={16} className="shrink-0" />
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
  // A shared line being made into a picture (PictureSheet).
  const [making, setMaking] = useState(false);
  const mine = myPostIds.has(post.id);
  // The words of a shared line, as a picture carries them: the same object
  // while they are the same, since the sheet draws its preview again when
  // they change.
  const pictureWords = useMemo(
    () => (post.quote_text ? { text: post.quote_text, reference: post.quote_source ?? "" } : null),
    [post.quote_text, post.quote_source],
  );

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
  // Where a fold cuts the words off, its soft fade (app/globals.css, .post-fold).
  const bodyFold = useFoldCut<HTMLParagraphElement>(longBody && folded);
  const quoteFold = useFoldCut<HTMLParagraphElement>(longQuote && folded);

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

  // A thread hangs from the writer's picture while the post has replies.
  const threadHangs = shownCount > 0 || open;

  return (
    <article
      ref={cardRef}
      id={postAnchorId(post.id)}
      // Set like a page (1.8, the owner's pick of r3-02, B): no box around a
      // post, the writer's picture in a rail at the start and the words beside
      // it, a hairline between one post and the next (drawn by the feed). The
      // row reaches a little past the column on each side, inside its own
      // box, so the light a notification brings (notify-lit) has room around
      // the words: content-visibility clips anything drawn outside the box.
      //
      // scroll-mt clears the sticky mobile top bar when a notification link
      // scrolls this row into view.
      //
      // A PINNED POST IS MARKED, NOT JUST MOVED. Sitting at the top of a
      // reverse-chronological feed is ambiguous: it reads as the newest post,
      // and a reader who came back an hour later would think nothing had been
      // written since. The label over it says the position is deliberate.
      className={cn(
        // content-visibility: a card off screen is not laid out or painted
        // until it comes near, which is most of what scrolling a long feed
        // costs. The intrinsic size keeps the scrollbar honest meanwhile.
        "community-post -mx-3 scroll-mt-24 rounded-2xl px-3 py-4 [contain-intrinsic-size:auto_320px] [content-visibility:auto]",
        lit === "post" && "notify-lit",
      )}
    >
      {/* What the post is for, over it, in small capitals: no pills. */}
      {feast || question || pinned ? (
        <p className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[10.5px] font-bold uppercase leading-tight tracking-[0.1em] text-paper/65">
          {feast ? (
            <span className="inline-flex items-center gap-1.5 text-premium-ink">
              <CrossIcon size={12} />
              {pinned ? t("community.feastToday") : t("community.feastDay")}
            </span>
          ) : question ? (
            <>
              <span>{t("community.askAPriest")}</span>
              {(post.clergy_reply_count ?? 0) > 0 ? (
                <>
                  <span aria-hidden className="text-paper/30">·</span>
                  <span className="inline-flex items-center gap-1 text-paper/85">
                    <ClergySeal mark="clergy" size={13} />
                    {t("community.answeredByClergy")}
                  </span>
                </>
              ) : null}
            </>
          ) : null}
          {pinned && !feast ? (
            <span className="inline-flex items-center gap-1.5 text-paper/80">
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
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-x-3">
        {/* The rail: the writer's picture, and while the post has replies a
            line running down from it, as a thread hangs from what was said. */}
        <div className="flex flex-col items-center">
          <AuthorButton seed={seed} decorative className="shrink-0 rounded-full">
            <Avatar name={post.author_name} url={post.author_avatar} size={38} decoration={post.author_decoration} />
          </AuthorButton>
          {threadHangs ? <span aria-hidden className="community-rail mb-1.5 mt-2 w-[1.5px] flex-1 rounded-full" /> : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-start gap-1">
            {/* The name opens the author's profile; when and what, after it. */}
            <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 pt-0.5 leading-tight">
              <AuthorButton seed={seed} className="inline-flex min-w-0 max-w-full items-center gap-1 font-sans text-[14.5px] font-semibold text-paper">
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
              </AuthorButton>
              <span className="font-sans text-[12.5px] text-paper/50">
                · {timeAgo(post.created_at)} · {t(POST_KIND_KEYS[post.kind])}
              </span>
            </p>
            <ActionMenu className="-me-1.5 -mt-1 shrink-0" label={t("community.postActions")} items={menuItems} />
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
            <h3 className="mt-1.5 text-[19px] leading-[1.28] tracking-[-0.005em] text-paper">
              <SymbolText text={post.title} />
            </h3>
          ) : null}

          {post.quote_text ? (
            // A line from Scripture or a Father is a card worth sharing (the
            // owner's rule, 1.8): the words whole under the cross, where they
            // are from, a tap to read them there and Share as a picture. Until
            // 1.8 it was the house quotation, a rule beside the words, which
            // the sheet replaces with this card (r3-02, Anna's verse).
            <figure className="community-quote mt-2.5 rounded-[18px] border border-paper/[0.11] px-4 pb-3 pt-4 text-center">
              <PurifyMark size={22} className="community-quote-mark mx-auto mb-2.5 block text-paper" />
              <blockquote>
                <p
                  ref={quoteFold}
                  className={cn(
                    "whitespace-pre-line font-serif text-[17px] font-medium leading-[1.5] text-paper",
                    longQuote && folded && "post-fold",
                  )}
                  style={longQuote && folded ? foldLines(6, 1.5) : undefined}
                >
                  {post.quote_text}
                </p>
              </blockquote>
              <span aria-hidden className="mx-auto mt-3 block h-[1.5px] w-7 rounded-full bg-paper/70" />
              <figcaption className="mt-2.5 flex items-center justify-between gap-2">
                {post.quote_href ? (
                  <Link
                    href={post.quote_href}
                    aria-label={t("today.saintWords.readSource")}
                    title={t("today.saintWords.readSource")}
                    className="tap-press hit-44 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.07] text-paper/85 hover:text-paper"
                  >
                    <Book size={15} />
                  </Link>
                ) : (
                  <span aria-hidden className="size-8 shrink-0" />
                )}
                <span className="min-w-0 font-sans text-[10.5px] font-bold uppercase leading-snug tracking-[0.16em] text-paper/70">
                  {post.quote_source}
                </span>
                <button
                  type="button"
                  onClick={() => setMaking(true)}
                  aria-label={t("today.verse.shareAsPicture")}
                  title={t("today.verse.shareAsPicture")}
                  className="tap-press hit-44 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.07] text-paper/85 hover:text-paper"
                >
                  <Share size={15} />
                </button>
              </figcaption>
            </figure>
          ) : null}

          {post.body ? (
            <p
              ref={bodyFold}
              className={cn(
                "mt-2 whitespace-pre-wrap break-words font-sans text-[15px] leading-[22px] text-paper/85",
                longBody && folded && "post-fold",
              )}
              style={longBody && folded ? foldLines(pinned ? 4 : 6, BODY_LEAD) : undefined}
            >
              {/* Folded or not, the writer's own lines and paragraphs. The fold
                  ends in a soft fade, so one that lands on the blank line between
                  two paragraphs reads as well as any other. */}
              <MentionText text={post.body} />
            </p>
          ) : null}
          {longBody || longQuote ? (
            <button
              type="button"
              onClick={() => setUnfolded((v) => !v)}
              aria-expanded={unfolded}
              className="hit-44 mt-1.5 inline-flex items-center gap-1 font-sans text-[13.5px] font-semibold text-paper/90 hover:text-paper"
            >
              {unfolded ? t("community.showLess") : t("community.readMore")}
              <ChevronDown size={15} className={cn("motion-safe:transition-transform", unfolded && "rotate-180")} />
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

          {/* One action row, bare words and marks on the page: the like and its
              opposite, Amen and the rest, and the replies at the far end. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
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
              // h-9 to match the reactions exactly. items-center alone cannot
              // line up two things of different heights when one of them is a bare
              // text button: the optical baseline lands wherever the shorter one's
              // box happens to put it.
              className="ms-auto inline-flex h-9 items-center gap-1 ps-1 font-sans text-[13px] font-semibold text-paper/60 hover:text-paper"
            >
              {tn("community.replyCount", shownCount)}
              <ChevronDown size={14} className={cn("motion-safe:transition-transform", open && "rotate-180")} />
            </button>
          </div>

          {actionError ? (
            <p className="mt-2 font-sans text-detail text-rose-300" role="alert">
              {actionError}
            </p>
          ) : null}

          {open ? (
            <div className="mt-3 space-y-3.5 border-t border-paper/[0.06] pt-3.5">
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
                orderedReplies.map((r) => {
                  if (r.author_muted && !opened.has(r.id)) {
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setOpened((s) => new Set(s).add(r.id))}
                        className="block w-full rounded-lg border border-dashed border-paper/12 px-3 py-2 text-left font-sans text-caption text-paper/45 hover:text-paper/70"
                      >
                        {t("community.mutedReply")}
                      </button>
                    );
                  }
                  // In a question, what verified clergy said stands first, in
                  // its own light: a raised panel, white edged, its label lit.
                  const clergyAnswer = question && Boolean(r.author_clergy);
                  return (
                    <div
                      key={r.id}
                      id={replyAnchorId(r.id)}
                      className={cn(
                        "scroll-mt-28 rounded-xl",
                        clergyAnswer && "community-clergy-answer rounded-2xl border border-paper/25 px-3 pb-2 pt-2.5",
                        // The light reaches a little past the words (the loose
                        // variant), so it reads as a row and the row does not move.
                        lit === r.id && "notify-lit notify-lit-loose",
                      )}
                    >
                      {clergyAnswer ? (
                        <p className="community-lit mb-2 flex items-center gap-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.1em] text-paper">
                          <ClergySeal mark={r.author_clergy} size={14} />
                          {t("community.clergyAnswer")}
                        </p>
                      ) : null}
                      <div className="flex items-start gap-2.5">
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
                                  "font-semibold text-paper/85 decoration-paper/40 underline-offset-2 hover:text-paper hover:underline",
                                  nameColorClass(r.author_name_color),
                                )}
                              >
                                {r.author_name}
                              </AuthorButton>
                            ) : (
                              <span className={cn("font-semibold text-paper/85", nameColorClass(r.author_name_color))}>{r.author_name}</span>
                            )}
                            <ClergySeal mark={r.author_clergy} size={14} />
                            {r.author_verified ? <VerifiedBadge size={14} /> : null}
                            <SupporterMark tier={r.author_mark} size={14} />
                            <span>· {timeAgo(r.created_at)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words font-sans text-[13.5px] leading-[1.48] text-paper/85">
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
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
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
                    </div>
                  );
                })
              )}
              {replyNotice ? (
                <p role="status" className="rounded-lg border border-paper/15 bg-paper/[0.05] px-3 py-2 font-sans text-caption text-paper/80">
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
        </div>
      </div>

      {/* A shared line as a picture: the sheet the verse and the saints use. */}
      {making && pictureWords ? (
        <PictureSheet
          open={making}
          onClose={() => setMaking(false)}
          words={pictureWords}
          title={post.kind === "scripture" ? t("picture.title") : (post.quote_source ?? "")}
          name={post.quote_source ?? ""}
          caption={post.quote_source ?? ""}
        />
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
 * A fold of so many lines of a text whose lines are `lead` ems apart: its
 * leading as the text's class sets it, for a browser that cannot count in
 * lines (app/globals.css, .post-fold).
 */
function foldLines(lines: number, lead: number): CSSProperties {
  return { "--fold-lines": lines, "--fold-lead": lead } as CSSProperties;
}

/**
 * Marks a folded text whose words run past its fold with data-cut, so the
 * fold's soft fade is drawn only where something is cut off: a long message
 * on a wide screen can fit its fold whole. Measured by a ResizeObserver, which
 * answers before the fold is first painted and again whenever its box changes
 * size, and written straight to the element, so nothing is drawn again and no
 * card the feed has not laid out yet is laid out for it.
 */
function useFoldCut<T extends HTMLElement>(on: boolean) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => el.toggleAttribute("data-cut", el.scrollHeight > el.clientHeight + 1));
    watch.observe(el);
    return () => {
      watch.disconnect();
      el.removeAttribute("data-cut");
    };
  }, [on]);
  return ref;
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
 *
 * Grey from 1.8, in the house greys beside a name (the owner's pick of r3-02
 * drew the marks so, an open question built as drawn): the clergy seal is
 * the white one, lit (ClergySeal), the tick a quiet grey under it, and the
 * Plus cross silver (SupporterMark). The disc's grey is mixed from the page's
 * own ink and ground (app/globals.css, .verified-tick), so it is grey on
 * every palette, Parchment included.
 */
function VerifiedBadge({ size = 15 }: { size?: number }) {
  const { t } = useTranslate();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="verified-tick shrink-0"
      role="img"
      aria-label={t("community.verified")}
    >
      <path
        className="verified-tick-disc"
        d="M12 1.6l2.36 1.64 2.84-.44 1.2 2.62 2.6 1.24-.46 2.84L22.4 12l-1.86 2.46.46 2.84-2.6 1.24-1.2 2.62-2.84-.44L12 22.4l-2.36-1.64-2.84.44-1.2-2.62-2.6-1.24.46-2.84L1.6 12l1.86-2.46-.46-2.84 2.6-1.24 1.2-2.62 2.84.44L12 1.6z"
      />
      <path
        d="M7.6 12.3l2.9 2.9 5.9-6.1"
        fill="none"
        stroke="var(--color-night, #101013)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
