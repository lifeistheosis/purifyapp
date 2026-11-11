"use client";

// The way back out of the sign-in pages, in the apps (1.9; the arbiter's word
// of 2026-11-11, on Fable Theology's finding: "The sign-in page has no Back in
// the apps (an iPhone can leave only by the Purify mark, to Today)").
//
// Sign in, sign up, forgot, reset and set password are drawn by their own
// frame (app/(auth)/layout.tsx), outside the app's (components/layout/
// AppFrame.tsx), so the apps' back bar (components/nav/NativeBackBar.tsx)
// never stands over them. On the website the browser has its own Back, and
// an Android phone has its button; an iPhone has neither. A reader who opened
// Sign in from You, or from the account step of the welcome questions, and
// thought better of it could only tap the Purify mark and land on Today, with
// their place lost.
//
// So the frame has the house's chevron, named Back, at the start of its head:
// the same way back as every other bar (lib/nav/goBack.ts), so the reader
// returns where they were, pictured as a step back is everywhere
// (lib/ui/routeMotion.ts), and with Today as the floor when nothing of the app
// is behind the page (a cold start on a link from an email). Only in the
// apps, as the back bar is.

import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { NativeOnly } from "@/components/platform/PlatformGate";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { goBack } from "@/lib/nav/goBack";

/** Where Back goes when nothing of the app is behind the page: Today. */
export const AUTH_BACK_FLOOR = "/";

export function AuthBack() {
  return (
    <NativeOnly>
      <Back />
    </NativeOnly>
  );
}

function Back() {
  const router = useRouter();
  const { t } = useTranslate();
  return (
    <button
      type="button"
      data-auth-back=""
      onClick={() => goBack(router, AUTH_BACK_FLOOR)}
      aria-label={t("nav.back")}
      // A finger's size, drawn back to the page's edge so the chevron stands where every bar's does.
      className="tap-press -ms-3 inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-paper/80 hover:text-paper"
    >
      {/* It points the way the reader came: mirrored where the page runs right to left. */}
      <ChevronLeft size={22} className="rtl:-scale-x-100" />
    </button>
  );
}
