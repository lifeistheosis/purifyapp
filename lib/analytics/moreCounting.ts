// The seven counts of the testing system's page (1.9; the owner's "finalize
// all of this and let's get going" of 2026-11-10). Each serves one decision,
// and anything that served none was left out
// (docs/1.9-build/notes/onboarding-fable.md, section 11).
//
// Counted the way the locks are (./lockCounting.ts): totals in
// analytics_events, sent through /api/track/event with no session, no
// account, no device id and no page, and kept to the day, not the time.
// Nothing about where a reader comes from in faith is on any of them.
//
//   first_act      the first prayer or chapter a new device finishes: which
//                  of the two, and how many days after it first opened Purify.
//                  Decides what Today leads with; the early sign of every test.
//   week_step      a step of a first week opened or closed: which day of the
//                  seven, never which step. Decides whether seven is right,
//                  and which day to mend.
//   account_made   an account made: where in Purify. Decides which moment is
//                  worth asking at.
//   reminders_set  reminders turned on or off, and where. With the word on
//                  the return notes (came_back, below), decides whether
//                  reminders keep readers and where to ask for them.
//   plus_step      in the Plus sheet: a feature's Try it opened, or the
//                  button to subscribe tapped, with the lock the sheet opened
//                  on. Decides which part of Plus to rework first.
//   pricing_bought a Plus subscription bought on the pricing page, which the
//                  sheet's own count (plus_bought) does not see.
//   today_card     one of the two small cards a new reader may meet on Today,
//                  answered or closed. Decides whether each earns its place.
//
// And two words on rows that already exist: `reminders` on came_back (was
// the device reminded when it came back), and `first` on screen_closed (the
// device's first day, so the screen new readers leave from is seen apart).
//
// THE SWITCH. None of these is sent until its sentence is on the privacy
// page: the words go to the owner, and ship at release. MORE_COUNTS_SENDING
// stays false until then, and lib/analytics/__tests__/moreCounting.test.ts
// refuses it true while the page lacks a sentence, in English or in German.
//
// Pure, so the rules are tested directly. Sending is ./moreCount.ts.

import type { CountPlatform } from "@/lib/onboarding/counting";

import type { Lock } from "./lockCounting";

/** Off until every sentence below is on /privacy. See the head of this file. */
export const MORE_COUNTS_SENDING = false;

export const MORE_EVENTS = ["first_act", "week_step", "account_made", "reminders_set", "plus_step", "pricing_bought", "today_card"] as const;
export type MoreEventName = (typeof MORE_EVENTS)[number];

export function isMoreEvent(name: string): name is MoreEventName {
  return (MORE_EVENTS as readonly string[]).includes(name);
}

export const FIRST_ACTS = ["prayer", "chapter"] as const;
export type FirstAct = (typeof FIRST_ACTS)[number];
/** Days after the device first opened Purify, in four spans. */
export const ACT_DAYS = ["0", "1", "2-6", "7+"] as const;
export type ActDay = (typeof ACT_DAYS)[number];
export function actDay(days: number): ActDay {
  if (!(days >= 1)) return "0";
  if (days === 1) return "1";
  return days < 7 ? "2-6" : "7+";
}

/** What was kept, from the id its mark is written under (lib/rhythm/marks.ts): a rule of prayer, or a day's reading. */
export function actOf(ruleId: string): FirstAct | null {
  if (!ruleId.startsWith("day:")) return "prayer";
  return ruleId === "day:gospel" || ruleId === "day:reading" ? "chapter" : null;
}

export const STEP_DID = ["opened", "passed"] as const;
export type StepDid = (typeof STEP_DID)[number];

export const ACCOUNT_PLACES = ["questions", "card", "signup", "plus"] as const;
export type AccountPlace = (typeof ACCOUNT_PLACES)[number];
export function isAccountPlace(v: unknown): v is AccountPlace {
  return typeof v === "string" && (ACCOUNT_PLACES as readonly string[]).includes(v);
}
/** An account this young, met on this device, was made here just now. */
export const NEW_ACCOUNT_MS = 30 * 60 * 1000;

export const REMINDER_PLACES = ["questions", "card", "settings"] as const;
export type ReminderPlace = (typeof REMINDER_PLACES)[number];

export const PLUS_STEPS = ["tried", "pay"] as const;
export type PlusStep = (typeof PLUS_STEPS)[number];
export const PRICING_PLANS = ["yearly", "monthly"] as const;
export type PricingPlan = (typeof PRICING_PLANS)[number];

export const TODAY_CARDS = ["keep", "second"] as const;
export type TodayCard = (typeof TODAY_CARDS)[number];
export const CARD_DID = ["answered", "closed"] as const;
export type CardDid = (typeof CARD_DID)[number];

export type MoreEvent =
  | { name: "first_act"; props: { kind: FirstAct; day: ActDay } }
  | { name: "week_step"; props: { n: number; did: StepDid } }
  | { name: "account_made"; props: { where: AccountPlace } }
  | { name: "reminders_set"; props: { to: "on" | "off"; where: ReminderPlace } }
  | { name: "plus_step"; props: { lock: Lock; step: PlusStep } }
  | { name: "pricing_bought"; props: { plan: PricingPlan } }
  | { name: "today_card"; props: { card: TodayCard; did: CardDid } };

/** The body the device sends: the event and the kind of device, and nothing else. */
export function moreEventBody(event: MoreEvent, platform: CountPlatform): string {
  return JSON.stringify({ name: event.name, props: { ...event.props, platform } });
}

/**
 * Each count's sentence for the privacy page, in English and in German, as
 * put to the owner. The page must carry every one, word for word, before the
 * switch above may be turned on. The last is not a new count: it names the
 * first step opened, which is counted today and which the page omits.
 */
export const PRIVACY_SENTENCES: readonly { what: string; en: string; de: string }[] = [
  {
    what: "first_act",
    en: "The first time a device finishes a prayer or a chapter, one row says which of the two it was and how many days after it first opened Purify.",
    de: "Wenn ein Gerät zum ersten Mal ein Gebet oder ein Kapitel beendet, sagt eine Zeile, welches von beiden es war und wie viele Tage nach dem ersten Öffnen von Purify.",
  },
  {
    what: "week_step",
    en: "The steps of a first week are counted the same way: which day of the seven it was and whether it was opened or closed, never which step.",
    de: "Die Schritte einer ersten Woche werden ebenso gezählt: welcher der sieben Tage es war und ob er geöffnet oder geschlossen wurde, nie welcher Schritt.",
  },
  {
    what: "account_made",
    en: "When an account is made, one row says where in Purify it was made, and nothing about the account.",
    de: "Wenn ein Konto angelegt wird, sagt eine Zeile, wo in Purify es angelegt wurde, und nichts über das Konto.",
  },
  {
    what: "reminders_set",
    en: "When reminders are turned on or off, one row says so and where. The note your device sends when you come back also says whether reminders were on.",
    de: "Wenn Erinnerungen ein- oder ausgeschaltet werden, sagt eine Zeile das und wo. Die Notiz, die dein Gerät sendet, wenn du wiederkommst, sagt auch, ob Erinnerungen eingeschaltet waren.",
  },
  {
    what: "plus_step",
    en: "In the Plus sheet, one row says when a feature's Try it was opened and when the button to subscribe was tapped, with the feature the sheet was opened on. A purchase made on the pricing page is counted like one made in the sheet.",
    de: "Im Plus-Blatt sagt eine Zeile, wann das Ausprobieren einer Funktion geöffnet und wann die Schaltfläche zum Abonnieren angetippt wurde, mit der Funktion, für die das Blatt geöffnet wurde. Ein Kauf auf der Preisseite wird gezählt wie einer im Blatt.",
  },
  {
    what: "screen_closed.first",
    en: "The row that says what kind of screen was showing when the app was put away also says whether it was the device's first day.",
    de: "Die Zeile, die sagt, welche Art von Bildschirm zu sehen war, als die App weggelegt wurde, sagt auch, ob es der erste Tag des Geräts war.",
  },
  {
    what: "today_card",
    en: "The two small cards a new reader may meet on Today are counted as answered or closed.",
    de: "Die zwei kleinen Karten, denen ein neuer Leser auf Heute begegnen kann, werden als beantwortet oder geschlossen gezählt.",
  },
  {
    what: "onboarding_dayone",
    en: "From your own device, one row also says when the first step of your first week was opened.",
    de: "Von deinem eigenen Gerät sagt eine Zeile auch, wann der erste Schritt deiner ersten Woche geöffnet wurde.",
  },
];
