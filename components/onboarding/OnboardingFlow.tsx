"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { writeCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import {
  clearResumeStage,
  markOnboarded,
  setResumeStage,
  writeDepth,
  writeFastingRule,
  writeFocus,
  writeIntent,
  writeLevel,
} from "@/lib/onboarding/state";
import {
  asksRule,
  dayOneFor,
  defaultsFor,
  depthFor,
  focusFor,
  type CalendarChoice,
  type DayOneKey,
  type FastingRule,
  type Intent,
  type Level,
} from "@/lib/onboarding/space";
import { saveSpaceToAccount } from "@/lib/onboarding/accountSync";
import { enableReminders as enablePush } from "@/lib/push/reminders";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { recordAcceptance } from "@/lib/legal/recordAcceptance";
import { authOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { Compass } from "@/components/ui/icons/Compass";
import { Book } from "@/components/ui/icons/Book";
import { Cross } from "@/components/ui/icons/Cross";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Church } from "@/components/ui/icons/Church";
import { Codex } from "@/components/ui/icons/Codex";
import { Orans } from "@/components/ui/icons/Orans";
import { HandoffSlate, type SlateLine } from "./HandoffSlate";

/**
 * First-run onboarding, version 2: the adaptive onboarding engine from the
 * owner's specification of 2026-09-28.
 *
 *   welcome   the outcome, in one calm line
 *   account   sign in or create an account, or carry on without one
 *   level     the baseline fork: completely new, learning, or practicing
 *   rule      calendar and fasting, asked of the practicing only
 *   intent    what they hope to focus on first
 *   reminders a benefit-first priming screen before the OS prompt
 *   handoff   a three-second slate that sets the space up and hands over
 *
 * The questions come AFTER the account step, as the specification places
 * them, and a Google or Apple sign-in that leaves the page resumes at the
 * first question (lib/onboarding/state.ts, the resume stage). Every answer is
 * written the moment it is given, so leaving halfway keeps what was said.
 */

/** Where the flow begins: the welcome for a new visitor, the account step
 *  when the reader came to make an account (the mobile website), the first
 *  question when they are signed in already. */
export type OnboardingStart = "welcome" | "account" | "level";

type StepId = "welcome" | "account" | "level" | "rule" | "intent" | "reminders" | "handoff";

const AUTO_ADVANCE_MS = 420;

export function OnboardingFlow({
  onDone,
  startAt = "welcome",
  catechismAvailable = false,
}: {
  /** Fires once the overlay has faded: the Day 1 step when the reader
   *  reached the handoff, null when they skipped or left for another page. */
  onDone: (dayOne: { key: DayOneKey; href: string } | null) => void;
  /** "level" when the reader is already signed in (a resumed sign-in or a brand-new account). */
  startAt?: OnboardingStart;
  /** One optional line on the account step, shown only while the bank has questions. */
  catechismAvailable?: boolean;
}) {
  const { t } = useTranslate();
  const [level, setLevel] = useState<Level | null>(null);
  const [calendar, setCalendar] = useState<CalendarChoice>("new");
  const [fasting, setFasting] = useState<FastingRule>("strict");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [busy, setBusy] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  // One answer, one advance: a second tap during the pause must not skip the
  // next question.
  const advancing = useRef(false);

  const steps = useMemo<StepId[]>(() => {
    const head: StepId[] = startAt === "level" ? [] : startAt === "account" ? ["account"] : ["welcome", "account"];
    return [...head, "level", ...(asksRule(level) ? (["rule"] as StepId[]) : []), "intent", "reminders", "handoff"];
  }, [startAt, level]);
  const step = steps[Math.min(index, steps.length - 1)];
  const dayOne = useMemo(() => dayOneFor(level, intent), [level, intent]);

  // Lock background scroll while the overlay is up.
  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  const go = useCallback(
    (to: number) => {
      setDir(to >= index ? "fwd" : "back");
      setIndex(Math.max(0, Math.min(to, steps.length - 1)));
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
      if (event === "SIGNED_IN") next();
    });
    return () => data.subscription.unsubscribe();
  }, [step, next]);

  useEffect(() => {
    // On the way into the account step: if sign-in leaves the page, the
    // questions resume when it comes back.
    if (step === "account") setResumeStage("assessment");
  }, [step]);

  function advanceSoon() {
    advancing.current = true;
    window.setTimeout(() => {
      advancing.current = false;
      setDir("fwd");
      setIndex((i) => i + 1);
    }, AUTO_ADVANCE_MS);
  }

  function chooseLevel(l: Level) {
    if (advancing.current) return;
    // The same answer again (after going back) keeps whatever the rule step
    // already set; only a new answer brings its own defaults.
    if (l !== level) {
      const d = defaultsFor(l);
      setCalendar(d.calendar);
      setFasting(d.fasting);
      writeCalendarStyleDefault(d.calendar);
      writeFastingRule(d.fasting);
    }
    setLevel(l);
    writeLevel(l);
    writeDepth(depthFor(l));
    advanceSoon();
  }

  function chooseCalendar(c: CalendarChoice) {
    setCalendar(c);
    writeCalendarStyleDefault(c);
  }

  function chooseFasting(f: FastingRule) {
    setFasting(f);
    writeFastingRule(f);
  }

  function chooseIntent(i: Intent) {
    if (advancing.current) return;
    setIntent(i);
    writeIntent(i);
    writeFocus([focusFor(i)]);
    advanceSoon();
  }

  const finish = useCallback(
    (reached: boolean) => {
      markOnboarded();
      clearResumeStage();
      void saveSpaceToAccount();
      setExiting(true);
      window.setTimeout(() => onDone(reached ? dayOne : null), 420);
    },
    [onDone, dayOne],
  );

  async function enableReminders() {
    setBusy(true);
    setReminderNote(null);
    try {
      // Native push (APNs/FCM) inside the Capacitor shell, Web Push in the
      // browser. Signed-out subscriptions are stashed and flushed on first
      // sign-in (PostSignInBridge), handled inside the facade.
      const result = await enablePush();
      if (!result.ok) {
        if (result.reason === "denied") setReminderNote(t("onboard.reminders.blocked"));
        else if (result.reason === "unsupported") setReminderNote(t("onboard.reminders.unsupported"));
        return;
      }
      setReminderNote(t("onboard.reminders.done"));
    } finally {
      setBusy(false);
    }
  }

  const slateLines: SlateLine[] = [
    {
      label: t("onboard.handoff.calendar"),
      value: calendar === "old" ? t("onboard.personalize.calOld") : t("onboard.personalize.calNew"),
    },
    { label: t("onboard.handoff.fasting"), value: t(`onboard.fasting.${fasting}`) },
    ...(intent ? [{ label: t("onboard.handoff.focus"), value: t(`onboard.intent.${intent}`) }] : []),
    { label: t("onboard.handoff.first"), value: t(`onboard.day1.${dayOne.key}.title`) },
  ];

  // Measured against the longest path, the one with the rule step, so the
  // line only ever grows: choosing "Practicing" adds a step, and counting
  // against the live list would pull the line back just as the reader moved
  // forward. Everyone else skips that segment in one longer stride.
  const progressPath: StepId[] = startAt === "level"
    ? ["level", "rule", "intent", "reminders", "handoff"]
    : startAt === "account"
      ? ["account", "level", "rule", "intent", "reminders", "handoff"]
      : ["welcome", "account", "level", "rule", "intent", "reminders", "handoff"];
  const progress = Math.max(0, progressPath.indexOf(step)) / (progressPath.length - 1);
  const stepClass = dir === "fwd" ? "ob-step-fwd" : "ob-step-back";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onboard.welcome.eyebrow")}
      className={`lm-hero fixed inset-0 z-[100] flex flex-col overflow-y-auto text-paper safe-pb ${exiting ? "ob-exit" : ""}`}
      style={{
        background:
          "radial-gradient(120% 55% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%), #101013",
      }}
    >
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

      <div key={step} className={`${stepClass} mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10`}>
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

        {step === "account" && (
          <Step eyebrow={t("onboard.account.eyebrow")} title={t("onboard.account.title")} body={t("onboard.account.body")}>
            <AccountStep onSkip={next} skipLabel={t("onboard.account.skip")} />
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

        {step === "level" && (
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

        {step === "rule" && (
          <Step eyebrow={t("onboard.rule.eyebrow")} title={t("onboard.rule.title")} body={t("onboard.rule.body")}>
            <p className="mb-2 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
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
            <p className="mb-2 mt-6 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
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
              <PrimaryButton onClick={next}>{t("onboard.continue")}</PrimaryButton>
            </div>
          </Step>
        )}

        {step === "intent" && (
          <Step eyebrow={t("onboard.intent.eyebrow")} title={t("onboard.intent.title")}>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["quiet", <Lampada key="i" size={20} />],
                  ["liturgy", <Church key="i" size={20} />],
                  ["study", <Codex key="i" size={20} />],
                  ["prayer", <Orans key="i" size={20} />],
                ] as const
              ).map(([i, icon], n) => (
                <ChoiceCard
                  key={i}
                  selected={intent === i}
                  onClick={() => chooseIntent(i)}
                  icon={icon}
                  title={t(`onboard.intent.${i}`)}
                  sub={t(`onboard.intent.${i}Sub`)}
                  delay={n}
                />
              ))}
            </div>
          </Step>
        )}

        {step === "reminders" && (
          <Step eyebrow={t("onboard.reminders.eyebrow")} title={t("onboard.reminders.title")} body={t("onboard.reminders.body")}>
            {reminderNote ? (
              <p className="mb-4 font-serif text-detail leading-[1.55] text-gold">{reminderNote}</p>
            ) : (
              <PrimaryButton onClick={enableReminders} disabled={busy}>
                {busy ? "…" : t("onboard.reminders.enable")}
              </PrimaryButton>
            )}
            <button
              type="button"
              onClick={next}
              className="mt-2 inline-flex min-h-11 items-center self-center rounded-pill px-4 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
            >
              {reminderNote ? t("onboard.continue") : t("onboard.reminders.notNow")}
            </button>
          </Step>
        )}

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
            className="w-full rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/40 focus:border-paper/55 focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("ui.password8Characters")}
            className="w-full rounded-pill border border-paper/20 bg-paper/[0.04] px-4 py-3 font-sans text-ui text-paper transition-colors placeholder:text-paper/40 focus:border-paper/55 focus:outline-none"
          />
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            <span className="text-left font-sans text-caption leading-[1.5] text-paper/70">
              {t("ui.iAgreeToThe")}{" "}
              <Link href="/terms" className="text-paper underline underline-offset-2">
                {t("ui.termsOfServiceX")}
              </Link>{" "}
              {t("ui.and")}{" "}
              <Link href="/privacy" className="text-paper underline underline-offset-2">
                {t("ui.privacyPolicyX")}
              </Link>
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
        className="onboard-step-in mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-premium-ink/85"
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

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block min-h-11 w-full rounded-pill bg-paper px-6 py-3.5 text-center font-sans text-ui font-semibold text-night transition-[transform,background-color] hover:bg-paper/90 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** One answer. Chosen, it blooms in gold and its tick draws itself. */
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
  sub: string;
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
      className={`ob-choice ob-rise flex min-h-11 w-full items-center gap-3.5 rounded-2xl border text-left ${
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
        <span className="mt-0.5 block font-sans text-caption leading-[1.45] text-paper/60">{sub}</span>
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
