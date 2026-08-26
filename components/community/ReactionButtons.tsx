"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import {
  applyPress,
  nextReaction,
  type Reaction,
  type ReactionState,
} from "@/lib/community/reactions";

/**
 * Like and dislike, on a post or a reply.
 *
 * ── The dislike count is stored and not shown ───────────────────────────
 *
 * Both buttons work and both are recorded, so moderation has the signal. Only
 * the like total is rendered. A visible dislike tally on a prayer request
 * invites the pile-on it measures, and it is the hard thing to walk back once
 * people have seen it: you cannot un-show a number. This is also what
 * "standard" means now, since YouTube removed public dislike counts in 2021.
 *
 * SHOW_DISLIKE_COUNT is the whole switch if that call changes.
 *
 * ── Optimistic, then corrected ──────────────────────────────────────────
 *
 * The press moves the number immediately through the same pure transition the
 * server uses (lib/community/reactions.ts), then the response replaces it with
 * the real counts. Two renderings of the same press cannot disagree, because
 * neither of them re-derives what a press means.
 *
 * The previous state is captured before the optimistic write and restored if
 * the request fails, so a dropped connection does not leave a like on screen
 * that the database never received.
 */

const SHOW_DISLIKE_COUNT = false;

type Props = {
  postId?: string;
  replyId?: string;
  likeCount: number;
  dislikeCount: number;
  /** What this reader already holds, from the authenticated read. */
  mine: ReactionState;
  /** False when signed out: the buttons explain instead of failing. */
  canReact: boolean;
};

export function ReactionButtons({
  postId,
  replyId,
  likeCount,
  dislikeCount,
  mine,
  canReact,
}: Props) {
  const { t } = useTranslate();
  const [state, setState] = useState<ReactionState>(mine);
  const [counts, setCounts] = useState({ like: likeCount, dislike: dislikeCount });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function press(value: Reaction) {
    if (!canReact || busy) return;

    // Captured BEFORE the optimistic write, so a failure can put both back.
    const prevState = state;
    const prevCounts = counts;

    setState(nextReaction(state, value));
    setCounts(applyPress(counts, state, value));
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch("/api/community/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, replyId, value }),
      });
      // Checked before the body is read: a 401 answers with JSON too, and
      // storing it would render an error object as a count.
      if (!res.ok) {
        setState(prevState);
        setCounts(prevCounts);
        setError(t("community.reactFailed"));
        return;
      }
      const data = (await res.json()) as {
        mine: ReactionState;
        likeCount: number;
        dislikeCount: number;
      };
      // The server's answer wins over the guess.
      setState(data.mine);
      setCounts({ like: data.likeCount, dislike: data.dislikeCount });
    } catch {
      setState(prevState);
      setCounts(prevCounts);
      setError(t("community.reactFailed"));
    } finally {
      setBusy(false);
    }
  }

  const base =
    "tap-press inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border px-3 font-sans text-caption font-medium transition-colors disabled:opacity-50";

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => press(1)}
        disabled={!canReact || busy}
        aria-pressed={state === 1}
        aria-label={t("community.like")}
        title={canReact ? t("community.like") : t("community.signInToReact")}
        className={cn(
          base,
          state === 1
            ? "border-gold/50 bg-gold/[0.12] text-gold"
            : "border-paper/15 text-paper/65 hover:border-paper/35 hover:text-paper",
        )}
      >
        <ThumbIcon up />
        {/* tabular-nums so the row does not shift as the count changes. */}
        <span className="tabular-nums">{counts.like}</span>
      </button>

      <button
        type="button"
        onClick={() => press(-1)}
        disabled={!canReact || busy}
        aria-pressed={state === -1}
        aria-label={t("community.dislike")}
        title={canReact ? t("community.dislike") : t("community.signInToReact")}
        className={cn(
          base,
          state === -1
            ? "border-crimson-soft/50 bg-crimson-soft/[0.10] text-crimson-soft"
            : "border-paper/15 text-paper/65 hover:border-paper/35 hover:text-paper",
        )}
      >
        <ThumbIcon />
        {SHOW_DISLIKE_COUNT ? (
          <span className="tabular-nums">{counts.dislike}</span>
        ) : null}
      </button>

      {error ? (
        <span role="alert" className="font-sans text-eyebrow text-crimson-soft">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** One path, flipped for the dislike, so the two are exactly symmetrical. */
function ThumbIcon({ up = false }: { up?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z" />
      <path d="M7 10l4.2-7.2a1 1 0 0 1 1.8.3l.5 2.1a3 3 0 0 0 .3.8L15 8h4a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 19H7" />
    </svg>
  );
}
