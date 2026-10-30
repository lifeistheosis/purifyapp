"use client";

// Opt-in opt-out toggle + time pickers for prayer reminders. Lives in
// the signed-in account page. Uses native push (APNs/FCM) inside the
// Capacitor shell and Web Push in the browser, via the reminders facade.
// No third-party notification provider.

import { useEffect, useState } from "react";
import {
  EVENING_DEFAULT,
  MORNING_DEFAULT,
  disableReminders,
  enableReminders,
  reminderTimes,
  remindersStatus,
  updateReminderTimes,
  type ReminderTimes,
} from "@/lib/push/reminders";
import { timeChange } from "@/lib/push/times";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type State =
  | { kind: "loading" }
  | { kind: "unsupported" }
  // The times as saved, read before the fields are drawn, so each field
  // starts at the reader's own time. It used to hold nothing after a reload
  // and the fields fell back to 07:00 and 21:00.
  | { kind: "subscribed"; times: ReminderTimes }
  | { kind: "not-subscribed" }
  | { kind: "denied" };

export function PushOptIn() {
  const { t } = useTranslate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  // Said when turning reminders on did not work. It used to fail in silence:
  // the button went back to "Turn on reminders" as if it had never been pressed.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const status = await remindersStatus();
      if (status !== "subscribed") {
        if (alive) setState({ kind: status });
        return;
      }
      const times = await reminderTimes();
      if (alive) setState({ kind: "subscribed", times });
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await enableReminders();
      if (!result.ok) {
        if (result.reason === "denied") setState({ kind: "denied" });
        else if (result.reason === "unsupported")
          setState({ kind: "unsupported" });
        else setFailed(true);
        return;
      }
      setState({
        kind: "subscribed",
        times: { morning: MORNING_DEFAULT, evening: EVENING_DEFAULT },
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      await disableReminders();
      setState({ kind: "not-subscribed" });
    } finally {
      setBusy(false);
    }
  }

  // Leaving a field saves that field's time, only when it changed, and never
  // the other one. Both used to go, the other as the screen showed it, which
  // after a reload was its default: moving the evening put the morning back
  // to 07:00 (lib/push/times.ts, timeChange).
  async function saveTime(which: keyof ReminderTimes, value: string) {
    if (state.kind !== "subscribed") return;
    const change = timeChange(state.times, which, value);
    if (!change) return;
    setBusy(true);
    try {
      // "kept" is the reader's time too: held on this device and sent on by
      // itself, after a sign-in or at the next visit or launch.
      if ((await updateReminderTimes(change)) !== "failed") {
        setState((s) =>
          s.kind === "subscribed" ? { kind: "subscribed", times: { ...s.times, ...change } } : s,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-paper/12 bg-paper/[0.03] p-5">
      <p className="font-sans text-caption font-semibold text-paper/55 mb-2">
        {t("prayers.push.label")}
      </p>
      <p className="font-serif text-body text-paper/85 leading-[1.6] mb-4">
        {t("ui.oneNudgeInTheMorning")}
      </p>
      {state.kind === "loading" && (
        <p className="font-sans text-detail text-paper/55 italic">{t("ui.checking")}</p>
      )}
      {state.kind === "unsupported" && (
        <p className="font-sans text-detail text-paper/55">
          {t("ui.yourBrowserDoesNotSupport")}
        </p>
      )}
      {state.kind === "denied" && (
        <p className="font-sans text-detail text-paper/55">
          {t("ui.notificationsAreBlockedAtThe")}
        </p>
      )}
      {state.kind === "not-subscribed" && (
        <>
          <button
            type="button"
            onClick={subscribe}
            disabled={busy}
            className="rounded-pill border border-gold/40 bg-gold/[0.08] text-gold px-5 py-2 font-sans text-detail font-semibold hover:bg-gold/[0.14] transition-colors disabled:opacity-40"
          >
            {busy ? t("prayers.push.turningOn") : t("prayers.push.turnOn")}
          </button>
          {failed ? (
            <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
              {t("prayers.push.failed")}
            </p>
          ) : null}
        </>
      )}
      {state.kind === "subscribed" && (
        <div className="space-y-3">
          <div className="flex gap-4 flex-wrap items-end">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-caption text-paper/55">
                {t("prayers.push.morning")}
              </span>
              <input
                type="time"
                defaultValue={state.times.morning}
                onBlur={(e) => saveTime("morning", e.target.value)}
                className="rounded-md border border-paper/15 bg-night px-3 py-1.5 font-sans text-detail text-paper [color-scheme:dark] focus:outline-none focus:border-gold/45 transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-caption text-paper/55">
                {t("prayers.push.evening")}
              </span>
              <input
                type="time"
                defaultValue={state.times.evening}
                onBlur={(e) => saveTime("evening", e.target.value)}
                className="rounded-md border border-paper/15 bg-night px-3 py-1.5 font-sans text-detail text-paper [color-scheme:dark] focus:outline-none focus:border-gold/45 transition-colors"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={busy}
            className="font-sans text-caption text-paper/55 hover:text-paper transition-colors disabled:opacity-40"
          >
            {t("prayers.push.turnOff")}
          </button>
        </div>
      )}
    </section>
  );
}
