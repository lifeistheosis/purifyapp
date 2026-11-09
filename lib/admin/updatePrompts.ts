/**
 * What installed apps are told about updates (1.9, admin item A3), said on
 * Releases beside the drop.
 *
 * Every installed app asks the website which build each store serves
 * (/api/app/release, lib/appUpdate/release.ts servedRelease) and, if its own
 * is older, offers the update. The numbers are 0 in the code until a store
 * serves a release, which tells nobody, and they can be set on Render
 * (ANDROID_VERSION_CODE, IOS_BUILD_NUMBER) the hour a store approves, with
 * no deploy. Nothing showed which of those states the site was in, so on
 * 2026-11-09 the code still said 0 for both stores after 1.8 went out, and no
 * installed app was told about it unless Render said otherwise.
 *
 * This compares the number the site answers with what the drop records
 * (docs/plans/v<release>/drop.json: each store's build, and the day it began
 * serving it), and says in one line what to do, if anything. Early is the
 * harmful direction: every reader is sent to a build the store does not
 * have. Late only means nobody is prompted.
 *
 * Pure. Tested in lib/admin/__tests__/updatePrompts.test.ts.
 */

export type Store = "android" | "ios";

export const PROMPT_ENV: Record<Store, string> = { android: "ANDROID_VERSION_CODE", ios: "IOS_BUILD_NUMBER" };
/** A store's name at the start of a sentence, and inside one. */
const STORE_WORDS: Record<Store, string> = { android: "Google Play", ios: "The App Store" };
const STORE_IN: Record<Store, string> = { android: "Google Play", ios: "the App Store" };

export type PromptVerdict = "off" | "check" | "behind" | "matches" | "ahead" | "told";

export type PromptLine = {
  store: Store;
  /** The build installed apps are told is out; 0 tells nobody. */
  told: number;
  /** Where that number comes from: Render's setting, or the code. */
  from: "render" | "code";
  verdict: PromptVerdict;
  /** What to say, and what to do if anything. */
  line: string;
};

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * One line a store. `build` and `served` are the drop's, for the release the
 * page shows; `current` is false for a past release, whose builds say nothing
 * about what apps should be told today.
 */
export function promptLine(
  store: Store,
  told: number,
  from: "render" | "code",
  version: string,
  drop: { build: number; served?: string | null } | null,
  current: boolean,
): PromptLine {
  const where = STORE_WORDS[store];
  const set = (n: number) => `Set ${PROMPT_ENV[store]}=${n} on Render; apps hear within the hour.`;
  const source = from === "render" ? " (set on Render)" : " (in the code)";
  const served = current && drop && drop.build > 0 && drop.served ? drop : null;

  if (told === 0) {
    if (served) {
      return { store, told, from, verdict: "behind", line: `${where} has served build ${served.build} since ${day(served.served!)}, and no app is told. ${set(served.build)}` };
    }
    if (current && drop && drop.build > 0) {
      return { store, told, from, verdict: "off", line: `Nobody is prompted${source}. That is right until ${STORE_IN[store]} serves build ${drop.build}.` };
    }
    // The drop has no build for this store, so whether the store already
    // serves this version cannot be told from here: say what to check.
    return {
      store,
      told,
      from,
      verdict: "check",
      line: `Nobody is prompted${source}. If ${STORE_IN[store]} already serves ${version}, set ${PROMPT_ENV[store]} to that build's number on Render, and record the build in the drop.`,
    };
  }
  if (served) {
    if (told < served.build) {
      return { store, told, from, verdict: "behind", line: `Apps are told build ${told}${source}, and ${STORE_IN[store]} serves ${served.build} since ${day(served.served!)}. ${set(served.build)}` };
    }
    if (told === served.build) {
      return { store, told, from, verdict: "matches", line: `Apps on an older build are told ${version} is out: build ${told}${source}, as ${STORE_IN[store]} serves it.` };
    }
    return {
      store,
      told,
      from,
      verdict: "ahead",
      line: `Apps are told build ${told}${source}, and ${STORE_IN[store]} serves ${served.build}. Readers are sent to a build the store does not have. ${set(served.build)}`,
    };
  }
  if (current && drop && drop.build > 0 && told === drop.build) {
    // The numbers agree; only the drop's mark that the store serves it is
    // missing, so this is a thing to check, not a fault.
    return {
      store,
      told,
      from,
      verdict: "check",
      line: `Apps are told build ${told}${source}, the build the drop carries. Mark ${STORE_IN[store]} live in the drop once it serves it, and this line can say it matches.`,
    };
  }
  if (current && drop && drop.build > 0 && told > drop.build) {
    return {
      store,
      told,
      from,
      verdict: "ahead",
      line: `Apps are told build ${told}${source}, and the drop carries build ${drop.build}. If ${STORE_IN[store]} does not serve ${told}, readers are sent to a build that is not there.`,
    };
  }
  return { store, told, from, verdict: "told", line: `Apps on an older build are told build ${told} is out${source}.` };
}
