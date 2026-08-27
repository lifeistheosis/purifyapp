"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { NotificationsInbox } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import {
  addReply,
  createCommunityPost,
  deleteCommunityPost,
  fetchMyCommunityIds,
  blockCommunityAuthor,
  reportCommunityItem,
  fetchCommunityPosts,
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
import { ReactionButtons } from "@/components/community/ReactionButtons";
import type { ReactionState } from "@/lib/community/reactions";
import { SkeletonList } from "@/components/ui/Skeleton";

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
      {/* The pills only exist when there is a choice to make. With campaigns
          dark, a "Prayer campaigns" pill led to an empty board that said
          "No campaigns here yet. Be the first to ask" and two buttons into a
          coming-soon shell, on a primary mobile tab. `campaignsEnabled()` was
          honoured in four other places and missed here. */}
      {campaigns ? (
        <div className="flex justify-center gap-2 px-5 pt-8">
          {(
            [
              ["campaigns", t("community.prayerCampaigns")],
              ["conversations", t("community.conversations")],
            ] as [Panel, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-pressed={panel === id}
              className={
                "rounded-pill px-5 py-2 font-sans text-ui font-semibold transition-colors " +
                (panel === id
                  ? "bg-paper text-night"
                  : "border border-paper/20 text-paper/70 hover:border-paper/40 hover:text-paper")
              }
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {campaigns && panel === "campaigns" ? (
        <CampaignsClient embedded />
      ) : (
        <ConversationsPanel groupId={groupId} />
      )}
    </div>
  );
}

/* ── Conversations ─────────────────────────────────────────────────────── */

function Avatar({
  name,
  url,
  size = 36,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-paper/15 bg-paper/[0.06] font-sans font-semibold text-paper/70"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : (
        (name[0] ?? "R").toUpperCase()
      )}
    </span>
  );
}

function ConversationsPanel({ groupId }: { groupId: string | null }) {
  const { t } = useTranslate();
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
      setFetched((prev) =>
        next.state === "error" &&
        prev?.scope === groupId &&
        prev.value.state === "ok"
          ? prev
          : { scope: groupId, value: next },
      );
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
      setMyPostIds(new Set(ids.postIds));
      setMyReactions(ids.reactions.posts);
    })();
    return () => {
      alive = false;
    };
  }, [version, authSettled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

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

  // Scroll a linked post into view once the feed that contains it exists.
  // Runs on every successful load, not only the first, because the deep link
  // can arrive before the posts do.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (result?.state !== "ok") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#post-")) return;
    if (scrolledFor.current === hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    scrolledFor.current = hash;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [result]);

  return (
    <section className="mx-auto w-full max-w-[680px] px-5 pb-16 pt-8">
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
          {/* What came back to you, above what you might say next. Renders
              nothing when there is nothing, including before the
              notifications migration is applied. */}
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
          {authSettled && me && !groupId ? <NotificationsInbox /> : null}
          {authSettled && me ? (
            <Composer
              me={me}
              groupId={groupId}
              onPosted={reload}
              onAvatarChanged={(url) => setMe((m) => (m ? { ...m, avatar: url } : m))}
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
          ) : null}

          <div className="mt-6 space-y-4">
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
            ) : (
              result.posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  me={me}
                  myPostIds={myPostIds}
                  myReaction={myReactions[p.id] ?? null}
                  onChanged={reload}
                />
              ))
            )}
          </div>

          <p className="mt-8 text-center font-sans text-caption text-paper/40">
            {t("community.houseRules")}
          </p>
        </>
      )}
    </section>
  );
}

/* ── Composer ──────────────────────────────────────────────────────────── */

function Composer({
  me,
  groupId,
  onPosted,
  onAvatarChanged,
}: {
  me: NonNullable<Me>;
  /** When set, the post goes to this parish group rather than the public
   *  feed. The route re-checks membership; this only shapes the request. */
  groupId: string | null;
  onPosted: () => void;
  onAvatarChanged: (url: string) => void;
}) {
  const { t } = useTranslate();
  const [mode, setMode] = useState<"discussion" | "share">("discussion");
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
  const fileRef = useRef<HTMLInputElement>(null);
  const { florilegia } = useFlorilegia();

  const gathered = florilegia.flatMap((f) => f.items);
  const GATHERED_SHOWN = 40;

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res =
      mode === "discussion"
        ? await createCommunityPost({
            kind: "discussion",
            title: title.trim() || null,
            body: body.trim(),
            groupId,
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
              });
            })()
          : { ok: false, error: t("community.pickALine") };
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setPicked(null);
      onPosted();
    } else {
      setError(res.error ?? t("community.postFailed"));
    }
  }

  async function changeAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarError(null);
    const res = await uploadAvatar(file);
    setAvatarBusy(false);
    if (res.ok && res.url) onAvatarChanged(res.url);
    else setAvatarError(res.error ?? t("community.photoFailed"));
  }

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={avatarBusy}
          title={t("community.changePhoto")}
          aria-label={t("community.changePhoto")}
          className="tap-press rounded-full disabled:opacity-50"
        >
          <Avatar name={me.name} url={me.avatar} size={40} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void changeAvatar(f);
            e.target.value = "";
          }}
        />
        <div className="min-w-0">
          <p className="truncate font-sans text-ui font-semibold text-paper">
            {me.name}
          </p>
          <p className="font-sans text-eyebrow text-paper/45">
            {avatarBusy ? t("community.uploadingPhoto") : t("community.tapPhotoToChange")}
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {(
            [
              ["discussion", t("community.discussion")],
              ["share", t("community.shareALine")],
            ] as ["discussion" | "share", string][]
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

      {avatarError ? (
        <p className="mt-2 font-sans text-detail text-rose-300">{avatarError}</p>
      ) : null}

      {mode === "discussion" ? (
        <div className="mt-4 space-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder={t("community.titlePlaceholder")}
            className={field}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={t("community.bodyPlaceholder")}
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
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={
            busy ||
            (mode === "discussion" ? body.trim().length < 2 : !picked)
          }
          className="rounded-pill bg-paper px-6 py-2 font-sans text-ui font-semibold text-night disabled:opacity-50"
        >
          {busy ? t("community.posting") : t("community.post")}
        </button>
      </div>
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

function PostCard({
  post,
  me,
  myPostIds,
  myReaction,
  onChanged,
}: {
  post: CommunityPost;
  me: Me;
  /** From GET /api/community/mine. The feed itself carries no author id. */
  myPostIds: Set<string>;
  /** From the same call, for the same reason: per-reader, so not in the feed. */
  myReaction: ReactionState;
  onChanged: () => void;
}) {
  const { t, tn } = useTranslate();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<CommunityReply[] | null>(null);
  const [repliesState, setRepliesState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [pending, setPending] = useState<PendingReply[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
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
    setBlocked(true);
    setActionError(null);
    const res = await blockCommunityAuthor({ postId: post.id });
    if (res.ok) onChanged();
    else {
      setBlocked(false);
      setActionError(res.error ?? t("community.blockFailed"));
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

  async function sendReply(text: string, retryOf?: number) {
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

    const res = await addReply(post.id, text);
    sending.current = false;
    setBusy(false);

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

  return (
    <article
      id={postAnchorId(post.id)}
      // scroll-mt clears the sticky mobile top bar when a notification link
      // scrolls this row into view.
      className="scroll-mt-24 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar name={post.author_name} url={post.author_avatar} />
        <div className="min-w-0">
          <p className="truncate font-sans text-ui font-semibold text-paper">
            {post.author_name}
          </p>
          <p className="font-sans text-eyebrow text-paper/45">
            {timeAgo(post.created_at)} · {t(POST_KIND_KEYS[post.kind])}
          </p>
        </div>
        {mine ? (
          <button
            type="button"
            onClick={() => void removePost()}
            disabled={busy}
            className="ml-auto shrink-0 rounded-pill border border-paper/15 px-3 py-1 font-sans text-eyebrow font-semibold text-paper/50 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
          >
            {t("community.delete")}
          </button>
        ) : me ? (
          // Both require an account: an anonymous report cannot be weighed or
          // rate-limited, and a block has to belong to somebody to be applied.
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void report()}
              disabled={reported}
              aria-label={t("community.reportAria")}
              className="rounded-pill border border-paper/12 px-3 py-1 font-sans text-eyebrow font-semibold text-paper/40 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-60 disabled:hover:border-paper/12 disabled:hover:text-paper/40"
            >
              {reported ? t("community.reported") : t("community.report")}
            </button>
            {/* Reporting asks someone else to act; blocking takes effect for
                this reader straight away. App Review guideline 1.2 asks for
                both, and Conversations shipped with only the first. */}
            <button
              type="button"
              onClick={() => void block()}
              disabled={blocked}
              aria-label={t("community.blockAria", { name: post.author_name })}
              className="rounded-pill border border-paper/12 px-3 py-1 font-sans text-eyebrow font-semibold text-paper/40 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-60 disabled:hover:border-paper/12 disabled:hover:text-paper/40"
            >
              {blocked ? t("community.blocked") : t("community.block")}
            </button>
          </div>
        ) : null}
      </div>

      {post.title ? (
        <h3 className="mt-3 font-display-serif text-title-sm text-paper">
          {post.title}
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
          <p className="font-serif italic text-body leading-[1.7] text-paper/90">
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
        <p className="mt-3 whitespace-pre-wrap font-sans text-ui leading-relaxed text-paper/80">
          {post.body}
        </p>
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
        <button
          type="button"
          onClick={() => void toggleReplies()}
          aria-expanded={open}
          className="font-sans text-detail font-medium text-paper/55 hover:text-paper"
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
            (replies ?? []).map((r) => (
              <div key={r.id} className="flex items-start gap-2.5">
                <Avatar name={r.author_name} url={r.author_avatar} size={28} />
                <div className="min-w-0">
                  <p className="font-sans text-caption text-paper/50">
                    <span className="font-semibold text-paper/80">{r.author_name}</span>{" "}
                    · {timeAgo(r.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap font-sans text-detail leading-relaxed text-paper/80">
                    {r.body}
                  </p>
                </div>
              </div>
            ))
          )}

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
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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
