"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNativeClient } from "@/lib/platform/native";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Client-side auth gate for the signed-in account dashboard.
 *
 * On the WEB the server proxy (lib/supabase/middleware.updateSession, run by
 * proxy.ts on every request) ALREADY validates the session server-side and
 * redirects signed-out users off /account/* before this ever renders — so if
 * we are rendering here on the web, the user is authenticated. We must NOT do
 * a second, redundant client check: that check called the network (getUser),
 * and when it raced a token refresh on open it failed with "We couldn't
 * confirm your sign-in" for an already-signed-in user (F-13, reported live
 * 2026-07-12). On the web we simply render.
 *
 * The NATIVE app ships as a local-first static export with NO server proxy and
 * no server session, so there the client resolve IS the gate: it reads the
 * WebView's local session and renders when signed in, redirects on a RESOLVED
 * signed-out, and shows a retry (never a fake sign-out) when it genuinely
 * can't tell.
 */
export function AccountAuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "in" | "out" | "unresolved">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  // The retry handler resets to "loading" before bumping `attempt` (state
  // updates belong in handlers, not effect bodies — same shape as
  // useAsyncData.reload).
  useEffect(() => {
    // Web: the server proxy already gated this route. Reaching here means
    // signed in — render without the redundant (and failure-prone) client
    // check. isNativeClient() is read in the effect (post-hydration) so it
    // returns the true value, not the SSR default. One-time platform sync,
    // same disable as the other hydration-time state seeds in this codebase.
    if (!isNativeClient()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("in");
      return;
    }
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      if (auth.state === "signed-in") {
        setState("in");
      } else if (auth.state === "signed-out") {
        setState("out");
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      } else {
        setState("unresolved");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname, attempt]);

  if (state === "in") return <>{children}</>;

  if (state === "unresolved") {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-16 text-center">
        <p className="font-serif text-body text-paper/70 leading-[1.6]">
          {t("ui.weCouldnTConfirmYour")}
        </p>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            setAttempt((n) => n + 1);
          }}
          className="tap-press mt-5 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          {t("error.tryAgain")}
        </button>
      </div>
    );
  }

  // Loading / redirecting: a calm placeholder, never a crash or blank flash
  // of protected chrome.
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="font-sans text-caption text-paper/45">
        {state === "out"
          ? t("ui.redirectingToSignIn")
          : t("ui.loadingYourAccount")}
      </p>
    </div>
  );
}
