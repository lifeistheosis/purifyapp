// A test notification sent to the admin's own devices, and nobody else's
// (app/api/admin/push/test, components/admin/push/MyDevicesTest.tsx).
//
// Why it exists. The owner's Android phone has shown no notification since
// at least 2026-10-14 (docs/audit/findings.yaml F-43) while his iPad and his
// browser do, and Google accepts the server's sends to almost every Android
// phone. Whether his own phone is even registered to his account, and what
// Google answers for it, could only be learned by reading production rows,
// which no working session may do. The only send that could have told him
// was a broadcast to everyone. This sends to his account alone, by the user
// id of the session that asks, and says per device what the push service
// answered, so the fault can be put on one side of the line: the server's
// (no phone on the account, or Google refusing it) or the phone's own (Google
// took it and the phone showed nothing).
//
// Nothing here can reach another reader: the route takes no user id, no
// token and no audience from the request.

import { NOTIFICATION_COPY } from "./copy";

export type DeviceKind = "android" | "ios" | "web";

/** One of the admin's own devices, as the panel shows it: never its token or address. */
export type MyDevice = {
  kind: DeviceKind;
  /** Which browser, for a web subscription; null for a phone. */
  browser: string | null;
  /** When this device was first saved to the account. */
  since: string | null;
  /** The last time a push service accepted a send to it, before this one. */
  lastAccepted: string | null;
  /** The phone's own time zone, as it last sent it; null for a browser. */
  zone: string | null;
};

/**
 * What the push service answered for one device:
 *   accepted   Google, Apple or the browser's push service took it. If the
 *              device shows nothing now, the fault is on the device.
 *   refused    it was refused; `reason` says why in plain words.
 *   gone       refused as a device that no longer exists (the app removed,
 *              or its address replaced), and taken off the account.
 *   not-set-up the server has no key for this kind of device.
 */
export type MyDeviceResult = MyDevice & {
  result: "accepted" | "refused" | "gone" | "not-set-up";
  reason: string | null;
};

/**
 * What the test says: its row in the copy table (./copy.ts, "panelTest"),
 * where every notification's words are kept and held to the same bar. It
 * opens Today when tapped, so the tap is tested with it.
 */
const row = NOTIFICATION_COPY.panelTest;
export const SELF_TEST_PUSH = { title: row.title, body: row.body, url: "/" } as const;

/** How often one admin may send it: ten in ten minutes. */
export const SELF_TEST_WINDOW_SECONDS = 600;
export const SELF_TEST_MAX = 10;

/**
 * Which browser a web subscription belongs to, from its push service's host,
 * so two browsers on one account can be told apart without showing the
 * address itself (which is a secret of that browser).
 */
export function browserOf(endpoint: string): string {
  let host = "";
  try {
    host = new URL(endpoint).hostname;
  } catch {
    return "A browser";
  }
  if (host === "fcm.googleapis.com" || host.endsWith(".googleapis.com")) return "Chrome, Edge or another Chromium browser";
  if (host.endsWith("mozilla.com")) return "Firefox";
  if (host.endsWith("push.apple.com")) return "Safari";
  if (host.endsWith("notify.windows.com")) return "Edge (Windows)";
  return "A browser";
}

/** The label a device row starts with. */
export function kindLabel(kind: DeviceKind): string {
  return kind === "android" ? "Android phone" : kind === "ios" ? "iPhone or iPad" : "Browser";
}
