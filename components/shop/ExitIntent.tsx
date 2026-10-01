"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import { isNativeClient } from "@/lib/platform/native";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { useReducedMotion } from "@/lib/ui/motion";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";

/**
 * On a computer, a reader about to leave the shop is offered the "New in the
 * shop" email (asked for 2026-09-30 as a respectful exit-intent capture).
 *
 * ── What keeps it respectful ────────────────────────────────────────────
 *
 *  - Computers only: the pointer leaving through the top of the window is the
 *    one honest sign of leaving, and phones have nothing like it.
 *  - Not before twenty seconds in the shop, at most once a month, never on
 *    checkout, orders, messages or the seller console, and never to a reader
 *    already on the list.
 *  - One tap to join for a signed-in reader (the list is theirs to switch off
 *    from any email), and an honest "make a free account" for a guest: the
 *    list belongs to accounts, so there is no email box to type into here.
 *  - No discount, no countdown, no guilt. "Not now" is as big as "Yes".
 */

const SEEN_KEY = "purify.exitIntent.at";
const ONCE_PER_MS = 30 * 86_400_000;
const ARM_AFTER_MS = 20_000;
const QUIET_PATHS = ["/shop/checkout", "/shop/orders", "/shop/messages", "/shop/seller", "/shop/sell"];

function recentlyShown(): boolean {
  try {
    const at = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(at) && Date.now() - at < ONCE_PER_MS;
  } catch {
    return true;
  }
}

function markShown() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

type Who = { signedIn: false } | { signedIn: true; productUpdates: boolean };

export function ExitIntent() {
  const { t } = useTranslate();
  const pathname = usePathname() ?? "";
  const [who, setWho] = useState<Who | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"ask" | "saving" | "joined" | "error">("ask");
  const firstButton = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p));
  // It moves like every pop-up card (lib/ui/useDraggableSheet): it rises in
  // as the backdrop dims and blurs in step, and its handle drags it down.
  const reduced = useReducedMotion();
  const { mounted, panelRef, scrimRef, grab } = useDraggableSheet({
    open,
    onClose: () => setOpen(false),
    reduced,
    half: 1,
  });

  // Arm after a while in the shop, on a computer, when the reader is not on the list.
  useEffect(() => {
    if (quiet || isNativeClient() || recentlyShown()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return;
    let armed = false;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const auth = await resolveUser();
        if (cancelled || auth.state === "unresolved") return;
        if (auth.state === "signed-out") {
          setWho({ signedIn: false });
        } else {
          const res = await apiFetch("/api/email/preferences");
          if (!res.ok) return;
          const prefs = (await res.json()) as { shopOffers?: boolean; productUpdates?: boolean };
          if (prefs.shopOffers) return;
          setWho({ signedIn: true, productUpdates: Boolean(prefs.productUpdates) });
        }
        armed = true;
      } catch {
        /* no offer is better than a broken one */
      }
    }, ARM_AFTER_MS);
    const onLeave = (e: MouseEvent) => {
      if (!armed || e.relatedTarget || e.clientY > 0) return;
      armed = false;
      markShown();
      setOpen(true);
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [quiet]);

  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mounted]);

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

  if (!mounted || !who) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-night/60"
        style={{ opacity: 0 }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-intent-title"
        className="relative w-full max-w-[480px] rounded-2xl border border-paper/12 bg-night px-7 pb-7 pt-2 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] will-change-transform"
      >
        <div className="mb-3 flex cursor-grab touch-none select-none justify-center py-2 active:cursor-grabbing" {...grab}>
          <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/20" />
        </div>
        <h2 id="exit-intent-title" className="text-balance text-title-sm font-bold leading-tight text-paper">
          {t("shop.exitTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-[34ch] text-pretty font-sans text-ui leading-[1.55] text-paper/70">
          {state === "joined" ? t("shop.exitJoined") : who.signedIn ? t("shop.exitBody") : t("shop.exitSignupBody")}
        </p>
        {state === "error" ? (
          <p role="alert" className="mt-3 font-sans text-caption text-crimson-soft">
            {t("shop.exitError")}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {state === "joined" ? (
            <button
              ref={(el) => {
                firstButton.current = el;
              }}
              type="button"
              onClick={() => setOpen(false)}
              className="col-span-2 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-on-paper hover:bg-paper/90"
            >
              {t("shop.exitClose")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/40"
              >
                {t("shop.exitNotNow")}
              </button>
              {who.signedIn ? (
                <button
                  ref={(el) => {
                    firstButton.current = el;
                  }}
                  type="button"
                  onClick={() => void join()}
                  disabled={state === "saving"}
                  className="inline-flex min-h-11 items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-on-paper hover:bg-paper/90 disabled:opacity-60"
                >
                  {t("shop.exitJoin")}
                </button>
              ) : (
                <Link
                  ref={(el) => {
                    firstButton.current = el;
                  }}
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-on-paper hover:bg-paper/90"
                >
                  {t("shop.exitSignup")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
