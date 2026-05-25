"use client";

import { useState } from "react";
import { useLocalAccount, releaseLocal } from "@/lib/profile/localAccount";
import { AccountChoice } from "./AccountChoice";

/**
 * Mirrors `ProfileHero` for the local-only path. Shown on `/account`
 * when a `LocalAccount` is claimed but no Supabase session exists.
 *
 * Surfaces:
 *  - the local display name + the date it was claimed,
 *  - an explicit "on this device only" eyebrow so it's never confusing,
 *  - an "Upgrade to a public account" affordance (flips the wrapper
 *    back into `AccountChoice` so the existing magic-link panel
 *    appears alongside the local card),
 *  - a quieter "Release this local profile" affordance for cleanup.
 *
 * Stateless w/r/t Supabase — this whole component only reads
 * localStorage.
 */
export function LocalProfileHero() {
  const account = useLocalAccount();
  const [upgrading, setUpgrading] = useState(false);

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
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
        Local profile, on this device only
      </p>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper/30 font-display-serif text-[18px] text-paper/85"
          style={{
            background:
              "linear-gradient(155deg, #1d1a22 0%, #2c2730 55%, #3a323f 100%)",
          }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="font-sans text-[22px] font-bold text-paper leading-tight truncate">
            {account.name}
          </p>
          {created ? (
            <p className="mt-1 font-sans text-[12.5px] text-paper/55">
              Claimed locally on {created}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-5 font-serif text-[16px] text-paper/80 leading-[1.7]">
        Highlights, notes, bookmarks, and your prayer streak live in
        this browser only. They will not follow you to another device.
        Either of these is a real, reversible move:
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setUpgrading(true)}
          className="font-sans text-[14px] font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
        >
          Upgrade to a public account →
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                "Release this local profile? Your local highlights, notes, and bookmarks stay where they are — only the name and claim date are removed.",
              )
            ) {
              releaseLocal();
            }
          }}
          className="font-sans text-[14px] font-medium rounded-pill px-5 py-3 border border-paper/25 text-paper/80 hover:border-paper/55 hover:text-paper transition-colors"
        >
          Release this local profile
        </button>
      </div>

      <p className="mt-5 font-sans text-[12.5px] text-paper/45 leading-[1.55]">
        Upgrading does not auto-migrate the highlights and notes that
        already live in this browser; that&rsquo;s a separate
        workstream. For now, anything saved publicly after sign-in
        starts fresh on the server.
      </p>
    </section>
  );
}
