// Where the account card on Today may say that reminders come with an
// account (1.9; the arbiter's check of 2026-11-10 against audit F-21).
//
// The card says it only where a reminder has been seen to arrive on a
// reader's device. The record (docs/audit/continuation-ledger.md, 1.6, and
// docs/audit/findings.yaml F-21, F-40, F-41, F-43):
//
//   ios      the owner's own word, 2026-10-14: "On iOS, I do."
//   android  Google accepts the server's sends, and the same day the owner
//            had not had "a single notification" on his Android phone. The
//            repair for a phone another account had used (F-43) went live
//            with 1.6, and no Android phone has been seen receiving since.
//   web      no browser has been seen to subscribe on the live site (F-40).
//
// Turn a line to true when a reminder is seen arriving there, with the day
// and who saw it. Elsewhere the card speaks of the account alone, which is
// true everywhere. The offer to turn reminders on (the questions, the
// account page, this card after a sign-in) is older than this file and is
// not decided here.

import type { NativePlatform } from "@/lib/platform/native";

export const REMINDERS_SEEN_ARRIVING: Readonly<Record<NativePlatform | "web", boolean>> = {
  ios: true,
  android: false,
  web: false,
};

/** May the signed-out account card say that signing in turns reminders on? */
export function mayPromiseReminders(platform: NativePlatform | null): boolean {
  return REMINDERS_SEEN_ARRIVING[platform ?? "web"];
}
