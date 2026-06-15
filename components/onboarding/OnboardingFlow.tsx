"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { writeCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import {
  markOnboarded,
  writeFocus,
  type Focus,
} from "@/lib/onboarding/state";
import {
  persistSubscription,
  requestAndSubscribe,
  stashPending,
} from "@/lib/push/client";
import { PurifyMark } from "@/components/ui/PurifyMark";

/**
 * First-run onboarding overlay. Three short, skippable steps shown over the
 * Today screen (which stays visible behind it — the product sells itself).
 *
 *   1. Welcome — the outcome, in one calm line.
 *   2. Personalize — calendar reckoning + an optional "what draws you" pick,
 *      written through the existing preference stores.
 *   3. Prayer reminders — a benefit-first priming screen before the OS
 *      permission prompt.
 *
 * Calm by design: no streaks, no progress scoring, no urgency. `onDone`
 * fires whether the user finishes or skips.
 */

type CalChoice = "new" | "old";

const FOCUS_OPTIONS: Focus[] = ["scripture", "prayer", "saints", "calendar"];

export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const { t } = useTranslate();
  const [step, setStep] = useState(0);
  const [cal, setCal] = useState<CalChoice>("new");
  const [focus, setFocus] = useState<Focus[]>([]);
  const [busy, setBusy] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);

  // Lock background scroll while the overlay is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function finish() {
    // Persist the personalization picks, then mark done.
    writeCalendarStyleDefault(cal);
    writeFocus(focus);
    markOnboarded();
    onDone();
  }

  function toggleFocus(f: Focus) {
    setFocus((cur) =>
      cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f],
    );
  }

  async function enableReminders() {
    setBusy(true);
    setReminderNote(null);
    try {
      const result = await requestAndSubscribe();
      if (!result.ok) {
        if (result.reason === "denied")
          setReminderNote(t("onboard.reminders.blocked"));
        else if (result.reason === "unsupported")
          setReminderNote(t("onboard.reminders.unsupported"));
        // no-vapid: silently fall through; the build simply has no key.
        return;
      }
      const res = await persistSubscription(result.subscription);
      if (res.status === 401) {
        // Signed-out: keep the browser subscription and persist on first
        // sign-in (PostSignInBridge flushes it).
        stashPending(result.subscription);
      }
      setReminderNote(t("onboard.reminders.done"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onboard.welcome.eyebrow")}
      className="fixed inset-0 z-[100] flex flex-col text-paper overflow-y-auto safe-pb"
      style={{
        background:
          "radial-gradient(120% 55% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%), #101013",
      }}
    >
      {/* Top bar: step dots + skip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <StepDots count={3} active={step} />
        <button
          type="button"
          onClick={finish}
          className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          {t("onboard.skip")}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md w-full mx-auto motion-safe:animate-[hero-copy-in_500ms_ease-out]">
        {step === 0 && (
          <Step
            eyebrow={t("onboard.welcome.eyebrow")}
            title={t("onboard.welcome.title")}
            body={t("onboard.welcome.body")}
            icon={<PurifyMark size={40} />}
            center
          >
            <PrimaryButton onClick={() => setStep(1)}>
              {t("onboard.welcome.begin")}
            </PrimaryButton>
          </Step>
        )}

        {step === 1 && (
          <Step
            eyebrow={t("onboard.personalize.eyebrow")}
            title={t("onboard.personalize.calendarTitle")}
            body={t("onboard.personalize.calendarBody")}
          >
            <div className="flex flex-col gap-2.5">
              <ChoiceCard
                selected={cal === "new"}
                onClick={() => setCal("new")}
                title={t("onboard.personalize.calNew")}
                sub={t("onboard.personalize.calNewSub")}
              />
              <ChoiceCard
                selected={cal === "old"}
                onClick={() => setCal("old")}
                title={t("onboard.personalize.calOld")}
                sub={t("onboard.personalize.calOldSub")}
              />
            </div>

            <p className="mt-7 font-sans text-ui font-semibold text-paper">
              {t("onboard.personalize.focusTitle")}
            </p>
            <p className="mt-1 font-serif text-detail text-paper/65 leading-[1.5]">
              {t("onboard.personalize.focusBody")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {FOCUS_OPTIONS.map((f) => (
                <FocusChip
                  key={f}
                  selected={focus.includes(f)}
                  onClick={() => toggleFocus(f)}
                  label={t(`onboard.focus.${f}`)}
                />
              ))}
            </div>

            <div className="mt-8">
              <PrimaryButton onClick={() => setStep(2)}>
                {t("onboard.continue")}
              </PrimaryButton>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            eyebrow={t("onboard.reminders.eyebrow")}
            title={t("onboard.reminders.title")}
            body={t("onboard.reminders.body")}
          >
            {reminderNote ? (
              <p className="font-serif text-detail text-gold leading-[1.55] mb-4">
                {reminderNote}
              </p>
            ) : (
              <PrimaryButton onClick={enableReminders} disabled={busy}>
                {busy ? "…" : t("onboard.reminders.enable")}
              </PrimaryButton>
            )}
            <button
              type="button"
              onClick={finish}
              className="mt-4 font-sans text-caption text-paper/55 hover:text-paper transition-colors self-center"
            >
              {reminderNote
                ? t("onboard.reminders.finish")
                : t("onboard.reminders.notNow")}
            </button>
          </Step>
        )}
      </div>
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
  body: string;
  /** Optional brand mark shown above the eyebrow (welcome moment). */
  icon?: React.ReactNode;
  /** Center the heading block (used on the welcome step). */
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${center ? "items-center text-center" : ""}`}>
      {icon ? (
        <span
          aria-hidden
          className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[26px] text-gold-pale ring-1 ring-inset ring-paper/12 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 8%, rgba(255,255,255,0.10) 0%, transparent 60%), linear-gradient(155deg, #2a2a2f 0%, #18181b 100%)",
          }}
        >
          {icon}
        </span>
      ) : null}
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/80 mb-3">
        {eyebrow}
      </p>
      <h2 className="font-serif text-title font-bold leading-tight text-paper">
        {title}
      </h2>
      <p
        className={`mt-3 font-serif text-body text-paper/80 leading-[1.6] ${
          center ? "max-w-[34ch]" : ""
        }`}
      >
        {body}
      </p>
      <div className={`mt-7 flex flex-col ${center ? "w-full" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-pill transition-all duration-300 ${
            i === active ? "w-5 bg-gold" : "w-1.5 bg-paper/25"
          }`}
        />
      ))}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3.5 hover:bg-paper/90 active:scale-[0.98] disabled:opacity-60 transition-[transform,background-color]"
    >
      {children}
    </button>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left rounded-2xl border p-4 transition-colors ${
        selected
          ? "border-gold/60 bg-gold/[0.10] ring-1 ring-inset ring-gold/30"
          : "border-paper/15 bg-paper/[0.03] hover:border-paper/30"
      }`}
    >
      <p className="font-sans text-ui font-semibold text-paper">{title}</p>
      <p className="mt-0.5 font-sans text-caption text-paper/60 leading-[1.45]">
        {sub}
      </p>
    </button>
  );
}

function FocusChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-pill border py-2.5 font-sans text-detail font-medium transition-colors ${
        selected
          ? "border-gold/60 bg-gold/[0.10] text-paper"
          : "border-paper/15 bg-paper/[0.03] text-paper/70 hover:border-paper/30"
      }`}
    >
      {label}
    </button>
  );
}
