// Where the account card on Today may say that reminders come with an
// account (1.9; the arbiter's check of 2026-11-10 against audit F-21).
//
// The card says it only where a notification from Purify has been seen to
// arrive on a reader's device. The record (docs/audit/continuation-ledger.md, 1.6, and
// docs/audit/findings.yaml F-21, F-40, F-41, F-43):
//
//   ios      the owner's own word, 2026-10-14: "On iOS, I do."
//   web      the owner's own word, 2026-11-10, of his own browser: "Though
//            web notification pops up for me, but not the Android app
//            itself." Until that day no browser had been seen to subscribe
//            on the live site (F-40).
//   android  Google accepts the server's sends, and on 2026-10-14 the owner
//            had not had "a single notification" on his Android phone. The
//            repair for a phone another account had used (F-43) went live
//            with 1.6. On 2026-11-10 he said so again, in the same sentence
//            as the line above: "but not the Android app itself."
//
// The measure, said plainly: a line turns to true when the owner, or
// someone he names, says a notification from Purify has arrived on that
// kind of device, with the day and who saw it. His words for iOS and for
// the website are both of notifications, not of a reminder watched arriving
// at its own hour; the reminders go out by the same send as every other
// notification (lib/push/deliver.ts), so one arriving shows the way is
// open. The stricter proof, a reminder at its set time, is the phone walk's
// (docs/PHONE-WALK.md, row 19), and Android waits for it.
//
// Elsewhere the card speaks of the account alone, which is true everywhere.
// The offer to turn reminders on (the questions, the account page, this
// card after a sign-in) is older than this file and is not decided here.

import type { NativePlatform } from "@/lib/platform/native";

export const REMINDERS_SEEN_ARRIVING: Readonly<Record<NativePlatform | "web", boolean>> = {
  ios: true,
  android: false,
  web: true,
};

/** May the signed-out account card say that signing in turns reminders on? */
export function mayPromiseReminders(platform: NativePlatform | null): boolean {
  return REMINDERS_SEEN_ARRIVING[platform ?? "web"];
}
