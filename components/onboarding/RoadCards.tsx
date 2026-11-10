"use client";

// The two small cards the roads put on Today (1.9, lib/onboarding/flags.ts;
// the why is docs/1.9-build/notes/onboarding-fable.md, 3.2). Each is the
// house's tip card (components/widget/WidgetTip.tsx), shown once, gone at a
// tap, and neither is counted.
//
//   KeepCard          the account and the reminders, offered after a first
//                     step and not as the second screen a new reader meets.
//                     Reminders are kept with an account, so the two are one
//                     offer: sign in, and on the way back, turn them on.
//   SecondChanceCard  one question for a reader who skipped the welcome
//                     questions, a day or more later: "Where are you coming
//                     from?", and nothing else. Closed once, it never
//                     returns.

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { Close } from "@/components/ui/icons/Close";
import { cn } from "@/lib/cn";
import {
  ONBOARDING_EVENT,
  isOnboarded,
  isSecondChanceDone,
  markSecondChanceDone,
  readBackground,
  readKeep,
  readLevel,
  readOnboardedDay,
  readWeek,
  writeBackground,
  writeKeep,
  type KeepState,
} from "@/lib/onboarding/state";
import { ROAD_PILLS, type Background } from "@/lib/onboarding/space";
import { reached } from "@/lib/ab/device";
import { countReminders, countTodayCard, markAccountFrom } from "@/lib/analytics/moreCount";
import { countAccountFromCard } from "@/lib/onboarding/count";
import { mayPromiseReminders } from "@/lib/onboarding/reminderPromise";
import { isTesting, previewSignedOut } from "@/lib/onboarding/testing";
import { useRoads } from "@/lib/onboarding/useRoads";
import { localDay } from "@/lib/onboarding/week";
import { isNativeClient, nativePlatform } from "@/lib/platform/native";
import { EVENING_DEFAULT, MORNING_DEFAULT, enableReminders, remindersStatus, type EnableWhy } from "@/lib/push/reminders";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

import { WhereFrom, WhereFromSky } from "./WhereFrom";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The house's tip card: an eyebrow, a title, a line or two, a way on, and a close. */
function TipCard({
  id,
  eyebrow,
  title,
  body,
  note,
  fine,
  onClose,
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  /** A second, quieter line. */
  note?: string | null;
  /** A smaller line under it, for a tester alone. */
  fine?: string | null;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslate();
  return (
    <aside
      aria-labelledby={id}
      data-road-card={id}
      className={cn("lm-card relative overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-paper/10", className)}
      style={CARD_BG}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="font-sans text-caption font-semibold text-paper/55">{eyebrow}</p> : null}
          <p id={id} className={cn("font-heading text-title-sm font-bold leading-tight text-paper", eyebrow && "mt-2")}>
            {title}
          </p>
          {body ? <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/65">{body}</p> : null}
          {note ? <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/65">{note}</p> : null}
          {fine ? (
            <p data-testers-line className="mt-1.5 font-sans text-caption leading-[1.5] text-paper/65">
              {fine}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("onboard.nudge.dismiss")}
          className="-me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
      <div className="mt-4 flex">{children}</div>
    </aside>
  );
}

const WAY_ON =
  "inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper transition-colors hover:border-paper/40 disabled:opacity-60";

/**
 * The account and the reminders, after a first step.
 *
 * Signed out, once a step of the week is behind the reader: what an account
 * keeps, and, only where a reminder has been seen to arrive, that reminders
 * come with one, in the words the questions used for both. Back from signing in: the reminders, one tap. Never while
 * nothing has been opened yet, and never again once answered or closed.
 */
export function KeepCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const roads = useRoads();
  // `${keep}|${steps behind}`, empty on the server and the hydration render.
  const snap = useSyncExternalStore(subscribe, () => `${readKeep()}|${readWeek().at}`, () => "");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // What the last try came to when it failed: whether the same tap is worth
  // offering again, and, for a tester alone, which wait it was (build 90,
  // note 2; the questions' own step does the same).
  const [fail, setFail] = useState<{ again: boolean; why: EnableWhy | null } | null>(null);
  const [on, setOn] = useState(false);

  const [keep, behind] = snap.split("|") as [KeepState | "", string];

  // Who is signed in, read from the device after the page wakes. A reader
  // back from the card's sign-in is counted once, as the account step always
  // counted "signed in" (lib/onboarding/count.ts), and offered the reminders,
  // unless this device has them already.
  useEffect(() => {
    if (!roads || !keep || keep === "done") return;
    let alive = true;
    const id = window.setTimeout(() => {
      const user = !!readLocalSessionUser();
      if (user && keep === "asked") {
        countAccountFromCard();
        reached("account");
        writeKeep("in");
        return;
      }
      // Testers mode's "Preview as signed out": an admin sees the signed-out
      // card though signed in.
      if (alive) setSignedIn(user && !previewSignedOut());
      if (user && keep === "in") {
        void remindersStatus().then(
          (status) => {
            if (alive && status === "subscribed") writeKeep("done");
          },
          () => {},
        );
      }
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [roads, keep]);

  if (!roads || !keep || keep === "done") return null;

  // Back from the card's sign-in: the reminders, one tap.
  if (keep !== "in") {
    // The account, to a reader with none, once a step of the week is behind
    // them. A reader who is signed in and never came by this card met the
    // reminders in the questions, and is shown nothing here.
    if (signedIn !== false || Number(behind) < 1) return null;
    return (
      <TipCard
        id="keep-card"
        title={t("onboard.account.title")}
        body={t("onboard.account.body")}
        // Reminders are promised only where one has been seen to arrive (lib/onboarding/reminderPromise.ts).
        note={mayPromiseReminders(nativePlatform()) ? t("onboard.reminders.needsAccount") : null}
        onClose={() => {
          countTodayCard("keep", "closed");
          writeKeep("done");
        }}
        className={className}
      >
        <Link
          href="/signin?next=/"
          onClick={() => {
            markAccountFrom("card");
            countTodayCard("keep", "answered");
            writeKeep("asked");
          }}
          className={WAY_ON}
        >
          {t("common.signIn")}
        </Link>
      </TipCard>
    );
  }

  const turnOn = async () => {
    setBusy(true);
    setNote(null);
    setFail(null);
    try {
      const result = await enableReminders(MORNING_DEFAULT, EVENING_DEFAULT);
      if (result.ok) {
        countReminders("on", "card");
        setOn(true);
        return;
      }
      if (result.reason === "denied")
        setNote(isNativeClient() ? t("onboard.reminders.blockedPhone") : t("onboard.reminders.blocked"));
      else if (result.reason === "unsupported") setNote(t("onboard.reminders.unsupported"));
      else setNote(t("prayers.push.failed"));
      // Never a dead end: the same tap again, except where the device cannot have reminders at all.
      setFail({ again: result.reason !== "unsupported", why: result.why ?? null });
    } catch {
      setNote(t("prayers.push.failed"));
      setFail({ again: true, why: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <TipCard
      id="keep-card"
      eyebrow={t("onboard.reminders.eyebrow")}
      title={on ? t("onboard.reminders.done") : t("onboard.reminders.title")}
      body={on ? undefined : t("onboard.reminders.body")}
      note={note}
      fine={fail?.why && isTesting() ? t(`testers.reminders.${fail.why}`) : null}
      onClose={() => writeKeep("done")}
      className={className}
    >
      {note && fail?.again ? (
        // The close in the card's corner is the way out; this is the way on.
        <button type="button" onClick={() => void turnOn()} disabled={busy} className={WAY_ON}>
          {t("error.tryAgain")}
        </button>
      ) : on || note ? (
        <button type="button" onClick={() => writeKeep("done")} className={WAY_ON}>
          {t("onboard.continue")}
        </button>
      ) : (
        <button type="button" onClick={() => void turnOn()} disabled={busy} className={WAY_ON}>
          {t("onboard.reminders.enable")}
        </button>
      )}
    </TipCard>
  );
}

/** A reader who left the questions with Skip, asked nothing since, a day or more on. */
function secondChanceDue(): boolean {
  if (!isOnboarded() || isSecondChanceDone()) return false;
  if (readLevel() != null || readBackground() != null) return false;
  // A device from before the day was kept skipped long ago.
  return readOnboardedDay() !== localDay(new Date());
}

/**
 * One question for a reader who skipped: where they are coming from, on the
 * question's own screen. Their answer gives them a road, and with it a first
 * week, where a skip left them with neither. Purify stays as it always was
 * for a reader who closes it.
 */
export function SecondChanceCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const roads = useRoads();
  const due = useSyncExternalStore(subscribe, secondChanceDue, () => false);
  const [open, setOpen] = useState(false);

  if (!roads || (!due && !open)) return null;
  return (
    <>
      {due ? (
        <TipCard
          id="second-chance"
          title={t("onboard.second.title")}
          onClose={() => {
            countTodayCard("second", "closed");
            markSecondChanceDone();
          }}
          className={className}
        >
          <button type="button" onClick={() => setOpen(true)} className={WAY_ON}>
            {t("onboard.day1.open")}
          </button>
        </TipCard>
      ) : null}
      {open ? <SecondChance onDone={() => setOpen(false)} /> : null}
    </>
  );
}

const LEAVE_MS = 420;

/** "Where are you coming from?" alone, on its own night and horizon, as the welcome questions draw it. */
function SecondChance({ onDone }: { onDone: () => void }) {
  const { t } = useTranslate();
  const [answer, setAnswer] = useState<Background | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  // Answered: kept on this device, the card retired, and the screen let go.
  const leave = (kept: Background | null) => {
    if (exiting) return;
    if (kept) {
      // That it was answered, never what was answered.
      countTodayCard("second", "answered");
      writeBackground(kept);
      markSecondChanceDone();
    }
    setExiting(true);
    window.setTimeout(onDone, LEAVE_MS);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onboard.background.title")}
      data-second-chance=""
      className={`lm-hero fixed inset-0 z-[100] flex flex-col overflow-y-auto text-paper safe-pb-edge ${exiting ? "ob-exit" : ""}`}
      style={{ background: "radial-gradient(120% 55% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%), #101013" }}
    >
      <WhereFromSky />
      <div className="flex items-center justify-end px-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
        <button
          type="button"
          onClick={() => leave(null)}
          aria-label={t("onboard.nudge.dismiss")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/60 transition-colors hover:text-paper"
        >
          <Close size={16} />
        </button>
      </div>
      <div className="ob-step-fwd mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-16 md:justify-center md:py-10">
        <WhereFrom
          answer={answer}
          pills={ROAD_PILLS}
          onChoose={setAnswer}
          onContinue={() => leave(answer)}
          onPreferNot={() => {
            setAnswer("prefer-not");
            leave("prefer-not");
          }}
        />
      </div>
    </div>
  );
}
