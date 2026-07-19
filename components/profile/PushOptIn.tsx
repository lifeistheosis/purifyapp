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
  remindersStatus,
  updateReminderTimes,
} from "@/lib/push/reminders";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type State =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "subscribed"; morningTime: string | null; eveningTime: string | null }
  | { kind: "not-subscribed" }
  | { kind: "denied" };

export function PushOptIn() {
  const { t } = useTranslate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await remindersStatus();
      setState(
        status === "subscribed"
          ? { kind: "subscribed", morningTime: null, eveningTime: null }
          : { kind: status },
      );
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const result = await enableReminders();
      if (!result.ok) {
        if (result.reason === "denied") setState({ kind: "denied" });
        else if (result.reason === "unsupported")
          setState({ kind: "unsupported" });
        else if (result.reason === "no-vapid")
          alert(
            "Push reminders are not yet enabled on this build (VAPID key missing).",
          );
        return;
      }
      setState({
        kind: "subscribed",
        morningTime: MORNING_DEFAULT,
        eveningTime: EVENING_DEFAULT,
      });
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

  async function updateTimes(morning: string, evening: string) {
    if (state.kind !== "subscribed") return;
    setBusy(true);
    try {
      await updateReminderTimes(morning, evening);
      setState({
        kind: "subscribed",
        morningTime: morning,
        eveningTime: evening,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-paper/12 bg-paper/[0.03] p-5">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
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
        <button
          type="button"
          onClick={subscribe}
          disabled={busy}
          className="rounded-pill border border-gold/40 bg-gold/[0.08] text-gold px-5 py-2 font-sans text-detail font-semibold hover:bg-gold/[0.14] transition-colors disabled:opacity-40"
        >
          {busy ? "Subscribing…" : "Turn on reminders"}
        </button>
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
                defaultValue={state.morningTime ?? "07:00"}
                onBlur={(e) =>
                  updateTimes(e.target.value, state.eveningTime ?? "21:00")
                }
                className="rounded-md border border-paper/15 bg-night px-3 py-1.5 font-sans text-detail text-paper [color-scheme:dark] focus:outline-none focus:border-gold/45 transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-caption text-paper/55">
                {t("prayers.push.evening")}
              </span>
              <input
                type="time"
                defaultValue={state.eveningTime ?? "21:00"}
                onBlur={(e) =>
                  updateTimes(state.morningTime ?? "07:00", e.target.value)
                }
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
