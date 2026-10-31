/**
 * The path through the faith (1.8, round 3 r3-13): the owner's pick of
 * 2026-10-30, "a hybrid of B and C, not A" ("I like the images that are on
 * B, but I like C's design"; Homebase/boards/purify-master/variants/
 * r3-13-theology-revamp, INDEX.md). C is the path: the nine subjects of
 * lib/theology/subjects.ts in the order of the Creed, each a step, and in
 * each step its reads, the short answer before the long study.
 *
 * Pure, and the same on the server and the device: the steps are built on
 * the server (lib/theology/pathSteps.ts) and the reader's place on the path
 * is read on the device (lib/theology/usePathProgress.ts), where it stays,
 * as the reading paths keep theirs (lib/reading/pathProgress.ts).
 */

import { THEOLOGY_SUBJECTS, type TheologySubject } from "./subjects";

/** The steps in the Creed's order: the subjects' own. */
export const PATH_ORDER: readonly string[] = THEOLOGY_SUBJECTS.map((s) => s.id);

/** Who the hub opens for, by the reader's answer to Familiarity (lib/onboarding/space.ts, Level). */
export type TheologyHead = "first" | "resume" | "library";

/**
 * The head a reader meets on Theology (C, transitionary): a reader completely
 * new gets the first step, one who is learning picks up where they left off,
 * a practicing reader gets the library first. A reader who never answered
 * is taken as learning.
 */
export function headFor(level: string | null | undefined): TheologyHead {
  if (level === "practicing") return "library";
  if (level === "inquirer") return "first";
  return "resume";
}

/** Each step by its numeral, I to IX, as the plates carry them. */
export const STEP_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] as const;

export function stepNumeral(n: number): string {
  return STEP_NUMERALS[n - 1] ?? String(n);
}

/** What a read is: the question answered, a long study, an error the Church named, a council. */
export type ReadKind = "question" | "study" | "error" | "council";

/** One read of a step, in the order the step gives them. Every title is its registry's own. */
export type PathRead = {
  id: string;
  kind: ReadKind;
  href: string;
  title: string;
  /** A question: how many of the Fathers it cites. */
  citations?: number;
  /** A study: its length, and its parts (lib/theology/parts.ts). */
  minutes?: number;
  parts?: number;
  /** A study: the Father it quotes most, whose face it wears. */
  father?: { slug: string; name: string; iconUrl?: string };
  /** An error: its century, as the registry says it. */
  era?: string;
  /** A council: its year, and its own picture (History's). */
  year?: number;
  picture?: { src: string; preview?: string; focus?: string };
};

/** One step of the path: a subject of the faith and its reads. */
export type PathStep = {
  id: string;
  /** 1 to 9. */
  n: number;
  title: string;
  line: string;
  picture: TheologySubject["picture"];
  /** The question's short answer: the first sentence of its definition. */
  short?: string;
  reads: PathRead[];
};

/** The id a read is kept by on the device. */
export const readIdOf = {
  question: (slug: string) => `q:${slug}`,
  study: (slug: string) => `s:${slug}`,
  error: (slug: string) => `h:${slug}`,
  council: (slug: string) => `c:${slug}`,
} as const;

/**
 * The reader's place on the path, kept on the device:
 *   walked  the steps finished, by their Up next (or every read of them read)
 *   read    the reads opened from the path, and the studies read to their end
 *   at      the step last opened
 *   parts   for each study, the furthest part reached (1-based)
 */
export type PathProgress = {
  walked: string[];
  read: string[];
  at: string | null;
  parts: Record<string, number>;
};

export const NO_PROGRESS: PathProgress = { walked: [], read: [], at: null, parts: {} };

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** The kept progress, read forgivingly: anything missing or malformed is no progress. */
export function parseProgress(raw: string | null | undefined): PathProgress {
  if (!raw) return NO_PROGRESS;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof PathProgress, unknown>> | null;
    if (!v || typeof v !== "object") return NO_PROGRESS;
    const parts: Record<string, number> = {};
    if (v.parts && typeof v.parts === "object") {
      for (const [slug, n] of Object.entries(v.parts as Record<string, unknown>)) {
        if (Number.isInteger(n) && (n as number) > 0) parts[slug] = n as number;
      }
    }
    return {
      walked: strings(v.walked),
      read: strings(v.read),
      at: typeof v.at === "string" ? v.at : null,
      parts,
    };
  } catch {
    return NO_PROGRESS;
  }
}

/** Whether the reader has begun the path at all. */
export function started(p: PathProgress): boolean {
  return p.walked.length > 0 || p.read.length > 0 || p.at !== null || Object.keys(p.parts).length > 0;
}

/** A step is walked when the reader went on from it, or has read every read it has. */
export function isWalked(step: Pick<PathStep, "id" | "reads">, p: PathProgress): boolean {
  if (p.walked.includes(step.id)) return true;
  return step.reads.length > 0 && step.reads.every((r) => p.read.includes(r.id));
}

export function walkedCount(steps: readonly Pick<PathStep, "id" | "reads">[], p: PathProgress): number {
  return steps.filter((s) => isWalked(s, p)).length;
}

/**
 * The step in hand: the one last opened while it is not yet walked, else the
 * first not walked. -1 once all nine are walked.
 */
export function currentStepIndex(steps: readonly Pick<PathStep, "id" | "reads">[], p: PathProgress): number {
  const at = p.at ? steps.findIndex((s) => s.id === p.at) : -1;
  if (at >= 0 && !isWalked(steps[at], p)) return at;
  return steps.findIndex((s) => !isWalked(s, p));
}

export type StepState = "walked" | "current" | "ahead";

/** Each step's state on the path: walked, the one in hand, or still ahead. */
export function stepStates(steps: readonly Pick<PathStep, "id" | "reads">[], p: PathProgress): StepState[] {
  const current = currentStepIndex(steps, p);
  return steps.map((s, i) => (isWalked(s, p) ? "walked" : i === current ? "current" : "ahead"));
}

/**
 * The next read of a step: the one after the furthest read, so a reader who
 * went straight to the second study is not sent back to the first; the first
 * when none is read; -1 when the last is read.
 */
export function nextReadIndex(reads: readonly Pick<PathRead, "id">[], p: PathProgress): number {
  let furthest = -1;
  reads.forEach((r, i) => {
    if (p.read.includes(r.id)) furthest = i;
  });
  return furthest + 1 < reads.length ? furthest + 1 : -1;
}

export type ReadState = "read" | "next" | "ahead";

export function readStates(reads: readonly Pick<PathRead, "id">[], p: PathProgress): ReadState[] {
  const next = nextReadIndex(reads, p);
  return reads.map((r, i) => (p.read.includes(r.id) ? "read" : i === next ? "next" : "ahead"));
}

/** The read that comes after `id` in its step, or null at the step's end. */
export function readAfter(reads: readonly PathRead[], id: string): PathRead | null {
  const at = reads.findIndex((r) => r.id === id);
  return at >= 0 && at + 1 < reads.length ? reads[at + 1] : null;
}

/** The part a study's reading shows, from the address's # ("#part-2"): the first where it names none, held within the study. */
export function partFromHash(hash: string, total: number): number {
  const m = /^#part-(\d+)$/.exec(hash);
  const n = m ? Number(m[1]) : 1;
  return Math.min(Math.max(n, 1), Math.max(total, 1));
}

export function partHash(n: number): string {
  return `#part-${n}`;
}

/** The part a study is opened at: the furthest reached while it is unfinished, else the first. */
export function resumePart(p: PathProgress, slug: string, total: number): number {
  const reached = p.parts[slug] ?? 0;
  return reached > 0 && reached < total ? reached : 1;
}

const add = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function withRead(p: PathProgress, id: string): PathProgress {
  return p.read.includes(id) ? p : { ...p, read: add(p.read, id) };
}

export function withWalked(p: PathProgress, step: string): PathProgress {
  return p.walked.includes(step) ? p : { ...p, walked: add(p.walked, step) };
}

export function withAt(p: PathProgress, step: string): PathProgress {
  return p.at === step ? p : { ...p, at: step };
}

/** The furthest part reached, which a reader going back over a part does not lower. */
export function withPart(p: PathProgress, slug: string, part: number): PathProgress {
  return (p.parts[slug] ?? 0) >= part ? p : { ...p, parts: { ...p.parts, [slug]: part } };
}

/**
 * The first sentence of a text: a question's short answer, the start of its
 * definition. A full stop after "St" or "cf" ends no sentence.
 */
export function firstSentence(text: string): string {
  const end = /[.!?]["'”’)]*(?=\s|$)/g;
  for (let m = end.exec(text); m; m = end.exec(text)) {
    if (/\b(?:Sts?|Ss|cf|vol|ch|no|pp?)$/i.test(text.slice(0, m.index))) continue;
    return text.slice(0, m.index + m[0].length).trim();
  }
  return text.trim();
}
