"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";

type Translate = ReturnType<typeof useTranslate>["t"];

/**
 * Email + password sign-in. On success, server middleware checks the
 * `has_password` flag and routes accordingly (set-password
 * interstitial if missing, /account/profile if set).
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useTranslate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.push(next && next.startsWith("/") ? next : "/account/profile");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? friendly(t, e.message)
          : t("signin.genericError"),
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="signin-email"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          {t("common.email")}
        </label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("ui.youSomewhereCom")}
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      <PasswordInput
        label={t("common.password")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error ? (
        <p className="font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? t("signin.pending") : t("signin.submit")}
      </button>

      <div className="flex items-center justify-between text-caption font-sans">
        <Link
          href="/forgot"
          className="text-paper/65 hover:text-paper underline underline-offset-2 decoration-paper/25"
        >
          {t("signin.forgotPassword")}
        </Link>
        <Link
          href="/signup"
          className="text-paper/65 hover:text-paper"
        >
          {t("signin.newHerePrefix")}{" "}
          <span className="text-paper">{t("ui.createAnAccountX")}</span>
        </Link>
      </div>

      <div className="relative my-3">
        <span className="absolute inset-x-0 top-1/2 h-px bg-paper/12" />
        <span className="relative bg-night px-3 text-eyebrow uppercase tracking-[1.5px] text-paper/45 mx-auto inline-block left-1/2 -translate-x-1/2">
          {t("notFound.or")}
        </span>
      </div>

      <OAuthButtons />
    </form>
  );
}

function friendly(t: Translate, msg: string): string {
  if (/invalid login credentials/i.test(msg)) {
    // Pre-v6.2 users signed up via magic-link with no password set.
    // The fix is the same as forgetting one: Forgot password → email
    // → set a password. Naming that path here is the difference
    // between "I'm locked out" and "I know what to do."
    return t("signin.invalidCredentials");
  }
  if (/email not confirmed/i.test(msg)) {
    return t("signin.emailNotConfirmed");
  }
  return msg;
}
