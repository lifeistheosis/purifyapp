"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { measureRows, playFlip, type FlipSnapshot } from "@/lib/ui/flip";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { readCalendarStyleDefault, writeCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import {
  clearResumeStage,
  markOnboarded,
  readBackground,
  readClergy,
  readFastingRule,
  readIntents,
  readLevel,
  readReturning,
  readRole,
  setResumeStage,
  writeBackground,
  writeClergy,
  writeDepth,
  writeFastingRule,
  writeFocus,
  writeIntents,
  writeKeep,
  writeLevel,
  writeReturning,
  writeRole,
} from "@/lib/onboarding/state";
import { armHere, exposed, reached as abReached, refreshWeights } from "@/lib/ab/device";
import { countReminders, markAccountFrom } from "@/lib/analytics/moreCount";
import { ACCOUNT_PLACE } from "@/lib/ab/tests";
import { roadsEnabled } from "@/lib/onboarding/flags";
import { isTesting, previewSignedOut } from "@/lib/onboarding/testing";
import { leanOf, roadOf } from "@/lib/onboarding/road";
import { weekFor } from "@/lib/onboarding/week";
import {
  NO_ANSWERS,
  OTHER,
  TYPED_MAX,
  asksClergy,
  clergyComplete,
  isClergyRole,
  isClergyStep,
  type ClergyAnswers,
  type ParishAnswer,
  type Role,
} from "@/lib/onboarding/clergy";
import { fileClergyRequest } from "@/lib/onboarding/clergyRequest";
import { flowSteps, progressPath, type StepId } from "@/lib/onboarding/flowSteps";
import {
  BACKGROUND_PILLS,
  ROAD_PILLS,
  dayOneFor,
  defaultsFor,
  depthFor,
  focusesFor,
  togglePick,
  type Background,
  type CalendarChoice,
  type DayOneKey,
  type FastingRule,
  type Intent,
  type Level,
} from "@/lib/onboarding/space";
import { saveSpaceToAccount } from "@/lib/onboarding/accountSync";
import { beginCountRun, countFinished, countOnboarding, countPicks } from "@/lib/onboarding/count";
import { routeFor, type CountQuestion } from "@/lib/onboarding/counting";
import { EVENING_DEFAULT, MORNING_DEFAULT, enableReminders as enablePush, remindersStatus, type EnableWhy } from "@/lib/push/reminders";
import { clearReminderWish, keepReminderWish, readReminderWish } from "@/lib/push/wish";
import { isNativeClient } from "@/lib/platform/native";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { recordAcceptance } from "@/lib/legal/recordAcceptance";
import { authOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { Compass } from "@/components/ui/icons/Compass";
import { LegalLink } from "@/components/legal/LegalLink";
import { Book } from "@/components/ui/icons/Book";
import { Cross } from "@/components/ui/icons/Cross";
import { ClergyJurisdiction, ClergyParish, ClergyWhere } from "./ClergySteps";
import { HandoffSlate, type SlateLine } from "./HandoffSlate";
import { LookingFor } from "./LookingFor";
import { PrimaryButton } from "./PrimaryButton";
import { GLIDE_MS, RemindersOn, preloadReminderArt, type ReminderTimes } from "./RemindersOn";
import { WhereFrom, WhereFromSky } from "./WhereFrom";

/**
 * First-run onboarding, version 2: the adaptive onboarding engine from the
 * owner's specification of 2026-09-28.
 *
 *   welcome    the outcome, in one calm line
 *   account    sign in or create an account, or carry on without one
 *   background "Where are you coming from?" (1.8, ./WhereFrom): the first
 *              question, on the intro's night and horizon
 *   level      the baseline fork: completely new, learning, or practicing
 *   role       "Are you a priest, a deacon, or a layman?", asked of the
 *              practicing only (1.8.x, the owner's note 54); a priest or
 *              deacon then answers where they serve, their jurisdiction, and
 *              in the United States their parish (./ClergySteps,
 *              lib/onboarding/clergy.ts), which asks the team for the clergy
 *              seal when the questions end and shows no mark by itself
 *   rule       calendar and fasting, asked of the practicing only
 *   intent     "What are you looking for?": as many answers as fit, in the
 *              order tapped, the first of them the intent (1.8, ./LookingFor)
 *   reminders  a benefit-first priming screen before the OS prompt, and once
 *              they are allowed, the reminders themselves (./RemindersOn)
 *   handoff    a three-second slate that sets the space up and hands over
 *
 * The questions come AFTER the account step, as the specification places
 * them, and a Google or Apple sign-in that leaves the page resumes at the
 * first question (lib/onboarding/state.ts, the resume stage). Every answer is
 * written the moment it is given, so leaving halfway keeps what was said.
 *
 * A reader who is back (1.5.2: the onboarding begins again for everyone, and
 * a signed-in reader "gets a customized version ... saying, oh, we updated
 * our onboarding. Here are some quick questions") comes in by "returning":
 *
 *   returning  one screen that says so, and that nothing they saved changes
 *   background the same questions, with what they answered before marked
 *   level
 *   rule       for the practicing, opened on the calendar and fast they keep
 *   intent
 *   reminders  only if this device does not have them on already
 *   handoff
 *
 * No welcome and no account step: they know Purify and they are signed in.
 * And nothing they have set is reset. A new reader's level brings its own
 * calendar and fasting defaults (space.ts, defaultsFor); a reader who is back
 * keeps the calendar and the fast they already had, whatever level they pick
 * now, because a reader on the Old Calendar who taps "Learning" has not asked
 * for every feast to move thirteen days.
 */

/** Where the flow begins: the welcome for a new visitor, the account step
 *  when the reader came to make an account (the mobile website), the first
 *  question when they are signed in already ("level", the name it kept when
 *  "Where are you coming from?" was put before familiarity in 1.8, so the
 *  way in counts under the same name), "returning" for a signed-in reader
 *  from before this version of the questions, and "reminders" for a reader
 *  back from the sign-in the reminders step sent them to. */
export type OnboardingStart = "welcome" | "account" | "level" | "returning" | "reminders";

// The screens, in order, are lib/onboarding/flowSteps.ts (tested there).

const AUTO_ADVANCE_MS = 420;

export function OnboardingFlow({
  onDone,
  startAt = "welcome",
  catechismAvailable = false,
}: {
  /** Fires once the overlay has faded: the Day 1 step when the reader
   *  reached the handoff (with the roads on, the first step of their week),
   *  null when they skipped or left for another page. */
  onDone: (dayOne: { key: DayOneKey | string; href: string } | null) => void;
  /** "level" when the reader is already signed in (a resumed sign-in or a brand-new account). */
  startAt?: OnboardingStart;
  /** One optional line on the account step, shown only while the bank has questions. */
  catechismAvailable?: boolean;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const returning = startAt === "returning";
  // The roads (1.9, lib/onboarding/flags.ts): read once, as the overlay
  // opens, so the questions keep one shape from first screen to last.
  const [roads] = useState(roadsEnabled);
  // Roads only: whether someone is signed in, which decides whether the
  // reminders are asked here or on Today (lib/onboarding/flowSteps.ts).
  // In Testers mode an admin may preview the signed-out way through
  // (lib/onboarding/testing.ts, previewSignedOut): an admin is always signed in.
  const [hasAccount, setHasAccount] = useState(() => roads && !!readLocalSessionUser() && !previewSignedOut());
  // Roads only: the account asked for as the last question, for a device in
  // that version of the account's test (lib/ab/tests.ts, ACCOUNT_PLACE). Known
  // once the reader leaves "What are you looking for?", the last screen the
  // two versions share.
  const [accountAtEnd, setAccountAtEnd] = useState(false);
  // Back from the sign-in the reminders step sent them to: every answer
  // before it is given already, and the end shows them as they were.
  const resumed = startAt === "reminders";
  const answered = returning || resumed;
  // A reader who is back starts from what they have: the answers they gave
  // before are the ones marked, and the calendar and fast are the ones they
  // keep. Read once, as the overlay opens (it only ever opens on the client).
  const [level, setLevel] = useState<Level | null>(() => (answered ? readLevel() : null));
  // Where they come from (1.8). Marked for a reader who is back, and for one
  // coming back to the questions from a sign-in, who may have answered it.
  const [background, setBackground] = useState<Background | null>(() =>
    answered || startAt === "level" ? readBackground() : null,
  );
  const [calendar, setCalendar] = useState<CalendarChoice>(() => (answered ? readCalendarStyleDefault() : "new"));
  const [fasting, setFasting] = useState<FastingRule>(() => (answered ? readFastingRule() : "strict"));
  // "What are you looking for?" (1.8): every pick in the order tapped. The
  // first is the intent, the one answer the Day 1 step and the counts read.
  const [picks, setPicks] = useState<Intent[]>(() => (answered ? readIntents() : []));
  const intent = picks[0] ?? null;
  // A priest, a deacon or a layman, and a priest's or deacon's answers after
  // it (1.8.x). Marked for a reader who is back, as every answer is.
  const [role, setRole] = useState<Role | null>(() => (answered ? readRole() : null));
  // Roads only. Coming back after time away: practicing, on the road back.
  const [away, setAway] = useState(() => (answered ? readReturning() : false));
  // Roads only. The clergy's question is behind a quiet line on the rule's
  // screen; open already for a reader who answered it before.
  const [clergyOpen, setClergyOpen] = useState(() => (answered ? isClergyRole(readRole()) : false));
  const [clergy, setClergy] = useState<ClergyAnswers>(() => (answered ? readClergy() : NO_ANSWERS));
  // Whether a request for the seal goes at the end or waits for a sign-in,
  // for the handoff's line. Asked of the device as the clergy's questions open.
  const [signedIn, setSignedIn] = useState(false);
  // Reminders already on, on this device: a reader who is back is not asked
  // to turn on what is on. Unknown until the device has answered.
  const [remindersOn, setRemindersOn] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [busy, setBusy] = useState(false);
  // Why reminders could not be turned on, said in place of the button.
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  // Reminders asked for with nobody signed in: the step asks for a sign-in
  // in place of the button (signInForReminders).
  const [needsAccount, setNeedsAccount] = useState(false);
  // What the last try came to when it failed: whether the same tap is worth
  // offering again, and, for a tester alone, which wait it was (build 90, note 2).
  const [reminderFail, setReminderFail] = useState<{ again: boolean; why: EnableWhy | null } | null>(null);
  // The reminders just switched on, at the times they were switched on at,
  // which the step then shows as Purify's own cards (./RemindersOn). Fresh
  // while the reader is still on the screen where they allowed them, so the
  // moment plays on from the question as it stood; back on the screen later,
  // it arrives as any step does.
  const [remindersSet, setRemindersSet] = useState<{ times: ReminderTimes; fresh: boolean } | null>(null);
  // Where the question stood as Allow landed, for the heading's glide.
  const reminderGlide = useRef<FlipSnapshot | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  // One answer, one advance: a second tap during the pause must not skip the
  // next question.
  const advancing = useRef(false);

  const steps = useMemo<StepId[]>(
    () => flowSteps({ startAt, level, role, country: clergy.country, remindersOn, roads, signedIn: hasAccount, clergyOpen, accountAtEnd }),
    [startAt, level, role, clergy.country, remindersOn, roads, hasAccount, clergyOpen, accountAtEnd],
  );
  const step = steps[Math.min(index, steps.length - 1)];
  // The first step the handoff names and the website opens. With the roads
  // on it is the first day of the reader's week (lib/onboarding/week.ts), or
  // the Day 1 step when they have said nothing to choose a road by.
  const dayOne = useMemo<{ key: DayOneKey | string; href: string; titleKey: string }>(() => {
    const road = roads ? roadOf({ background, level, intent, returning: away }) : null;
    if (road) return weekFor({ road, lean: leanOf(intent), level, picks })[0];
    const one = dayOneFor(level, intent);
    return { ...one, titleKey: `onboard.day1.${one.key}.title` };
  }, [roads, background, level, intent, away, picks]);
  const onRoad = roads && roadOf({ background, level, intent, returning: away }) != null;
  const route = routeFor(startAt);

  // Lock background scroll while the overlay is up.
  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  // The counts (lib/onboarding/count.ts): a new run as the overlay opens, then
  // each screen once as it is reached. Declared before the screen's count, so
  // the run is new before the first screen is counted.
  useEffect(() => {
    beginCountRun();
  }, []);
  useEffect(() => {
    // A priest's or deacon's own screens are not counted: that one was
    // reached would tell what was answered, and those answers leave the
    // device only inside their request for the seal. The role question is
    // counted as reached, never by its answer.
    if (isClergyStep(step)) return;
    countOnboarding({ name: "onboarding_step", props: { route, step } });
  }, [route, step]);

  // Signed in or not, asked once the clergy's question is reached and again
  // at the handoff (a sign-in may have come between).
  useEffect(() => {
    if (step !== "role" && step !== "handoff") return;
    let alive = true;
    void createClient()
      .auth.getSession()
      .then(
        ({ data }) => {
          if (alive) setSignedIn(Boolean(data.session));
        },
        () => {},
      );
    return () => {
      alive = false;
    };
  }, [step]);

  const countAnswer = useCallback(
    (question: CountQuestion, answer: string) => {
      countOnboarding({ name: "onboarding_answer", props: { route, question, answer } });
    },
    [route],
  );

  // Whether this device already has reminders, asked once for a reader who
  // is back. It answers long before they reach that step; if it cannot
  // answer, the step shows, as it does for everyone else.
  useEffect(() => {
    if (!returning) return;
    let alive = true;
    void remindersStatus().then(
      (status) => {
        if (alive && status === "subscribed") setRemindersOn(true);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [returning]);

  const go = useCallback(
    (to: number) => {
      setDir(to >= index ? "fwd" : "back");
      setIndex(Math.max(0, Math.min(to, steps.length - 1)));
      // Leaving the screen where reminders were allowed: the moment has played.
      setRemindersSet((set) => (set?.fresh ? { ...set, fresh: false } : set));
    },
    [index, steps.length],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const back = useCallback(() => go(index - 1), [go, index]);

  // A sign-in that completes without leaving the page (the native shells'
  // in-app browser) moves the flow on by itself. Only state is set in the
  // callback: an auth call made inside onAuthStateChange never returns.
  useEffect(() => {
    if (step !== "account") return;
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        countAnswer("account", "signed-in");
        // Roads: signed in now, so the reminders are asked here after all.
        if (roads) setHasAccount(true);
        next();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [step, next, countAnswer, roads]);

  useEffect(() => {
    // On the way into the account step: if sign-in leaves the page, the
    // questions resume when it comes back.
    // As the last question (the account's test), every answer is given
    // already: a sign-in that leaves the page comes back to the reminders and
    // the end, and the card on Today is not for this reader.
    if (step === "account") {
      // If an account comes of this step, the welcome questions are where it was made.
      markAccountFrom("questions");
      setResumeStage(accountAtEnd ? "reminders" : "assessment");
      if (accountAtEnd) writeKeep("done");
    }
  }, [step, accountAtEnd]);

  // The shares of a running test, asked for while the first questions are up,
  // so they are here by the time the device is given its version.
  useEffect(() => {
    if (roads && !hasAccount) refreshWeights();
  }, [roads, hasAccount]);

  // The reminders' two icons, fetched while the question is still up.
  useEffect(() => {
    if (step === "reminders") preloadReminderArt();
  }, [step]);

  // Allow has landed and the question has given way to the reminders: the
  // heading glides on from where it stood, before the first paint, so it is
  // never seen to jump. Reduced motion skips it (playFlip asks).
  useLayoutEffect(() => {
    const from = reminderGlide.current;
    if (!from) return;
    reminderGlide.current = null;
    playFlip(stepRef.current, from, { durationMs: GLIDE_MS, easing: "var(--ease-house)" });
  }, [remindersSet]);

  function advanceSoon() {
    advancing.current = true;
    window.setTimeout(() => {
      advancing.current = false;
      setDir("fwd");
      setIndex((i) => i + 1);
    }, AUTO_ADVANCE_MS);
  }

  // Where they come from: saved as it is tapped, counted as they leave, so the
  // count holds what they settled on. A pill is followed by its line and
  // Continue; "Prefer not to say" is an answer, and moves on at once.
  function chooseBackground(b: Background) {
    // Not once "Prefer not to say" is moving the reader on.
    if (advancing.current) return;
    setBackground(b);
    writeBackground(b);
  }

  function leaveBackground() {
    if (!background) return;
    countAnswer("background", background);
    next();
  }

  function preferNotToSay() {
    if (advancing.current) return;
    setBackground("prefer-not");
    writeBackground("prefer-not");
    countAnswer("background", "prefer-not");
    advanceSoon();
  }

  // `comingBack` is the roads' third answer for the Orthodox (1.9): the
  // level is still "practicing", with the mark that puts them on the road
  // back, and the fast starts shown plainly, not as the full rule.
  function chooseLevel(l: Level, comingBack = false) {
    if (advancing.current) return;
    // The same answer again (after going back) keeps whatever the rule step
    // already set; only a new answer brings its own defaults. And never for a
    // reader who is back: they keep the calendar and the fast they have. The
    // practicing are shown both on the next step and can change them there.
    if ((l !== level || comingBack !== away) && !returning) {
      const d = comingBack ? { calendar: "new" as const, fasting: "modified" as const } : defaultsFor(l);
      setCalendar(d.calendar);
      setFasting(d.fasting);
      writeCalendarStyleDefault(d.calendar);
      writeFastingRule(d.fasting);
    }
    setLevel(l);
    writeLevel(l);
    writeDepth(depthFor(l));
    if (roads) {
      setAway(comingBack);
      writeReturning(comingBack);
    }
    // Counted by the level it is underneath: coming back is practicing.
    countAnswer("level", l);
    advanceSoon();
  }

  // Roads only: the quiet line on the rule's screen. The clergy's question
  // becomes the next screen, and the rule's answers are counted as it is left.
  function openClergy() {
    if (advancing.current) return;
    countAnswer("calendar", calendar);
    countAnswer("fasting", fasting);
    setClergyOpen(true);
    advanceSoon();
  }

  // "Are you a priest, a deacon, or a layman?" (1.8.x): kept on the device
  // and moved on from at once, as the level is. Never counted by its answer.
  function chooseRole(r: Role) {
    if (advancing.current) return;
    setRole(r);
    writeRole(r);
    advanceSoon();
  }

  // A priest's or deacon's answers, each kept as it is given. Where they serve
  // is a tap that moves on; a new country asks its own jurisdiction again, and
  // a parish only in the United States.
  function saveClergy(nextAnswers: ClergyAnswers) {
    setClergy(nextAnswers);
    writeClergy(nextAnswers);
  }

  function chooseCountry(c: string) {
    if (advancing.current) return;
    saveClergy(c === clergy.country ? clergy : { ...NO_ANSWERS, country: c });
    advanceSoon();
  }

  // A listed jurisdiction moves on; "Another jurisdiction" waits for its name.
  function chooseJurisdiction(j: string) {
    if (advancing.current) return;
    saveClergy({ ...clergy, jurisdiction: j });
    if (j !== OTHER) advanceSoon();
  }

  function nameJurisdiction(name: string) {
    saveClergy({ ...clergy, otherJurisdiction: name.slice(0, TYPED_MAX) });
  }

  function pickParish(parish: ParishAnswer | null) {
    saveClergy({ ...clergy, parish });
  }

  function chooseCalendar(c: CalendarChoice) {
    setCalendar(c);
    writeCalendarStyleDefault(c);
  }

  function chooseFasting(f: FastingRule) {
    setFasting(f);
    writeFastingRule(f);
  }

  // Each tap is saved as it is given, as every answer is: the picks in their
  // order, the first as the intent, and the older focus picks in step.
  function toggleIntent(i: Intent) {
    const nextPicks = togglePick(picks, i);
    setPicks(nextPicks);
    writeIntents(nextPicks);
    writeFocus(focusesFor(nextPicks));
  }

  // Counted as the reader leaves the screen, like the rule's answers, so the
  // count holds what they settled on: every pick, each with its place in the
  // order tapped (1.8), the first of them the intent.
  function leaveIntent() {
    if (!intent) return;
    countPicks(route, picks);
    // The account's test (lib/ab/tests.ts): a reader with no account is in
    // one of its two versions from here, the last screen they share, and is
    // counted as shown here whichever it is. Never where the questions began
    // at the account, and never while no test is running (armHere says).
    if (roads && !hasAccount && startAt !== "account") {
      const here = armHere("onboarding");
      exposed("onboarding");
      if (here?.test.id === ACCOUNT_PLACE.id && here.arm === "end") setAccountAtEnd(true);
    }
    next();
  }

  // The rule's two answers are counted as the reader leaves the screen, so
  // the count holds what they settled on, not every tap on the way.
  function leaveRule() {
    countAnswer("calendar", calendar);
    countAnswer("fasting", fasting);
    next();
  }

  const finish = useCallback(
    (reached: boolean) => {
      markOnboarded({ again: returning });
      clearResumeStage();
      clearReminderWish();
      // Stamped with this version of the questions, so the reader's other
      // devices take these answers and do not ask again.
      void saveSpaceToAccount({ finished: true });
      // A priest or deacon who answered where they serve asks the team for
      // the clergy seal now, with the answers as they stand at the end; signed
      // out, it waits on the device for a sign-in. Nothing shows until the
      // team has verified it (lib/onboarding/clergyRequest.ts).
      void fileClergyRequest();
      if (reached) {
        // For a test that reads it (lib/ab/device.ts): the questions reached their end.
        abReached("finished");
        const kept = readBackground();
        const answers = { ...(kept ? { background: kept } : {}), ...(level ? { level } : {}), ...(intent ? { intent } : {}) };
        void createClient()
          .auth.getSession()
          .then(
            ({ data }) => countFinished(route, answers, !!data.session),
            () => countFinished(route, answers, false),
          );
      } else {
        // A skip from a priest's or deacon's own screens counts at the role
        // question, so the count never says which answer led there.
        countOnboarding({ name: "onboarding_skipped", props: { route, at: isClergyStep(step) ? "role" : step } });
      }
      setExiting(true);
      window.setTimeout(() => onDone(reached ? dayOne : null), 420);
    },
    [onDone, dayOne, returning, level, intent, route, step],
  );

  const enableReminders = useCallback(async () => {
    setBusy(true);
    setReminderNote(null);
    setReminderFail(null);
    setNeedsAccount(false);
    // Named here because the screen shows them: the times switched on are
    // the times the reader sees.
    const times: ReminderTimes = { morning: MORNING_DEFAULT, evening: EVENING_DEFAULT };
    try {
      // Native push (APNs/FCM) inside the Capacitor shell, Web Push in the
      // browser. Both are kept with an account and nowhere else, so with
      // nobody signed in the facade asks nothing of the device and says so.
      const result = await enablePush(times.morning, times.evening);
      if (!result.ok && result.reason === "signed-out") {
        // Asked to sign in now (signInForReminders), and brought back here.
        // Never "on" while there is no account to keep them with.
        setNeedsAccount(true);
        return;
      }
      // Asked for and answered: nothing waits for a sign-in any more.
      clearReminderWish();
      if (!result.ok) {
        countAnswer("reminders", result.reason === "denied" ? "blocked" : result.reason === "unsupported" ? "unsupported" : "failed");
        // Where to allow them again: on a phone it is the phone's settings
        // (an iPhone never asks twice), not a browser's.
        if (result.reason === "denied")
          setReminderNote(isNativeClient() ? t("onboard.reminders.blockedPhone") : t("onboard.reminders.blocked"));
        else if (result.reason === "unsupported") setReminderNote(t("onboard.reminders.unsupported"));
        // Anything else is ours to say, not to swallow: the reader allowed
        // notifications and still has none.
        else setReminderNote(t("prayers.push.failed"));
        // The same tap again, wherever another try can end otherwise: after
        // allowing them in the settings, with a connection back, a moment on.
        // Never where the device cannot have reminders at all.
        setReminderFail({ again: result.reason !== "unsupported", why: result.why ?? null });
        return;
      }
      countAnswer("reminders", "on");
      countReminders("on", "questions");
      // The question as it stands now, the busy button still in it. A reader
      // who went back while the prompt was up is not on it, and later finds
      // the reminders already standing.
      const from = measureRows(stepRef.current);
      const fresh = from.has("reminders");
      if (fresh) reminderGlide.current = from;
      setRemindersSet({ times, fresh });
    } catch {
      clearReminderWish();
      countAnswer("reminders", "failed");
      setReminderNote(t("prayers.push.failed"));
      setReminderFail({ again: true, why: null });
    } finally {
      setBusy(false);
    }
  }, [countAnswer, t]);

  // Reminders are kept with an account (a phone's token, a browser's
  // subscription), so a reader with none is sent to the app's own sign-in,
  // with their wish kept and the questions set to pick up at the reminders
  // (lib/push/wish.ts, the resume stage). Nothing is marked finished: they
  // come back to this screen and the end after it.
  function signInForReminders() {
    keepReminderWish({ morning: MORNING_DEFAULT, evening: EVENING_DEFAULT });
    setResumeStage("reminders");
    setExiting(true);
    window.setTimeout(() => {
      onDone(null);
      router.push("/signin?next=/");
    }, 420);
  }

  // Back from that sign-in. On a phone the tap before it was the reader's
  // answer, so the reminders go on now: the phone's own question, then the
  // cards. A browser shows its question only after a tap of its own, so
  // there the button waits, the wish kept until it is pressed or declined.
  // Deferred a tick, so no state is set from the effect's own body.
  const resumedWish = useRef(false);
  useEffect(() => {
    if (step !== "reminders" || resumedWish.current || !isNativeClient()) return;
    if (!readReminderWish() || !readLocalSessionUser()) return;
    const id = window.setTimeout(() => {
      resumedWish.current = true;
      void enableReminders();
    }, 0);
    return () => window.clearTimeout(id);
  }, [step, enableReminders]);

  const slateLines: SlateLine[] = [
    {
      label: t("onboard.handoff.calendar"),
      value: calendar === "old" ? t("onboard.personalize.calOld") : t("onboard.personalize.calNew"),
    },
    { label: t("onboard.handoff.fasting"), value: t(`onboard.fasting.${fasting}`) },
    ...(intent ? [{ label: t("onboard.handoff.focus"), value: t(`onboard.intent.${intent}`) }] : []),
    // A priest or deacon who answered where they serve: their request goes to
    // the team, who check it before any seal shows. Says so, and shows none.
    ...(asksClergy(level) && isClergyRole(role) && clergyComplete(role, clergy)
      ? [{ label: t("onboard.handoff.clergy"), value: signedIn ? t("onboard.handoff.clergySent") : t("onboard.handoff.clergyLater") }]
      : []),
    // A reader who is back is not on their first day.
    {
      // On a road, the week itself, and that it comes one step a day: the
      // step that leads it is the reader's own first pick, which the Focus
      // line above has just said.
      label: returning ? t("onboard.returning.next") : onRoad ? t("onboard.week.title") : t("onboard.handoff.first"),
      value: onRoad && !returning ? t("onboard.week.sub") : t(dayOne.titleKey),
    },
  ];

  // Measured against the longest way through, so the line only ever grows
  // (lib/onboarding/flowSteps.ts, progressPath).
  const path = progressPath(startAt, roads);
  const progress = Math.max(0, path.indexOf(step)) / (path.length - 1);
  const stepClass = dir === "fwd" ? "ob-step-fwd" : "ob-step-back";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={returning ? t("onboard.returning.title") : t("onboard.welcome.eyebrow")}
      className={`lm-hero fixed inset-0 z-[100] flex flex-col overflow-y-auto text-paper safe-pb-edge ${exiting ? "ob-exit" : ""}`}
      style={{
        background:
          "radial-gradient(120% 55% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%), #101013",
      }}
    >
      {/* "Where are you coming from?" stands on the intro's night and horizon,
          held still behind the step while the step slides in. */}
      {step === "background" ? <WhereFromSky /> : null}

      {/* Top bar: back, the progress line, skip. Padded past the status bar
          (inset + 1.25rem) so the controls are never under the Android clock,
          the "invisible skip button" tester report. On web the inset is 0. */}
      <div
        className="flex items-center gap-3 px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={back}
          disabled={index === 0 || step === "handoff"}
          aria-label={t("onboard.back")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/60 transition-colors hover:text-paper disabled:invisible"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
            <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper/12" aria-hidden>
          <div className="ob-progress h-full rounded-full bg-premium" style={{ width: `${Math.max(6, progress * 100)}%` }} />
        </div>
        <button
          type="button"
          onClick={() => finish(false)}
          disabled={step === "handoff"}
          className="inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 font-sans text-caption text-paper/55 transition-colors hover:text-paper disabled:invisible"
        >
          {t("onboard.skip")}
        </button>
      </div>

      {/* "What are you looking for?" stands at the top of a phone with its
          button held at the foot, as its design draws it, and "Where are you
          coming from?" a little lower, over its horizon; a priest's or
          deacon's lists stand at the top on every screen, since a centred
          list longer than the window would lose its head; every other step
          is centred. */}
      <div
        key={step}
        ref={stepRef}
        className={`${stepClass} mx-auto flex w-full max-w-md flex-1 flex-col px-6 ${
          step === "intent"
            ? "pt-5 md:justify-center md:py-10"
            : step === "background"
              ? "pb-6 pt-16 md:justify-center md:py-10"
              : isClergyStep(step)
                ? "pb-6 pt-5"
                : "justify-center py-10"
        }`}
      >
        {step === "welcome" && (
          <Step
            eyebrow={t("onboard.welcome.eyebrow")}
            title={t("onboard.welcome.title")}
            body={t("onboard.welcome.body")}
            icon={<PurifyMark size={40} />}
            center
          >
            <PrimaryButton onClick={next}>{t("onboard.welcome.begin")}</PrimaryButton>
          </Step>
        )}

        {step === "returning" && (
          <Step
            eyebrow={t("onboard.returning.eyebrow")}
            title={t("onboard.returning.title")}
            body={t("onboard.returning.body")}
            icon={<PurifyMark size={40} />}
            center
          >
            <PrimaryButton onClick={next}>{t("onboard.welcome.begin")}</PrimaryButton>
          </Step>
        )}

        {step === "account" && (
          <Step eyebrow={t("onboard.account.eyebrow")} title={t("onboard.account.title")} body={t("onboard.account.body")}>
            <AccountStep
              onSkip={() => {
                countAnswer("account", "without");
                next();
              }}
              skipLabel={t("onboard.account.skip")}
            />
            {catechismAvailable && (
              <p className="mt-6 text-center font-serif text-caption leading-[1.5] text-paper/55">
                {t("catechism.onboardLine")}{" "}
                <Link
                  href="/catechism"
                  onClick={() => finish(false)}
                  className="text-paper/80 underline decoration-paper/30 underline-offset-2 hover:decoration-paper"
                >
                  {t("catechism.onboardLink")}
                </Link>
              </p>
            )}
          </Step>
        )}

        {step === "background" && (
          <WhereFrom
            answer={background}
            pills={roads ? ROAD_PILLS : BACKGROUND_PILLS}
            onChoose={chooseBackground}
            onContinue={leaveBackground}
            onPreferNot={preferNotToSay}
          />
        )}

        {/* Roads only (1.9): how far along, asked in the reader's own terms.
            The Orthodox are asked where they are now; everyone else whether
            they have been to an Orthodox church. Underneath it is the same
            answer as ever (lib/onboarding/space.ts, Level), so nothing that
            reads it changes. "Prefer not to say" keeps the question as it was. */}
        {step === "level" && roads && background === "orthodox" && (
          <Step eyebrow={t("onboard.level.eyebrow")} title={t("onboard.where.title")}>
            <div className="flex flex-col gap-2.5">
              <ChoiceCard
                selected={level === "practicing" && !away}
                onClick={() => chooseLevel("practicing")}
                icon={<Cross size={20} />}
                title={t("onboard.level.practicing")}
                sub={t("onboard.level.practicingSub")}
                delay={0}
              />
              <ChoiceCard
                selected={level === "practicing" && away}
                onClick={() => chooseLevel("practicing", true)}
                icon={<Compass size={20} />}
                title={t("onboard.where.returning")}
                sub={t("onboard.where.returningSub")}
                delay={1}
              />
              <ChoiceCard
                selected={level === "learning"}
                onClick={() => chooseLevel("learning")}
                icon={<Book size={20} />}
                title={t("onboard.where.preparing")}
                sub={t("onboard.level.learningSub")}
                delay={2}
              />
            </div>
          </Step>
        )}
        {step === "level" && roads && background !== "orthodox" && background !== "prefer-not" && background !== null && (
          <Step eyebrow={t("onboard.level.eyebrow")} title={t("onboard.been.title")}>
            <div className="flex flex-col gap-2.5">
              <ChoiceCard
                selected={level === "inquirer"}
                onClick={() => chooseLevel("inquirer")}
                icon={<Compass size={20} />}
                title={t("onboard.been.notYet")}
                sub={t("onboard.level.inquirerSub")}
                delay={0}
              />
              <ChoiceCard
                selected={level === "learning"}
                onClick={() => chooseLevel("learning")}
                icon={<Book size={20} />}
                title={t("onboard.been.going")}
                sub={t("onboard.level.learningSub")}
                delay={1}
              />
            </div>
          </Step>
        )}
        {step === "level" && (!roads || background === "prefer-not" || background === null) && (
          <Step eyebrow={t("onboard.level.eyebrow")} title={t("onboard.level.title")}>
            <div className="flex flex-col gap-2.5">
              <ChoiceCard
                selected={level === "inquirer"}
                onClick={() => chooseLevel("inquirer")}
                icon={<Compass size={20} />}
                title={t("onboard.level.inquirer")}
                sub={t("onboard.level.inquirerSub")}
                delay={0}
              />
              <ChoiceCard
                selected={level === "learning"}
                onClick={() => chooseLevel("learning")}
                icon={<Book size={20} />}
                title={t("onboard.level.learning")}
                sub={t("onboard.level.learningSub")}
                delay={1}
              />
              <ChoiceCard
                selected={level === "practicing"}
                onClick={() => chooseLevel("practicing")}
                icon={<Cross size={20} />}
                title={t("onboard.level.practicing")}
                sub={t("onboard.level.practicingSub")}
                delay={2}
              />
            </div>
          </Step>
        )}
        {/* The baptized Orthodox only (1.8.x, the owner's note 54). A priest
            or deacon goes on to where they serve; a layman to the rule. */}
        {step === "role" && (
          <Step eyebrow={t("onboard.level.eyebrow")} title={t("onboard.role.title")} body={t("onboard.role.body")}>
            <div className="flex flex-col gap-2.5">
              <ChoiceCard selected={role === "priest"} onClick={() => chooseRole("priest")} title={t("clergy.rank.priest")} delay={0} />
              <ChoiceCard selected={role === "deacon"} onClick={() => chooseRole("deacon")} title={t("clergy.rank.deacon")} delay={1} />
              <ChoiceCard selected={role === "layman"} onClick={() => chooseRole("layman")} title={t("onboard.role.layman")} delay={2} />
            </div>
          </Step>
        )}

        {step === "clergyWhere" && <ClergyWhere country={clergy.country} onChoose={chooseCountry} />}

        {step === "clergyJurisdiction" && clergy.country && (
          <ClergyJurisdiction
            country={clergy.country}
            jurisdiction={clergy.jurisdiction}
            otherName={clergy.otherJurisdiction}
            onChoose={chooseJurisdiction}
            onOtherName={nameJurisdiction}
            onContinue={next}
          />
        )}

        {step === "clergyParish" && (
          <ClergyParish jurisdiction={clergy.jurisdiction} parish={clergy.parish} onPick={pickParish} onContinue={next} />
        )}

        {step === "rule" && (
          <Step eyebrow={t("onboard.rule.eyebrow")} title={t("onboard.rule.title")} body={t("onboard.rule.body")}>
            <p className="mb-2 font-sans text-caption font-semibold text-paper/55">
              {t("onboard.rule.calendar")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <ChoiceCard
                selected={calendar === "new"}
                onClick={() => chooseCalendar("new")}
                title={t("onboard.personalize.calNew")}
                sub={t("onboard.personalize.calNewSub")}
                compact
                delay={0}
              />
              <ChoiceCard
                selected={calendar === "old"}
                onClick={() => chooseCalendar("old")}
                title={t("onboard.personalize.calOld")}
                sub={t("onboard.personalize.calOldSub")}
                compact
                delay={1}
              />
            </div>
            <p className="mb-2 mt-6 font-sans text-caption font-semibold text-paper/55">
              {t("onboard.rule.fasting")}
            </p>
            <div className="flex flex-col gap-2.5">
              {(["strict", "modified", "hidden"] as const).map((f, i) => (
                <ChoiceCard
                  key={f}
                  selected={fasting === f}
                  onClick={() => chooseFasting(f)}
                  title={t(`onboard.fasting.${f}`)}
                  sub={t(`onboard.fasting.${f}Sub`)}
                  compact
                  delay={2 + i}
                />
              ))}
            </div>
            <div className="mt-8">
              <PrimaryButton onClick={leaveRule}>{t("onboard.continue")}</PrimaryButton>
            </div>
            {/* Roads only: the clergy's question, a quiet line for the few it
                is for, where it was a screen every practicing reader passed. */}
            {roads && !clergyOpen ? (
              <button
                type="button"
                onClick={openClergy}
                className="mt-2 inline-flex min-h-11 items-center self-center rounded-pill px-4 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
              >
                {t("onboard.rule.clergy")}
              </button>
            ) : null}
          </Step>
        )}

        {step === "intent" && <LookingFor picks={picks} onToggle={toggleIntent} onContinue={leaveIntent} />}

        {step === "reminders" &&
          (remindersSet ? (
            <RemindersOn times={remindersSet.times} fresh={remindersSet.fresh} onContinue={next} />
          ) : (
            // The key the heading's glide is measured by (RemindersOn's root carries it too).
            <div data-flip-key="reminders">
              <Step eyebrow={t("onboard.reminders.eyebrow")} title={t("onboard.reminders.title")} body={t("onboard.reminders.body")}>
                {reminderNote ? (
                  <>
                    <p className="mb-4 font-serif text-detail leading-[1.55] text-paper/85">{reminderNote}</p>
                    {/* For a tester alone: which wait it was, in plain words, so a note from a phone names the cause. */}
                    {reminderFail?.why && isTesting() ? (
                      <p data-testers-line className="mb-4 font-sans text-caption leading-[1.5] text-paper/65">
                        {t(`testers.reminders.${reminderFail.why}`)}
                      </p>
                    ) : null}
                    {reminderFail?.again ? (
                      <PrimaryButton onClick={() => void enableReminders()} disabled={busy}>
                        {t("error.tryAgain")}
                      </PrimaryButton>
                    ) : null}
                  </>
                ) : needsAccount || !readLocalSessionUser() ? (
                  // Reminders are kept with an account, so a reader with none
                  // is told so at once and offered the sign-in: never a button
                  // that says it turns them on and cannot (build 90, note 2).
                  <>
                    <p className="mb-4 font-serif text-detail leading-[1.55] text-paper/85">
                      {t("onboard.reminders.needsAccount")}
                    </p>
                    <PrimaryButton onClick={signInForReminders}>{t("common.signIn")}</PrimaryButton>
                  </>
                ) : (
                  <PrimaryButton onClick={() => void enableReminders()} disabled={busy}>
                    {busy ? "…" : t("onboard.reminders.enable")}
                  </PrimaryButton>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!reminderNote) countAnswer("reminders", "not-now");
                    // Declined: nothing waits for a sign-in any more.
                    clearReminderWish();
                    next();
                  }}
                  className="mt-2 inline-flex min-h-11 items-center self-center rounded-pill px-4 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
                >
                  {reminderNote ? t("onboard.continue") : t("onboard.reminders.notNow")}
                </button>
              </Step>
            </div>
          ))}

        {step === "handoff" && <HandoffSlate lines={slateLines} onFinish={() => finish(true)} />}
      </div>
    </div>
  );
}

/**
 * Account creation inside onboarding. Google or Apple via the shared
 * OAuthButtons (native-aware, back to "/" where the questions resume), or an
 * inline email signup with the same clickwrap the /signup page records.
 * Optional: "Continue without an account" goes straight to the questions.
 */
function AccountStep({ onSkip, skipLabel }: { onSkip: () => void; skipLabel: string }) {
  const { t } = useTranslate();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError(t("signup.mustAgree"));
      return;
    }
    if (password.length < 8) {
      setError(t("ui.passwordMinLength"));
      return;
    }
    setPending(true);
    // Recorded BEFORE the account exists, and awaited. A failure aborts the
    // sign-up rather than producing an account we cannot show agreed to
    // anything. See lib/legal/recordAcceptance.ts for why that ordering is
    // the safe half-state.
    try {
      await recordAcceptance("signup", email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("signup.acceptanceFailed"));
      setPending(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // authOrigin(), NOT window.location.origin: inside the Capacitor
          // shell the origin is https://localhost, and a confirmation link
          // there resolves nowhere (lib/site.ts).
          emailRedirectTo: `${authOrigin()}/api/auth/callback?next=/`,
        },
      });
      if (err) throw err;
      if (data.session) {
        try {
          await supabase.rpc("mark_password_set");
        } catch {
          /* middleware will catch it if needed */
        }
        // Signed in. A full reload so every server component sees the
        // session; the questions resume on arrival (the resume stage).
        window.location.assign("/");
        return;
      }
      // Email confirmation is on: note it, and carry on with the questions.
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("signup.genericError"));
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col">
        <p className="rounded-2xl border border-gold/35 bg-gold/[0.06] p-4 font-serif text-detail leading-[1.6] text-paper/90">
          {t("ui.weSentAConfirmationLink")} <span className="font-semibold text-paper">{sentTo}</span>
          {t("ui.openItOnAnyDevice")}
        </p>
        <div className="mt-5">
          <PrimaryButton onClick={onSkip}>{t("onboard.continue")}</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <OAuthButtons redirectTo="/" />

      {!showEmail ? (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="mt-3 min-h-11 rounded-pill border border-paper/20 bg-paper/[0.04] font-sans text-ui font-medium text-paper transition-colors hover:border-paper/35 hover:bg-paper/10"
        >
          {t("ui.signUpWithEmail")}
        </button>
      ) : (
        <form onSubmit={createAccount} className="mt-3 flex flex-col gap-2.5">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("ui.youSomewhereCom")}
            className="w-full rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/55 focus:border-paper/55 focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("ui.password8Characters")}
            className="w-full rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/55 focus:border-paper/55 focus:outline-none"
          />
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            <span className="text-start font-sans text-caption leading-[1.5] text-paper/70">
              {t("ui.iAgreeToThe")}{" "}
              <LegalLink doc="terms" className="text-paper underline underline-offset-2">
                {t("ui.termsOfServiceX")}
              </LegalLink>{" "}
              {t("ui.and")}{" "}
              <LegalLink doc="privacy" className="text-paper underline underline-offset-2">
                {t("ui.privacyPolicyX")}
              </LegalLink>
              .
            </span>
          </label>
          {error ? <p className="font-sans text-detail text-crimson-soft">{error}</p> : null}
          <button
            type="submit"
            disabled={pending || !agreed}
            className="min-h-11 rounded-pill bg-paper py-3 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t("signup.pending") : t("signup.submit")}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 inline-flex min-h-11 items-center self-center rounded-pill px-4 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
      >
        {skipLabel}
      </button>
    </div>
  );
}

function Step({
  eyebrow,
  title,
  body,
  icon,
  center = false,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  /** Optional brand mark shown above the eyebrow (welcome moment). */
  icon?: ReactNode;
  /** Center the heading block (used on the welcome step). */
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col ${center ? "items-center text-center" : ""}`}>
      {icon ? (
        <span
          aria-hidden
          className="lm-card onboard-mark-in mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[26px] text-gold-pale shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-paper/12"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 8%, rgba(255,255,255,0.10) 0%, transparent 60%), linear-gradient(155deg, #2a2a2f 0%, #18181b 100%)",
          }}
        >
          {icon}
        </span>
      ) : null}
      <p
        className="onboard-step-in mb-3 font-sans text-caption text-premium-ink/85"
        style={{ animationDelay: "70ms" }}
      >
        {eyebrow}
      </p>
      <h2 className="onboard-step-in text-title font-bold leading-tight text-paper" style={{ animationDelay: "130ms" }}>
        {title}
      </h2>
      {body ? (
        <p
          className={`onboard-step-in mt-3 font-sans text-ui leading-[1.6] text-paper/70 ${center ? "max-w-[34ch]" : ""}`}
          style={{ animationDelay: "190ms" }}
        >
          {body}
        </p>
      ) : null}
      <div className={`onboard-step-in mt-7 flex flex-col ${center ? "w-full" : ""}`} style={{ animationDelay: "260ms" }}>
        {children}
      </div>
    </div>
  );
}

/** One answer. Chosen, it is lit white and its tick draws itself. */
function ChoiceCard({
  selected,
  onClick,
  title,
  sub,
  icon,
  compact = false,
  delay = 0,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  /** The line under the title; the role question's answers stand on their titles. */
  sub?: string;
  icon?: ReactNode;
  compact?: boolean;
  /** Position in its list, for the staggered entrance. */
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`ob-choice ob-rise flex min-h-11 w-full items-center gap-3.5 rounded-2xl border text-start ${
        compact ? "px-3.5 py-3" : "p-4"
      } ${
        selected
          ? "border-premium/60 bg-premium/[0.10]"
          : "border-paper/15 bg-paper/[0.03] hover:border-paper/30 hover:bg-paper/[0.05]"
      }`}
      style={{ animationDelay: `${300 + delay * 60}ms` }}
    >
      {icon ? (
        <span
          aria-hidden
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
            selected ? "bg-premium/15 text-premium-ink ring-premium/35" : "bg-paper/[0.06] text-paper/75 ring-paper/10"
          }`}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-ui font-semibold text-paper">{title}</span>
        {sub ? <span className="mt-0.5 block font-sans text-caption leading-[1.45] text-paper/60">{sub}</span> : null}
      </span>
      <span
        aria-hidden
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors ${
          selected ? "bg-premium text-night ring-premium" : "ring-paper/25"
        }`}
      >
        {selected ? (
          <svg viewBox="0 0 16 16" width="12" height="12" className="ob-tick">
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
          </svg>
        ) : null}
      </span>
    </button>
  );
}
