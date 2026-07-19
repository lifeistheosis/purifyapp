"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-xl border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

async function loadAuth(): Promise<{ signedIn: boolean }> {
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  return { signedIn: auth.state === "signed-in" };
}

/**
 * "Contact EIKON support" — opens (or reuses) a live chat thread with the EIKON
 * store and drops the buyer straight into it. A thin front door onto the same
 * buyer messages UI; the message posts to /api/shop/conversations anchored to
 * the EIKON store, subject "Support".
 */
export function ShopSupportClient() {
  const { t } = useTranslate();
  const router = useRouter();
  const { data, error, loading, reload } = useAsyncData(loadAuth, []);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) return <ShopLoading label={t("common.loading")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Contact EIKON support"
        body="Sign in to start a conversation with EIKON. Your messages and their replies live in your shop inbox."
        next="/shop/support"
      />
    );
  }

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await apiFetch("/api/shop/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: "eikon",
          subject: "Support",
          body: text,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        conversationId?: string;
        error?: string;
      };
      if (res.ok && json.ok && json.conversationId) {
        router.push(`/shop/messages/detail?id=${json.conversationId}`);
        return;
      }
      setSubmitError(json.error ?? "Couldn't start the conversation.");
    } catch {
      setSubmitError("Couldn't start the conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          {t("shop.purifyShop")}
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">
          {t("shop.contactEikonSupport")}
        </h1>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
          {t("shop.questionsAboutAnOrderAn")}
        </p>
      </header>

      <form
        onSubmit={start}
        className="mt-8 rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:p-6"
      >
        <label className="block">
          <span className="font-sans text-detail font-medium text-paper/80">
            {t("ui.howCanWeHelp")}
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Tell EIKON what you need help with…"
            className={cn(field, "mt-2 resize-none")}
          />
        </label>

        {submitError ? (
          <p role="alert" className="mt-2 font-sans text-detail text-crimson-soft">
            {submitError}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start a conversation"}
          </button>
          <Link
            href="/shop/messages"
            className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
          >
            {t("shop.viewMyMessages")}
          </Link>
        </div>
      </form>
    </div>
  );
}
