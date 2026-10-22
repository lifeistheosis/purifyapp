"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { LIST_LABEL, isMarketingList } from "@/lib/email/lists";

/**
 * The page an unsubscribe link opens.
 *
 * It asks first and acts on the button, never on arrival: mail security
 * scanners open every link in a message, so an unsubscribe that happened on
 * page load would take readers off a list they never chose to leave. The mail
 * client's own one-click button skips this page and POSTs to the route directly.
 */
export function UnsubscribeClient() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const rawList = params.get("l");
  const list = isMarketingList(rawList) ? rawList : null;
  const [state, setState] = useState<"ready" | "busy" | "done" | "error">("ready");
  const [error, setError] = useState<string | null>(null);
  // 1.8: a link for one list can stop all of them too, with no sign-in.
  const [stopped, setStopped] = useState<"list" | "all">(list ? "list" : "all");

  const listName = list && stopped === "list" ? `"${LIST_LABEL[list]}"` : "every optional Purify email";

  async function unsubscribe(which: "list" | "all" = list ? "list" : "all") {
    setStopped(which);
    setState("busy");
    setError(null);
    try {
      const res = await apiFetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, list: which === "list" && list ? list : "all" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) setState("done");
      else {
        setError(data.error ?? "That did not go through. Try again in a moment.");
        setState("error");
      }
    } catch {
      setError("The network dropped. Try again in a moment.");
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="font-sans text-caption font-semibold text-gold/80">Email</p>
      {!token ? (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">Choose what email you get</h1>
          <p className="mt-4 font-sans text-body text-paper/70 leading-[1.6]">
            This link does not carry your own code, so nothing can be turned off from here. Sign in and open your
            account to choose what email you get, or reply to any email from us and we will stop it for you. Email
            about your orders, your membership and your account still arrives, because it is part of having one.
          </p>
        </>
      ) : state === "done" ? (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">You are unsubscribed</h1>
          <p className="mt-4 font-sans text-body text-paper/70 leading-[1.6]">
            You will not get {listName} from Purify again. Email about your orders, your membership, your account
            and your support messages still arrives, because those are about things you asked for or have with us.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-3 font-serif text-title text-paper">Stop {listName}?</h1>
          <p className="mt-4 font-sans text-body text-paper/70 leading-[1.6]">
            One press and it stops. You can turn it back on any time from your account.
          </p>
          <button
            type="button"
            onClick={() => void unsubscribe()}
            disabled={state === "busy"}
            className="mt-8 rounded-pill border border-gold/40 bg-gold/[0.08] px-6 py-2.5 font-sans text-detail font-semibold text-gold transition-colors hover:bg-gold/[0.14] disabled:opacity-40"
          >
            {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
          </button>
          {list ? (
            <button
              type="button"
              onClick={() => void unsubscribe("all")}
              disabled={state === "busy"}
              className="mt-4 block font-sans text-detail text-paper/60 underline underline-offset-2 hover:text-paper disabled:opacity-40"
            >
              Stop every optional Purify email instead
            </button>
          ) : null}
          {error ? <p className="mt-4 font-sans text-detail text-red-300">{error}</p> : null}
        </>
      )}
      <p className="mt-10 font-sans text-caption text-paper/50">
        {/* The Notifications screen (1.6), which holds the email choices on a
            phone and on the desktop alike. It was the Data tab, where a phone
            no longer draws them. */}
        <Link href="/account/notifications" className="underline underline-offset-2">
          Choose what email you get
        </Link>
      </p>
    </div>
  );
}
