"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { nextPath, withNext } from "@/lib/auth/nextPath";
import { createClient } from "@/lib/supabase/client";
import { recordAcceptance } from "@/lib/legal/recordAcceptance";
import { authOrigin } from "@/lib/site";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";
import { LegalLink } from "@/components/legal/LegalLink";
import { connectionAware } from "@/lib/auth/friendlyError";

/**
 * Email + password sign-up. The Supabase trigger creates the profiles
 * row automatically; we additionally call `mark_password_set()` RPC
 * once the user lands signed in so the `has_password` flag is true.
 *
 * If "Confirm email" is enabled in Supabase Auth settings (recommended),
 * the user lands in the "check your inbox" state and the password is
 * already on `auth.users`, the flag is set by the SetPasswordForm /
 * first successful sign-in path.
 */
/** The address's query never changes while this form is up. */
const noChanges = () => () => {};

export function SignUpForm() {
  const router = useRouter();
  const { t } = useTranslate();
  // Where the new account goes once it exists: the `?next=` sign-in carried
  // here (withNext), read on the device as SignInForm reads it, or Profile as
  // before. The gift page (/gift) is the reason: a reader with no account
  // signs up from it and must land back on their gift, by any of the three
  // ways in (no confirmation, the confirmation email, Google or Apple).
  const search = useSyncExternalStore(noChanges, () => window.location.search, () => "");
  const target = nextPath(undefined, search);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Clickwrap: affirmative agreement is required before an account is
  // created, which is what makes the Terms (and the arbitration clause) bind.
  const [agreed, setAgreed] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError(t("signup.mustAgree"));
      return;
    }
    if (password.length < 8) {
      setError(t("ui.passwordMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("ui.passwordsDontMatch"));
      return;
    }
    setPending(true);
    // Recorded BEFORE the account exists, and awaited. The checkbox gate is a
    // client-side control; it proves nothing on its own, so the server-side
    // record has to actually land. A failure aborts rather than producing an
    // account with no acceptance row.
    try {
      await recordAcceptance("signup", email.trim());
    } catch (e) {
      setError(
        e instanceof Error ? connectionAware(e.message, t) : t("signup.acceptanceFailed"),
      );
      setPending(false);
      return;
    }
    try {
      const supabase = createClient();
      const origin = authOrigin();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || undefined,
          },
          // Encoded, as OAuthButtons sends it: the allow list's `next=*`
          // (docs/auth-setup.md) is matched the same way for both.
          emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(target)}`,
        },
      });
      if (err) throw err;
      // If confirm-email is off, Supabase returns a session; the
      // user is already signed in. Mark the flag and reload.
      if (data.session) {
        try {
          await supabase.rpc("mark_password_set");
        } catch {
          /* ignore, the middleware will trip the set-password gate if needed */
        }
        // router.push, NOT window.location.href. Capacitor's iOS router
        // serves basePath + "/index.html" for any extensionless path, so a
        // hard navigation to /account/profile handed back the Today page,
        // and the reload took the session with it. See OAuthButtons.
        router.push(target);
        router.refresh();
        return;
      }
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? connectionAware(e.message, t) : t("signup.genericError"));
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="rounded-lg border border-gold/35 bg-gold/[0.06] p-5">
        <p className="font-sans text-caption font-semibold text-gold mb-2">
          {t("signup.checkInbox")}
        </p>
        <p className="font-serif text-body text-paper/90 leading-[1.65]">
          {t("ui.weSentAConfirmationLink")}{" "}
          <span className="font-semibold text-paper">{sentTo}</span>
          {t("ui.openItOnAnyDevice")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="signup-name"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          {t("common.displayName")}{" "}
          <span className="text-paper/45">{t("ui.parenOptional")}</span>
        </label>
        <input dir="auto"
          id="signup-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("campaigns.new.namePlaceholder")}
          maxLength={64}
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/55 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          {t("common.email")}
        </label>
        <input
          id="signup-email"
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
        autoComplete="new-password"
        showStrength
      />
      <PasswordInput
        label={t("common.confirmPassword")}
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
      <label className="flex cursor-pointer items-start gap-2.5">
        {/* A 44 by 44 reach round the box, inside its label, so a tap anywhere in
            it ticks the box; the negative margin keeps the box where it was drawn. */}
        <span className="-m-[13px] inline-flex h-11 w-11 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            data-mock-allow="target"
            data-mock-why="its reach is the 44 by 44 square round it, inside its label: a tap anywhere there ticks it"
            className="h-[18px] w-[18px] accent-gold"
          />
        </span>
        <span className="font-sans text-caption leading-[1.5] text-paper/70">
          {t("ui.iAgreeToThe")}{" "}
          <LegalLink doc="terms" className="text-paper underline underline-offset-2">
            {t("ui.termsOfServiceX")}
          </LegalLink>{" "}
          {t("ui.and")}{" "}
          <LegalLink doc="privacy" className="text-paper underline underline-offset-2">
            {t("ui.privacyPolicyX")}
          </LegalLink>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={pending || !agreed}
        className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? t("signup.pending") : t("signup.submit")}
      </button>
      {/* Under the button, so nothing moves under the finger that pressed it (fresh eyes M6). */}
      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}

      <p className="text-center font-sans text-caption text-paper/55">
        {t("signup.alreadyHaveOnePrefix")}{" "}
        <Link
          href={withNext("/signin", target)}
          className="text-paper hover:underline underline-offset-2"
        >
          {t("ui.signInArrow")}
        </Link>
      </p>

      {/* The word stands in the middle of its line whichever way the page runs. It was centred by a left offset, which
          in a page that runs right to left starts from the right: in Arabic and Urdu it was carried off the screen and
          only the line was left (seen on the export, 2026-11-11). */}
      <div data-or-line="" className="relative my-3 flex justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-paper/12" />
        <span className="relative bg-night px-3 text-caption text-paper/45">
          {t("notFound.or")}
        </span>
      </div>

      <OAuthButtons
        redirectTo={target}
        // The checkbox above already governs this button, so the inline
        // notice would ask for the same agreement twice on one screen.
        showTermsNotice={false}
        disabled={!agreed}
        disabledHint={t("signup.agreeFirstHint")}
      />
    </form>
  );
}
