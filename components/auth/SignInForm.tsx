"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { nextPath, withNext } from "@/lib/auth/nextPath";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";
import { connectionAware } from "@/lib/auth/friendlyError";

type Translate = ReturnType<typeof useTranslate>["t"];

/** The address's query never changes while this form is up. */
const noChanges = () => () => {};

/**
 * Email + password sign-in. On success, server middleware checks the
 * `has_password` flag and routes accordingly (set-password
 * interstitial if missing, /account/profile if set).
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useTranslate();
  // Where to go once signed in: what the page was asked for, which in the
  // apps is read here from the address because the export's server cannot
  // read it (lib/auth/nextPath.ts). Google and Apple go there too.
  const search = useSyncExternalStore(noChanges, () => window.location.search, () => "");
  const target = nextPath(next, search);
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
      router.push(target);
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
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/55 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      <PasswordInput
        label={t("common.password")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? t("signin.pending") : t("signin.submit")}
      </button>
      {/* Under the button, so nothing moves under the finger that pressed it (fresh eyes M6). */}
      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}

      <div className="flex items-center justify-between text-caption font-sans">
        <Link
          href="/forgot"
          className="inline-flex min-h-11 items-center text-paper/65 hover:text-paper underline underline-offset-2 decoration-paper/25"
        >
          {t("signin.forgotPassword")}
        </Link>
        <Link
          // Carries the way on: no account yet is the usual case for someone
          // the gift page sent here (lib/auth/nextPath.ts, withNext).
          href={withNext("/signup", target)}
          className="inline-flex min-h-11 items-center gap-1 text-end text-paper/65 hover:text-paper"
        >
          {t("signin.newHerePrefix")}{" "}
          <span className="text-paper">{t("ui.createAnAccountX")}</span>
        </Link>
      </div>

      {/* The word stands in the middle of its line whichever way the page runs. It was centred by a left offset, which
          in a page that runs right to left starts from the right: in Arabic and Urdu it was carried off the screen and
          only the line was left (seen on the export, 2026-11-11). */}
      <div data-or-line="" className="relative my-3 flex justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-paper/12" />
        <span className="relative bg-night px-3 text-caption text-paper/45">
          {t("notFound.or")}
        </span>
      </div>

      <OAuthButtons redirectTo={target} />
    </form>
  );
}

function friendly(t: Translate, msg: string): string {
  if (connectionAware(msg, t) !== msg) return connectionAware(msg, t);
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
