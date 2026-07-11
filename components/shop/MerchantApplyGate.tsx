"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MerchantApplyForm } from "@/components/shop/MerchantApplyForm";
import { createClient } from "@/lib/supabase/client";

/**
 * The "Apply" section of the Sell page, gated on the signed-in state resolved
 * client-side so the page works in the native local-first export.
 */
export function MerchantApplyGate() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setState(data.user ? "in" : "out");
      })
      .catch(() => {
        if (!cancelled) setState("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <p className="mt-5 font-sans text-caption text-paper/45">Loading…</p>
    );
  }
  if (state === "in") {
    return (
      <div className="mt-5">
        <MerchantApplyForm />
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
      <p className="font-serif text-body text-paper/70 leading-[1.65]">
        Applications are tied to a Purify account so you can follow your review
        status. Sign in or create a free account to apply.
      </p>
      <Link
        href="/signin?next=/shop/sell"
        className="tap-press mt-4 inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
      >
        Sign in to apply
      </Link>
    </div>
  );
}
