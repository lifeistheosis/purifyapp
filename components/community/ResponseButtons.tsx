"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Orans } from "@/components/ui/icons/Orans";
import { cn } from "@/lib/cn";
import { setResponse } from "@/lib/community/client";
import {
  RESPONSE_KEYS,
  RESPONSE_KINDS,
  applyResponse,
  toggleMine,
  type ResponseCounts,
  type ResponseKind,
} from "@/lib/community/responses";

/**
 * Amen, Praying, Glory to God, beside the like (lib/community/responses.ts).
 *
 * Quiet by default: a response shows as a small pill only once somebody has
 * given it, with its count, and the praying-hands button opens all three.
 * Any pill is a toggle for the reader's own response. A reader may give all
 * three; each is theirs once.
 *
 * Like the like button, nothing waits on the network: a tap moves the pill at
 * once and sends the END state wanted for that one response, so quick taps
 * can never leave the database out of step with the screen. The props are
 * the truth; the reader's own taps are held beside them, tagged with the
 * read they were made against, until a newer read arrives.
 */

type Props = {
  postId?: string;
  replyId?: string;
  counts: ResponseCounts;
  mine: readonly ResponseKind[];
  canRespond: boolean;
  size?: "post" | "reply";
};

type Guess = { from: string; counts: ResponseCounts; mine: ResponseKind[] };

const keyOf = (counts: ResponseCounts, mine: readonly ResponseKind[]) =>
  `${counts.amen}:${counts.praying}:${counts.glory}:${[...mine].sort().join(",")}`;

export function ResponseButtons({ postId, replyId, counts, mine, canRespond, size = "post" }: Props) {
  const { t } = useTranslate();
  const [guess, setGuess] = useState<Guess | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Saves still out: while any is, a poll landing mid-tap cannot flick the
  // pills back to what they were a moment ago.
  const [pending, setPending] = useState(0);

  const readKey = keyOf(counts, mine);
  const shown = guess && (guess.from === readKey || pending > 0) ? guess : { counts, mine: [...mine] };

  async function press(kind: ResponseKind) {
    if (!canRespond) return;
    const on = !shown.mine.includes(kind);
    const before = shown;
    setGuess({ from: readKey, counts: applyResponse(shown.counts, shown.mine, kind, on), mine: toggleMine(shown.mine, kind, on) });
    setError(null);
    setOpen(false);
    setPending((n) => n + 1);
    const res = await setResponse({ postId, replyId, kind, on });
    setPending((n) => n - 1);
    if (res.ok) {
      setGuess((g) => (g ? { from: readKey, counts: res.counts, mine: res.mine } : g));
    } else {
      setGuess({ from: readKey, counts: before.counts, mine: before.mine });
      setError(t("community.respondFailed"));
    }
  }

  const compact = size === "reply";
  const visible = RESPONSE_KINDS.filter((k) => open || shown.counts[k] > 0 || shown.mine.includes(k));

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {visible.map((k) => {
        const held = shown.mine.includes(k);
        const label = t(RESPONSE_KEYS[k]);
        return (
          <button
            key={k}
            type="button"
            onClick={() => void press(k)}
            disabled={!canRespond}
            aria-pressed={held}
            title={canRespond ? label : t("community.signInToReact")}
            className={cn(
              "tap-press inline-flex items-center gap-1 rounded-pill border font-sans font-medium transition-colors disabled:opacity-60",
              compact ? "hit-44 h-7 px-2.5 text-eyebrow" : "h-9 px-3 text-caption",
              held
                ? "border-premium/60 bg-premium/15 font-semibold text-premium-ink"
                : "border-paper/15 text-paper/65 hover:border-paper/35 hover:text-paper",
            )}
          >
            <span>{label}</span>
            {shown.counts[k] > 0 ? <span className="tabular-nums opacity-80">{shown.counts[k]}</span> : null}
          </button>
        );
      })}
      {canRespond ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("community.respondClose") : t("community.respond")}
          title={open ? t("community.respondClose") : t("community.respond")}
          className={cn(
            "tap-press inline-flex items-center justify-center rounded-pill border border-paper/15 text-paper/60 transition-colors hover:border-paper/35 hover:text-paper",
            compact ? "hit-44 size-7" : "size-9",
            open && "border-paper/35 text-paper",
          )}
        >
          <Orans size={compact ? 13 : 15} />
        </button>
      ) : null}
      {error ? (
        <span role="alert" className="font-sans text-eyebrow text-crimson-soft">
          {error}
        </span>
      ) : null}
    </div>
  );
}
