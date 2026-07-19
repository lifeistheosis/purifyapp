"use client";

import { useState } from "react";
import { useLocalAccount, releaseLocal } from "@/lib/profile/localAccount";
import { AccountChoice } from "./AccountChoice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Mirrors `ProfileHero` for the device-only path. Shown on `/account`
 * when a local name is claimed but no Supabase session exists.
 *
 * Copy model (store-launch language): Purify works privately on this
 * device with no account; signing in exists to keep reading
 * synchronized across devices. The old "Local profile / Public
 * account" naming is retired.
 *
 * Surfaces:
 *  - the local display name + the date it was claimed,
 *  - an explicit "on this device" eyebrow so it's never confusing,
 *  - a "Sign in to sync across devices" affordance (flips the wrapper
 *    back into `AccountChoice` so the existing sign-in panel appears),
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

  const initials = account.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const created = (() => {
    try {
      return new Date(account.createdAt).toLocaleDateString();
    } catch {
      return "";
    }
  })();

  return (
    <section className="mt-10 rounded-lg border border-paper/15 bg-paper/[0.03] p-6 md:p-7">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
        {t("ui.readingPrivatelyOnThisDevice")}
      </p>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper/30 font-display-serif text-lede text-paper/85"
          style={{
            background:
              "linear-gradient(155deg, #1d1a22 0%, #2c2730 55%, #3a323f 100%)",
          }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="font-sans text-title-sm font-bold text-paper leading-tight truncate">
            {account.name}
          </p>
          {created ? (
            <p className="mt-1 font-sans text-caption text-paper/55">
              {t("ui.claimedLocallyOn")} {created}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-5 font-serif text-body text-paper/80 leading-[1.7]">
        {t("ui.highlightsNotesAndBookmarksAre")}
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setUpgrading(true)}
          className="font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
        >
          {t("ui.signInToSyncAcross")}
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

      <p className="mt-5 font-sans text-caption text-paper/45 leading-[1.55]">
        {t("ui.signingInSyncsYourLocal")}
      </p>
    </section>
  );
}
