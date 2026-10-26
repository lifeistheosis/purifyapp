"use client";

// One day's conversation in a circle reading a path together (1.8): the
// circle's own thread in Community, only the posts about this day, and a
// line to add to it. Same posts, moderation, word filter and limits as every
// Community post (app/api/community/posts); the audience is the circle's
// members, proved on the server.

import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { createCommunityPost, fetchCommunityPosts } from "@/lib/community/client";
import { relativeTime } from "@/lib/community/relativeTime";
import type { CommunityPost } from "@/lib/community/types";

export function DayThread({
  circle,
  day,
  open,
  onClose,
}: {
  circle: { id: string; name: string } | null;
  day: number;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useTranslate();
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [askFiltered, setAskFiltered] = useState(false);

  const load = useCallback(async () => {
    if (!circle) return;
    const r = await fetchCommunityPosts(circle.id, { day });
    setPosts(r.state === "ok" ? r.posts : []);
  }, [circle, day]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the read
       shares its path with a new post; every write is past an await. */
    if (open) void load();
  }, [open, load]);

  async function post(confirmFiltered = false) {
    if (!circle || draft.trim().length < 2) return;
    setBusy(true);
    setSaid(null);
    const r = await createCommunityPost({ kind: "discussion", body: draft.trim(), groupId: circle.id, pathDay: day, confirmFiltered });
    setBusy(false);
    if (r.code === "filtered") {
      setAskFiltered(true);
      setSaid(r.error ?? null);
      return;
    }
    if (!r.ok) {
      setSaid(r.error || t("together.failed"));
      return;
    }
    setAskFiltered(false);
    setDraft("");
    if (r.held) setSaid(t("together.held"));
    await load();
  }

  return (
    <Sheet open={open} onClose={onClose} title={circle ? t("together.dayTitle", { n: day, name: circle.name }) : ""} desktop>
      <div className="space-y-4">
        {posts === null ? null : posts.length === 0 ? (
          <p className="font-sans text-caption text-paper/55">{t("together.noPosts")}</p>
        ) : (
          <ol className="divide-y divide-paper/[0.07]">
            {[...posts].reverse().map((p) => (
              <li key={p.id} className="py-3">
                <p className="font-sans text-caption text-paper/55">
                  <span className="font-semibold text-paper/80">{p.author_name}</span> · {relativeTime(p.created_at, locale)}
                </p>
                {p.body ? <p className="mt-1 whitespace-pre-line font-sans text-ui leading-[1.55] text-paper/90">{p.body}</p> : null}
              </li>
            ))}
          </ol>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post(askFiltered);
          }}
          className="space-y-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={t("together.placeholder")}
            aria-label={t("together.placeholder")}
            className="w-full resize-y rounded-[12px] border border-paper/15 bg-paper/[0.04] px-3 py-2 font-sans text-ui leading-[1.55] text-paper placeholder:text-paper/40 focus:border-paper/35 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length < 2}
            className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-50"
          >
            {askFiltered ? t("together.postAnyway") : t("together.post")}
          </button>
          {said ? <p className="font-sans text-caption text-paper/60" aria-live="polite">{said}</p> : null}
        </form>
      </div>
    </Sheet>
  );
}
