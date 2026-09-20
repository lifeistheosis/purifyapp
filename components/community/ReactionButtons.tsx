"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import {
  applyPress,
  nextReaction,
  readKey,
  reactionView,
  type Reaction,
  type ReactionCounts,
  type ReactionGuess,
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
 *
 * ── The press has to survive the next read ─────────────────────────────
 *
 * Reported 2026-09-19: "when you like something it doesn't really signify
 * that you liked it, the number just goes up". Both halves were this. The
 * button seeded its state from `mine` ONCE, with useState, and the reader's
 * own reactions arrive from /api/community/mine after the feed has already
 * painted, so every button rendered un-pressed however many things the reader
 * had liked, on every load and after every poll. Worse, pressing a like the
 * server already held then read as a fresh like, and the server toggled it
 * off: the count went DOWN on a press that looked like a like.
 *
 * So nothing is copied into state any more. The props are the truth, the
 * local guess is held beside them tagged with the props it was made against,
 * and a new read retires it (no effect, no setState during render). The guess
 * is kept while a request is in flight so a poll landing mid-press cannot
 * flicker the button back.
 *
 * ── Pressed has to LOOK pressed ────────────────────────────────────────
 *
 * The same report: a gold tint at 12% on a dark row is not an answer to "did
 * that work". A held reaction now fills the thumb, deepens the tint, and says
 * what a second press will do, so it reads in a glance and reads without
 * colour alone.
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
  const [guess, setGuess] = useState<ReactionGuess | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The props are the truth; the reader's own press is held beside them until
  // a newer read carries it (lib/community/reactions.ts, reactionView).
  const read = { mine, counts: { like: likeCount, dislike: dislikeCount } };
  const shown = reactionView(read, guess, busy);
  const state: ReactionState = shown.mine;
  const counts: ReactionCounts = shown.counts;

  async function press(value: Reaction) {
    if (!canReact || busy) return;

    // Captured BEFORE the optimistic write, so a failure can put both back.
    const prevState = state;
    const prevCounts = counts;

    setGuess({
      from: readKey(read),
      mine: nextReaction(state, value),
      counts: applyPress(counts, state, value),
    });
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
        setGuess({ from: readKey(read), mine: prevState, counts: prevCounts });
        setError(t("community.reactFailed"));
        return;
      }
      const data = (await res.json()) as {
        mine: ReactionState;
        likeCount: number;
        dislikeCount: number;
      };
      // The server's answer wins over the guess, and is held until a fresh
      // read of the feed carries the same thing.
      setGuess({
        from: readKey(read),
        mine: data.mine,
        counts: { like: data.likeCount, dislike: data.dislikeCount },
      });
    } catch {
      setGuess({ from: readKey(read), mine: prevState, counts: prevCounts });
      setError(t("community.reactFailed"));
    } finally {
      setBusy(false);
    }
  }

  // justify-center and a floor on the width, so the two pills are the same
  // size. Only the like carries a number, so without this the dislike sat
  // visibly narrower and the pair read as misaligned rather than as a pair.
  const base =
    "tap-press inline-flex h-9 min-w-[64px] items-center justify-center gap-1.5 rounded-pill border px-3 font-sans text-caption font-medium transition-colors disabled:opacity-50";
  const liked = state === 1;
  const disliked = state === -1;

  return (
    // NO TOP MARGIN. This sits inside the post's action row, which is already
    // `flex items-center` and spaces itself. The mt-3 that used to be here
    // pushed the pills 12px below the replies button beside them, so the row
    // was centred on paper and visibly stepped on screen.
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => press(1)}
        disabled={!canReact || busy}
        aria-pressed={liked}
        aria-label={liked ? t("community.likeRemove") : t("community.like")}
        title={
          canReact
            ? liked
              ? t("community.likeRemove")
              : t("community.like")
            : t("community.signInToReact")
        }
        className={cn(
          base,
          liked
            ? "border-gold bg-gold/25 font-semibold text-gold"
            : "border-paper/15 text-paper/65 hover:border-paper/35 hover:text-paper",
        )}
      >
        <ThumbIcon up filled={liked} />
        {/* tabular-nums so the row does not shift as the count changes. */}
        <span className="tabular-nums">{counts.like}</span>
      </button>

      <button
        type="button"
        onClick={() => press(-1)}
        disabled={!canReact || busy}
        aria-pressed={disliked}
        aria-label={disliked ? t("community.dislikeRemove") : t("community.dislike")}
        title={
          canReact
            ? disliked
              ? t("community.dislikeRemove")
              : t("community.dislike")
            : t("community.signInToReact")
        }
        className={cn(
          base,
          disliked
            ? "border-crimson-soft bg-crimson-soft/25 font-semibold text-crimson-soft"
            : "border-paper/15 text-paper/65 hover:border-paper/35 hover:text-paper",
        )}
      >
        <ThumbIcon filled={disliked} />
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

/**
 * One path, flipped for the dislike, so the two are exactly symmetrical.
 *
 * `filled` is what carries "you are holding this" without relying on the
 * tint: an outline thumb and a solid thumb differ in shape, which survives a
 * dark room, a cheap screen and colour blindness.
 */
function ThumbIcon({ up = false, filled = false }: { up?: boolean; filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
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
