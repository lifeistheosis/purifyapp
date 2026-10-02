"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { fetchCommunityPosts } from "@/lib/community/client";
import { communityEnabled } from "@/lib/community/flags";
import { timeAgo, type CommunityPost } from "@/lib/community/types";

/**
 * "Discussed in Community", at the foot of a Bible chapter: the latest posts
 * about this chapter (a verse shared from it, or a conversation that names
 * it), and a way to start one. Read on the device, like the feed, so the
 * phone apps' local-first chapters get it too; renders nothing until there
 * is something to show or a way to start, and nothing at all while
 * Community is switched off.
 */
const SHOWN = 3;

export function ChapterDiscussions({ book, bookName, chapter }: { book: string; bookName: string; chapter: number }) {
  const { t, tn } = useTranslate();
  const ref = `${book}/${chapter}`;
  const [loaded, setLoaded] = useState<{ ref: string; posts: CommunityPost[] } | null>(null);
  const enabled = communityEnabled();

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      const res = await fetchCommunityPosts(null, { chapter: ref });
      if (alive) setLoaded({ ref, posts: res.state === "ok" ? res.posts : [] });
    })();
    return () => {
      alive = false;
    };
  }, [ref, enabled]);

  if (!enabled || !loaded || loaded.ref !== ref) return null;
  const posts = loaded.posts.slice(0, SHOWN);

  return (
    <section data-reader-chrome aria-labelledby="chapter-discussed" className="mt-10 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <h2 id="chapter-discussed" className="font-serif text-lede text-paper">
        {t("bible.discussedTitle")}
      </h2>
      <p className="mt-1 font-sans text-detail text-paper/60">
        {loaded.posts.length > 0
          ? tn("bible.discussedCount", loaded.posts.length, { chapter: `${bookName} ${chapter}` })
          : t("bible.discussedNone", { chapter: `${bookName} ${chapter}` })}
      </p>
      {posts.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/community#post-${p.id}`}
                className="flex items-start gap-3 rounded-xl border border-paper/10 bg-black/15 p-3 transition-colors hover:border-paper/25"
              >
                <CommunityAvatar name={p.author_name} url={p.author_avatar} size={32} />
                <span className="min-w-0">
                  <span className="block font-sans text-caption text-paper/55">
                    {p.author_name} · {timeAgo(p.created_at)}
                  </span>
                  {p.title ? <span className="block font-serif text-ui font-semibold leading-snug text-paper">{p.title}</span> : null}
                  <span className="mt-0.5 line-clamp-2 block font-sans text-detail leading-relaxed text-paper/75">
                    {p.body || p.quote_text}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/community?about=${encodeURIComponent(ref)}#conversations`}
          className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night"
        >
          {t("bible.discussedStart")}
        </Link>
        {loaded.posts.length > SHOWN ? (
          <Link
            href="/community#conversations"
            className="inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/80 hover:border-paper/40"
          >
            {t("bible.discussedAll")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
