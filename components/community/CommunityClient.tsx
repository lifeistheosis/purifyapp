"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  addReply,
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityPosts,
  fetchReplies,
  uploadAvatar,
} from "@/lib/community/client";
import {
  POST_KIND_LABELS,
  timeAgo,
  type CommunityPost,
  type CommunityReply,
} from "@/lib/community/types";
import {
  useFlorilegia,
  type FlorilegiumItem,
} from "@/lib/florilegium/florilegium";
import { resolveUser } from "@/lib/supabase/resolveUser";

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

export function CommunityClient() {
  const { t } = useTranslate();
  const [panel, setPanel] = useState<Panel>("campaigns");

  return (
    <div>
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
            onClick={() => setPanel(id)}
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
      {panel === "campaigns" ? <CampaignsClient embedded /> : <ConversationsPanel />}
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

function ConversationsPanel() {
  const { t } = useTranslate();
  const [me, setMe] = useState<Me>(null);
  const [authSettled, setAuthSettled] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[] | null | undefined>(undefined);
  const [version, setVersion] = useState(0);

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
      const list = await fetchCommunityPosts();
      if (alive) setPosts(list);
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  return (
    <section className="mx-auto w-full max-w-[680px] px-5 pb-16 pt-8">
      {posts === null ? (
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
          {authSettled && me ? (
            <Composer me={me} onPosted={reload} onAvatarChanged={(url) => setMe((m) => (m ? { ...m, avatar: url } : m))} />
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
            {posts === undefined ? (
              <p className="py-10 text-center font-sans text-ui text-paper/40">
                {t("community.gathering")}
              </p>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-paper/10 bg-black/20 p-8 text-center">
                <p className="font-serif text-lede text-paper/80">
                  {t("community.quietHere")}
                </p>
                <p className="mt-2 font-sans text-ui text-paper/55">
                  {t("community.quietHereBody")}
                </p>
              </div>
            ) : (
              posts.map((p) => (
                <PostCard key={p.id} post={p} me={me} onChanged={reload} />
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
  onPosted,
  onAvatarChanged,
}: {
  me: NonNullable<Me>;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const { florilegia } = useFlorilegia();

  const gathered = florilegia.flatMap((f) => f.items);

  async function submit() {
    setBusy(true);
    setError(null);
    const res =
      mode === "discussion"
        ? await createCommunityPost({
            kind: "discussion",
            title: title.trim() || null,
            body: body.trim(),
          })
        : picked
          ? await createCommunityPost({
              kind: picked.kind,
              body: body.trim() || null,
              quoteText: picked.text,
              quoteSource: shareSource(picked),
              quoteHref: shareHref(picked),
            })
          : { ok: false, error: t("community.pickALine") };
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setPicked(null);
      onPosted();
    } else {
      setError(res.error ?? "Couldn't post.");
    }
  }

  async function changeAvatar(file: File) {
    setAvatarBusy(true);
    setError(null);
    const res = await uploadAvatar(file);
    setAvatarBusy(false);
    if (res.ok && res.url) onAvatarChanged(res.url);
    else setError(res.error ?? "Couldn't update your photo.");
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
              {gathered.slice(0, 40).map((item) => (
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

function shareHref(item: FlorilegiumItem): string | null {
  if (item.kind === "scripture") {
    return `/bible/${item.book}/${item.chapter}`;
  }
  return item.href ?? (item.saintSlug ? `/saints/${item.saintSlug}` : null);
}

/* ── Post card ─────────────────────────────────────────────────────────── */

function PostCard({
  post,
  me,
  onChanged,
}: {
  post: CommunityPost;
  me: Me;
  onChanged: () => void;
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<CommunityReply[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = me?.id === post.user_id;

  async function toggleReplies() {
    const next = !open;
    setOpen(next);
    if (next && replies === null) {
      setReplies(await fetchReplies(post.id));
    }
  }

  async function sendReply() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    const res = await addReply(post.id, text);
    setBusy(false);
    if (res.ok) {
      setDraft("");
      setReplies(await fetchReplies(post.id));
      onChanged();
    }
  }

  async function removePost() {
    setBusy(true);
    const res = await deleteCommunityPost(post.id);
    setBusy(false);
    if (res.ok) onChanged();
  }

  return (
    <article className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <div className="flex items-center gap-3">
        <Avatar name={post.author_name} url={post.author_avatar} />
        <div className="min-w-0">
          <p className="truncate font-sans text-ui font-semibold text-paper">
            {post.author_name}
          </p>
          <p className="font-sans text-eyebrow text-paper/45">
            {timeAgo(post.created_at)} · {POST_KIND_LABELS[post.kind]}
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
        ) : null}
      </div>

      {post.title ? (
        <h3 className="mt-3 font-display-serif text-title-sm text-paper">
          {post.title}
        </h3>
      ) : null}

      {post.quote_text ? (
        <blockquote className="mt-3 rounded-lg border-l-2 border-gold/50 bg-night px-4 py-3">
          <p className="font-serif text-body leading-relaxed text-paper/90">
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

      <button
        type="button"
        onClick={() => void toggleReplies()}
        className="mt-4 font-sans text-detail font-medium text-paper/55 hover:text-paper"
      >
        {post.reply_count === 1
          ? t("community.oneReply")
          : t("community.nReplies", { count: post.reply_count })}
        {open ? " ▴" : " ▾"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-white/6 pt-3">
          {(replies ?? []).map((r) => (
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
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void sendReply()}
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
