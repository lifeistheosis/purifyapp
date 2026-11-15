"use client";

import { use, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { readLocalSessionUser } from "@/lib/supabase/localSession";
import type { ResolvedAuth } from "@/lib/supabase/resolveUser";

/**
 * The one rule for a signed page met by a reader who is not signed in (1.9,
 * Gate 3c groups 1 and 2).
 *
 * Until now such a page drew a waiting screen (a single grey line under its
 * bar) while it read the session, and only then sent the reader on to sign in
 * (AccountAuthGate, PlanScreen), or the export baked the server's redirect
 * into an empty page (/set-password/). Either way the switch passed through an
 * empty screen for about 0.4 s, then switched again. Measured on the export of
 * f637f7b8a: 18 to 24 frames, every run, with motion on and reduced.
 *
 * So, when no session is stored on the device, the page does not draw at all
 * until the session read answers. It suspends inside the page switch, and
 * with no new Suspense boundary above it React keeps the page the reader is
 * leaving on the screen (react-dom, shouldRemainOnPreviousScreen). If the
 * answer is "signed out", the page sends the reader on while it still holds,
 * so the one switch the reader sees goes from the page they left straight to
 * sign in, in the house's motion (or at once, with motion reduced). A pushed
 * address the reader never saw is not left behind: the router writes an
 * address when its page commits, and this one never does, so the way on is a
 * push while the address still shows the page being left, and a replace when
 * it already shows this one (a step back, a cold start).
 *
 * The hold is bounded (HOLD_MS). Past it the page draws its own waiting state
 * and goes on exactly as before, so a slow read never freezes the screen. A
 * reader with a session stored is never held, and arrives exactly as before.
 * Before hydration nothing is held either: a router cannot be driven before
 * it is mounted.
 */

/** The longest a page switch holds the page being left while the session is read. */
export const HOLD_MS = 600;
/** A hold older than this belongs to an earlier visit and is asked again. */
const KEEP_MS = 4000;

type Hold = {
  at: number;
  /** The address on the screen when the hold began: the page being left. */
  from: string;
  answer: ResolvedAuth | null;
  /** The answer came, or the bound passed. */
  done: boolean;
  /** Signed out in time: the reader is on the way on, so keep holding. */
  leaving: boolean;
  over: Promise<void>;
};

export type HoldEnv = {
  now: () => number;
  /** The address on the screen, path and query. */
  here: () => string;
  wait: (ms: number) => Promise<void>;
};

const browserEnv: HoldEnv = {
  now: () => Date.now(),
  here: () => window.location.pathname + window.location.search,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const holds = new Map<string, Hold>();
const NEVER: Promise<void> = new Promise(() => {});

const bare = (address: string) => address.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

export type HoldStep = { wait: Promise<void> } | { answer: ResolvedAuth | null };

/**
 * One render of a signed page at `path` with no session stored. `wait` means
 * suspend on it (hold the page being left); `answer` means draw, with the
 * answer, or with null when the bound passed first (the page's own waiting
 * state, as before). `leave` is called at most once, and only while holding.
 */
export function holdStep(
  path: string,
  ask: () => Promise<ResolvedAuth>,
  leave: (how: "push" | "replace") => void,
  env: HoldEnv = browserEnv,
): HoldStep {
  const now = env.now();
  let hold = holds.get(path);
  if (hold && now - hold.at > KEEP_MS) {
    holds.delete(path);
    hold = undefined;
  }
  if (!hold) {
    const entry: Hold = { at: now, from: env.here(), answer: null, done: false, leaving: false, over: NEVER };
    const asked = ask().then((answer) => {
      if (entry.done) return;
      entry.answer = answer;
      if (answer.state !== "signed-out") return;
      if (env.here() !== entry.from) {
        // The reader went somewhere else meanwhile: not ours to move.
        holds.delete(path);
        return;
      }
      entry.leaving = true;
      leave(bare(entry.from) === bare(path) ? "replace" : "push");
    });
    // One promise for the whole hold, and it resolves only when the page is
    // to draw: React keeps the first promise a waiting page was given (see
    // useSignedHold), so a hold that sends the reader on never resolves it.
    entry.over = new Promise<void>((resolve) => {
      void Promise.race([asked, env.wait(HOLD_MS)]).then(() => {
        entry.done = true;
        if (!entry.leaving) resolve();
      });
    });
    holds.set(path, entry);
    hold = entry;
  }
  if (hold.leaving || !hold.done) return { wait: hold.over };
  return { answer: hold.answer };
}

/** The page drew: its next visit asks again. */
export function forgetHold(path: string): void {
  const hold = holds.get(path);
  if (hold && !hold.leaving) holds.delete(path);
}

/**
 * The answer for a device with no session kept on it: signed out, at once
 * (1.9, Updates 92). The hold asked the session read here, and on a cold
 * client (the Supabase client built, its lock taken, the stored session
 * looked for, all on a main thread busy with the switch) that read can take
 * longer than HOLD_MS. Then the bound passed first, the page drew its waiting
 * line, and its own read sent the reader on a moment later: the blank of 22
 * frames on the switch into /set-password/ (Updates 83, 1 of 8; Updates 90,
 * 1 of 2; Gate 4, 1 of 3). The read can only say what the device keeps, and
 * this device keeps no session, so it is signed out, as YouMobile and the
 * shop's signed pages already know it (lib/shop/signedOutAtOnce.ts). Nothing
 * waits on the read, so the bound cannot pass first. A device with a session
 * kept is never held and arrives as before.
 */
export const signedOutAtOnce = (): Promise<ResolvedAuth> => Promise.resolve({ state: "signed-out" });

const noSubscribe = () => () => {};

/**
 * The rule as a hook. `undefined`: not held (a session is stored, the page is
 * hydrating, or `enabled` says no), so the page goes its own way as before.
 * Otherwise the answer read while holding, or null when the bound passed.
 * A signed-out answer in time never returns: the reader goes on to `to`.
 */
export function useSignedHold(path: string, to: string, enabled: () => boolean): ResolvedAuth | null | undefined {
  const router = useRouter();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!hydrated || !enabled() || readLocalSessionUser()) return undefined;
  const leave = (how: "push" | "replace") => (how === "push" ? router.push(to) : router.replace(to));
  // React renders a page that waited once more when its promise resolves, and
  // hands `use` the promise it was first given at that place, whatever it is
  // handed now (react-dom, trackUsedThenable: "Reuse the previous thenable").
  // The hold used to hand it its own promise first and NEVER on the way on,
  // so `use` returned the first, resolved, and this hook said "the bound
  // passed": the gate committed its waiting line and only then went on to
  // sign in (/set-password/'s blank, 1.9, Updates 96). So a step read before
  // a wait is never trusted after it: the hold is asked again until it
  // answers, and a hold that sends the reader on never answers.
  let step = holdStep(path, signedOutAtOnce, leave);
  while ("wait" in step) {
    use(step.wait);
    step = holdStep(path, signedOutAtOnce, leave);
  }
  return step.answer;
}
