/**
 * What pressing Like or Dislike does.
 *
 * Pure and dependency-free, because the button and the route have to agree on
 * this and there is no version of "agree" that survives the rule being written
 * twice. vitest collects lib/**, so the rule is tested rather than asserted.
 *
 * ── The rule ────────────────────────────────────────────────────────────
 *
 * A person holds at most one reaction to a thing. Pressing the one you already
 * hold takes it back. Pressing the other one flips you across; it does not
 * leave you holding both, and it does not require you to un-press first.
 *
 * The database enforces the "at most one" half with a partial unique index
 * (20260826_community_reactions_and_verification.sql), so this module decides
 * intent and the constraint makes a second row impossible. Neither is enough
 * alone: without the index a double-tap races through the check; without this
 * the UI has to guess what a press means.
 *
 * ── The optimistic half ─────────────────────────────────────────────────
 *
 * countDelta exists so the button can move the number the instant it is
 * pressed and reconcile when the server answers. Every path through it is
 * derived from the same transition table, so an optimistic count and a
 * refetched count cannot disagree about what a press meant.
 */

/** 1 is a like, -1 is a dislike, null is holding neither. */
export type Reaction = 1 | -1;
export type ReactionState = Reaction | null;

export type ReactionCounts = { like: number; dislike: number };

/**
 * The reaction a person holds after pressing `pressed`, given what they held.
 *
 * Pressing what you already hold returns null: a like is a toggle, not a
 * ratchet, and a reader who changes their mind should not have to find a
 * separate control to undo it.
 */
export function nextReaction(
  current: ReactionState,
  pressed: Reaction,
): ReactionState {
  return current === pressed ? null : pressed;
}

/**
 * What the write is, in terms the route can act on without re-deriving intent.
 *
 * "remove" and "set" rather than "insert/update/delete", because the route
 * upserts: whether a set is an insert or an update is the database's business
 * and depends on a row this module cannot see.
 */
export type ReactionWrite =
  | { action: "remove" }
  | { action: "set"; value: Reaction };

export function reactionWrite(
  current: ReactionState,
  pressed: Reaction,
): ReactionWrite {
  const next = nextReaction(current, pressed);
  return next === null ? { action: "remove" } : { action: "set", value: next };
}

/**
 * How the two public counters move for one press.
 *
 * Both can change in a single press: flipping a like to a dislike takes one
 * off the first and adds one to the second. A counter that only ever moved by
 * one would be wrong for exactly that case, which is the common one.
 */
export function countDelta(
  current: ReactionState,
  pressed: Reaction,
): { like: number; dislike: number } {
  const next = nextReaction(current, pressed);
  const weight = (r: ReactionState, side: Reaction) => (r === side ? 1 : 0);
  return {
    like: weight(next, 1) - weight(current, 1),
    dislike: weight(next, -1) - weight(current, -1),
  };
}

/**
 * The counts after a press, floored at zero.
 *
 * The floor is not decoration. These counters are denormalised onto the post
 * row and the client moves them optimistically, so a stale state (two tabs, a
 * reaction removed elsewhere) can ask for a decrement that would go negative.
 * A count of -1 is visibly broken in a way a count that is briefly one low is
 * not, and the server's number replaces this one on the next read either way.
 */
export function applyPress(
  counts: ReactionCounts,
  current: ReactionState,
  pressed: Reaction,
): ReactionCounts {
  const d = countDelta(current, pressed);
  return {
    like: Math.max(0, counts.like + d.like),
    dislike: Math.max(0, counts.dislike + d.dislike),
  };
}

/** Whether a value off the wire is a reaction at all. */
export function isReaction(v: unknown): v is Reaction {
  return v === 1 || v === -1;
}

/**
 * The id-to-reaction map a reader gets back, narrowed rather than cast.
 *
 * This is the seam between the wire and the button, and a cast here is how a
 * button ends up stuck. The states are 1, -1 and ABSENT; there is no third
 * value and no zero. A 0, a "1", or a null arriving from an older deploy or a
 * hand-rolled request would satisfy `Record<string, ReactionState>` under a
 * cast, reach the button as something truthy that is not a Reaction, and
 * render as pressed with no press able to clear it, because every transition
 * in this module compares against 1 and -1 by identity.
 *
 * So anything that is not exactly 1 or -1 is dropped, which lands the reader
 * on "holding neither". That is the honest default: it is what the server will
 * say on the next read, and an un-pressed button a reader can press beats a
 * pressed one they cannot.
 */
export function parseReactionMap(
  raw: unknown,
): Record<string, Reaction> {
  const out: Record<string, Reaction> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (id && isReaction(value)) out[id] = value;
  }
  return out;
}
