"use client";

import { useEffect } from "react";

import { isNativeClient } from "@/lib/platform/native";
import { healWebPush } from "@/lib/push/client";

/**
 * Finishes web reminders that were asked for and never reached the server.
 *
 * Until 2026-10-04 "turn on reminders" failed in every browser after the
 * permission prompt was answered (lib/push/vapid.ts), so those readers hold a
 * granted permission and nothing behind it. And a subscription made during
 * onboarding, before there is an account, was sent on only by the account
 * page. healWebPush repairs both the next time the reader opens Purify, a
 * few seconds in so it never competes with the page loading, and makes no
 * request for a browser that is already saved. Browser only: the phone apps
 * register through the native plugin (lib/push/native.ts). Renders nothing.
 */
export function PushHealBridge() {
  useEffect(() => {
    if (isNativeClient()) return;
    const id = window.setTimeout(() => {
      void healWebPush().catch(() => {
        /* the next visit tries again */
      });
    }, 5000);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
