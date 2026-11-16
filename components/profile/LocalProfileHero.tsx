"use client";

import { useState } from "react";
import { useLocalAccount, releaseLocal } from "@/lib/profile/localAccount";
import { AccountChoice } from "./AccountChoice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LINE_ON_PAGE, ReaderIdentity } from "@/components/profile/ReaderIdentity";

/**
 * Mirrors `ProfileHero` for the device-only path. Shown on `/account`
 * when a local name is claimed but no Supabase session exists.
 *
 * Copy model (store-launch language): Purify works privately on this
 * device with no account; signing in exists to keep reading
 * synchronized across devices. The old "Local profile / Public
 * account" naming is retired.
 *
 * Since 1.9 (build 98 note 11) it wears the one piece a signed-in reader's
 * You and Profile wear (components/profile/ReaderIdentity.tsx): the picture
 * (their initials, a device keeps no picture without an account), the name
 * in the reading serif, and under it the line that says where they read.
 * Then the invitation to sign in, once: one line on what an account adds,
 * and its button. The date the name was claimed went with the account's
 * other facts off a reader's own face.
 *
 * Surfaces:
 *  - the local display name, as the identity piece,
 *  - an explicit "on this device" line so it's never confusing,
 *  - a "Sign in" affordance (flips the wrapper back into `AccountChoice`
 *    so the existing sign-in panel appears),
 *  - a quieter "Remove this name" affordance for cleanup.
 *
 * Stateless w/r/t Supabase, this whole component only reads
 * localStorage.
 */
export function LocalProfileHero() {
  const { t } = useTranslate();
  const account = useLocalAccount();
  const [upgrading, setUpgrading] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState(false);

  if (!account) return null;
  if (upgrading) {
    // Re-show the chooser so the user can land in the right card.
    return <AccountChoice />;
  }

  return (
    <section className="mt-10 rounded-lg border border-paper/15 bg-paper/[0.03] p-6 md:p-7">
      <ReaderIdentity
        name={account.name}
        picture={null}
        patron={null}
        badges={[]}
        under={<span className={LINE_ON_PAGE}>{t("ui.readingPrivatelyOnThisDevice")}</span>}
      />

      <p className="mt-5 font-serif text-body text-paper/80 leading-[1.7]">
        {t("ui.syncLockedBody")}
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setUpgrading(true)}
          className="font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-paper text-night hover:bg-paper/90 transition-colors"
        >
          {t("profile.signInLink")}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingRelease(true)}
          className="font-sans text-ui font-medium rounded-pill px-5 py-3 border border-paper/25 text-paper/80 hover:border-paper/55 hover:text-paper transition-colors"
        >
          {t("ui.removeThisName")}
        </button>
      </div>
      <ConfirmDialog
        open={confirmingRelease}
        title={t("ui.removeThisNameX")}
        description="Your highlights, notes, and bookmarks stay on this device, only the name and claim date are removed."
        confirmLabel={t("ui.removeName")}
        cancelLabel={t("study.florilegium.keepIt")}
        destructive
        onCancel={() => setConfirmingRelease(false)}
        onConfirm={() => {
          setConfirmingRelease(false);
          releaseLocal();
        }}
      />

      <p className="mt-5 font-sans text-caption text-paper/55 leading-[1.55]">
        {t("profile.signInKeeps")}
      </p>
    </section>
  );
}
