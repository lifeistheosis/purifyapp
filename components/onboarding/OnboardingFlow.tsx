"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { writeCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import {
  markOnboarded,
  writeFocus,
  type Focus,
} from "@/lib/onboarding/state";
import { enableReminders as enablePush } from "@/lib/push/reminders";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { createClient } from "@/lib/supabase/client";

/**
 * First-run onboarding overlay. Four short, skippable steps shown over the
 * Today screen (which stays visible behind it — the product sells itself).
 *
 *   1. Welcome — the outcome, in one calm line.
 *   2. Personalize — calendar reckoning + an optional "what draws you" pick,
 *      written through the existing preference stores.
 *   3. Prayer reminders — a benefit-first priming screen before the OS
 *      permission prompt.
 *   4. Account — keep the journey: Continue with Google or a compact email
 *      signup, both optional. Picks are persisted BEFORE this step so an
 *      auth redirect can never lose them.
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
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  function persistPicks() {
    // Persist the personalization picks and mark onboarded. Called both on
    // finish/skip AND when entering the account step, so a full-page auth
    // redirect can never lose the choices or re-show the overlay.
    writeCalendarStyleDefault(cal);
    writeFocus(focus);
    markOnboarded();
  }

  function finish() {
    persistPicks();
    onDone();
  }

  function toAccountStep() {
    persistPicks();
    setStep(3);
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
      // Native push (APNs/FCM) inside the Capacitor shell, Web Push in the
      // browser. Signed-out subscriptions are stashed and flushed on first
      // sign-in (PostSignInBridge) — handled inside the facade.
      const result = await enablePush();
      if (!result.ok) {
        if (result.reason === "denied")
          setReminderNote(t("onboard.reminders.blocked"));
        else if (result.reason === "unsupported")
          setReminderNote(t("onboard.reminders.unsupported"));
        // no-vapid: silently fall through; the build simply has no key.
        return;
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
      {/* Top bar: step dots + skip. Pad past the status bar (inset + the
          original 1.25rem) so the Skip button isn't hidden under the Android
          clock/battery — the "invisible skip button" tester report. On web the
          inset is 0, so this is just pt-5. */}
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
      >
        <StepDots count={4} active={step} />
        <button
          type="button"
          onClick={finish}
          className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          {t("onboard.skip")}
        </button>
      </div>

      <div
        key={step}
        className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md w-full mx-auto"
      >
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
              onClick={toAccountStep}
              className="mt-4 font-sans text-caption text-paper/55 hover:text-paper transition-colors self-center"
            >
              {reminderNote
                ? t("onboard.continue")
                : t("onboard.reminders.notNow")}
            </button>
          </Step>
        )}

        {step === 3 && (
          <Step
            eyebrow={t("onboard.account.eyebrow")}
            title={t("onboard.account.title")}
            body={t("onboard.account.body")}
          >
            <AccountStep onDone={onDone} notNowLabel={t("onboard.account.notNow")} />
          </Step>
        )}
      </div>
    </div>
  );
}

/**
 * Compact account creation for the final onboarding step. Google via the
 * shared OAuthButtons (native-aware; redirects back to Today), or an inline
 * email signup with the same clickwrap the /signup page records. Entirely
 * optional: "Not now" closes the overlay with everything already persisted.
 */
function AccountStep({
  onDone,
  notNowLabel,
}: {
  onDone: () => void;
  notNowLabel: string;
}) {
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
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    // Record the clickwrap acceptance (fire-and-forget, same as /signup).
    void fetch("/api/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: "signup", email: email.trim() }),
    }).catch(() => {});
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/`,
        },
      });
      if (err) throw err;
      if (data.session) {
        try {
          await supabase.rpc("mark_password_set");
        } catch {
          /* middleware will catch it if needed */
        }
        // Signed in. Full reload so every server component sees the session,
        // landing on Today (picks were persisted before this step).
        window.location.assign("/");
        return;
      }
      // Email confirmation is on: show the gentle inbox note in place.
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create account.");
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col">
        <p className="rounded-2xl border border-gold/35 bg-gold/[0.06] p-4 font-serif text-detail text-paper/90 leading-[1.6]">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-paper">{sentTo}</span>. Open it on
          any device to finish creating your account.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-4 self-center font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          {notNowLabel}
        </button>
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
          className="mt-3 h-11 rounded-pill border border-paper/20 bg-paper/[0.04] font-sans text-ui font-medium text-paper hover:bg-paper/10 hover:border-paper/35 transition-colors"
        >
          Sign up with email
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
            placeholder="you@somewhere.com"
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
          />
          <label className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            <span className="font-sans text-caption leading-[1.5] text-paper/70 text-left">
              I agree to the{" "}
              <Link href="/terms" className="text-paper underline underline-offset-2">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-paper underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {error ? (
            <p className="font-sans text-detail text-crimson-soft">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !agreed}
            className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-5 self-center font-sans text-caption text-paper/55 hover:text-paper transition-colors"
      >
        {notNowLabel}
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
          className="onboard-mark-in mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[26px] text-gold-pale ring-1 ring-inset ring-paper/12 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 8%, rgba(255,255,255,0.10) 0%, transparent 60%), linear-gradient(155deg, #2a2a2f 0%, #18181b 100%)",
          }}
        >
          {icon}
        </span>
      ) : null}
      <p
        className="onboard-step-in font-sans text-eyebrow uppercase tracking-[2px] text-gold/80 mb-3"
        style={{ animationDelay: "70ms" }}
      >
        {eyebrow}
      </p>
      <h2
        className="onboard-step-in font-serif text-title font-bold leading-tight text-paper"
        style={{ animationDelay: "130ms" }}
      >
        {title}
      </h2>
      <p
        className={`onboard-step-in mt-3 font-serif text-body text-paper/80 leading-[1.6] ${
          center ? "max-w-[34ch]" : ""
        }`}
        style={{ animationDelay: "190ms" }}
      >
        {body}
      </p>
      <div
        className={`onboard-step-in mt-7 flex flex-col ${center ? "w-full" : ""}`}
        style={{ animationDelay: "260ms" }}
      >
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
      className="block w-full rounded-pill bg-paper text-night text-center font-sans text-ui font-semibold px-6 py-3.5 hover:bg-paper/90 active:scale-[0.98] disabled:opacity-60 transition-[transform,background-color]"
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
