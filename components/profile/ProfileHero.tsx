"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Pen } from "@/components/ui/icons/Pen";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { LINE_ON_PAGE, ReaderIdentity } from "@/components/profile/ReaderIdentity";
import { useMyBadges } from "@/lib/profile/myBadges";
import { useMyCard } from "@/lib/profile/myCard";
import { useMyPicture } from "@/lib/profile/myPicture";
import { PATRON_ANCHOR } from "@/lib/profile/patronEvent";

/**
 * Who the reader is, at the top of their Profile: the one piece the You tab
 * wears on its Ladder (components/profile/ReaderIdentity.tsx), their picture,
 * their name, their patron saint and their badges, with Edit as its one quiet
 * button. Edit opens what it always did: the name, in place.
 *
 * Redrawn for 1.9 (build 98 note 11; the owner, 2026-11-15: "can your revamp
 * the your profile screen"). It was the picture large and centred, the name,
 * and under the name the address the reader signs in with, then three facts
 * in a list (member since, last signed in, the plan): an account's record,
 * on a screen people photograph and share. The address and the facts are the
 * account's and are listed with it (components/profile/AccountFacts.tsx,
 * behind the row at this screen's foot); nothing of them is drawn here. The
 * plan shows as the supporter's mark by the name, and as nothing else.
 *
 * Before that, for 1.8, it had been drawn as the phone screens are, after
 * years as a card of its own world: a violet glow and a drawn wave behind
 * the name, a plan pill in gold, and the facts as outlined pills.
 *
 * Saves a new name to both places it is read from: auth's user_metadata (so
 * the app picks it up across sessions) and profiles.display_name (so other
 * surfaces read it through RLS).
 */
export function ProfileHero({
  uid,
  initialDisplayName,
}: {
  /** Whose badges to show; null when the session gave no id. */
  uid: string | null;
  initialDisplayName: string;
}) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const badges = useMyBadges(uid);
  // Asked for again on each visit: a reader comes back here from the card's editor.
  const card = useMyCard({ fresh: true });
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tier = usePremiumTier();
  const picture = me.state === "in" ? me.picture : null;

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

  if (editing) {
    return (
      <header data-profile-hero="editing">
        <div className="flex items-start gap-[15px]">
          {/* The reader's picture, the same one the You tab and Community show,
              or their initials (InitialsAvatar: neutral, no ring, no glow). */}
          <ReaderAvatar name={displayName} picture={picture} size={66} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            <input
              dir="auto"
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
              className="h-12 w-full min-w-0 max-w-[320px] rounded-pill border border-paper/30 bg-paper/[0.06] px-4 font-heading text-lede text-paper focus:border-paper/60 focus:outline-none"
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
        </div>
      </header>
    );
  }

  return (
    // The page's bar says Profile; this is whose.
    <header data-profile-hero="">
      <ReaderIdentity
        name={displayName}
        picture={picture}
        patron={card?.patronSaint ?? null}
        badges={badges}
        tier={tier === "plus" || tier === "pro" ? tier : null}
        carry="into"
        // No patron saint chosen yet, and the website has said so: the way to
        // choose one, here only (on You the line is simply not drawn). It
        // brings the chooser below into view.
        under={
          card && !card.patronSaint ? (
            <Link href={`#${PATRON_ANCHOR}`} data-reader-patron-invite="" className={`${LINE_ON_PAGE} hit-44 w-fit font-semibold`}>
              {t("settings.discordFavoritePick")}
              <ChevronLeft size={13} aria-hidden className="shrink-0 -scale-x-100 opacity-70 rtl:scale-x-100" />
            </Link>
          ) : null
        }
        end={
          <button
            type="button"
            onClick={() => {
              setDraft(displayName);
              setEditing(true);
            }}
            aria-label={t("ui.editDisplayName")}
            className="tap-press hit-44 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-paper/20 px-3.5 font-sans text-caption font-semibold text-paper/80 motion-safe:transition-colors hover:border-paper/40"
          >
            <Pen size={13} className="shrink-0 text-paper/55" />
            {t("common.edit")}
          </button>
        }
      />
    </header>
  );
}
