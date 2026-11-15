"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
 *
 * Nothing on a page moves after it arrives (Updates 97, 2026-11-15). The
 * section stands above the chapter's foot (KeepScrolling) and its answer
 * comes after the page, so it is drawn only from the feed's own answer and
 * only while its place is below the screen. A feed that failed, is switched
 * off or was never reached draws nothing: offline nobody knows that no one
 * has discussed the chapter, and the quiet card drawn for that moved the foot
 * 83 to 91px in the frame after a chapter opened at its end. A reader at the
 * foot sees the section once its place has gone below the screen.
 */
const SHOWN = 3;

export function ChapterDiscussions({ book, bookName, chapter }: { book: string; bookName: string; chapter: number }) {
  const { t, tn } = useTranslate();
  const ref = `${book}/${chapter}`;
  const [loaded, setLoaded] = useState<{ ref: string; posts: CommunityPost[] } | null>(null);
  // The chapter whose section may be drawn: its answer is in and its place has been below the screen.
  const [placed, setPlaced] = useState<string | null>(null);
  const slot = useRef<HTMLDivElement>(null);
  const enabled = communityEnabled();

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      const res = await fetchCommunityPosts(null, { chapter: ref });
      if (alive && res.state === "ok") setLoaded({ ref, posts: res.posts });
    })();
    return () => {
      alive = false;
    };
  }, [ref, enabled]);

  const waiting = loaded !== null && loaded.ref === ref && placed !== ref;
  useEffect(() => {
    const el = slot.current;
    if (!waiting || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      if (e && !e.isIntersecting && e.boundingClientRect.top >= (e.rootBounds?.bottom ?? window.innerHeight)) setPlaced(ref);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [waiting, ref]);

  if (!enabled) return null;
  // Until then an empty holder keeps the place from the first frame. It takes no room: the margins run through it.
  if (!loaded || loaded.ref !== ref || placed !== ref) return <div ref={slot} />;
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
              {/* On paper no well: a black one is grey there (Light turns only /20 and /30 into its warm shade),
                  and the name and age read 4.24:1 on it, the face's letter 3.86 on the light looks (2026-11-13,
                  measured on the walks' stand-in post, scripts/lib/main-web.mjs). The border holds the card. */}
              <Link
                href={`/community#post-${p.id}`}
                className="flex items-start gap-3 rounded-xl border border-paper/10 bg-black/15 p-3 transition-colors hover:border-paper/25 [html[data-reading-mode=parchment]_&]:bg-transparent"
              >
                <CommunityAvatar name={p.author_name} url={p.author_avatar} size={32} />
                <span className="min-w-0">
                  <span className="block font-sans text-caption text-paper/55">
                    {p.author_name} · {timeAgo(p.created_at)}
                  </span>
                  {p.title ? <span dir="auto" className="block font-serif text-ui font-semibold leading-snug text-paper">{p.title}</span> : null}
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
