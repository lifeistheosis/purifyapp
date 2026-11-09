"use client";

// The home screen widgets, on the app's side (docs/WIDGETS.md, section 2).
// Mounted once in the root frame; renders nothing, and does nothing in a
// browser, which has no widgets.
//
// A widget is drawn by the phone and knows only what the app hands it: the
// reader's calendar, their streak, the prayers they kept, their patron saint,
// the next update, the verse to remember (1.9), and every word in their
// language. This hands those over, through lib/widget/bridge.ts, which sends
// only what changed.
//
// When:
//   - a few seconds after the app opens, once its language is on the screen.
//     The first seconds belong to drawing Today and lifting the logo screen,
//     and nothing here is something a reader is waiting for (PackBridge
//     waits for the same reason);
//   - when the streak store changes, a prayer is finished, the calendar
//     setting or the language changes, a verse is saved or taken off the
//     bookmarks, or Remember the verse is answered (lib/remember/schedule.ts,
//     REMEMBER_EVENT);
//   - when the reader saves a patron saint in the app, in You or on the
//     Community profile (lib/profile/patronEvent.ts), with the saint saved;
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
import { useBookmarks, type Bookmark } from "@/lib/bookmarks";
import { CALENDAR_STYLE_EVENT, readCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { whenLanguageSettled } from "@/lib/i18n/launchLanguage";
import { savedPacks, subscribePacks } from "@/lib/packs/store";
import { useIsNative } from "@/lib/platform/native";
import { PRAYER_EVENT, readPrayedDates } from "@/lib/prayers/storage";
import { PATRON_EVENT, type PatronChange } from "@/lib/profile/patronEvent";
import { REMEMBER_EVENT, rememberStore, savedVersesOf } from "@/lib/remember/schedule";
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
  const { bookmarks } = useBookmarks();
  const latest = useRef<{ words: Words; streak: StreakView } | null>(null);
  const saved = useRef<readonly Bookmark[]>(bookmarks);
  const changed = useRef<(() => void) | null>(null);

  // What the screens know, kept for the next push. The words change with the
  // language and the streak with its store; either asks for a push.
  useEffect(() => {
    latest.current = { words: { locale, t, tn }, streak };
    changed.current?.();
  }, [locale, t, tn, streak]);

  // The saved verses, which Remember the verse brings back (1.9).
  useEffect(() => {
    saved.current = bookmarks;
    changed.current?.();
  }, [bookmarks]);

  useEffect(() => {
    let alive = true;
    let started = false;
    let timer: number | undefined;
    let patron: Known | null = null;
    let patronStale = false;
    let asking = false;
    /** Patrons saved on this device so far, so an answer asked for before one is not taken over it. */
    let patronSaves = 0;

    function soon(ms = GATHER_MS) {
      if (!alive || !started) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void push(), ms);
    }

    async function askPatron(signedIn: boolean) {
      if (asking) return;
      asking = true;
      const saves = patronSaves;
      let answer: PatronAnswer = { kind: "unknown" };
      try {
        const res = await apiFetch("/api/profile/patron-saint", { cache: "no-store" });
        const body: unknown = res.ok ? await res.json().catch(() => null) : null;
        const { readPatronAnswer } = await import("@/lib/widget/state");
        // Signed in as far as the app knows, a 401 is not "no saint" (note 85).
        answer = readPatronAnswer(res.status, body, signedIn);
      } catch {
        // No connection: the answer stays unknown.
      }
      asking = false;
      // A saint saved on this device while the server was being asked is
      // newer than this answer, which may have been read before the save. It
      // is dropped, and asked again if the saved one has not landed yet.
      if (saves !== patronSaves) {
        if (patronStale) soon();
        return;
      }
      // An answer that says nothing keeps the one before it.
      const kept = answer.kind === "unknown" && patron ? patron.answer : answer;
      patron = { answer: kept, at: Date.now(), signedIn };
      patronStale = false;
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
        const remember = state.rememberFaces({
          saved: savedVersesOf(saved.current),
          store: rememberStore(),
          today,
          t: words.t,
        });
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
            // The next update from the content packs when they carry one, so a
            // date set or moved on the website reaches the widgets without a
            // store build; the committed file otherwise.
            update: savedPacks()?.packs.release?.next,
            remember,
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
    // A patron saved on this device (lib/profile/patronEvent.ts). The event
    // carries what the server saved, in the shape the server answers a read
    // with, so the widget has it without asking again; anything else, or the
    // chunk not loading, leaves the patron stale and the push asks.
    const onPatron = (event: Event) => {
      patronSaves += 1;
      patronStale = true;
      const saved: PatronChange | undefined = (event as CustomEvent<PatronChange>).detail;
      void import("@/lib/widget/state")
        .then(({ readPatronAnswer }) => {
          const answer = readPatronAnswer(200, saved);
          if (answer.kind === "unknown") return;
          patron = { answer, at: Date.now(), signedIn: latest.current?.streak.signedIn ?? true };
          patronStale = false;
        })
        .catch(() => {
          // Offline before the chunk was cached: the push asks the server.
        })
        .finally(() => soon());
    };

    const start = window.setTimeout(() => {
      void whenLanguageSettled().then(() => {
        started = true;
        soon(0);
      });
    }, SETTLE_MS);
    window.addEventListener(PRAYER_EVENT, onChange);
    window.addEventListener(CALENDAR_STYLE_EVENT, onChange);
    window.addEventListener(REMEMBER_EVENT, onChange);
    window.addEventListener(PATRON_EVENT, onPatron);
    const stopPacks = subscribePacks(onChange);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      changed.current = null;
      window.clearTimeout(start);
      window.clearTimeout(timer);
      window.removeEventListener(PRAYER_EVENT, onChange);
      window.removeEventListener(CALENDAR_STYLE_EVENT, onChange);
      window.removeEventListener(REMEMBER_EVENT, onChange);
      window.removeEventListener(PATRON_EVENT, onPatron);
      stopPacks();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
