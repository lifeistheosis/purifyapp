/**
 * Releases, his pick A on r3-17 (2026-10-30): one path.
 *
 * "A release has an order, and the email cannot go before the note. The path
 * shows the next thing and puts each tool where it is used, the way the drop
 * file already thinks." So the page is the drop's six moments in order (the
 * note, the stores, the announcement, the day a store has it, a few days
 * later, a week later), and the step that waits on him is open with its tool
 * inside it; every other step is one line.
 *
 * The old tabs land on their step: Patch notes on the note (Claude's
 * proposals are its tool), Email on the day a store has it (the release
 * email), Push on a few days later (the notification).
 *
 * Pure: the drop, what is true this minute and the open proposals in; the
 * path's words and states out. components/admin/tabs/DropTab.tsx draws it.
 */

import { isDay, shortDay } from "@/lib/drop/days";
import { CHANNELS, MOMENTS, MOMENT_LABEL, hasOwnWords, type Drop, type Moment, type Piece } from "@/lib/drop/kit";
import type { Plan } from "@/lib/drop/live";

export type Tone = "neutral" | "gold" | "rose" | "emerald";

/** What the page knows this minute, from /api/admin/drop. */
export type LiveState = {
  plan: Plan;
  /** For each note the drop covers: whether What's New is showing it. Null when that could not be read. */
  notes: { version: string; published: boolean | null }[];
};

/** Where a piece stands: the file, with what the owner marked laid over it. */
export function standing(drop: Drop, piece: Piece, live: LiveState | null): { label: string; tone: Tone } {
  if (piece.channel === "note") {
    const version = piece.id.replace(/^note-/, "");
    if (live?.notes.find((n) => n.version === version)?.published) return { label: "Showing on What's New", tone: "emerald" };
    const state = drop.notes.find((n) => n.version === version)?.state;
    return state === "queued" ? { label: "In your queue", tone: "gold" } : state === "accepted" ? { label: "Accepted", tone: "emerald" } : { label: "Not filed yet", tone: "rose" };
  }
  // A step is done, and so is SQL the owner runs: neither is sent anywhere.
  const doing = !CHANNELS[piece.channel].paste || Boolean(CHANNELS[piece.channel].runs);
  const on = piece.sent?.on ?? live?.plan.done[piece.id]?.on;
  if (on) return { label: `${doing ? "Done" : "Sent"} ${isDay(on) ? shortDay(on) : on}`, tone: "emerald" };
  if (piece.waits) return { label: "Waits", tone: "gold" };
  if (hasOwnWords(piece) && !piece.text) return { label: "No words yet", tone: "rose" };
  return { label: doing ? "To do" : "Ready", tone: "neutral" };
}

/** The old tabs that land on a step. */
export type Focus = "note" | "email" | "push";

export const FOCUS_MOMENT: Readonly<Record<Focus, Moment>> = { note: "ready", email: "stores", push: "after" };

/** What each step is, in the words the sheet uses. The drop file's moments are the same for every release. */
export function stepTitle(moment: Moment, release: string): string {
  switch (moment) {
    case "ready":
      return `The ${release} note`;
    case "submit":
      return "Store texts, then submit both builds";
    case "web":
      return "The board message, Discord, our post in Community";
    case "stores":
      return "The release email, the update prompt, the cards";
    case "after":
      return "A notification";
    case "numbers":
      return "The first week's numbers";
  }
}

export type Proposal = { version: string; author: string; created_at: string; status: string };

export type PathStep = {
  moment: Moment;
  /** 1 to 6. */
  n: number;
  /** "1 · Before anything goes out". */
  eyebrow: string;
  title: string;
  /** A line under the title, when there is one to say: who changed the note, and when. */
  meta: string | null;
  state: "done" | "current" | "later";
  /** Pieces not done yet. */
  open: number;
  /** The one step lit: the current one, when something in it is his to do. */
  waitsOnYou: boolean;
  /** Pieces of the drop in this step. */
  pieces: Piece[];
};

function ago(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 60) return m <= 1 ? "just now" : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/**
 * The six steps. The first not finished is the current one; it waits on him
 * when a proposal for the drop's note is open, or when any of its pieces is
 * his to send (not one that waits on something else).
 */
export function pathSteps(drop: Drop, live: LiveState | null, proposals: readonly Proposal[], now: number): PathStep[] {
  const mine = proposals
    .filter((p) => (p.status === "pending" || p.status === "suggested") && drop.covers.includes(p.version))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  let currentFound = false;
  return MOMENTS.filter((m) => drop.pieces.some((p) => p.moment === m)).map((moment, i) => {
    const pieces = drop.pieces.filter((p) => p.moment === moment);
    const open = pieces.filter((p) => standing(drop, p, live).tone !== "emerald").length;
    const proposalHere = moment === "ready" && mine.some((p) => p.status === "pending");
    let state: PathStep["state"] = "later";
    if (open === 0 && !proposalHere) state = "done";
    else if (!currentFound) {
      state = "current";
      currentFound = true;
    }
    const sendable = pieces.some((p) => {
      const s = standing(drop, p, live);
      return s.tone === "neutral" || s.tone === "rose";
    });
    const first = mine[0];
    const meta =
      moment === "ready" && first
        ? `${first.status === "suggested" ? "Sent back to" : "A change from"} ${first.author === "claude" ? "Claude" : first.author}, ${ago(first.created_at, now)}`
        : null;
    return {
      moment,
      n: i + 1,
      eyebrow: `${i + 1} · ${MOMENT_LABEL[moment].name}`,
      title: stepTitle(moment, drop.release),
      meta,
      state,
      open,
      waitsOnYou: state === "current" && (proposalHere || sendable),
      pieces,
    };
  });
}

/** The step a page opens with: the landing's, else the one that waits. */
export function openingStep(steps: readonly PathStep[], focus: Focus | null): Moment | null {
  if (focus) return FOCUS_MOMENT[focus];
  return steps.find((s) => s.state === "current")?.moment ?? null;
}

/** The right-hand word on a step's line. */
export function stepRight(s: PathStep): string {
  if (s.state === "done") return "Done";
  if (s.waitsOnYou) return "Waits on you";
  return s.open > 0 ? `${s.open} to go` : "";
}

/** "21 pieces, none refused. 7 words wait until they are true." */
export function checkLine(drop: Drop, findings: readonly { level: "error" | "warn" }[]): { passes: boolean; title: string; line: string } {
  const refused = findings.filter((f) => f.level === "error").length;
  const looks = findings.filter((f) => f.level === "warn").length;
  const words = drop.never.length;
  return {
    passes: refused === 0,
    title: refused === 0 ? "The check passes" : `The check refuses ${refused === 1 ? "one piece" : `${refused} pieces`}`,
    line: [
      `${drop.pieces.length} pieces, ${refused === 0 ? "none refused" : `${refused} refused`}${looks ? `, ${looks} to look at` : ""}.`,
      words ? `${words === 1 ? "One word waits" : `${words} words wait`} until ${words === 1 ? "it is" : "they are"} true.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
