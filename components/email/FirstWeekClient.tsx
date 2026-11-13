"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";

/**
 * The page the welcome email's "Send it to me" opens: the first-week guide,
 * turned on by the reader's own press (lib/email/retention/firstWeekAsk.ts).
 *
 * It asks first and acts on the button, never on arrival: mail security
 * scanners open every link in a message, so a guide turned on at page load
 * would be consent nobody gave. The link's own code (?u and ?s) is what lets
 * the button work with no sign-in, for that one account and that one list.
 */
export function FirstWeekClient() {
  const params = useSearchParams();
  const user = params.get("u") ?? "";
  const signature = params.get("s") ?? "";
  const [state, setState] = useState<"ready" | "busy" | "done" | "refused" | "error">("ready");
  const [said, setSaid] = useState<string | null>(null);

  async function send() {
    setState("busy");
    setSaid(null);
    try {
      const res = await apiFetch("/api/email/first-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u: user, s: signature }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; answer?: string; said?: string; error?: string };
      if (res.ok && data.ok) setState("done");
      else if (res.ok && data.said) {
        setSaid(data.said);
        setState("refused");
      } else {
        setSaid(data.error ?? "That did not go through. Try again in a moment.");
        setState("error");
      }
    } catch {
      setSaid("The network dropped. Try again in a moment.");
      setState("error");
    }
  }

  // This page's words are written in English here, as the unsubscribe page's
  // are and the welcome email's that leads here, so it says so whole and reads
  // left to right under Arabic and Urdu (build 90 note 4).
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-lg px-6 py-16">
      <p className="font-sans text-caption font-semibold text-gold/80">Email</p>
      {!user || !signature ? (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">Your first week</h1>
          <p className="mt-4 font-sans text-body leading-[1.6] text-paper/70">
            This link does not carry your own code, so nothing can be turned on from here. Open the welcome email
            again and press Send it to me there.
          </p>
        </>
      ) : state === "done" ? (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">It is on its way</h1>
          <p className="mt-4 font-sans text-body leading-[1.6] text-paper/70">
            The guide comes over your first week. Each email has a link at its foot that stops the rest.
          </p>
        </>
      ) : state === "refused" ? (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">Nothing was turned on</h1>
          <p className="mt-4 font-sans text-body leading-[1.6] text-paper/70">{said}</p>
        </>
      ) : (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">Send the first-week guide?</h1>
          <p className="mt-4 font-sans text-body leading-[1.6] text-paper/70">
            Three short emails: the day after you joined, on the morning prayers; on your third day, on the calendar;
            and on your seventh, on keeping a verse. Each comes only if you have not done it yet. One press and it is
            on.
          </p>
          <button
            type="button"
            onClick={() => void send()}
            disabled={state === "busy"}
            className="mt-8 min-h-11 rounded-pill border border-gold/40 bg-gold/[0.08] px-6 py-2.5 font-sans text-detail font-semibold text-gold transition-colors hover:bg-gold/[0.14] disabled:opacity-40"
          >
            {state === "busy" ? "Sending…" : "Send it to me"}
          </button>
          {state === "error" && said ? <p className="mt-4 font-sans text-detail text-paper/80">{said}</p> : null}
        </>
      )}
      <p className="mt-10 font-sans text-caption text-paper/50">
        <Link href="/account/notifications" className="underline underline-offset-2">
          Choose what email you get
        </Link>
      </p>
    </div>
  );
}
