"use client";

// The home screen widgets, on the app's side (docs/WIDGETS.md, section 2).
// Mounted once in the root frame; renders nothing, and does nothing in a
// browser, which has no widgets.
//
// A widget is drawn by the phone and knows only what the app hands it: the
// reader's calendar, their streak, the prayers they kept, their patron saint,
// the next update, and every word in their language. This hands those over,
// through lib/widget/bridge.ts, which sends only what changed.
//
// When:
//   - a few seconds after the app opens, once its language is on the screen.
//     The first seconds belong to drawing Today and lifting the logo screen,
//     and nothing here is something a reader is waiting for (PackBridge
//     waits for the same reason);
//   - when the streak store changes, a prayer is finished, the calendar
//     setting or the language changes;
//   - when the app comes back to the front, which is also when the day may
//     have turned and a patron chosen on another device may have arrived.
//
// lib/widget/state.ts and the rest are loaded with import() at the first
// push, so none of it is in what the app reads to open: the icons' rights
// record it needs is 60 KB of source on its own, and the website never
// pushes at all (lib/saints/__tests__/brief.test.ts guards what the start
// reads, lib/widget/__tests__/sync.test.ts what this file brings to it).
//
// The patron is asked of the server here and not through the Discord
// status's patronSlug(), because that answer cannot tell "signed out" from
// "no connection". Offline, the widgets must keep the reader's saint, not
// ask them to choose one.

import { useEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import { CALENDAR_STYLE_EVENT, readCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { whenLanguageSettled } from "@/lib/i18n/launchLanguage";
import { useIsNative } from "@/lib/platform/native";
import { PRAYER_EVENT, readPrayedDates } from "@/lib/prayers/storage";
import { todayKey } from "@/lib/rhythm/dayKey";
import { useStreak, type StreakView } from "@/lib/streak/useStreak";
import type { PatronAnswer } from "@/lib/widget/state";

/** How long after the app opens before the first push. */
const SETTLE_MS = 4000;
/** Changes that arrive together (a prayer finished keeps the day too) are one push. */
const GATHER_MS = 300;
/** How old the patron may be when the app comes back to the front. */
const PATRON_FRESH_MS = 60_000;

type Words = Pick<ReturnType<typeof useTranslate>, "locale" | "t" | "tn">;

type Known = {
  answer: PatronAnswer;
  at: number;
  /** Whether the reader was signed in when it was asked, so signing in asks again. */
  signedIn: boolean;
};

export function WidgetBridgeSync() {
  return useIsNative() ? <WidgetSync /> : null;
}

function WidgetSync() {
  const { locale, t, tn } = useTranslate();
  const streak = useStreak();
  const latest = useRef<{ words: Words; streak: StreakView } | null>(null);
  const changed = useRef<(() => void) | null>(null);

  // What the screens know, kept for the next push. The words change with the
  // language and the streak with its store; either asks for a push.
  useEffect(() => {
    latest.current = { words: { locale, t, tn }, streak };
    changed.current?.();
  }, [locale, t, tn, streak]);

  useEffect(() => {
    let alive = true;
    let started = false;
    let timer: number | undefined;
    let patron: Known | null = null;
    let patronStale = false;
    let asking = false;

    function soon(ms = GATHER_MS) {
      if (!alive || !started) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void push(), ms);
    }

    async function askPatron(signedIn: boolean) {
      if (asking) return;
      asking = true;
      let answer: PatronAnswer = { kind: "unknown" };
      try {
        const res = await apiFetch("/api/profile/patron-saint", { cache: "no-store" });
        const body: unknown = res.ok ? await res.json().catch(() => null) : null;
        const { readPatronAnswer } = await import("@/lib/widget/state");
        answer = readPatronAnswer(res.status, body);
      } catch {
        // No connection: the answer stays unknown.
      }
      // An answer that says nothing keeps the one before it.
      const kept = answer.kind === "unknown" && patron ? patron.answer : answer;
      patron = { answer: kept, at: Date.now(), signedIn };
      patronStale = false;
      asking = false;
      soon();
    }

    async function push() {
      const now = latest.current;
      if (!alive || !now) return;
      const { words, streak: view } = now;
      if (view.ready && (!patron || patronStale || patron.signedIn !== view.signedIn)) {
        void askPatron(view.signedIn);
      }
      try {
        const [state, { widgetLabels }, { pushWidgetState }] = await Promise.all([
          import("@/lib/widget/state"),
          import("@/lib/widget/labels"),
          import("@/lib/widget/bridge"),
        ]);
        if (!alive) return;
        const today = todayKey();
        const style = readCalendarStyleDefault();
        const facts = state.patronFacts(patron?.answer ?? { kind: "unknown" }, today, style);
        const labels = widgetLabels({
          ...words,
          streak: view.ready ? view.current : null,
          nameDayIn: facts?.daysToNameDay ?? null,
        });
        await pushWidgetState(
          state.widgetEntries({
            today,
            calendarStyle: style,
            labels,
            streak: view,
            prayed: {
              morning: readPrayedDates(state.PRAYED_RULES.morning),
              evening: readPrayedDates(state.PRAYED_RULES.evening),
            },
            patron: facts,
          }),
        );
      } catch {
        // A widget showing what it showed before is better than an error.
      }
    }

    changed.current = () => soon();
    const onChange = () => soon();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (patron && Date.now() - patron.at > PATRON_FRESH_MS) patronStale = true;
      soon();
    };

    const start = window.setTimeout(() => {
      void whenLanguageSettled().then(() => {
        started = true;
        soon(0);
      });
    }, SETTLE_MS);
    window.addEventListener(PRAYER_EVENT, onChange);
    window.addEventListener(CALENDAR_STYLE_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      changed.current = null;
      window.clearTimeout(start);
      window.clearTimeout(timer);
      window.removeEventListener(PRAYER_EVENT, onChange);
      window.removeEventListener(CALENDAR_STYLE_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
