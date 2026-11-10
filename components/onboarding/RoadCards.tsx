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
import { previewSignedOut } from "@/lib/onboarding/testing";
import { useRoads } from "@/lib/onboarding/useRoads";
import { localDay } from "@/lib/onboarding/week";
import { isNativeClient } from "@/lib/platform/native";
import { EVENING_DEFAULT, MORNING_DEFAULT, enableReminders, remindersStatus } from "@/lib/push/reminders";
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
 * keeps, and that reminders come with one, in the words the questions used
 * for both. Back from signing in: the reminders, one tap. Never while
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
  const [on, setOn] = useState(false);

  const [keep, behind] = snap.split("|") as [KeepState | "", string];

  // Who is signed in, read from the device after the page wakes. A reader
  // back from the card's sign-in who already has reminders is finished here.
  useEffect(() => {
    if (!roads || !keep || keep === "done") return;
    let alive = true;
    const id = window.setTimeout(() => {
      // Testers mode's "Preview as signed out": an admin sees the signed-out
      // card though signed in, and after its Sign in, the card's second state.
      const user = !!readLocalSessionUser() && !(previewSignedOut() && keep !== "asked");
      if (alive) setSignedIn(user);
      if (user && keep === "asked") {
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

  if (!roads || !keep || keep === "done" || signedIn === null) return null;

  if (!signedIn) {
    if (Number(behind) < 1) return null;
    return (
      <TipCard
        id="keep-card"
        title={t("onboard.account.title")}
        body={t("onboard.account.body")}
        note={t("onboard.reminders.needsAccount")}
        onClose={() => writeKeep("done")}
        className={className}
      >
        <Link href="/signin?next=/" onClick={() => writeKeep("asked")} className={WAY_ON}>
          {t("common.signIn")}
        </Link>
      </TipCard>
    );
  }

  // Signed in. The reminders are offered here only to a reader who came by
  // this card: one who met them in the questions has answered already.
  if (keep !== "asked") return null;

  const turnOn = async () => {
    setBusy(true);
    setNote(null);
    try {
      const result = await enableReminders(MORNING_DEFAULT, EVENING_DEFAULT);
      if (result.ok) setOn(true);
      else if (result.reason === "denied")
        setNote(isNativeClient() ? t("onboard.reminders.blockedPhone") : t("onboard.reminders.blocked"));
      else if (result.reason === "unsupported") setNote(t("onboard.reminders.unsupported"));
      else setNote(t("prayers.push.failed"));
    } catch {
      setNote(t("prayers.push.failed"));
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
      onClose={() => writeKeep("done")}
      className={className}
    >
      {on || note ? (
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
        <TipCard id="second-chance" title={t("onboard.second.title")} onClose={markSecondChanceDone} className={className}>
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
