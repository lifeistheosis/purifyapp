"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { Pen } from "@/components/ui/icons/Pen";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { useMyPicture } from "@/lib/profile/myPicture";
import { dateLocale, deviceDateLocale } from "@/lib/i18n/deviceDates";

/**
 * Who the reader is, at the top of their Profile: their picture, their name
 * (editable in place), the address they sign in with, and three facts.
 *
 * Redrawn for 1.8. It was a card of its own world: a violet glow and a drawn
 * wave behind the name, the name in the display serif the owner has asked to
 * keep off Purify, a plan pill in gold, and the facts as outlined pills. On
 * the phone it sat under a row of three tiles (Saved, Saints, Discover) and
 * over a strip of three large cards with arrows, the look the rest of the
 * app left in 1.7: "when you click profile, and then you scroll down, it
 * shows ... the old UI" (the owner, 2026-10-17). Now it is drawn as the
 * phone screens are: the picture and the name in Lora on the page itself,
 * and the facts in one rounded list, as Settings draws its rows.
 *
 * Saves a new name to both places it is read from: auth's user_metadata (so
 * the app picks it up across sessions) and profiles.display_name (so other
 * surfaces read it through RLS).
 */

/** "2 hours ago", "yesterday", or the date, in the reader's own language. */
function relativeTime(iso: string, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  try {
    const rtf = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto" });
    if (minutes < 1) return rtf.format(0, "minute");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    if (days < 7) return rtf.format(-days, "day");
  } catch {
    /* the date, below */
  }
  // A date, as the profile writes dates: the device's own way (lib/i18n/deviceDates).
  return new Date(iso).toLocaleDateString(deviceDateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileHero({
  email,
  initialDisplayName,
  joinedAt,
  lastSignedInAt,
}: {
  email: string;
  initialDisplayName: string;
  joinedAt: string;
  lastSignedInAt?: string;
}) {
  const { t, locale } = useTranslate();
  const me = useMyPicture();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tier = usePremiumTier();

  /**
   * Write the new name to BOTH places it is read from, and say so when
   * either refuses.
   *
   * The name is read back in two steps by ProfileTabClient: first from the
   * session cookie's user_metadata, then overwritten by profiles.display_name
   * when that row arrives. So a write that lands in auth and not in the table
   * looks, after one reload, exactly like a write that never happened. This
   * used to be that: the whole function hung on updateUser (see AppNav, which
   * held the auth lock against itself), so auth took the new name, the table
   * never did, and the reader saw the old one come back.
   *
   * Three silent failures were underneath it, each still live once the hang
   * was gone, so all four are fixed together:
   *   1. postgrest returns RLS refusals in `error`, it does not throw, and
   *      nothing here looked at `error`. A denied write reported success.
   *   2. the row was targeted with `getUser()?.id ?? ""`, so a failed user
   *      read updated zero rows and still reported success.
   *   3. `catch {}` was empty, so a thrown failure also reported success.
   * The user is told now, in all three cases, and the name stays in the box
   * so nothing they typed is lost.
   */
  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      setDraft(displayName);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth, error: authErr } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
      if (authErr) throw new Error(authErr.message);

      const id = auth.user?.id;
      if (!id) throw new Error("Not signed in.");

      const { error: rowErr } = await supabase
        .from("profiles")
        .update({
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      // Auth already has the new name at this point. Leaving the table behind
      // is the exact state that reads as "it did not save", so it is an error
      // here rather than something to shrug at.
      if (rowErr) throw new Error(rowErr.message);

      setDisplayName(trimmed);
      setDraft(trimmed);
      setEditing(false);
    } catch {
      setError(t("profile.err.saveFailed"));
    }
    setSaving(false);
  }

  const memberSince = joinedAt
    ? new Date(joinedAt).toLocaleDateString(deviceDateLocale(), {
        month: "long",
        year: "numeric",
      })
    : "";
  const lastSeen = lastSignedInAt ? relativeTime(lastSignedInAt, locale) : "";
  // A plan is named only when there is one: the free reader's screen does
  // not say "Free" at them. Product names, as the Premium pill says them.
  const plan = tier === "plus" ? t("profile.badge.plus") : tier === "pro" ? t("profile.badge.pro") : "";
  const facts: [label: string, value: string][] = [
    ...(memberSince ? ([[t("profile.memberSince"), memberSince]] as [string, string][]) : []),
    ...(lastSeen ? ([[t("ui.lastSignedIn"), lastSeen]] as [string, string][]) : []),
    ...(plan ? ([[t("ui.plan"), plan]] as [string, string][]) : []),
  ];

  return (
    <header data-profile-hero="">
      <div className="flex flex-col items-center text-center md:flex-row md:items-center md:gap-5 md:text-start">
        {/* The reader's picture, the same one the You tab and Community show,
            or their initials (InitialsAvatar: neutral, no ring, no glow). */}
        <ReaderAvatar name={displayName} picture={me.state === "in" ? me.picture : null} size={80} />
        <div className="mt-4 min-w-0 md:mt-0">
          {editing ? (
            <div className="flex flex-col items-center gap-3 md:items-start">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t("ui.editDisplayName")}
                // The input only mounts when the reader taps Edit: focus
                // follows their intent, it does not steal it.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") {
                    setDraft(displayName);
                    setEditing(false);
                    setError(null);
                  }
                }}
                maxLength={60}
                className="h-12 w-full min-w-0 max-w-[320px] rounded-pill border border-paper/30 bg-paper/[0.06] px-4 text-center font-heading text-lede text-paper focus:border-paper/60 focus:outline-none md:text-start"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="tap-press inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-60"
                >
                  {saving ? t("profile.saving") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(displayName);
                    setEditing(false);
                    setError(null);
                  }}
                  className="tap-press inline-flex h-11 items-center rounded-pill px-4 font-sans text-ui text-paper/65"
                >
                  {t("common.cancel")}
                </button>
              </div>
              {error ? (
                <p role="alert" className="max-w-[320px] font-sans text-caption leading-[1.45] text-crimson-soft">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              {/* The page's bar says Profile; this is whose. A heading of the
                  page, set in Lora by the global rule. */}
              <h2 className="break-words text-title leading-[1.1] tracking-[-0.01em] text-paper">{displayName}</h2>
              {/* The whole address, wrapped and never cut: a reader checking
                  WHICH account they are signed into needs all of it. */}
              <p className="mt-1.5 break-all font-sans text-detail text-paper/60">{email}</p>
              <button
                type="button"
                onClick={() => {
                  setDraft(displayName);
                  setEditing(true);
                }}
                aria-label={t("ui.editDisplayName")}
                className="tap-press hit-44 mt-3 inline-flex h-9 items-center gap-1.5 rounded-pill border border-paper/20 px-3.5 font-sans text-caption font-semibold text-paper/80 motion-safe:transition-colors hover:border-paper/40"
              >
                <Pen size={13} className="shrink-0 text-paper/55" />
                {t("common.edit")}
              </button>
            </>
          )}
        </div>
      </div>

      {facts.length > 0 ? (
        <dl className={`mt-7 ${INDEX_LIST_LOOK}`}>
          {facts.map(([label, value], i) => (
            <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3.5${i ? " border-t border-paper/[0.06]" : ""}`}>
              <dt className="font-sans text-ui text-paper/70">{label}</dt>
              <dd className="text-end font-sans text-ui text-paper">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
