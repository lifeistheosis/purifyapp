// Purify's announcement in the bell (2.0): the board message the What's New
// page opens with, the one the admin panel publishes (lib/whatsNew/board.ts,
// lib/packs). His word, 2026-11-28: "updates/announcements from purify".
//
// A new message lights the bell once. The device keeps the date of the last
// one seen in the sheet. The first time, the message that stands is taken as
// seen, so a reader is never woken by one already weeks old.

const KEY = "purify:board-seen";

/** Whether this message is new since the sheet was last opened. Never before the device has seen one. */
export function boardFresh(message: { date: string } | null, seen: string | null): boolean {
  if (!message || seen === null) return false;
  return message.date > seen;
}

export function readBoardSeen(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The message as seen: the sheet was opened, or the device meets one for the first time. */
export function markBoardSeen(date: string): void {
  try {
    window.localStorage.setItem(KEY, date);
  } catch {
    // A blocked store: the message may light the bell once more.
  }
}

/** The first time the device meets a message, it is taken as seen. */
export function seedBoardSeen(message: { date: string } | null): void {
  if (message && readBoardSeen() === null) markBoardSeen(message.date);
}
