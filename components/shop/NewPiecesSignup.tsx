"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import { resolveUser } from "@/lib/supabase/resolveUser";

type Who = { signedIn: false } | { signedIn: true; productUpdates: boolean };

/**
 * "New pieces, by email", in the shop home itself (2026-09-30, the revamp's
 * retention ask), for every reader: the exit offer (ExitIntent.tsx) only ever
 * reaches a computer, and most of the shop is read on phones.
 *
 * The same list and the same honesty as the exit offer, in the same words:
 * one tap for a signed-in reader, who can stop it from any email; an honest
 * "make a free account" for a guest, because the list belongs to accounts and
 * there is no email box to type into here. Nothing is shown to a reader
 * already on the list, and nothing at all until we know which case this is.
 */
export function NewPiecesSignup({ className }: { className?: string }) {
  const { t } = useTranslate();
  const [who, setWho] = useState<Who | null>(null);
  const [state, setState] = useState<"ask" | "saving" | "joined" | "error">("ask");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const auth = await resolveUser();
        if (cancelled || auth.state === "unresolved") return;
        if (auth.state === "signed-out") {
          setWho({ signedIn: false });
          return;
        }
        const res = await apiFetch("/api/email/preferences");
        if (cancelled || !res.ok) return;
        const prefs = (await res.json()) as { shopOffers?: boolean; productUpdates?: boolean };
        if (!prefs.shopOffers) setWho({ signedIn: true, productUpdates: Boolean(prefs.productUpdates) });
      } catch {
        /* no offer is better than a broken one */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function join() {
    if (!who?.signedIn) return;
    setState("saving");
    try {
      const res = await apiFetch("/api/email/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopOffers: true, productUpdates: who.productUpdates }),
      });
      setState(res.ok ? "joined" : "error");
    } catch {
      setState("error");
    }
  }

  if (!who) return null;
  return (
    <section aria-labelledby="shop-new-pieces" className={className}>
      <div className="flex flex-col gap-5 rounded-2xl border border-premium/25 bg-premium/[0.05] p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-8">
        <div className="max-w-[52ch]">
          <h2 id="shop-new-pieces" className="text-title-sm text-paper">
            {t("shop.exitTitle")}
          </h2>
          <p className="mt-2 font-sans text-ui leading-[1.55] text-paper/70" aria-live="polite">
            {state === "joined" ? t("shop.exitJoined") : who.signedIn ? t("shop.exitBody") : t("shop.exitSignupBody")}
          </p>
          {state === "error" ? (
            <p role="alert" className="mt-2 font-sans text-caption text-crimson-soft">
              {t("shop.exitError")}
            </p>
          ) : null}
        </div>
        {state === "joined" ? null : who.signedIn ? (
          <button
            type="button"
            onClick={() => void join()}
            disabled={state === "saving"}
            className="tap-press inline-flex min-h-12 shrink-0 items-center justify-center self-start rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60 md:self-center"
          >
            {t("shop.exitJoin")}
          </button>
        ) : (
          <Link
            href="/signup"
            className="tap-press inline-flex min-h-12 shrink-0 items-center justify-center self-start whitespace-nowrap rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 md:self-center"
          >
            {t("shop.exitSignup")}
          </Link>
        )}
      </div>
    </section>
  );
}
