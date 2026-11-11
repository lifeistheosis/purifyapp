"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Where a change of email stands, after a link in its email was opened
 * (a reader's report from the Discord, 2026-10-31: "Change Email does not
 * finish after the confirmation, tried several times").
 *
 * Supabase's secure email change sends a link to the old address and one to
 * the new, and makes the change only when both are opened. The card told
 * readers of the new one only, so the change waited for a link they were
 * never told to open, and the callback then landed them on their profile
 * with the old address still showing. Now every link lands here and says
 * which of three it is:
 *
 *   done      both are opened: the account uses the new address
 *   half      one is opened: open the other
 *   expired   the link was old or already used: ask again from Security
 *
 * The state comes from the callback (app/api/auth/callback/route.ts,
 * ?state=), or, when the email's link went through Supabase's own page (its
 * default template), from what Supabase writes after the #. This page needs
 * no sign-in: the link may open in another browser than the one that asked.
 */

export type EmailChangeState = "done" | "half" | "expired";

const STATES: readonly EmailChangeState[] = ["done", "half", "expired"];

/** The state, from the callback's ?state= first, else from Supabase's fragment. */
export function readEmailChangeState(query: string | null, hash: string): EmailChangeState {
  if (query && (STATES as readonly string[]).includes(query)) return query as EmailChangeState;
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (p.get("error") || p.get("error_code") || p.get("error_description")) return "expired";
  // Supabase's words for the first of two: "Confirmation link accepted.
  // Please proceed to confirm link sent to the other email".
  if (/other email/i.test(p.get("message") ?? "")) return "half";
  return p.get("access_token") || p.get("code") ? "done" : "expired";
}

const KEY: Record<EmailChangeState, string> = {
  done: "emailChange.done",
  half: "emailChange.half",
  expired: "emailChange.expired",
};

export function EmailChangeStateView() {
  const { t } = useTranslate();
  const query = useSearchParams().get("state");
  const [state, setState] = useState<EmailChangeState | null>(null);

  useEffect(() => {
    // The fragment is read on the device only: a server never sees it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readEmailChangeState(query, window.location.hash));
  }, [query]);

  return (
    <section className="px-5 py-16 md:py-24">
      <article className="mx-auto w-full max-w-[560px]">
        <h1 className="font-sans text-title font-bold leading-tight text-paper">{t("ui.changeEmail")}</h1>
        {state ? (
          <p role="status" className="mt-4 font-serif text-body leading-[1.7] text-paper/85">
            {t(KEY[state])}
          </p>
        ) : null}
        <Link
          href="/account/security"
          className="mt-8 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night"
        >
          {t("emailChange.toSecurity")}
        </Link>
      </article>
    </section>
  );
}
