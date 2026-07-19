"use client";

import { useState } from "react";
import Link from "next/link";
import { claimLocal } from "@/lib/profile/localAccount";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Two-card account chooser. Shown on `/account` when the visitor has
 * neither a Supabase session nor a claimed device name. Both cards
 * are real, named choices, neither is a default.
 *
 * Copy model (store-launch language; "Local profile / Public account"
 * naming is retired):
 *  - LEFT: "On this device" — Purify privately, no account required.
 *    Keeps highlights / notes / bookmarks / reader prefs in local
 *    storage. Writes a LocalAccount record via `claimLocal()`. No
 *    server row.
 *  - RIGHT: "Sign in to sync" — Supabase email sign-in. Same items,
 *    synchronized across devices, deletable any time.
 *
 * The cards explicitly list trade-offs on each side so the choice is
 * informed rather than implicit.
 */
export function AccountChoice() {
  const { t } = useTranslate();
  const [localName, setLocalName] = useState("");
  const [localExpanded, setLocalExpanded] = useState(false);

  function submitLocal(e: React.FormEvent) {
    e.preventDefault();
    claimLocal(localName);
    // The account page is subscribed via useLocalAccount(); the
    // LocalProfileHero branch will swap in on the next render.
  }

  return (
    <div className="mt-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LOCAL */}
        <section className="rounded-lg border border-paper/15 bg-paper/[0.03] p-6 md:p-7 flex flex-col">
          <h2 className="font-sans text-lede font-bold text-paper leading-tight">
            {t("account.localProfile")}
          </h2>
          <p className="mt-1 font-sans text-caption uppercase tracking-[1.5px] text-paper/55">
            {t("ui.privateNoAccountRequired")}
          </p>
          <p className="mt-4 font-serif text-ui text-paper/85 leading-[1.65]">
            {t("ui.usePurifyPrivatelyOnThis")}
          </p>
          <ul className="mt-4 space-y-1.5 font-sans text-detail text-paper/70 leading-[1.55]">
            <li>{t("ui.noEmailNoSignIn")}</li>
            <li>{t("ui.noServerSideRecordOf")}</li>
            <li>{t("ui.worksFullyOfflineOnceA")}</li>
            <li className="text-paper/55">
              {t("ui.wonTFollowYouTo")}
            </li>
            <li className="text-paper/55">
              {t("ui.goesAwayIfYouClear")}
            </li>
          </ul>

          {localExpanded ? (
            <form
              onSubmit={submitLocal}
              className="mt-5 flex flex-col gap-3"
            >
              <label
                htmlFor="local-account-name"
                className="font-sans text-caption text-paper/65"
              >
                {t("ui.aNameToShowOn")}
              </label>
              <input
                id="local-account-name"
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder={t("ui.edgar")}
                maxLength={48}
                className="bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50 transition-colors"
              />
              <button
                type="submit"
                className="self-start font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-paper text-night hover:bg-paper/90 transition-colors"
              >
                {t("ui.useLocally")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setLocalExpanded(true)}
              className="mt-6 self-start font-sans text-ui font-semibold rounded-pill px-5 py-3 border border-paper/30 text-paper hover:bg-paper/[0.06] hover:border-paper/55 transition-colors"
            >
              {t("ui.useLocallyX")}
            </button>
          )}
        </section>

        {/* PUBLIC */}
        <section className="rounded-lg border border-gold/35 bg-gold/[0.05] p-6 md:p-7 flex flex-col">
          <h2 className="font-sans text-lede font-bold text-paper leading-tight">
            {t("account.publicAccount")}
          </h2>
          <p className="mt-1 font-sans text-caption uppercase tracking-[1.5px] text-gold">
            {t("ui.yourReadingOnEveryDevice")}
          </p>
          <p className="mt-4 font-serif text-ui text-paper/85 leading-[1.65]">
            {t("ui.theSameThingsYouD")}
          </p>
          <ul className="mt-4 space-y-1.5 font-sans text-detail text-paper/70 leading-[1.55]">
            <li>{t("ui.openTheAppOnA")}</li>
            <li>{t("ui.deleteTheAccountAndEvery")}</li>
            <li>{t("ui.stillNoAdsNoAnalytics")}</li>
            <li className="text-paper/55">
              {t("ui.yourEmailAndWhatYou")}
            </li>
            <li className="text-paper/55">
              {t("ui.requiresAWorkingEmailTo")}
            </li>
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
            >
              {t("ui.createAnAccountX")}
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center font-sans text-detail text-paper/75 hover:text-paper transition-colors"
            >
              {t("ui.alreadyHaveOneSignIn")}
            </Link>
          </div>
        </section>
      </div>

      <p className="mt-6 font-sans text-detail text-paper/55 leading-[1.6]">
        {t("ui.eitherChoiceIsReversibleThe")}{" "}
        <Link
          href="/privacy"
          className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
        >
          {t("ui.privacyPage")}
        </Link>
        .
      </p>
    </div>
  );
}
