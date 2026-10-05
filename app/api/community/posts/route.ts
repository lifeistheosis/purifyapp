import { after, NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { AUTHOR_MARK_COLS, deriveAuthorMark } from "@/lib/community/authorMark";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { isDecoration, isNameColor } from "@/lib/profile/cosmetics";
import { isClergyMark } from "@/lib/profile/clergy";
import { hiddenAuthors } from "@/lib/community/blocks";
import { chapterRefOf, findChapterRef, validChapterRef } from "@/lib/community/chapterRef";
import { ensureFeastThread } from "@/lib/community/feast";
import { guardWrite } from "@/lib/community/guard";
import { notifyClergyOfQuestion, notifyMentions } from "@/lib/community/notify";
import { censorName, censorPost } from "@/lib/moderation/server";
import { ensureCleanHandle } from "@/lib/profile/server";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityPostSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";
import {
  isRefusal,
  verifyFatherQuote,
  verifyScriptureQuote,
  type VerifiedQuote,
} from "@/lib/community/verifyQuote";

// `user_id` is NOT selected, and the badge is not wired here yet.
//
// The first attempt resolved the verified badge by selecting the uuid, mapping
// it to a boolean, and dropping it before the response. That is safe as
// written, but lib/security/__tests__/publicColumnExposure.test.ts refused it,
// and the refusal is right: the guard cannot tell "selected then stripped"
// from "selected then leaked", and its own header warns that the next step
// after tolerating a select is somebody re-granting the column to make it
// work. A ratchet written after a real exposure does not get loosened to save
// one query.
//
// The badge HAS now arrived as that denormalised author_verified column on
// community_posts, maintained from user_verification by a trigger the same way
// the reaction counters are maintained from community_reactions
// (20260901000000_community_author_verified.sql). The feed reads a boolean that was
// never a uuid and the guard stays absolute.
//
// Recorded because the shortcut was attempted again before this landed: the
// select-then-strip version was rewritten, publicColumnExposure refused it a
// second time, and the refusal was right a second time. The query it saves is
// not worth the ratchet.
//
// The supporter mark arrived the same way (20260905000100_community_author_mark.sql):
// two denormalised timestamps, author_plus_until and author_pro_until, that
// publicPost() compares to the clock and collapses to author_mark. The
// timestamps are selected and never emitted. POST_COLS_BEFORE_MARK is the
// list without them, read instead when the migration has not been applied,
// so the feed keeps working and simply shows no mark.
const POST_COLS_BEFORE_MARK =
  "id, kind, title, body, quote_text, quote_source, quote_href, author_name, author_avatar, author_verified, reply_count, like_count, dislike_count, created_at, pinned_at";
const POST_COLS = `${POST_COLS_BEFORE_MARK}, ${AUTHOR_MARK_COLS}`;
// The author's public @handle and avatar frame (20261001000000_profiles_badges.sql),
// denormalised like the badge so a post can open its author's profile without
// the uuid. POST_COLS is the fallback while that migration is unapplied: posts
// then carry no handle and the author simply is not a link yet.
const POST_COLS_WITH_PROFILE = `${POST_COLS}, author_handle, author_decoration`;
// Community, part three (20261005000000_community_three.sql): what a post is for,
// the chapter it is about, the clergy seal, the Plus name colour, the three
// responses and whether clergy have answered. The fallback chain above still
// serves the feed while it is unapplied.
const POST_COLS_THREE = `${POST_COLS_WITH_PROFILE}, category, chapter_ref, feast_slug, author_clergy, author_name_color, amen_count, praying_count, glory_count, clergy_reply_count`;

/** A count off a row, or 0 when an older schema has none. */
const count = (v: unknown) => (typeof v === "number" && v > 0 ? v : 0);

/** A post id as the database writes one. Anything else is not looked up. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The row a reader actually receives: every column above except the uuid,
 * plus the resolved badge. Written as an explicit projection rather than a
 * delete, because a delete leaves the uuid in the object until the line that
 * removes it, and one early return past that line is a leak.
 */
function publicPost(
  row: Record<string, unknown>,
  now: number = Date.now(),
): Record<string, unknown> {
  const mark = deriveAuthorMark(row, now);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    quote_text: row.quote_text,
    quote_source: row.quote_source,
    quote_href: row.quote_href,
    author_name: row.author_name,
    // Google pictures go through our own domain: the Android app cannot
    // load them from Google (lib/community/avatarSrc.ts).
    author_avatar: avatarSrc(row.author_avatar as string | null),
    // A boolean that was never a uuid. See the note above POST_COLS.
    author_verified: Boolean(row.author_verified),
    // 'plus' | 'pro' | null, resolved here against the clock. Never the two
    // timestamps it is derived from. A subscription's end date is a fact
    // about a person, and this object is served to anonymous readers from a
    // shared cache. Only the tier leaves, and only while it is live.
    author_mark: deriveAuthorMark(row, now),
    // The profile link, or null before 20261001000000_profiles_badges.sql.
    author_handle: (row.author_handle as string | null | undefined) ?? null,
    // The avatar frame is a Plus cosmetic: drawn only while the mark above is
    // live, so a lapsed subscription takes the frame with it, as on Discord.
    author_decoration: mark && isDecoration(row.author_decoration) ? row.author_decoration : null,
    // A Plus name colour, by the same rule as the frame.
    author_name_color: mark && isNameColor(row.author_name_color) ? row.author_name_color : null,
    // The clergy seal: a rank word, never who decided it or when.
    author_clergy: isClergyMark(row.author_clergy) ? row.author_clergy : null,
    reply_count: row.reply_count,
    like_count: row.like_count ?? 0,
    dislike_count: row.dislike_count ?? 0,
    created_at: row.created_at,
    // The timestamp, so the client can order announcements among themselves
    // exactly as the query below did, and a locally prepended post cannot
    // jump above one.
    pinned_at: (row.pinned_at as string | null) ?? null,
    // NOT pinned_by. That column holds the deciding admin's email, and this
    // object is served to anonymous readers. It is deliberately absent from
    // POST_COLS as well, so it is not in `row` to be leaked by a future edit
    // that spreads the row instead of projecting it.
    category: row.category === "question" || row.category === "feast" ? row.category : null,
    chapter_ref: (row.chapter_ref as string | null | undefined) ?? null,
    feast_slug: (row.feast_slug as string | null | undefined) ?? null,
    amen_count: count(row.amen_count),
    praying_count: count(row.praying_count),
    glory_count: count(row.glory_count),
    clergy_reply_count: count(row.clergy_reply_count),
  };
}


/**
 * Latest visible community posts.
 *
 * Public for a signed-out reader. For a signed-in one the authors they have
 * blocked are removed, which is the half of guideline 1.2 that makes the
 * block button mean anything: reporting asks someone else to act, blocking
 * has to take effect immediately and for that reader alone.
 *
 * Blocking is applied here rather than in the client because the feed does
 * not carry `user_id` (see POST_COLS above) and should not start carrying it
 * just to let the client filter. The exclusion is resolved server-side and
 * the uuids never leave this handler.
 */
export async function GET(req: Request) {
  if (!communityEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const admin = createAdminClient();

  // `?group=<uuid>` asks for one parish group's thread instead of the public
  // feed. Membership is proved here, with the caller's own token, before a
  // single row is read: the group id travels in a URL and a URL is a guess
  // away from any other group id.
  const params = new URL(req.url).searchParams;
  const groupId = params.get("group");
  let scopedGroup: string | null = null;

  // `?chapter=john/3`: the posts about one Bible chapter, for its page
  // ("Discussed in Community"). `?category=question`: Ask a Priest, which
  // needs its own read because questions are fewer than the feed's fifty.
  const chapterParam = params.get("chapter");
  const chapter = chapterParam ? validChapterRef(chapterParam) : null;
  if (chapterParam && !chapter) {
    return withCors(NextResponse.json({ posts: [] }), req);
  }
  const category = params.get("category") === "question" ? "question" : null;

  // `?post=<uuid>`: one post by its id, for a notification about a post that
  // has left the newest fifty (a reply to something said last month). It is
  // read by the same rules as the feed below and through the same projection:
  // only a visible post, never one by an author the caller has blocked or
  // muted, and a parish group's post only for a member of that group. A post
  // that fails any of those answers as an empty list, the same as one that
  // does not exist, so the address tells nobody that it does.
  const postParam = params.get("post");
  const onePost = postParam && UUID.test(postParam) ? postParam : null;
  if (postParam && !onePost) {
    return withCors(NextResponse.json({ posts: [] }), req);
  }
  let onePostGroup: string | null = null;
  if (onePost) {
    const { data: where } = await admin
      .from("community_posts")
      .select("group_id")
      .eq("id", onePost)
      .eq("status", "visible")
      .maybeSingle();
    if (!where) return withCors(NextResponse.json({ posts: [] }), req);
    onePostGroup = ((where as { group_id?: string | null }).group_id as string | null) ?? null;
  }

  // `?following=1`: only the readers the caller follows. One reader's feed,
  // so it is read with their own sign-in and never cached.
  let followees: string[] | null = null;
  if (params.get("following") === "1") {
    const supabase = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withCors(NextResponse.json({ error: "Sign in." }, { status: 401 }), req);
    }
    // One reader's own follows, the newest 1,000: all one request gives. Not
    // read further on purpose. Every id here goes into the one .in() below,
    // so a longer list would only make a longer address for that request.
    // Newest first, so that past a thousand the ones kept are stated and not
    // whichever the database happened to give.
    const { data: rows, error: followErr } = await admin
      .from("community_follows")
      .select("followee_id")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);
    followees = followErr ? [] : ((rows ?? []) as { followee_id: string }[]).map((r) => r.followee_id);
    if (followees.length === 0) {
      return withCors(
        NextResponse.json({ posts: [] }, { headers: { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" } }),
        req,
      );
    }
  }
  if (groupId) {
    const supabase = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withCors(
        NextResponse.json({ error: "Sign in." }, { status: 401 }),
        req,
      );
    }
    const { data: member } = await admin
      .from("prayer_campaign_group_members")
      .select("group_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      // 404 and not 403: a non-member should not learn that the group exists.
      return withCors(
        NextResponse.json({ error: "Not found." }, { status: 404 }),
        req,
      );
    }
    scopedGroup = groupId;
  }
  if (onePostGroup) {
    // The one post asked for sits in a parish group's thread: membership is
    // proved exactly as above before it is read. Signed out, or not a
    // member, it is simply not there.
    const supabase = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: member } = user
      ? await admin
          .from("prayer_campaign_group_members")
          .select("group_id")
          .eq("group_id", onePostGroup)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
    if (!member) {
      return withCors(
        NextResponse.json({ posts: [] }, { headers: { "Cache-Control": "private, no-store", Vary: "Origin, Authorization" } }),
        req,
      );
    }
    scopedGroup = onePostGroup;
  }

  // The authors this reader has blocked or muted: neither reaches their feeds.
  const hidden = await hiddenAuthors(req, admin);
  const blocked = [...new Set([...hidden.blocked, ...hidden.muted])];

  // The day's feast thread opens itself on the first read of a new day,
  // after the response, so nobody waits for it (lib/community/feast.ts).
  if (!scopedGroup && !followees && !chapter && !category && !onePost) {
    try {
      after(() => ensureFeastThread(admin));
    } catch {
      // Outside a request; nothing to open.
    }
  }

  const listPosts = (cols: string) => {
    let query = admin.from("community_posts").select(cols).eq("status", "visible");
    // The public feed carries no group posts, and a group thread carries only
    // its own. Without the `is null` half, group posts would surface in the
    // global feed the moment the column existed.
    query = scopedGroup
      ? query.eq("group_id", scopedGroup)
      : query.is("group_id", null);
    if (blocked.length > 0) {
      query = query.not("user_id", "in", `(${blocked.join(",")})`);
    }
    if (followees) query = query.in("user_id", followees);
    if (chapter) query = query.eq("chapter_ref", chapter);
    if (category) query = query.eq("category", category);
    if (onePost) query = query.eq("id", onePost);
    return (
      query
        // ANNOUNCEMENTS FIRST, newest pin highest, then the feed proper.
        //
        // nullsFirst: false is load-bearing. Postgres sorts NULLs FIRST by
        // default on a descending order, so without it every unpinned post,
        // which is almost all of them, would sort above the announcements and
        // the feature would do the exact opposite of its name.
        //
        // Ordering before the limit also means a pinned post cannot fall off
        // the end: an announcement from three months ago is still first,
        // where a created_at sort would have dropped it past the fifty newest.
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50)
    );
  };

  let { data, error } = await listPosts(POST_COLS_THREE);
  if (error && isColumnAbsent(error) && !chapter && !category) {
    // 20261005000000_community_three.sql not applied yet: no categories, chapters,
    // seals or responses. A chapter or question read has nothing to fall
    // back to and answers empty below.
    ({ data, error } = await listPosts(POST_COLS_WITH_PROFILE));
  }
  if (error && isColumnAbsent(error) && !chapter && !category) {
    // 20261001000000_profiles_badges.sql not applied yet: no handles, no frames.
    ({ data, error } = await listPosts(POST_COLS));
  }
  if (error && isColumnAbsent(error) && !chapter && !category) {
    // 20260905000100_community_author_mark.sql not applied yet. Read the list the
    // table does have; publicPost() then derives no mark, which is the truth.
    ({ data, error } = await listPosts(POST_COLS_BEFORE_MARK));
  }
  if (error) {
    console.warn("[community] list failed", error.message);
    return withCors(NextResponse.json({ posts: [] }), req);
  }

  const now = Date.now();
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const posts = rows.map((r) => publicPost(r, now));

  return withCors(
    NextResponse.json(
      { posts },
      {
        headers: {
          // A filtered feed is one reader's feed. Serving it from a shared
          // cache would hand somebody else's blocklist-shaped view to the
          // next caller, so personalised responses are never cacheable. A
          // group thread is always one reader's view for the same reason.
          "Cache-Control":
            blocked.length > 0 || scopedGroup || followees
              ? "private, no-store"
              : "public, max-age=15",
          // The body varies by who is asking, so a shared cache must not
          // serve one reader's feed to the next. `withCors` sets Vary to
          // "Origin" and would otherwise overwrite this.
          Vary: "Origin, Authorization",
        },
      },
    ),
    req,
  );
}

/** Create a post. Signed-in only; author identity snapshotted server-side. */
async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-post:${ipKey(req.headers)}`, 3600, 20)) {
    return NextResponse.json(
      { error: "You're posting quickly. Please slow down a little." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = communityPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to post in the community." },
      { status: 401 },
    );
  }

  const meta = (user.user_metadata ?? {}) as {
    display_name?: string;
    avatar_url?: string;
  };
  const authorName =
    (meta.display_name ?? "").trim() ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Reader";

  // The quotation is built HERE, from our own library, never accepted from
  // the caller. A share that cannot be traced to the work it cites is
  // refused rather than published. See lib/community/verifyQuote.ts.
  let quote: VerifiedQuote | null = null;
  if (p.kind === "scripture") {
    const v = await verifyScriptureQuote({
      book: p.book,
      chapter: p.chapter,
      verse: p.verse,
    });
    if (isRefusal(v)) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    quote = v;
  } else if (p.kind === "father") {
    const v = await verifyFatherQuote({
      saintSlug: p.saintSlug,
      work: p.work,
      text: p.quoteText,
    });
    if (isRefusal(v)) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    quote = v;
  }

  const admin = createAdminClient();

  // Posting into a parish group instead of the public feed. Membership is
  // checked server-side: the group id came from the client, and a client is
  // not a validator. A caller who is not in the group is refused rather than
  // silently posted to the global feed, which would leak a message meant for
  // a handful of people to everyone.
  let groupId: string | null = null;
  if (p.groupId) {
    const { data: member } = await admin
      .from("prayer_campaign_group_members")
      .select("group_id")
      .eq("group_id", p.groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    groupId = p.groupId;
  }

  // The word filter (lib/moderation): a listed word is masked, and the writer
  // is asked first. Only their own words: a shared verse or a Father's line
  // comes from Purify's library and is never touched.
  const ownTitle = p.kind === "discussion" ? p.title?.trim() || null : null;
  const ownBody = p.body?.trim() || null;
  const censored = await censorPost(admin, { title: ownTitle, body: ownBody });
  if (censored.hits > 0 && !p.confirmFiltered) {
    return NextResponse.json(
      {
        error: "Some words in this post will be hidden until a moderator reviews them.",
        code: "filtered",
        preview: { title: censored.title, body: censored.body },
      },
      { status: 409 },
    );
  }
  // The spam filter and the reader's posting limits (lib/community/guard.ts):
  // refused with a reason they can act on, or kept and held from everyone
  // until a moderator looks.
  const guard = await guardWrite(admin, user, { kind: "post", title: ownTitle, body: ownBody });
  if (guard.kind === "refuse") {
    return NextResponse.json({ error: guard.error, code: guard.code, limit: guard.limit }, { status: guard.status });
  }
  let held = guard.kind === "hold";

  // A handle with a listed word is swapped before it lands on a new post.
  await ensureCleanHandle(admin, user.id);
  const shownName = (await censorName(admin, authorName)).slice(0, 80);

  // The chapter it is about: a shared verse says so itself; a discussion
  // carries it from the chapter's page, or names one in its own words.
  const chapterRef =
    p.kind === "scripture" && p.book && p.chapter
      ? chapterRefOf(p.book, p.chapter)
      : p.kind === "discussion"
        ? (validChapterRef(p.chapterRef) ?? findChapterRef([ownTitle, ownBody]))
        : null;
  const category = p.kind === "discussion" && p.category === "question" ? "question" : null;

  const base = {
    user_id: user.id,
    kind: p.kind,
    title: censored.title,
    body: censored.body,
    quote_text: quote?.quoteText ?? null,
    quote_source: quote?.quoteSource ?? null,
    quote_href: quote?.quoteHref ?? null,
    author_name: shownName,
    author_avatar: meta.avatar_url || null,
    group_id: groupId,
  };
  let { data: created, error } = await admin
    .from("community_posts")
    .insert({ ...base, status: held ? "held" : "visible", category, chapter_ref: chapterRef })
    .select("id")
    .single();
  if (error && (isColumnAbsent(error) || error.code === "23514")) {
    // Before 20261005: no categories or chapters, and nothing can be held,
    // so what was written goes up as it always did.
    held = false;
    ({ data: created, error } = await admin.from("community_posts").insert(base).select("id").single());
  }
  if (error || !created) {
    console.warn("[community] create failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't publish your post. Please try again." },
      { status: 500 },
    );
  }

  // The words as written, for a moderator to decide on (20261004). Only here,
  // never in the public row.
  if (censored.hits > 0) {
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ post_id: created.id, original_title: ownTitle, original_body: ownBody, hits: censored.hits });
    if (holdError) console.warn("[community] filter hold not written", holdError.message);
  }
  // Why it waits, for the queue. Its notifications wait with it, and go out
  // when a moderator approves it (lib/community/moderation.ts).
  if (held && guard.kind === "hold") {
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ post_id: created.id, reason: guard.reason, detail: guard.detail, hits: 1 });
    if (holdError) console.warn("[community] spam hold not written", holdError.message);
    return NextResponse.json({ ok: true, id: created.id, held: true, code: "held" });
  }

  // Everyone @mentioned hears about it. Best effort and after the write:
  // the post is what the reader came to publish.
  const { data: me } = await admin.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const actorHandle = (me as { handle?: string | null } | null)?.handle ?? null;
  await notifyMentions({
    admin,
    texts: [censored.title, censored.body],
    postId: created.id,
    actorId: user.id,
    actorName: shownName,
    actorHandle,
    groupId,
  });
  // A question for clergy reaches the verified clergy who answer them.
  if (category === "question" && !groupId) {
    await notifyClergyOfQuestion({
      admin,
      postId: created.id,
      actorId: user.id,
      actorName: shownName,
      actorHandle,
      excerpt: censored.title || censored.body,
    });
  }

  return NextResponse.json({ ok: true, id: created.id });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
