// How long a push may wait to be delivered, and what it takes the place of.
//
// A reminder names an hour. Delivered hours after it, it is no longer a
// reminder, and a pile of them is the multiplication CONTRIBUTING's third
// clause forbids. So each of the three transports is told the same two
// things about a reminder:
//
//   - its lifetime: how long the push service may hold it for a device that
//     is switched off or out of signal before dropping it;
//   - its tag: the name that lets a newer reminder of the same kind replace an
//     older one still on the screen, so a reader who leaves them unread sees
//     one Morning prayer, not a week of them.
//
// The browser has had both for a while (the TTL in ./send.ts, and the tag
// public/sw.js gives each notification by its kind). The phones had neither
// until 2026-10-31: FCM holds a message for four weeks unless told otherwise
// and APNs keeps the latest one for as long as it likes, so an Android phone
// back from three days without signal received six reminders at once, and
// each unread reminder stayed in the shade beside the next day's.
//
// Anything that is not a reminder (a reply, a gift, an announcement, an alert
// to the owner) keeps each service's own defaults: it is still true when it
// arrives late, and two replies are two things, not one thing twice.
//
// No imports, so the providers and ./send.ts can all use it without a cycle,
// and a test can read it without a push service in sight.

/** The kinds that name an hour. Each is also its own tag. */
export const REMINDER_KINDS: ReadonlySet<string> = new Set(["morning", "evening", "campaign"]);

/**
 * How long a push service may hold a reminder. The web-push library's own
 * default is four weeks, which would hand a reader opening a laptop on Friday
 * every morning reminder since Monday. A reminder that is hours late is no
 * longer a reminder.
 */
export const REMINDER_TTL_SECONDS = 6 * 60 * 60;

/** What a phone's push service is told besides the words. Empty: its defaults. */
export type NativeDelivery = { ttlSeconds?: number; tag?: string };

/** The lifetime and tag for a push of this kind, or nothing for one that is not a reminder. */
export function nativeDelivery(kind: string | undefined): NativeDelivery {
  return kind !== undefined && REMINDER_KINDS.has(kind) ? { ttlSeconds: REMINDER_TTL_SECONDS, tag: kind } : {};
}
